import { Timestamp } from "firebase/firestore";

// ============================================================================
// COMMUNICATION TEMPLATE TYPES
// ============================================================================

export interface CommunicationTemplate {
  id: string; // Auto-generated Firestore ID
  name: string;
  subject: string;
  content: string; // HTML content
  variables: string[]; // ["{{traveler_name}}", "{{tour_name}}"]
  variableDefinitions?: VariableDefinition[]; // Variable type definitions with types, array types, map fields
  status: "active" | "draft" | "archived";
  // NEW V2 FIELDS
  bccGroups: string[]; // References to bccGroups
  metadata: CommunicationMetadata;
}

export interface CommunicationMetadata {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // Reference to users
  usedCount: number;
}

// ============================================================================
// EMAIL TYPES
// ============================================================================

export interface SentEmail {
  id: string; // Auto-generated Firestore ID
  bookingId: string; // Reference to bookings
  recipient: string;
  subject: string;
  status: "sent" | "delivered" | "failed";
  opened: boolean;
  openedAt?: Timestamp;
  link: string; // Gmail message link
  metadata: SentEmailMetadata;
}

export interface SentEmailMetadata {
  sentAt: Timestamp;
  sentBy: string; // Reference to users
}

export interface EmailStatus {
  drafted: boolean;
  sent: boolean;
  sentDate?: Timestamp;
  subject: string;
  link?: string;
}

export interface ReminderStatus {
  sent: boolean;
  sentDate: Timestamp;
  method: "email" | "calendar";
}

// ============================================================================
// EMAIL CONFIGURATION TYPES
// ============================================================================

export interface EmailProvider {
  name: "resend" | "sendgrid" | "gmail";
  displayName: string;
  description: string;
  features: string[];
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export type TemplateType =
  | "reservation"
  | "payment-reminder"
  | "cancellation"
  | "adventure-kit";

export type TemplateStatus = "active" | "draft" | "archived";

// Variable definition types for the new template system
export type VariableType = "string" | "number" | "boolean" | "array" | "map";

export interface VariableDefinition {
  id: string;
  name: string;
  type: VariableType;
  description?: string;
  // For arrays
  arrayElementType?: VariableType;
  arrayElementDefinitions?: VariableDefinition[]; // For complex array elements
  // For maps/objects
  mapFields?: { [key: string]: VariableDefinition };
}

export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
}

export interface TemplateFormData {
  type: TemplateType;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  status: TemplateStatus;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface NotificationTemplate {
  id: string;
  type: "email" | "sms" | "push";
  name: string;
  subject?: string;
  content: string;
  variables: string[];
  enabled: boolean;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface EmailFormData {
  to: string;
  subject: string;
  content: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export interface TemplateFormData {
  type: TemplateType;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  status: TemplateStatus;
}

// ============================================================================
// STATUS TYPES
// ============================================================================

export type EmailStatusType =
  | "draft"
  | "sent"
  | "delivered"
  | "failed"
  | "bounced";

export type TemplateStatusType = "active" | "draft" | "archived";

// ============================================================================
// FILTER AND SEARCH TYPES
// ============================================================================

export interface EmailFilters {
  status?: EmailStatusType;
  templateType?: TemplateType;
  dateRange?: {
    start: Date;
    end: Date;
  };
  recipient?: string;
}

export interface TemplateFilters {
  type?: TemplateType;
  status?: TemplateStatusType;
  search?: string;
}

export interface CommunicationSearchParams {
  query: string;
  filters: EmailFilters | TemplateFilters;
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
}
