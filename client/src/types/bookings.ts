import { Timestamp } from "firebase/firestore";
import type { EmailStatus, ReminderStatus } from "./communications";

// ============================================================================
// BOOKING CORE TYPES
// ============================================================================

export interface Booking {
  id: string; // Auto-generated Firestore ID
  bookingId: string; // TR-EC-20250712-JD-01 format
  traveler: Traveler;
  tour: TourBooking;
  reservation: Reservation;
  payment: Payment;
  group?: GroupBooking;
  schedule: PaymentScheduleMap;
  communications: BookingCommunications;
  metadata: BookingMetadata;
}

export interface Traveler {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface TourBooking {
  packageId: string; // Reference to tourPackages
  name: string;
  date: Timestamp;
  returnDate: Timestamp;
  duration: number; // Days
}

export interface Reservation {
  date: Timestamp;
  source: "Webform" | "Manual" | "Partner";
  bookingType: "single" | "duo" | "group";
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export interface Payment {
  condition: "Invalid" | "Last Minute" | "Standard";
  terms: "Invalid" | "Full" | "P1" | "P2" | "P3" | "P4" | "Cancelled";
  plan: "Full" | "P1" | "P2" | "P3" | "P4";
  method?: "stripe" | "revolut" | "bank";
  originalCost: number;
  discountedCost?: number;
  reservationFee: number;
  paid: number;
  remainingBalance: number;
  enableReminders: boolean;
  cancellationReason?:
    | "Tour Date too close"
    | "Fully booked"
    | "Tour Date Cancelled";
}

export interface PaymentSchedule {
  amount: number;
  dueDate: Timestamp;
  scheduledReminder: Timestamp;
  calendarEventId?: string;
  paid: boolean;
  paidDate?: Timestamp;
}

export interface PaymentScheduleMap {
  full?: PaymentSchedule;
  P1?: PaymentSchedule;
  P2?: PaymentSchedule;
  P3?: PaymentSchedule;
  P4?: PaymentSchedule;
}

export type PaymentPlan = "Full" | "P1" | "P2" | "P3" | "P4";

export interface PaymentCalculationResult {
  originalCost: number;
  discountedCost: number;
  reservationFee: number;
  remainingBalance: number;
  schedule: PaymentScheduleMap;
}

// ============================================================================
// GROUP BOOKING TYPES
// ============================================================================

export interface GroupBooking {
  id?: string; // DB-JD-5837-001 format
  isMainBooker: boolean;
  members: string[]; // References to other bookings
}

// ============================================================================
// COMMUNICATIONS TYPES
// ============================================================================

export interface BookingCommunications {
  reservation: EmailStatus;
  cancellation?: EmailStatus;
  adventureKit?: EmailStatus;
  reminders: {
    P1?: ReminderStatus;
    P2?: ReminderStatus;
    P3?: ReminderStatus;
    P4?: ReminderStatus;
  };
}

// ============================================================================
// METADATA TYPES
// ============================================================================

export interface BookingMetadata {
  createdBy: string; // Reference to users
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActivity: Timestamp;
}

// ============================================================================
// ACTIVITY LOG TYPES
// ============================================================================

export interface BookingActivity {
  id: string; // Auto-generated
  action:
    | "created"
    | "updated"
    | "payment-received"
    | "email-sent"
    | "cancelled";
  field?: string; // For updates
  oldValue?: unknown;
  newValue?: unknown;
  performedBy: string; // Reference to users
  timestamp: Timestamp;
  notes?: string;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface BookingFormData {
  traveler: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  tour: {
    packageId: string;
    date: string;
    returnDate: string;
  };
  reservation: {
    source: "Webform" | "Manual" | "Partner";
    bookingType: "single" | "duo" | "group";
  };
  payment: {
    condition: "Invalid" | "Last Minute" | "Standard";
    terms: "Invalid" | "Full" | "P1" | "P2" | "P3" | "P4" | "Cancelled";
    plan: "Full" | "P1" | "P2" | "P3" | "P4";
    enableReminders: boolean;
  };
}

// ============================================================================
// STATUS TYPES
// ============================================================================

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "paid"
  | "cancelled"
  | "completed";

export type PaymentStatus =
  | "pending"
  | "partial"
  | "paid"
  | "overdue"
  | "cancelled";

// ============================================================================
// FILTER AND SEARCH TYPES
// ============================================================================

export interface BookingFilters {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tourPackage?: string;
  traveler?: string;
}

export interface SearchParams {
  query: string;
  filters: BookingFilters;
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
}
