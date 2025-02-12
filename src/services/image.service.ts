import sharp from 'sharp';
import { Buffer } from 'buffer';

export const addWatermark = async (imageBuffer: Buffer, username: string): Promise<Buffer> => {
    try {
        // Create a buffer with the watermark text
        const svgBuffer = Buffer.from(`
      <svg width="500" height="50">
        <style>
          .text {
            fill: rgba(255, 255, 255, 0.5);
            font-size: 24px;
            font-weight: bold;
            font-family: Arial, sans-serif;
          }
        </style>
        <text x="50%" y="50%" text-anchor="middle" class="text">
          ${username}
        </text>
      </svg>
    `);

        // Process the image with sharp
        const processedImageBuffer = await sharp(imageBuffer)
            .composite([
                {
                    input: svgBuffer,
                    gravity: 'southeast', // Position watermark at bottom-right
                    blend: 'over'
                }
            ])
            .jpeg({ quality: 90 }) // Maintain good quality while reducing size
            .toBuffer();

        return processedImageBuffer;
    } catch (error) {
        console.error('Error adding watermark:', error);
        throw error;
    }
}; 