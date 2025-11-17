/**
 * Booking Sheet Columns
 *
 * This module provides all booking sheet column definitions organized by category.
 * Each column is typed and includes configuration for display, validation, and functions.
 */

// Re-export system injected functions for use in column functions
export {
  auth,
  db,
  storage,
  firebaseUtils,
  functionsUtils,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "@/app/functions/firebase-utils";

// Identifier columns
export * from "./identifier";

// Traveler Information columns
export * from "./traveler-information";

// Tour Details columns
export * from "./tour-details";

// Payment Setting columns
export * from "./payment-setting";

// Full Payment columns
export * from "./full-payment";

// Payment Term columns
export * from "./payment-term-1";
export * from "./payment-term-2";
export * from "./payment-term-3";
export * from "./payment-term-4";

// Reservation Email columns
export * from "./reservation-email";

// Cancellation columns
export * from "./cancellation";

// Group Booking columns
export * from "./duo-or-group-booking";

import { BookingSheetColumn } from "@/types/booking-sheet-column";

// Import all columns from each category
import * as identifier from "./identifier";
import * as travelerInfo from "./traveler-information";
import * as tourDetails from "./tour-details";
import * as paymentSetting from "./payment-setting";
import * as fullPayment from "./full-payment";
import * as paymentTerm1 from "./payment-term-1";
import * as paymentTerm2 from "./payment-term-2";
import * as paymentTerm3 from "./payment-term-3";
import * as paymentTerm4 from "./payment-term-4";
import * as reservationEmail from "./reservation-email";
import * as cancellation from "./cancellation";
import * as groupBooking from "./duo-or-group-booking";

/**
 * Collection of all booking sheet columns grouped by category
 */
export const bookingSheetColumns = {
  identifier: Object.values(identifier),
  travelerInformation: Object.values(travelerInfo),
  tourDetails: Object.values(tourDetails),
  paymentSetting: Object.values(paymentSetting),
  fullPayment: Object.values(fullPayment),
  paymentTerm1: Object.values(paymentTerm1),
  paymentTerm2: Object.values(paymentTerm2),
  paymentTerm3: Object.values(paymentTerm3),
  paymentTerm4: Object.values(paymentTerm4),
  reservationEmail: Object.values(reservationEmail),
  cancellation: Object.values(cancellation),
  groupBooking: Object.values(groupBooking),
};

/**
 * Flattened array of all booking sheet columns sorted by order
 */
export const allBookingSheetColumns: BookingSheetColumn[] = [
  ...bookingSheetColumns.identifier,
  ...bookingSheetColumns.travelerInformation,
  ...bookingSheetColumns.tourDetails,
  ...bookingSheetColumns.paymentSetting,
  ...bookingSheetColumns.fullPayment,
  ...bookingSheetColumns.paymentTerm1,
  ...bookingSheetColumns.paymentTerm2,
  ...bookingSheetColumns.paymentTerm3,
  ...bookingSheetColumns.paymentTerm4,
  ...bookingSheetColumns.reservationEmail,
  ...bookingSheetColumns.cancellation,
  ...bookingSheetColumns.groupBooking,
].sort((a, b) => a.data.order - b.data.order);

/**
 * Map of column ID to column definition for quick lookup
 */
export const bookingSheetColumnsById = new Map<string, BookingSheetColumn>(
  allBookingSheetColumns.map((col) => [col.id, col])
);

/**
 * Get a booking sheet column by its ID
 */
export function getColumnById(id: string): BookingSheetColumn | undefined {
  return bookingSheetColumnsById.get(id);
}

/**
 * Get all columns for a specific parent tab
 */
export function getColumnsByParentTab(parentTab: string): BookingSheetColumn[] {
  return allBookingSheetColumns.filter(
    (col) => col.data.parentTab === parentTab
  );
}

/**
 * Get all columns of a specific data type
 */
export function getColumnsByDataType(dataType: string): BookingSheetColumn[] {
  return allBookingSheetColumns.filter((col) => col.data.dataType === dataType);
}

/**
 * Get all function-type columns
 */
export function getFunctionColumns(): BookingSheetColumn[] {
  return getColumnsByDataType("function");
}

/**
 * Get all columns that should be included in forms
 */
export function getFormColumns(): BookingSheetColumn[] {
  return allBookingSheetColumns.filter((col) => col.data.includeInForms);
}
