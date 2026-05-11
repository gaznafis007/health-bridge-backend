import { Prisma } from '@prisma/client';

export interface BookingItemInput {
  testId?: string;
  packageId?: string;
}

export interface ResolvedBookingItem {
  testId?: string;
  packageId?: string;
  price: Prisma.Decimal;
}

/** Minimal shape of a multer-uploaded file used by the lab report upload endpoint. */
export interface LabReportFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface LabReportPublic {
  reportUrl: string;
  reportFileName: string;
}

export interface AdminReportRow {
  id: string;
  reportFileName: string;
  reportUrl: string;
  reportToken: string;
  reportStatus: string;
  deliveredAt: Date | null;
  createdAt: Date;
  bookingId: string;
  bookingStatus: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  centerName: string;
  testName: string | null;
}

export interface PatientReportRow {
  id: string;
  reportFileName: string;
  reportToken: string;
  reportStatus: string;
  deliveredAt: Date | null;
  createdAt: Date;
  bookingId: string;
  centerName: string;
  testName: string | null;
}
