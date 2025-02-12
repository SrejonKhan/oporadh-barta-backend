import { NextFunction, Request, Response } from "express";
import { createCrimeReportSchema } from "../schemas/report.schema";
import { createCrimeReport } from "../services/report.service";
import httpStatus from "http-status";

export const reportCrime = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = createCrimeReportSchema.parse(req.body);

    const { title, description, location } = payload;
    const files = req.files as Express.Multer.File[];

    const report = await createCrimeReport(req.user.email, title, description, location, files);

    const body = {
      message: "Crime report created successfully",
      report,
    };

    res.status(httpStatus.CREATED).send(body);
  } catch (ex) {
    next(ex);
  }
};
