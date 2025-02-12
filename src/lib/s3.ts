import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  endpoint: process.env.AWS_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY || '',
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY || ''
  }
});

const uploadToS3 = async (file: Express.Multer.File): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: "your-bucket-name",
    Key: `uploads/${Date.now()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);
  return `${process.env.AWS_S3_ENDPOINT}/your-bucket-name/${command.input.Key}`;
};

export default uploadToS3;
