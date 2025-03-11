import { NextResponse, NextRequest } from 'next/server';
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getTextExtractor } from 'office-text-extractor'
import {v4 as uuidv4} from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';

const path = require("path");
const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const extractor = getTextExtractor();

const Bucket = process.env.S3_BUCKET_NAME;
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

async function sendCVDataToGoogleSheets(cvData: any) {
  const response = await fetch(process.env.GOOGLE_SHEET_SCRIPT_LINK as string, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cvData),
  });

  const result = await response.json();
  console.log(result);
}

async function sendWebhook(cvData: any, metadata: any) {
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

  const result = await response;
  console.log(result);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll("file") as File[];
  const fileExtention = path.extname(files[0].name);
  const fileName = `${uuidv4()}${fileExtention}`;

  
  const response = await Promise.all(
    files.map(async (file) => {
      const Body = Buffer.from(await file.arrayBuffer());
      s3.send(new PutObjectCommand({ Bucket, Key: fileName, Body }));
    })
  );

  const fileBuffer = Buffer.from(await files[0].arrayBuffer());
  const text = await extractor.extractText({input: fileBuffer, type: 'file'});


  const model = genAI.getGenerativeModel({model: "gemini-1.5-flash" });
  
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
  const json = JSON.parse(jsonMatch![0]);
  json.cv_public_link = `https://${Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  console.log(json);

  await sendCVDataToGoogleSheets(json);

  const metadata = {
    applicant_name: formData.get("name"),
    email: formData.get("email"),
    status: "testing", 
    cv_processed: true,
    processed_timestamp: new Date().toISOString(),
  };

  await sendWebhook(json, metadata);

  const msg = {
    to: formData.get("email"),
    from: process.env.EMAIL as string,
    subject: 'Your CV is Under Review',
    text: `Dear ${formData.get("name")},\n\nYour CV is currently under review. We will get back to you soon.\n\nBest regards,\nMetana Team`,
    html: `<p>Dear ${formData.get("name")},</p><p>Your CV is currently under review. We will get back to you soon.</p><p>Best regards,<br>Metana Team</p>`,
    send_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  }
  
  sgMail
    .send(msg)
    .then((response: any) => {
      console.log(response[0].statusCode)
      console.log(response[0].headers)
    })
    .catch((error: any) => {
      console.error(error)
    })

  return NextResponse.json(response);

}