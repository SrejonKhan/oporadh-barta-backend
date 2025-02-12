import { NextFunction, Request, Response } from "express";
import { createCrimeReportSchema } from "../schemas/report.schema";
import { createCrimeReport, handleUpvote, handleDownvote, handleGetAllReports } from "../services/report.service";
import httpStatus from "http-status";

export const reportCrime = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = createCrimeReportSchema.parse(req.body);

    const { title, description, division, district, fullAddress, latitude, longitude, media } = payload;

    const files = req.files as Express.Multer.File[];

    const report = await createCrimeReport(
      req.user.email,
      title,
      description,
      division,
      district,
      fullAddress,
      latitude,
      longitude,
      files
    );

    const body = {
      message: "Crime report created successfully",
      report,
    };

    res.status(httpStatus.CREATED).send(body);
  } catch (ex) {
    next(ex);
  }
};

export const upvoteReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportId = parseInt(req.params.id);
    const response = await handleUpvote(reportId, req.user.id);
    res.status(httpStatus.OK).send(response);
  } catch (ex) {
    next(ex);
  }
};

export const downvoteReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportId = parseInt(req.params.id);
    const response = await handleDownvote(reportId, req.user.id);
    res.status(httpStatus.OK).send(response);
  } catch (ex) {
    next(ex);
  }
};

export const getAllReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await handleGetAllReports();
    res.status(httpStatus.OK).send(response);
  } catch (ex) {
    next(ex);
  }
};
