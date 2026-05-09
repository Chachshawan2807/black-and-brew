import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.warn("⚠️ GOOGLE_API_KEY is missing in environment variables.");
}

export const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Generate a response using Gemini
 */
export async function generateResponse(prompt: string, modelName: string = "gemini-3-flash-preview") {
  if (!genAI) throw new Error("Gemini AI not initialized.");
  
  const response = await genAI.models.generateContent({
    model: modelName,
    contents: prompt
  });
  
  return response.text;
}
