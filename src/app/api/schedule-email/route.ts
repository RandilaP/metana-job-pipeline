// app/api/schedule-email/route.js
import { NextResponse } from 'next/server';
import AWS from 'aws-sdk';
import { EventBridgeClient, PutRuleCommand, PutTargetsCommand } from '@aws-sdk/client-eventbridge';

interface EmailRequest {
    email: string;
    name: string;
    scheduledTime: Date;
}

interface LambdaInput {
    email: string;
    name: string;
    subject: string;
    message: string;
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const { email, name, scheduledTime }: EmailRequest = await request.json();
        const eventBridge = new EventBridgeClient({});
        
        // Schedule the email to be sent at the specified time
        await eventBridge.send(new PutRuleCommand({
            Name: `follow-up-email-${Date.now()}`,
            ScheduleExpression: `at(${scheduledTime.toISOString()})`,
            State: 'ENABLED'
        }));
        
        const lambdaInput: LambdaInput = {
            email,
            name,
            subject: 'Your Application is Under Review',
            message: `Dear ${name},\n\nThank you for submitting your application. Your CV is currently under review.\n\nBest regards,\nThe Hiring Team`
        };
        
        await eventBridge.send(new PutTargetsCommand({
            Rule: `follow-up-email-${Date.now()}`,
            Targets: [
                {
                    Id: 'send-email-target',
                    Arn: process.env.LAMBDA_FUNCTION_ARN, // Lambda that will send the email
                    Input: JSON.stringify(lambdaInput)
                }
            ]
        }));
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to schedule email:', error);
        return NextResponse.json(
            { error: 'Failed to schedule follow-up email' },
            { status: 500 }
        );
    }
}