import { Timestamp } from "firebase/firestore";

// ============================================================================
// TOUR PACKAGE CORE TYPES
// ============================================================================

export interface TourPackage {
  id: string; // Auto-generated Firestore ID
  name: string;
  slug: string; // URL-friendly ID
  url?: string; // Direct URL to tour page
  tourCode: string; // Tour code (e.g., SIA, PHS, PSS)
  description: string;
  location: string;
  duration: string; // Duration in format "X days"
  travelDates: TravelDate[]; // Available travel dates
  pricing: TourPricing;
  details: TourDetails;
  media: TourMedia;
  status: "active" | "draft" | "archived";
  // NEW V2 FIELDS
  pricingHistory: PricingHistoryEntry[];
  metadata: TourMetadata;
  // ADDITIONAL FIELDS FROM TABLE
  brochureLink?: string; // Google Drive or other brochure link
  stripePaymentLink?: string; // Stripe payment link
  preDeparturePack?: string; // Pre-departure pack link
}

// ============================================================================
// TRAVEL DATES TYPES
// ============================================================================

export interface TravelDate {
  startDate: Timestamp;
  endDate: Timestamp;
  isAvailable: boolean;
  maxCapacity?: number;
  currentBookings?: number;
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
  url?: string;
  tourCode: string;
  description: string;
  location: string;
  duration: string; // Duration in format "X days"
  travelDates: TravelDate[];
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
  brochureLink?: string;
  stripePaymentLink?: string;
  preDeparturePack?: string;
  // Note: pricingHistory is managed automatically by the system
}

// Form data with string dates (what the form actually sends)
export interface TourFormDataWithStringDates {
  name: string;
  slug: string;
  url?: string;
  tourCode: string;
  description: string;
  location: string;
  duration: string; // Duration as a string like "11 days"
  travelDates: {
    startDate: string;
    endDate: string;
    isAvailable: boolean;
    maxCapacity?: number;
    currentBookings?: number;
  }[];
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
  brochureLink?: string;
  stripePaymentLink?: string;
  preDeparturePack?: string;
}

// ============================================================================
// TOUR STATUS TYPES
// ============================================================================

export type TourStatus = "active" | "draft" | "archived";

export type TourDuration = "1-3 days" | "4-7 days" | "8-14 days" | "15+ days";

// Tour codes from the table
export type TourCode =
  | "SIA" // Siargao Island Adventure
  | "PHS" // Philippine Sunrise
  | "PSS" // Philippine Sunset
  | "MLB" // Maldives Bucketlist
  | "SLW" // Sri Lanka Wander Tour
  | "ARW" // Argentina's Wonders
  | "BZT" // Brazil's Treasures
  | "VNE" // Vietnam Expedition
  | "IDD" // India Discovery Tour
  | "IHF" // India Holi Festival Tour
  | "TXP" // Tanzania Exploration
  | "NZE"; // New Zealand Expedition

export type TourLocation =
  | "Ecuador"
  | "Galapagos"
  | "Amazon"
  | "Andes"
  | "Coast"
  | "Philippines"
  | "Maldives"
  | "Sri Lanka"
  | "Argentina"
  | "Brazil"
  | "Vietnam"
  | "India"
  | "Tanzania"
  | "New Zealand"
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

// ============================================================================
// TOUR SUMMARY TYPES (FOR TABLE DISPLAY)
// ============================================================================

export interface TourSummary {
  id: string;
  name: string;
  url?: string;
  brochureLink?: string;
  destinations: string;
  tourCode: string;
  duration: string;
  travelDates: string;
  tripDescription: string;
  tripHighlights: string;
  itinerarySummary: string;
  stripePaymentLink?: string;
  preDeparturePack?: string;
  originalCost: number;
  discountedCost?: number;
  reservationFee: number;
  currency: string;
  status: TourStatus;
}

// ============================================================================
// TOUR PACKAGE CREATION/UPDATE TYPES
// ============================================================================

export interface CreateTourPackageData {
  name: string;
  tourCode: string;
  description: string;
  destinations: string[];
  duration: string; // Duration in format "X days"
  travelDates: TravelDate[];
  highlights: string[];
  itinerary: TourItinerary[];
  pricing: {
    original: number;
    discounted?: number;
    deposit: number;
    currency: "USD" | "EUR" | "GBP";
  };
  brochureLink?: string;
  stripePaymentLink?: string;
  preDeparturePack?: string;
  coverImage?: string;
  gallery?: string[];
}

export interface UpdateTourPackageData extends Partial<CreateTourPackageData> {
  id: string;
  updatedAt: Timestamp;
  updatedBy: string;
}
