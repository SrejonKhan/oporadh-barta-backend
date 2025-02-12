import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Predefined Bangladesh divisions and districts
export const bdLocations = {
  "Dhaka": ["Dhaka", "Gazipur", "Narayanganj"],
  "Chittagong": ["Chittagong", "Cox's Bazar", "Comilla"],
  "Rajshahi": ["Rajshahi", "Bogra", "Pabna"],
  // Add more as needed
};

export const validateLocation = (division: string, district: string): boolean => {
  if (!bdLocations[division]) return false;
  if (!bdLocations[division].includes(district)) return false;
  return true;
};


export const createLocation = async (division: string, district: string, fullAddress?: string) => {
  if (!validateLocation(division, district)) {
    throw new Error("Invalid division or district.");
  }

  return await prisma.location.create({
    data: {
      division,
      district,
      fullAddress
    }
  });
};
