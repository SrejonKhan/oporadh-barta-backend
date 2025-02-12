import { MediaType } from "../types/media.types";
import prisma from "../lib/prisma";
import { ApiError as AppError } from "../utils/error";
import httpStatus from "http-status";
import { generateDescription, uploadMedia } from "./media.service";
import logger from "../utils/logger";

export const createCrimeReport = async (
  userEmail,
  title,
  description,
  division,
  district,
  fullAddress,
  latitude: string,
  longitude: string,
  files
) => {
  try {
    // Check if user is verified
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user?.isVerified) {
      throw new AppError(httpStatus.FORBIDDEN, "Only verified users can report crimes");
    }

    // Validate media files
    if (!files || files.length === 0) {
      throw new AppError(httpStatus.BAD_REQUEST, "At least one media file is required");
    }

    // Check if at least one image is provided
    const hasImage = files.some((file) => file.mimetype.startsWith("image/"));
    if (!hasImage) {
      throw new AppError(httpStatus.BAD_REQUEST, "At least one image is required");
    }

    // Create location
    const locationDb = await prisma.location.create({
      data: {
        latitude: Number(latitude),
        longitude: Number(longitude),
        fullAddress: fullAddress,
        district: district,
        division: division,
      },
    });

    // Upload media files with watermark
    const mediaUrls = await Promise.all(
      files.map((file) =>
        uploadMedia(
          file,
          file.mimetype.startsWith("image/") ? MediaType.IMAGE : MediaType.VIDEO,
          user.username // Pass username for watermark
        )
      )
    );

    // Generate description if needed
    let finalDescription = description;
    const hasVideo = files.some((file) => file.mimetype.startsWith("video/"));
    if (!hasVideo && !description) {
      try {
        const firstImageUrl = mediaUrls[0];
        finalDescription = await generateDescription(firstImageUrl);
      } catch (error) {
        logger.error("Failed to generate description:", error);
        throw new AppError(
          httpStatus.SERVICE_UNAVAILABLE,
          "Failed to generate description. Please provide a manual description."
        );
      }
    }

    // Create crime report
    const report = await prisma.crimeReport.create({
      data: {
        title,
        description: finalDescription || "No description provided",
        reporterId: user.id,
        locationId: locationDb.id,
        media: {
          create: mediaUrls.map((url, index) => ({
            url,
            type: files[index].mimetype.startsWith("image/") ? MediaType.IMAGE : MediaType.VIDEO,
          })),
        },
      },
      include: {
        location: true,
        media: true,
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    return {
      message: "Crime report created successfully",
      report: report,
    };
  } catch (error) {
    // if (error instanceof AppError) throw error;
    logger.error("Crime Report Creation Error");
    console.log(error);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to create crime report");
  }
};

export const handleUpvote = async (reportId: number, userId: number) => {
  try {
    // Check if report exists
    const report = await prisma.crimeReport.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        location: true,
        media: true,
      },
    });

    if (!report) {
      throw new AppError(httpStatus.NOT_FOUND, "Report not found");
    }

    // Don't allow self-voting
    if (report.reporterId === userId) {
      throw new AppError(httpStatus.FORBIDDEN, "You cannot vote on your own report");
    }

    // Update upvotes
    const updatedReport = await prisma.crimeReport.update({
      where: { id: reportId },
      data: {
        upvotes: {
          increment: 1,
        },
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        location: true,
        media: true,
      },
    });

    logger.info(`Report ${reportId} upvoted by user ${userId}`);

    return {
      message: "Successfully upvoted the report",
      report: updatedReport,
    };
  } catch (error) {
    logger.error("Upvote Error:", error);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to upvote report");
  }
};

export const handleDownvote = async (reportId: number, userId: number) => {
  try {
    // Check if report exists
    const report = await prisma.crimeReport.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        location: true,
        media: true,
      },
    });

    if (!report) {
      throw new AppError(httpStatus.NOT_FOUND, "Report not found");
    }

    // Don't allow self-voting
    if (report.reporterId === userId) {
      throw new AppError(httpStatus.FORBIDDEN, "You cannot vote on your own report");
    }

    // Update downvotes
    const updatedReport = await prisma.crimeReport.update({
      where: { id: reportId },
      data: {
        downvotes: {
          increment: 1,
        },
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        location: true,
        media: true,
      },
    });

    logger.info(`Report ${reportId} downvoted by user ${userId}`);

    return {
      message: "Successfully downvoted the report",
      report: updatedReport,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("Downvote Error:", error);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to downvote report");
  }
};

// Add a function to get report details with vote counts
export const getReportDetails = async (reportId: number) => {
  try {
    const report = await prisma.crimeReport.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        location: true,
        media: true,
      },
    });

    if (!report) {
      throw new AppError(httpStatus.NOT_FOUND, "Report not found");
    }

    return {
      message: "Report details retrieved successfully",
      report,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("Get Report Details Error:", error);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to get report details");
  }
};

// get all reports of all users, sort by upvotes and downvotes
export const handleGetAllReports = async () => {
  try {
    const reports = await prisma.crimeReport.findMany({
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        location: true,
        media: true,
      },
      orderBy: {
        upvotes: "desc",
        downvotes: "asc",
      },
    });

    return {
      message: "Reports retrieved successfully",
      reports,
    };
  } catch (error) {
    console.error("Get All Reports Error:", error);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to get reports");
  }
};
