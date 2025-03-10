// lib/gemini.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function structureCV(rawText) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompt = `
    Extract the following information from this CV text and structure it into JSON format:
    
    1. Personal Information (name, contact details)
    2. Education (institution names, degrees, years)
    3. Qualifications (skills, certifications, etc.)
    4. Projects (titles, descriptions, technology used)
    
    CV Text:
    ${rawText}
    
    Response format should be valid JSON with the following structure:
    {
      "personal_info": {...},
      "education": [...],
      "qualifications": [...],
      "projects": [...]
    }
  `;
  
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  // Extract JSON from response (in case there's additional text)
  const jsonMatch = responseText.match(/{[\s\S]*}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse CV structure from AI response');
  }
  
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to parse CV structure:', error);
    
    // Fallback structure
    return {
      personal_info: { name: '', contact: '' },
      education: [],
      qualifications: [],
      projects: []
    };
  }
}