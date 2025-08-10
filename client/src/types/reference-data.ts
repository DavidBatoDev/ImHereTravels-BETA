import { Timestamp } from "firebase/firestore";

// ============================================================================
// REFERENCE DATA TYPES
// ============================================================================

export interface ReferenceData {
  id: string;
  type: ReferenceDataType;
  values: ReferenceDataValue[];
  metadata: ReferenceDataMetadata;
}

export type ReferenceDataType =
  | "bookingStatus"
  | "customerType"
  | "cancellationReason"
  | "customerStatus"
  | "paymentTerms"
  | "bookingSource"
  | "tourLocation"
  | "tourDifficulty";

export interface ReferenceDataValue {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder?: number;
  color?: string; // For UI display
  icon?: string; // Icon identifier
}

export interface ReferenceDataMetadata {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string; // Reference to users
}

// ============================================================================
// REFERENCE DATA FORM TYPES
// ============================================================================

export interface ReferenceDataFormData {
  type: ReferenceDataType;
  values: Omit<ReferenceDataValue, 'id'>[];
}

export interface ReferenceDataValueFormData {
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder?: number;
  color?: string;
  icon?: string;
}

// ============================================================================
// HELPER TYPES FOR SPECIFIC REFERENCE DATA
// ============================================================================

export interface BookingStatusValue extends ReferenceDataValue {
  canTransitionTo?: string[]; // IDs of statuses this can transition to
  requiresPayment?: boolean;
  isFinal?: boolean; // Cannot transition from this status
}

export interface CustomerTypeValue extends ReferenceDataValue {
  discountPercentage?: number;
  priority?: number; // For customer service prioritization
}

export interface PaymentTermsValue extends ReferenceDataValue {
  conditions: string[]; // Conditions when this term is applicable
  term: string; // The actual term code (P1, P2, etc.)
}

// ============================================================================
// REFERENCE DATA SEARCH AND FILTER TYPES
// ============================================================================

export interface ReferenceDataFilters {
  type?: ReferenceDataType;
  isActive?: boolean;
  search?: string;
}

export interface ReferenceDataSearchParams {
  query: string;
  filters: ReferenceDataFilters;
  sortBy: "name" | "sortOrder" | "createdAt";
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
}
