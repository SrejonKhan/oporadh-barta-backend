import { MediaType } from '../types/media.types';
import { PrismaClient } from "@prisma/client";
// import { uploadToS3 } from "../lib/s3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import uploadToS3 from "../lib/s3"
import { ApiError as AppError } from "../utils/error";
import httpStatus from "http-status";
import fs from 'fs';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const uploadMedia = async (file: Express.Multer.File, type: MediaType) => {
  const url = await uploadToS3(file);
  return url;
};

export const generateDescription = async (imageUrl: string) => {
  try {
    // Initialize the model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Convert image URL to base64 or file buffer
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    // Create image part for the model
    const imagePart = {
      inlineData: {
        data: Buffer.from(imageBuffer).toString('base64'),
        mimeType: "image/jpeg"
      }
    };

    // Generate content
    const result = await model.generateContent([
      "Describe this crime scene in detail:",
      imagePart
    ]);
    const response = await result.response;

    return response.text() || "";
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new AppError(httpStatus.SERVICE_UNAVAILABLE, "Failed to generate description");
  }
}; 