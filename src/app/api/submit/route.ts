import { NextResponse, NextRequest } from 'next/server';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getTextExtractor } from 'office-text-extractor';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as path from 'path';
import * as sgMail from '@sendgrid/mail';

// Environment validation
const requiredEnvVars = [
  'SENDGRID_API_KEY',
  'S3_BUCKET_NAME',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_SHEET_SCRIPT_LINK',
  'EMAIL'
];

// Check for missing environment variables at startup
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    // Continue execution but log the error
  }
}

// Initialize services
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
const extractor = getTextExtractor();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Type definitions
interface CVData {
  personal_info: {
    name: string;
    email: string;
    phone: string;
    address: string;
    linkedin: string;
  };
  education: any[];
  qualifications: any[];
  projects: any[];
  cv_public_link?: string;
}

interface Metadata {
  applicant_name: string | null;
  email: string | null;
  status: string;
  cv_processed: boolean;
  processed_timestamp: string;
}

/**
 * Sends CV data to Google Sheets
 */
async function sendCVDataToGoogleSheets(cvData: CVData): Promise<void> {
  try {
    const scriptLink = process.env.GOOGLE_SHEET_SCRIPT_LINK;
    if (!scriptLink) {
      throw new Error('Google Sheet script link not configured');
    }

    const response = await fetch(scriptLink, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cvData),
    });

    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Google Sheets response:', result);
  } catch (error) {
    console.error('Failed to send data to Google Sheets:', error);
    throw error;
  }
}

/**
 * Sends webhook with CV data and metadata
 */
async function sendWebhook(cvData: CVData, metadata: Metadata): Promise<void> {
  try {
    const payload = {
      cv_data: cvData,
      metadata: metadata,
    };

    const response = await fetch('https://rnd-assignment.automations-3d6.workers.dev/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Candidate-Email': process.env.EMAIL as string,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
    }

    console.log('Webhook response status:', response.status);
  } catch (error) {
    console.error('Failed to send webhook:', error);
    throw error;
  }
}

/**
 * Uploads file to S3
 */
async function uploadFileToS3(file: File, fileName: string): Promise<string> {
  try {
    const Body = Buffer.from(await file.arrayBuffer());
    const Bucket = process.env.S3_BUCKET_NAME;
    
    if (!Bucket) {
      throw new Error('S3 bucket name not configured');
    }

    await s3.send(new PutObjectCommand({ Bucket, Key: fileName, Body }));
    
    return `https://${Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error('Failed to upload file to S3:', error);
    throw error;
  }
}

/**
 * Process CV text with Gemini AI
 */
async function processWithAI(text: string): Promise<CVData> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      Extract the following information from this CV text and structure it into JSON format:
      
      1. Personal Information (name, contact details)
      2. Education (institution names, degrees, years)
      3. Qualifications (skills, certifications, etc.)
      4. Projects (titles, descriptions, technology used)
      
      CV Text:
      ${text}
      
      Response format should be valid JSON with the following structure:
      {
        "personal_info": {
          "name": "",
          "email": "",
          "phone": "",
          "address": "",
          "linkedin": ""},
        "education": [...],
        "qualifications": [...],
        "projects": [...]
      }
    `;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }
    
    return JSON.parse(jsonMatch[0]) as CVData;
  } catch (error) {
    console.error('Failed to process CV with AI:', error);
    throw error;
  }
}

/**
 * Sends confirmation email to applicant
 */
async function sendConfirmationEmail(name: string | null, email: string | null): Promise<void> {
  try {
    if (!email) {
      throw new Error('Email address is required');
    }

    const msg = {
      to: email,
      from: process.env.EMAIL as string,
      subject: 'Your CV is Under Review',
      text: `Dear ${name || 'Applicant'},\n\nYour CV is currently under review. We will get back to you soon.\n\nBest regards,\nMetana Team`,
      html: `<p>Dear ${name || 'Applicant'},</p><p>Your CV is currently under review. We will get back to you soon.</p><p>Best regards,<br>Metana Team</p>`,
      send_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    };
    
    const response = await sgMail.send(msg);
    console.log('Email sent:', response[0].statusCode);
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    throw error;
  }
}

/**
 * Main handler for POST requests
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll("file") as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const file = files[0];
    const fileExtension = path.extname(file.name);
    const fileName = `${uuidv4()}${fileExtension}`;

    // Step 1: Upload file to S3
    const fileUrl = await uploadFileToS3(file, fileName);
    
    // Step 2: Extract text from file
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let text: string;
    try {
      text = await extractor.extractText({input: fileBuffer, type: 'file'});
    } catch (error) {
      console.error('Error extracting text from file:', error);
      return NextResponse.json(
        { error: 'Failed to extract text from file' },
        { status: 422 }
      );
    }
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text content found in the file' },
        { status: 422 }
      );
    }

    // Step 3: Process text with AI
    const cvData = await processWithAI(text);
    cvData.cv_public_link = fileUrl;
    
    // Step 4: Send data to Google Sheets
    await sendCVDataToGoogleSheets(cvData);

    // Step 5: Send webhook
    const metadata: Metadata = {
      applicant_name: formData.get("name") as string | null,
      email: formData.get("email") as string | null,
      status: "testing", 
      cv_processed: true,
      processed_timestamp: new Date().toISOString(),
    };
    await sendWebhook(cvData, metadata);

    // Step 6: Send confirmation email
    await sendConfirmationEmail(
      formData.get("name") as string | null,
      formData.get("email") as string | null
    );

    return NextResponse.json({ 
      success: true,
      message: 'CV processed successfully',
      fileUrl
    });
  } catch (error) {
    console.error('Error processing CV:', error);
    return NextResponse.json(
      { error: 'Failed to process CV', message: (error as Error).message },
      { status: 500 }
    );
  }
}