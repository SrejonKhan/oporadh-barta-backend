import express from "express";
import { reportCrime } from "../../controllers/crime-report.controller";
import { hasRole } from "../../middlewares/auth.middleware";
import multer from "multer";
import { ApiError as AppError } from "../../utils/error";
import httpStatus from "http-status";

const crimeReportRouter = express.Router();

// Configure multer
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos only
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new AppError(httpStatus.BAD_REQUEST, "Only images and videos are allowed"));
    }
  }
});

crimeReportRouter.post(
  "/report",
  hasRole(["USER", "ADMIN"]),
  upload.array('media', 5), // Max 5 files
  reportCrime
);

export default crimeReportRouter; 