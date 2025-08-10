import { Timestamp } from "firebase/firestore";

// ============================================================================
// TOUR PACKAGE CORE TYPES
// ============================================================================

export interface TourPackage {
  id: string; // Auto-generated Firestore ID
  name: string;
  slug: string; // URL-friendly ID
  description: string;
  location: string;
  duration: number; // Days
  pricing: TourPricing;
  details: TourDetails;
  media: TourMedia;
  status: "active" | "draft" | "archived";
  // NEW V2 FIELDS
  pricingHistory: PricingHistoryEntry[];
  metadata: TourMetadata;
}

// ============================================================================
// TOUR DETAILS TYPES
// ============================================================================

export interface TourPricing {
  original: number;
  discounted?: number;
  deposit: number;
  currency: "USD" | "EUR" | "GBP";
}

export interface PricingHistoryEntry {
  date: Timestamp;
  price: number;
  changedBy: string;
}

export interface TourDetails {
  highlights: string[];
  itinerary: TourItinerary[];
  requirements: string[];
}

export interface TourItinerary {
  day: number;
  title: string;
  description: string;
}

export interface TourMedia {
  coverImage: string; // Storage path
  gallery: string[]; // Storage paths
}

export interface TourMetadata {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // Reference to users
  bookingsCount: number;
}

// ============================================================================
// TOUR STATISTICS TYPES
// ============================================================================

export interface TourStatistics {
  id: string; // "2025-06"
  bookings: number;
  revenue: number;
  cancellations: number;
  avgBookingValue: number;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface TourPackageFormData {
  name: string;
  slug: string;
  description: string;
  location: string;
  duration: number;
  pricing: {
    original: number;
    discounted?: number;
    deposit: number;
    currency: "USD" | "EUR" | "GBP";
  };
  details: {
    highlights: string[];
    itinerary: TourItinerary[];
    requirements: string[];
  };
  media?: {
    coverImage?: string;
    gallery?: string[];
  };
  status: "active" | "draft" | "archived";
  // Note: pricingHistory is managed automatically by the system
}

// ============================================================================
// TOUR STATUS TYPES
// ============================================================================

export type TourStatus = "active" | "draft" | "archived";

export type TourDuration = "1-3 days" | "4-7 days" | "8-14 days" | "15+ days";

export type TourLocation =
  | "Ecuador"
  | "Galapagos"
  | "Amazon"
  | "Andes"
  | "Coast"
  | "Other";

// ============================================================================
// FILTER AND SEARCH TYPES
// ============================================================================

export interface TourFilters {
  status?: TourStatus;
  location?: TourLocation;
  duration?: TourDuration;
  priceRange?: {
    min: number;
    max: number;
  };
  search?: string;
}

export interface TourSearchParams {
  query: string;
  filters: TourFilters;
  sortBy: "name" | "price" | "duration" | "bookings" | "createdAt";
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
}
