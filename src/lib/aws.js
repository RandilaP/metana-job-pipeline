// lib/aws.js
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();
const textract = new AWS.Textract();
const ses = new AWS.SES();

// Upload file to S3
export async function uploadToS3(file) {
  const fileExtension = file.name.split('.').pop();
  const fileKey = `${uuidv4()}.${fileExtension}`;
  const bucket = process.env.S3_BUCKET_NAME;
  
  const params = {
    Bucket: bucket,
    Key: fileKey,
    Body: Buffer.from(await file.arrayBuffer()),
    ContentType: file.type,
    ACL: 'public-read' // Make the file publicly accessible
  };
  
  await s3.upload(params).promise();
  
  return {
    publicUrl: `https://${bucket}.s3.amazonaws.com/${fileKey}`,
    fileKey
  };
}

// Extract text from document using AWS Textract
export async function getTextFromDocument(fileKey) {
  const params = {
    Document: {
      S3Object: {
        Bucket: process.env.S3_BUCKET_NAME,
        Name: fileKey
      }
    }
  };
  
  // For PDF files, start a document text detection job
  if (fileKey.endsWith('.pdf')) {
    const startJobResponse = await textract.startDocumentTextDetection(params).promise();
    const jobId = startJobResponse.JobId;
    
    // Poll for job completion
    let jobComplete = false;
    let result;
    
    while (!jobComplete) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const jobStatus = await textract.getDocumentTextDetection({ JobId: jobId }).promise();
      jobComplete = jobStatus.JobStatus === 'SUCCEEDED';
      
      if (jobComplete) {
        result = jobStatus;
      }
    }
    
    // Combine all pages
    let text = '';
    let nextToken = result.NextToken;
    
    do {
      const pages = nextToken 
        ? await textract.getDocumentTextDetection({ JobId: jobId, NextToken: nextToken }).promise()
        : result;
      
      for (const block of pages.Blocks) {
        if (block.BlockType === 'LINE') {
          text += block.Text + '\n';
        }
      }
      
      nextToken = pages.NextToken;
    } while (nextToken);
    
    return text;
  } 
  // For DOCX files, use document analysis
  else if (fileKey.endsWith('.docx')) {
    // For DOCX, we need to first convert to PDF 
    // This is a simplified example - in production, you'd need to handle DOCX conversion
    // You might use a Lambda function with LibreOffice/unoconv to convert DOCX to PDF
    
    // For this example, let's assume we converted to PDF and then used Textract
    // In reality, you might use a different approach like using a document parsing library
    
    const detectionResponse = await textract.detectDocumentText({
      Document: {
        S3Object: {
          Bucket: process.env.S3_BUCKET_NAME,
          Name: fileKey
        }
      }
    }).promise();
    
    let text = '';
    for (const block of detectionResponse.Blocks) {
      if (block.BlockType === 'LINE') {
        text += block.Text + '\n';
      }
    }
    
    return text;
  }
  
  throw new Error('Unsupported file format');
}

// Send email using AWS SES
export async function sendEmail(to, subject, message) {
  const params = {
    Source: process.env.EMAIL_FROM,
    Destination: {
      ToAddresses: [to]
    },
    Message: {
      Subject: {
        Data: subject
      },
      Body: {
        Text: {
          Data: message
        }
      }
    }
  };
  
  return ses.sendEmail(params).promise();
}