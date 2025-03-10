// lib/google-sheets.js
import { google } from 'googleapis';

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function appendToSheet(data) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const range = 'Sheet1!A:I'; // Adjust based on your column count
  
  const values = [
    [
      data.name,
      data.email,
      data.phone,
      data.cvUrl,
      data.personalInfo,
      data.education,
      data.qualifications,
      data.projects,
      new Date().toISOString()
    ]
  ];
  
  const request = {
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    resource: {
      values,
    },
  };
  
  await sheets.spreadsheets.values.append(request);
}