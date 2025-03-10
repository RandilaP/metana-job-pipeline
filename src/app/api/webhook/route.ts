import { NextResponse } from 'next/server';

interface WebhookRequest extends Request {
    json: () => Promise<any>;
}

interface WebhookResponse {
    success?: boolean;
    error?: string;
}

export async function POST(request: WebhookRequest): Promise<NextResponse<WebhookResponse>> {
    try {
        const webhookData = await request.json();
        
        // This is a route that can be triggered by a webhook
        // For example, you might want to handle callbacks from other services
        
        console.log('Webhook received:', webhookData);
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { error: 'Failed to process webhook' },
            { status: 500 }
        );
    }
}