import { z } from "zod";

const allowedMimetypes = ["image/jpeg", "image/png", "image/gif", "video/mp4", "video/mpeg", "video/quicktime"];

const mediaSchema = z.object({
  buffer: z.instanceof(Buffer),
  mimetype: z.string().refine((mimetype) => allowedMimetypes.includes(mimetype), {
    message: "Only images and videos are allowed",
  }),
  originalname: z.string(),
});

// Media is a file buffer array
export const createCrimeReportSchema = z.object({
  title: z.string(),
  description: z.string(),
  division: z.string(),
  district: z.string(),
  fullAddress: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  media: z.array(mediaSchema).max(5), // Max 5 files
});
