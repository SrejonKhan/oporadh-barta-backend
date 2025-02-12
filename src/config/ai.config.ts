import { GoogleGenerativeAI } from "@google/generative-ai";

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const getGeminiConfig = () => ({
  model: "gemini-pro-vision",
  temperature: 0.4,
  topK: 32,
  topP: 1,
  maxOutputTokens: 2048,
}); 