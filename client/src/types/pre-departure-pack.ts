import { Timestamp } from "firebase/firestore";

/**
 * Pre-departure Pack Interface
 * Represents a document in the preDeparturePack collection
 */
export interface PreDeparturePack {
  id: string;
  tourPackages: TourPackageAssignment[];
  fileName: string;
  originalName: string;
  fileDownloadURL: string;
  contentType: string; // pdf | docx | image/webp etc.
  storagePath: string;
  size: number; // in bytes
  uploadedAt: Timestamp;
  uploadedBy: string; // users.id
  metadata?: {
    description?: string;
    version?: string;
    tags?: string[];
    [key: string]: any;
  };
}

/**
 * Tour Package Assignment for Pre-departure Pack
 */
export interface TourPackageAssignment {
  tourPackageId: string;
  tourPackageName: string;
}

/**
 * Confirmed Booking Interface
 * Represents a document in the confirmedBookings collection
 */
export interface ConfirmedBooking {
  id: string;
  bookingDocumentId: string; // Reference to bookings collection document id
  bookingId: string; // The booking.bookingId field
  tourPackageName: string;
  tourDate: Timestamp;
  preDeparturePackId: string | null; // Reference to preDeparturePack collection
  preDeparturePackName: string | null; // The pack's fileName
  status: "created" | "sent";
  createdAt: Timestamp;
  sentEmailLink?: string; // https://mail.google.com/mail/u/0/#sent/<messageId>
  sentAt?: Timestamp;
  lastModified: Timestamp;
  tags?: string[];
  bookingReference: string; // IMT-{tourDate:yyyy-MM-dd}-{tourCode}-{counter:0000}
}

/**
 * Pre-departure Configuration
 * Document at config/pre-departure
 */
export interface PreDepartureConfig {
  automaticSends: boolean;
  lastUpdated?: Timestamp;
  updatedBy?: string;
}

/**
 * Form data for creating a pre-departure pack
 */
export interface PreDeparturePackFormData {
  tourPackages: TourPackageAssignment[];
  file: File;
  metadata?: {
    description?: string;
    version?: string;
    tags?: string[];
  };
}

/**
 * Form data for updating confirmed booking status
 */
export interface ConfirmedBookingUpdateData {
  status: "created" | "sent";
  sentEmailLink?: string;
  sentAt?: Date;
}
