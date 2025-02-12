import { z } from "zod";

// Media is a file buffer array
export const createCrimeReportSchema = z.object({
  title: z.string(),
  description: z.string(),
  division: z.string(),
  district: z.string(),
  fullAddress: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  media: z
    .array(
      z.object({
        buffer: z.instanceof(Buffer),
        mimetype: z.string(),
        originalname: z.string(),
      })
    )
    .max(5), // Max 5 files
});
