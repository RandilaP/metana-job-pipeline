import { NextResponse } from 'next/server';
import { uploadToS3, getTextFromDocument } from '../../../lib/aws';
import { appendToSheet } from '../../../lib/google-sheets';
import { structureCV } from '../../../lib/gemini';
import { calculateNextDayTimezone } from '../../../lib/time-utils';

interface FormData {
    get(name: string): File | string | null;
}

interface S3UploadResult {
    publicUrl: string;
    fileKey: string;
}

interface StructuredCV {
    education: any;
    qualifications: any;
    projects: any;
    personal_info: any;
}

interface WebhookPayload {
    cv_data: {
        personal_info: any;
        education: any;
        qualifications: any;
        projects: any;
        cv_public_link: string;
    };
    metadata: {
        applicant_name: string;
        email: string;
        status: string;
        cv_processed: boolean;
        processed_timestamp: string;
    };
}

interface ScheduleEmailPayload {
    email: string;
    name: string;
    scheduledTime: string;
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const formData: FormData = await request.formData();
        
        const name: string | null = formData.get('name') as string | null;
        const email: string | null = formData.get('email') as string | null;
        const phone: string | null = formData.get('phone') as string | null;
        const cvFile: File | null = formData.get('cv') as File | null;
        
        // 1. Upload to S3
        const { publicUrl, fileKey }: S3UploadResult = await uploadToS3(cvFile);
        
        // 2. Extract text using Textract
        const rawText: string = await getTextFromDocument(fileKey);
        
        // 3. Structure the data using Gemini
        const structuredData: StructuredCV = await structureCV(rawText);
        
        // 4. Add data to Google Sheet
        await appendToSheet({
            name,
            email,
            phone,
            cvUrl: publicUrl,
            education: JSON.stringify(structuredData.education),
            qualifications: JSON.stringify(structuredData.qualifications),
            projects: JSON.stringify(structuredData.projects),
            personalInfo: JSON.stringify(structuredData.personal_info)
        });
        
        // 5. Send webhook notification
        const webhookPayload: WebhookPayload = {
            cv_data: {
                personal_info: structuredData.personal_info,
                education: structuredData.education,
                qualifications: structuredData.qualifications,
                projects: structuredData.projects,
                cv_public_link: publicUrl
            },
            metadata: {
                applicant_name: name!,
                email: email!,
                status: "testing", // Change to "testing" during development
                cv_processed: true,
                processed_timestamp: new Date().toISOString()
            }
        };
        
        // await fetch('https://rnd-assignment.automations-3d6.workers.dev/', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'X-Candidate-Email': 'randilamenukapremarathne@gmail.com' // Replace with the email you used to apply
        //     },
        //     body: JSON.stringify(webhookPayload)
        // });
        
        // 6. Schedule follow-up email for next day
        const nextDayTime: string = calculateNextDayTimezone(email!);
        
        const scheduleEmailPayload: ScheduleEmailPayload = {
            email: email!,
            name: name!,
            scheduledTime: nextDayTime
        };
        
        await fetch('/api/schedule-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(scheduleEmailPayload)
        });
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Submission error:', error);
        return NextResponse.json(
            { error: 'Failed to process application' },
            { status: 500 }
        );
    }
}
