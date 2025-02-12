import fs from "fs";
import sharp from "sharp";
import { Buffer } from "buffer";
import path from "path";

export const addWatermark = async (imageBuffer: Buffer, username: string): Promise<Buffer> => {
  try {
    // Create a buffer with the watermark text
    const svgBuffer = Buffer.from(`
      <svg width="300" height="200">
        <style>
          .text {
            fill: rgba(255, 255, 255, 0.5);
            font-size: 24px;
            font-weight: bold;
            font-family: Arial, sans-serif;
          }
        </style>
        <text x="100%" y="100%" text-anchor="middle">
          ${username}
        </text>
      </svg>
    `);

    // readd png buffer from abu_sayeed.png file from the same directory of this script
    const overlayBuffer = Buffer.from(fs.readFileSync(path.join(__dirname, "abu_sayeed.png")));

    // Process the image with sharp
    const processedImageBuffer = await sharp(imageBuffer)
      .composite([
        {
          input: svgBuffer,
          gravity: "center",
          blend: "over",
        },
        { input: overlayBuffer, gravity: "southeast" },
      ])
      .toBuffer();

    return processedImageBuffer;
  } catch (error) {
    console.error("Error adding watermark:", error);
    throw error;
  }
};
