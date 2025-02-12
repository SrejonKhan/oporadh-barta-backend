import { z } from "zod";
import { bdLocations } from "../services/location.service";

export const createCrimeReportSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long"),
  description: z.string().optional(),
  division: z.string().refine(val => Object.keys(bdLocations).includes(val), {
    message: "Invalid division"
  }),
  district: z.string(),
  fullAddress: z.string().optional(),
}).openapi({
  description: "Create Crime Report Schema"
}); 