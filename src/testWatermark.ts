import fs from "fs";
import { addWatermark } from "./services/image.service";

// Read an image file into a buffer
const imagePath = "/home/srejon/projects/2024/hackathon/oporadh-barta-backend/src/test.jpg"; // Replace with the path to your image file
const imageBuffer = fs.readFileSync(imagePath);

// Username for the watermark
const username = "YourUsername";

// Add watermark to the image
addWatermark(imageBuffer, username)
  .then((processedImageBuffer) => {
    // Save the processed image to a new file
    const outputPath = "./image_with_watermark.jpg"; // Replace with the desired output path
    fs.writeFileSync(outputPath, processedImageBuffer);
    console.log("Watermark added successfully!");
  })
  .catch((error) => {
    console.error("Error adding watermark:", error);
  });
