import { BookingSheetColumn } from "@/types/booking-sheet-column";

/**
 * Global Column Order Configuration
 *
 * Single source of truth for all booking sheet column orders.
 * This makes it easier to manage, reorder, and visualize column positions
 * without editing individual column files.
 *
 * To reorder columns:
 * 1. Adjust the order numbers below
 * 2. Save the file
 * 3. The changes will be reflected immediately
 */

/**
 * Column order mapping
 * Maps column ID to its display order number
 */
export const COLUMN_ORDERS: Record<string, number> = {
  // ============================================================================
  // IDENTIFIER (1-6, 85)
  // ============================================================================
  bookingId: 1,
  bookingCode: 2,
  tourCode: 3,
  travellerInitials: 4,
  tourPackageNameUniqueCounter: 5,
  formattedDate: 6,
  delete: 85, // Delete column at the end

  // ============================================================================
  // TRAVELER INFORMATION (7-10)
  // ============================================================================
  emailAddress: 7,
  firstName: 8,
  lastName: 9,
  fullName: 10, // Computed from first + last

  // ============================================================================
  // DISCOUNTS (9-10) - Note: overlaps with traveler info in original
  // ============================================================================
  eventName: 9,
  discountRate: 10,

  // ============================================================================
  // TOUR DETAILS (12-21)
  // ============================================================================
  reservationDate: 12,
  bookingType: 13,
  tourPackageName: 14,
  tourDate: 15,
  returnDate: 16,
  tourDuration: 18,
  paymentCondition: 18, // Note: duplicate order with tourDuration
  eligible2ndOfMonths: 20,
  availablePaymentTerms: 21,
  daysBetweenBookingAndTourDate: 21, // Note: duplicate order

  // ============================================================================
  // DUO OR GROUP BOOKING (22-24)
  // ============================================================================
  isMainBooker: 22,
  groupIdGroupIdGenerator: 23,
  groupId: 24,

  // ============================================================================
  // RESERVATION EMAIL (25-32)
  // ============================================================================
  includeBccReservation: 25,
  useDiscountedTourCost: 26,
  generateEmailDraft: 27,
  emailDraftLink: 28,
  subjectLineReservation: 29,
  sendEmail: 30,
  sentEmailLink: 31,
  reservationEmailSentDate: 32,

  // ============================================================================
  // PAYMENT SETTING (33-46)
  // ============================================================================
  originalTourCost: 33,
  discountedTourCost: 34,
  reservationFee: 35,
  adminFee: 35.5, // New column - Admin fee (10% of paid terms)
  paid: 36,
  paidTerms: 36.5, // New column - Total amount paid
  remainingBalance: 37,
  manualCredit: 38,
  creditFrom: 39,
  paymentPlan: 40,
  paymentMethod: 41,
  enablePaymentReminder: 42,
  sentInitialReminderLink: 43,
  bookingStatus: 44,
  paymentProgress: 45,
  guestInfoEmailSentLink: 46,

  // ============================================================================
  // FULL PAYMENT (47-49)
  // ============================================================================
  fullPaymentDueDate: 47,
  fullPaymentAmount: 48,
  fullPaymentDatePaid: 49,

  // ============================================================================
  // PAYMENT TERM 1 - P1 (50-56)
  // ============================================================================
  p1ScheduledReminderDate: 50,
  p1ScheduledEmailLink: 51,
  p1CalendarEventId: 52,
  p1CalendarEventLink: 53,
  p1DueDate: 54,
  p1Amount: 55,
  p1DatePaid: 56,

  // ============================================================================
  // PAYMENT TERM 2 - P2 (57-63)
  // ============================================================================
  p2ScheduledReminderDate: 57,
  p2ScheduledEmailLink: 58,
  p2CalendarEventId: 59,
  p2CalendarEventLink: 60,
  p2DueDate: 61,
  p2Amount: 62,
  p2DatePaid: 63,

  // ============================================================================
  // PAYMENT TERM 3 - P3 (64-70)
  // ============================================================================
  p3ScheduledReminderDate: 64,
  p3ScheduledEmailLink: 65,
  p3CalendarEventId: 66,
  p3CalendarEventLink: 67,
  p3DueDate: 68,
  p3Amount: 69,
  p3DatePaid: 70,

  // ============================================================================
  // PAYMENT TERM 4 - P4 (71-77)
  // ============================================================================
  p4ScheduledReminderDate: 71,
  p4ScheduledEmailLink: 72,
  p4CalendarEventId: 73,
  p4CalendarEventLink: 74,
  p4DueDate: 75,
  p4Amount: 76,
  p4DatePaid: 77,

  // ============================================================================
  // CANCELLATION (78-85)
  // ============================================================================
  reasonForCancellation: 78,
  cancellationRequestDate: 78.5, // New column - Date cancellation was requested
  includeBccCancellation: 79,
  eligibleRefund: 79.5, // New column - Refund eligibility status
  generateCancellationEmailDraft: 80,
  nonRefundableAmount: 80.5, // New column - Amount that cannot be refunded
  cancellationEmailDraftLink: 81,
  refundableAmount: 81.5, // New column - Amount that can be refunded
  subjectLineCancellation: 82,
  sendCancellationEmail: 83,
  sentCancellationEmailLink: 84,
  cancellationEmailSentDate: 85,
};

/**
 * Helper function to inject order into a column definition
 *
 * @param column - The column definition without order
 * @param columnId - The column ID to lookup the order
 * @returns Column definition with order injected
 */
export function withOrder(
  column: BookingSheetColumn,
  columnId?: string
): BookingSheetColumn {
  const id = columnId || column.id;
  const order = COLUMN_ORDERS[id];

  if (order === undefined) {
    console.warn(
      `⚠️ No order defined for column: ${id} (${column.data.columnName})`
    );
  }

  return {
    ...column,
    data: {
      ...column.data,
      order: order ?? 999, // Use 999 as fallback for undefined orders
    },
  };
}

/**
 * Validate that all columns have unique orders (except intentional duplicates)
 * Call this in development to check for order conflicts
 */
export function validateColumnOrders(): void {
  const orderCounts: Record<number, string[]> = {};

  Object.entries(COLUMN_ORDERS).forEach(([id, order]) => {
    if (!orderCounts[order]) {
      orderCounts[order] = [];
    }
    orderCounts[order].push(id);
  });

  const duplicates = Object.entries(orderCounts).filter(
    ([, ids]) => ids.length > 1
  );

  if (duplicates.length > 0) {
    console.warn("⚠️ Duplicate column orders detected:");
    duplicates.forEach(([order, ids]) => {
      console.warn(`  Order ${order}: ${ids.join(", ")}`);
    });
  } else {
    console.log("✅ All column orders are unique");
  }
}

/**
 * Get all column IDs sorted by order
 */
export function getColumnIdsSortedByOrder(): string[] {
  return Object.keys(COLUMN_ORDERS).sort(
    (a, b) => COLUMN_ORDERS[a] - COLUMN_ORDERS[b]
  );
}

/**
 * Get order range for a specific tab/category
 */
export function getOrderRangeForTab(
  tabName: string
): { min: number; max: number; columns: string[] } | null {
  const tabRanges: Record<
    string,
    { min: number; max: number; columns: string[] }
  > = {
    Identifier: {
      min: 1,
      max: 6,
      columns: Object.entries(COLUMN_ORDERS)
        .filter(([, order]) => order >= 1 && order <= 6)
        .map(([id]) => id),
    },
    "Traveler Information": {
      min: 7,
      max: 10,
      columns: Object.entries(COLUMN_ORDERS)
        .filter(([, order]) => order >= 7 && order <= 10)
        .map(([id]) => id),
    },
    "Tour Details": {
      min: 12,
      max: 21,
      columns: Object.entries(COLUMN_ORDERS)
        .filter(([, order]) => order >= 12 && order <= 21)
        .map(([id]) => id),
    },
    "Payment Setting": {
      min: 33,
      max: 46,
      columns: Object.entries(COLUMN_ORDERS)
        .filter(([, order]) => order >= 33 && order <= 46)
        .map(([id]) => id),
    },
    Cancellation: {
      min: 78,
      max: 85,
      columns: Object.entries(COLUMN_ORDERS)
        .filter(([, order]) => order >= 78 && order <= 85)
        .map(([id]) => id),
    },
  };

  return tabRanges[tabName] || null;
}
