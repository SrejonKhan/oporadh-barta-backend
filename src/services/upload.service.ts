import * as fs from "fs";
import { s3Client, PutObjectCommand, DeleteObjectCommand } from "../lib/s3";
import { Readable } from "stream";

const uploadFile = async (filepath: string, filename: string, key: string) => {
  if (!fs.existsSync(filepath)) throw "File not found";

  const fileStream = fs.createReadStream(filepath);

  fileStream.on("error", function (err) {
    throw err;
  });

  const putCmd = new PutObjectCommand({
    Bucket: "oporadh-barta",
    ACL: "public-read",
    Body: fileStream,
    Key: key,
    ContentDisposition: `attachment; filename=${filename}`,
  });

  const response = await s3Client.send(putCmd);
  return key;
};

const uploadBuffer = async (buffer: Buffer, filename: string, key: string) => {
  const putCmd = new PutObjectCommand({
    Bucket: "oporadh-barta",
    ACL: "public-read",
    Body: Readable.from(buffer),
    Key: key,
    ContentDisposition: `attachment; filename=${filename}`,
    ContentLength: buffer.length,
  });
  const response = await s3Client.send(putCmd);
  return key;
};

const removeFile = async (key: string) => {
  const deleteCmd = new DeleteObjectCommand({
    Bucket: "oporadh-barta",
    Key: key,
  });
  const response = await s3Client.send(deleteCmd);
  return response;
};

export { uploadFile, uploadBuffer, removeFile };
