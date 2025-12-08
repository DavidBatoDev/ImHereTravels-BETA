/**
 * Guest Booking Utilities
 *
 * Helper functions for managing guest bookings in group/duo reservations.
 * These utilities handle:
 * - Invitation validation (expiration, cancellation, duplicate checks)
 * - Guest booking creation and data management
 * - Parent booking lookups and inheritance
 */

import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GuestInvitation {
  email: string;
  invitedAt: Timestamp;
  expiresAt: Timestamp;
  status: "pending" | "accepted" | "expired";
}

export interface ParentBookingData {
  id: string;
  bookingType: string;
  tourPackageId: string;
  tourName: string;
  tourDate: Timestamp | string;
  tourImage?: string;
  groupSize: number;
  groupId: string;
  paymentPlan: string;
  paymentMethod: string;
  stripePaymentId: string;
  guestInvitations?: GuestInvitation[];
  // Pricing data
  basePriceAdult?: number;
  discountEvent?: string;
  discountRate?: number;
  depositAmount?: number;
  p1Amount?: number;
  p1DueDate?: Timestamp | string;
  p2Amount?: number;
  p2DueDate?: Timestamp | string;
  p3Amount?: number;
  p3DueDate?: Timestamp | string;
  p4Amount?: number;
  p4DueDate?: Timestamp | string;
}

export interface InvitationValidationResult {
  isValid: boolean;
  error?: string;
  parentBooking?: ParentBookingData;
  invitation?: GuestInvitation;
}

// ============================================================================
// INVITATION VALIDATION
// ============================================================================

/**
 * Validate a guest invitation link
 * Checks for:
 * - Valid parent booking exists
 * - Invitation exists for the given email
 * - Invitation hasn't expired (7 days)
 * - Booking hasn't been cancelled
 * - Guest hasn't already booked
 */
export async function validateGuestInvitation(
  parentBookingId: string,
  guestEmail: string
): Promise<InvitationValidationResult> {
  try {
    // 1. Fetch parent booking from stripePayments collection
    const parentDocRef = doc(db, "stripePayments", parentBookingId);
    const parentDocSnap = await getDoc(parentDocRef);

    if (!parentDocSnap.exists()) {
      return {
        isValid: false,
        error: "Invalid invitation link. The booking was not found.",
      };
    }

    const rawData = parentDocSnap.data() as any;

    // Map the nested payment document structure to ParentBookingData
    const parentData: ParentBookingData = {
      id: parentDocSnap.id,
      bookingType: rawData.booking?.type || "",
      tourPackageId: rawData.tour?.packageId || "",
      tourName: rawData.tour?.packageName || "",
      tourDate: rawData.tour?.date || "",
      groupSize: rawData.booking?.groupSize || 1,
      groupId: rawData.booking?.groupCode || "",
      paymentPlan: rawData.booking?.paymentPlan || "",
      paymentMethod: rawData.payment?.method || "stripe",
      stripePaymentId: rawData.id || parentDocSnap.id,
      guestInvitations: rawData.guestInvitations || [],
      // Pricing data from booking document (will be fetched separately if needed)
      basePriceAdult: rawData.booking?.basePriceAdult,
      discountEvent: rawData.booking?.discountEvent,
      discountRate: rawData.booking?.discountRate,
      depositAmount: rawData.booking?.depositAmount,
      p1Amount: rawData.booking?.p1Amount,
      p1DueDate: rawData.booking?.p1DueDate,
      p2Amount: rawData.booking?.p2Amount,
      p2DueDate: rawData.booking?.p2DueDate,
      p3Amount: rawData.booking?.p3Amount,
      p3DueDate: rawData.booking?.p3DueDate,
      p4Amount: rawData.booking?.p4Amount,
      p4DueDate: rawData.booking?.p4DueDate,
    };

    // 2. Check if booking was cancelled
    if (parentData.bookingType === "Cancelled") {
      return {
        isValid: false,
        error:
          "This booking has been cancelled. Guest reservations are no longer available.",
      };
    }

    // 3. Check if invitation exists for this email
    const guestInvitations = parentData.guestInvitations || [];
    const invitation = guestInvitations.find(
      (inv) => inv.email.toLowerCase() === guestEmail.toLowerCase()
    );

    if (!invitation) {
      return {
        isValid: false,
        error: "No invitation found for this email address.",
      };
    }

    // 4. Check if invitation has expired (7 days from invitedAt)
    const now = new Date();
    const expiresAt = invitation.expiresAt.toDate();

    if (now > expiresAt) {
      return {
        isValid: false,
        error:
          "This invitation has expired. Please contact the main booker for a new invitation.",
      };
    }

    // 5. Check if guest has already accepted (made a booking)
    if (invitation.status === "accepted") {
      return {
        isValid: false,
        error: "You have already completed your reservation for this booking.",
      };
    }

    // All checks passed
    return {
      isValid: true,
      parentBooking: parentData,
      invitation,
    };
  } catch (error) {
    console.error("Error validating guest invitation:", error);
    return {
      isValid: false,
      error:
        "An error occurred while validating your invitation. Please try again.",
    };
  }
}

/**
 * Check if a guest has already made a booking for this group
 * Prevents duplicate guest bookings
 */
export async function checkDuplicateGuestBooking(
  groupId: string,
  guestEmail: string
): Promise<boolean> {
  try {
    const bookingsRef = collection(db, "bookings");
    const q = query(
      bookingsRef,
      where("groupId", "==", groupId),
      where("email", "==", guestEmail.toLowerCase())
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // Returns true if duplicate exists
  } catch (error) {
    console.error("Error checking duplicate guest booking:", error);
    return false; // Assume no duplicate on error (fail open)
  }
}

/**
 * Get parent booking data by ID
 * Used for inheriting payment plan and pricing information
 */
export async function getParentBookingData(
  parentBookingId: string
): Promise<ParentBookingData | null> {
  try {
    const parentDocRef = doc(db, "stripePayments", parentBookingId);
    const parentDocSnap = await getDoc(parentDocRef);

    if (!parentDocSnap.exists()) {
      return null;
    }

    const rawData = parentDocSnap.data() as any;

    // Map the nested payment document structure to ParentBookingData
    const parentData: ParentBookingData = {
      id: parentDocSnap.id,
      bookingType: rawData.booking?.type || "",
      tourPackageId: rawData.tour?.packageId || "",
      tourName: rawData.tour?.packageName || "",
      tourDate: rawData.tour?.date || "",
      groupSize: rawData.booking?.groupSize || 1,
      groupId: rawData.booking?.groupCode || "",
      paymentPlan: rawData.booking?.paymentPlan || "",
      paymentMethod: rawData.payment?.method || "stripe",
      stripePaymentId: rawData.id || parentDocSnap.id,
      guestInvitations: rawData.guestInvitations || [],
      // Pricing data from booking document (will be fetched separately if needed)
      basePriceAdult: rawData.booking?.basePriceAdult,
      discountEvent: rawData.booking?.discountEvent,
      discountRate: rawData.booking?.discountRate,
      depositAmount: rawData.booking?.depositAmount,
      p1Amount: rawData.booking?.p1Amount,
      p1DueDate: rawData.booking?.p1DueDate,
      p2Amount: rawData.booking?.p2Amount,
      p2DueDate: rawData.booking?.p2DueDate,
      p3Amount: rawData.booking?.p3Amount,
      p3DueDate: rawData.booking?.p3DueDate,
      p4Amount: rawData.booking?.p4Amount,
      p4DueDate: rawData.booking?.p4DueDate,
    };

    return parentData;
  } catch (error) {
    console.error("Error fetching parent booking:", error);
    return null;
  }
}

// ============================================================================
// GUEST BOOKING DATA HELPERS
// ============================================================================

/**
 * Create guest booking data object inheriting from parent booking
 * This ensures consistency in payment plans and pricing across the group
 */
export interface CreateGuestBookingParams {
  parentBooking: ParentBookingData;
  guestEmail: string;
  guestFirstName: string;
  guestLastName: string;
  guestBirthdate: Date;
  guestNationality: string;
  guestPhone: string;
  guestDietaryRestrictions?: string;
}

export function createGuestBookingData(params: CreateGuestBookingParams) {
  const {
    parentBooking,
    guestEmail,
    guestFirstName,
    guestLastName,
    guestBirthdate,
    guestNationality,
    guestPhone,
    guestDietaryRestrictions,
  } = params;

  return {
    // Guest personal information
    email: guestEmail.toLowerCase(),
    firstName: guestFirstName,
    lastName: guestLastName,
    birthdate: Timestamp.fromDate(guestBirthdate),
    nationality: guestNationality,
    phoneNumber: guestPhone,
    dietaryRestrictions: guestDietaryRestrictions || "",

    // Inherited from parent booking
    tourPackageId: parentBooking.tourPackageId,
    tourName: parentBooking.tourName,
    tourDate: parentBooking.tourDate,
    bookingType: parentBooking.bookingType, // "Duo Booking" or "Group Booking"
    groupSize: parentBooking.groupSize,
    groupId: parentBooking.groupId,

    // Payment information (inherited from parent)
    paymentPlan: parentBooking.paymentPlan,
    paymentMethod: parentBooking.paymentMethod,
    basePriceAdult: parentBooking.basePriceAdult || 0,
    discountEvent: parentBooking.discountEvent || "",
    discountRate: parentBooking.discountRate || 0,
    depositAmount: parentBooking.depositAmount || 0,

    // Payment terms (inherited)
    p1Amount: parentBooking.p1Amount || 0,
    p1DueDate: parentBooking.p1DueDate || "",
    p2Amount: parentBooking.p2Amount || 0,
    p2DueDate: parentBooking.p2DueDate || "",
    p3Amount: parentBooking.p3Amount || 0,
    p3DueDate: parentBooking.p3DueDate || "",
    p4Amount: parentBooking.p4Amount || 0,
    p4DueDate: parentBooking.p4DueDate || "",

    // Guest-specific fields
    isMainBooker: false,
    parentBookingId: parentBooking.id,

    // Metadata
    createdAt: Timestamp.now(),
    lastModified: Timestamp.now(),
  };
}

/**
 * Format expiration date for display
 */
export function formatExpirationDate(expiresAt: Timestamp): string {
  const date = expiresAt.toDate();
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calculate days remaining until expiration
 */
export function getDaysUntilExpiration(expiresAt: Timestamp): number {
  const now = new Date();
  const expiration = expiresAt.toDate();
  const diffMs = expiration.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
