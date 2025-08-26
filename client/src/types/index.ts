// Core Firestore Types
import { Timestamp } from "firebase/firestore";

// ============================================================================
// COMMON UTILITY TYPES
// ============================================================================

export type CollectionName =
  | "bookings"
  | "tourPackages"
  | "users"
  | "communications"
  | "settings"
  | "referenceData"
  | "contacts"
  | "flightInfo"
  | "paymentTerms";

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardStats {
  totalBookings: number;
  totalRevenue: number;
  pendingPayments: number;
  activeTours: number;
  recentBookings: unknown[];
  upcomingPayments: unknown[];
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}

// ============================================================================
// FILE UPLOAD TYPES
// ============================================================================

export interface UploadResult {
  success: boolean;
  data?: {
    publicUrl: string;
    path: string;
  };
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadOptions {
  bucket: string;
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
  generateUniqueName?: boolean;
  onProgress?: (progress: UploadProgress) => void;
}

export interface ImageConversionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 for JPEG
  format?: "jpeg" | "png" | "webp";
  maintainAspectRatio?: boolean;
}

export interface BlobUploadResult {
  allSuccessful: boolean;
  coverResult?: {
    success: boolean;
    url?: string;
    error?: string;
  };
  galleryResults: Array<{
    success: boolean;
    url?: string;
    error?: string;
    fileName: string;
  }>;
}

// Monaco Editor Types
declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}
