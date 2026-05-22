import { Timestamp } from "firebase/firestore";
import {
  TravelDate,
  TourPricing,
  TourDetails,
  TourMedia,
  TourItinerary,
} from "./tours";

// ============================================================================
// HOSTED TOUR CORE TYPE
// ============================================================================

export interface HostedTour {
  id: string;

  // Parent tour reference
  parentTourId: string;
  parentTourName: string;

  // Copied/editable fields (same as TourPackage)
  name: string;
  slug: string;
  url?: string;
  tourCode: string;
  description: string;
  location: string;
  duration: string;
  travelDates: TravelDate[];
  pricing: TourPricing;
  details: TourDetails;
  media: TourMedia;
  status: "active" | "draft" | "archived";
  brochureLink?: string;
  stripePaymentLink?: string;
  preDeparturePack?: string;

  // Hosted-tour-specific fields
  isLocked: boolean;
  lastSyncedAt?: Timestamp;
  lastSyncedVersion?: number;

  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
  };
}

// ============================================================================
// FORM TYPE
// ============================================================================

export interface HostedTourFormData {
  name: string;
  slug: string;
  url?: string;
  tourCode: string;
  description: string;
  location: string;
  duration: string;
  travelDates: {
    startDate: string;
    endDate: string;
    tourDays?: number;
    isAvailable: boolean;
    maxCapacity?: number | null;
    currentBookings?: number | null;
    customOriginal?: number | null;
    customDiscounted?: number | null;
    customDeposit?: number | null;
    hasCustomOriginal?: boolean;
    hasCustomDiscounted?: boolean;
    hasCustomDeposit?: boolean;
  }[];
  pricing: {
    original: number;
    discounted?: number | null;
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
// CHANGE LOG (for parent → hosted tour sync diff)
// ============================================================================

export interface ChangeLogEntry {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
  /**
   * Optional explicit sync target used by UI/API when this change entry maps
   * to a concrete syncable field (for example, synthetic diff rows).
   */
  syncField?: SyncableField;
}

// ============================================================================
// SYNC FIELD MAPPING
// ============================================================================

export const SYNCABLE_FIELDS = [
  "description",
  "location",
  "duration",
  "pricing.original",
  "pricing.discounted",
  "pricing.deposit",
  "pricing.currency",
  "travelDates",
  "details.highlights",
  "details.itinerary",
  "details.requirements",
  "media.coverImage",
  "media.gallery",
  "brochureLink",
  "stripePaymentLink",
  "preDeparturePack",
  "url",
] as const;

export type SyncableField = (typeof SYNCABLE_FIELDS)[number];

export const CHANGE_FIELD_TO_SYNC_FIELD: Record<string, SyncableField | null> = {
  // Identity fields are intentionally not synced to hosted tours.
  name: null,
  slug: null,
  tourCode: null,

  description: "description",
  location: "location",
  duration: "duration",
  "pricing.original": "pricing.original",
  "pricing.discounted": "pricing.discounted",
  "pricing.deposit": "pricing.deposit",
  "pricing.currency": "pricing.currency",
  travelDates: "travelDates",
  "travelDates.missingInHosted": "travelDates",
  "details.highlights": "details.highlights",
  "details.itinerary": "details.itinerary",
  "details.requirements": "details.requirements",
  brochureLink: "brochureLink",
  stripePaymentLink: "stripePaymentLink",
  preDeparturePack: "preDeparturePack",
  "media.coverImage": "media.coverImage",
  "media.gallery": "media.gallery",
  url: "url",
};

export function getSyncFieldForChange(
  change: ChangeLogEntry,
): SyncableField | null {
  if (change.syncField) return change.syncField;
  return CHANGE_FIELD_TO_SYNC_FIELD[change.field] ?? null;
}

export function getSyncableFieldsFromChanges(
  changes: ChangeLogEntry[],
): SyncableField[] {
  const fields = new Set<SyncableField>();
  changes.forEach((change) => {
    const syncField = getSyncFieldForChange(change);
    if (syncField) fields.add(syncField);
  });
  return Array.from(fields);
}

// ============================================================================
// CREATE PAYLOAD
// ============================================================================

export interface CreateHostedTourPayload {
  parentTourId: string;
  name: string;
  slug: string;
  tourCode: string;
  url: string;
}

// ============================================================================
// SYNC RESULT
// ============================================================================

export interface SyncResult {
  synced: string[];
  skipped: string[];
  errors: string[];
}
