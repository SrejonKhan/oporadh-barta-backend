import { NextFunction, Request, Response } from "express";
import { createCrimeReportSchema } from "../schemas/crime-report.schema";
import { createCrimeReport } from "../services/crime-report.service";
import httpStatus from "http-status";

export const reportCrime = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = createCrimeReportSchema.parse(req.body);
    const files = req.files as Express.Multer.File[];

    const report = await createCrimeReport({
      ...payload,
      mediaFiles: files,
      userId: req.user.id
    });

    const body = {
      message: "Crime report created successfully",
      report
    };

    res.status(httpStatus.CREATED).send(body);
  } catch (ex) {
    next(ex);
  }
}; 