import { MediaType } from "../types/media.types";
import prisma from "../lib/prisma";
import { ApiError as AppError } from "../utils/error";
import httpStatus from "http-status";
import { generateDescription, uploadMedia } from "./media.service";
import logger from "../utils/logger";

export const createCrimeReport = async (userEmail, title, description, location, mediaFiles) => {
  try {
    // Check if user is verified
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user?.isVerified) {
      throw new AppError(httpStatus.FORBIDDEN, "Only verified users can report crimes");
    }

    // Validate media files
    if (!mediaFiles || mediaFiles.length === 0) {
      throw new AppError(httpStatus.BAD_REQUEST, "At least one media file is required");
    }

    // Check if at least one image is provided
    const hasImage = mediaFiles.some((file) => file.mimetype.startsWith("image/"));
    if (!hasImage) {
      throw new AppError(httpStatus.BAD_REQUEST, "At least one image is required");
    }

    // Create location
    const locationDb = await prisma.location.create({
      data: {
        latitude: location.latitude,
        longitude: location.longitude,
        fullAddress: location.fullAddress,
        district: location.district,
        division: location.division,
      },
    });

    // Upload media files with watermark
    const mediaUrls = await Promise.all(
      mediaFiles.map((file) => 
        uploadMedia(
          file, 
          file.mimetype.startsWith("image/") ? MediaType.IMAGE : MediaType.VIDEO,
          user.username // Pass username for watermark
        )
      )
    );

    // Generate description if needed
    let finalDescription = description;
    const hasVideo = mediaFiles.some((file) => file.mimetype.startsWith("video/"));
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
            type: mediaFiles[index].mimetype.startsWith("image/") ? MediaType.IMAGE : MediaType.VIDEO,
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
      report,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("Crime Report Creation Error:", error);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to create crime report");
  }
};
