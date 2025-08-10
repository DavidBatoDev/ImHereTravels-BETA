import { Timestamp } from "firebase/firestore";

// ============================================================================
// CONTACT/CRM TYPES
// ============================================================================

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: ContactType;
  status: ContactStatus;
  source: ContactSource;
  notes: string;
  bookings: string[]; // Booking references
  tags: string[];
  customFields: Record<string, any>;
  metadata: ContactMetadata;
}

export type ContactType = "lead" | "customer" | "partner" | "vendor";

export type ContactStatus = 
  | "new" 
  | "contacted" 
  | "qualified" 
  | "converted" 
  | "lost"
  | "inactive";

export type ContactSource = 
  | "webform" 
  | "referral" 
  | "event" 
  | "social" 
  | "email"
  | "phone"
  | "walk-in"
  | "partner";

export interface ContactMetadata {
  createdAt: Timestamp;
  lastContacted?: Timestamp;
  assignedTo?: string; // Reference to users
  updatedAt: Timestamp;
  updatedBy?: string; // Reference to users
}

// ============================================================================
// CONTACT INTERACTION TYPES
// ============================================================================

export interface ContactInteraction {
  id: string;
  contactId: string;
  type: InteractionType;
  subject: string;
  content: string;
  outcome?: string;
  nextFollowUp?: Timestamp;
  metadata: InteractionMetadata;
}

export type InteractionType = 
  | "email"
  | "phone"
  | "meeting"
  | "note"
  | "booking"
  | "payment"
  | "complaint"
  | "feedback";

export interface InteractionMetadata {
  createdAt: Timestamp;
  createdBy: string; // Reference to users
  duration?: number; // In minutes for calls/meetings
  attachments?: string[]; // File references
}

// ============================================================================
// CONTACT FORM TYPES
// ============================================================================

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  type: ContactType;
  source: ContactSource;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface ContactInteractionFormData {
  type: InteractionType;
  subject: string;
  content: string;
  outcome?: string;
  nextFollowUp?: string; // ISO date string
  duration?: number;
}

// ============================================================================
// CRM ANALYTICS TYPES
// ============================================================================

export interface ContactAnalytics {
  totalContacts: number;
  newThisMonth: number;
  conversionRate: number;
  averageTimeToConversion: number; // In days
  topSources: Array<{
    source: ContactSource;
    count: number;
    conversionRate: number;
  }>;
  statusDistribution: Array<{
    status: ContactStatus;
    count: number;
    percentage: number;
  }>;
}

export interface ContactLifecycleMetrics {
  leadToQualified: number; // Average days
  qualifiedToCustomer: number; // Average days
  totalLifecycleValue: number; // Average revenue per customer
  retentionRate: number; // Percentage
}

// ============================================================================
// CONTACT SEARCH AND FILTER TYPES
// ============================================================================

export interface ContactFilters {
  type?: ContactType;
  status?: ContactStatus;
  source?: ContactSource;
  tags?: string[];
  assignedTo?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasBookings?: boolean;
  lastContactedRange?: {
    start: Date;
    end: Date;
  };
}

export interface ContactSearchParams {
  query: string;
  filters: ContactFilters;
  sortBy: "name" | "email" | "createdAt" | "lastContacted" | "status";
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
}

// ============================================================================
// CONTACT IMPORT/EXPORT TYPES
// ============================================================================

export interface ContactImportData {
  name: string;
  email: string;
  phone?: string;
  type?: ContactType;
  source?: ContactSource;
  notes?: string;
  tags?: string;
  customFields?: Record<string, string>;
}

export interface ContactExportData extends Contact {
  bookingCount: number;
  totalRevenue: number;
  lastBookingDate?: string;
  assignedToName?: string;
}
