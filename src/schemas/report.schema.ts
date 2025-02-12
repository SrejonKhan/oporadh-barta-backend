import { z } from "zod";

`model CrimeReport {
  id          Int        @id @default(autoincrement())
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  title       String
  description String
  location    Location   @relation(fields: [locationId], references: [id], name: "LocationReports")
  locationId  Int
  media       Media[]
  status      ReportStatus @default(PENDING)
  reporter    User     @relation(fields: [reporterId], references: [id])
  reporterId  Int
}


model Location {
  id         Int           @id @default(autoincrement())
  division   String
  district   String
  fullAddress String?
  latitude   Float?
  longitude  Float?
  reports    CrimeReport[] @relation("LocationReports") // Explicit relation name
}`;

//Media is file
export const createCrimeReportSchema = z.object({
  title: z.string(),
  description: z.string(),
  location: z.object({
    division: z.string(),
    district: z.string(),
    fullAddress: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  media: z.array(
    z.object({
      name: z.string(),
      type: z.string().optional(),
      size: z.number().optional(),
    })
  ),
});
