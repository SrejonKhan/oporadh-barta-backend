import { MediaType } from "../types/media.types";
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { uploadBuffer } from "./upload.service";
import { ApiError as AppError } from "../utils/error";
import httpStatus from "http-status";
import { addWatermark } from "./image.service";
import sharp from "sharp";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const uploadMedia = async (file: Express.Multer.File, type: MediaType, username: string) => {
  if (!file) throw new AppError(httpStatus.BAD_REQUEST, "File not found");

  const uniqueFileName = `${Date.now()}-${file.originalname}`;
  let processedBuffer = file.buffer;

  // Add watermark only to images
  if (type === MediaType.IMAGE) {
    processedBuffer = await addWatermark(file.buffer, username);
  }

  // Optimize image using sharp
  if (type === MediaType.IMAGE) {
    processedBuffer = await sharp(file.buffer)
      .resize({ width: 800, height: 800, fit: sharp.fit.inside, withoutEnlargement: true }) // Resize to fit within 800x800, maintaining aspect ratio
      .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
      .toBuffer();
  }

  const key = await uploadBuffer(processedBuffer, uniqueFileName, `media/${type}/${uniqueFileName}`);
  return key;
};

export const generateDescription = async (imageUrl: string) => {
  try {
    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Convert image URL to base64 or file buffer
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    // Create image part for the model
    const imagePart = {
      inlineData: {
        data: Buffer.from(imageBuffer).toString("base64"),
        mimeType: "image/jpeg",
      },
    };

    // Generate content
    const result = await model.generateContent(["Describe this crime scene in detail:", imagePart]);
    const response = await result.response;

    return response.text() || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new AppError(httpStatus.SERVICE_UNAVAILABLE, "Failed to generate description");
  }
};
