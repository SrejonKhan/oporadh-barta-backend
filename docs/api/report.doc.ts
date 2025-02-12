import { z } from "zod";
import { createCrimeReportSchema } from "../../src/schemas/report.schema";
import { bearerAuth, registry } from "./generator";

registry.registerPath({
  method: "post",
  path: "/report/create-report",
  summary: "Report Crime",
  description: "Report a crime",
  security: [{ bearerAuth: [] }],
  tags: ["Report"],
  request: {
    body: {
      content: {
        "multipart/form-data": { schema: createCrimeReportSchema },
      },
    },
  },
  responses: {
    201: {
      description: "Crime report created successfully",
    },
  },
});
