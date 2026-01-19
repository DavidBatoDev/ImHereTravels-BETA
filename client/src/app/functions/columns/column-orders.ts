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
  // IDENTIFIER (1-6)
  // ============================================================================
  bookingId: 1,
  bookingCode: 2,
  tourCode: 3,
  travellerInitials: 4,
  tourPackageNameUniqueCounter: 5,
  formattedDate: 6,

  // ============================================================================
  // TRAVELER INFORMATION (7-10)
  // ============================================================================
  emailAddress: 7,
  firstName: 8,
  lastName: 9,
  fullName: 10,

  // ============================================================================
  // DISCOUNTS (11-12)
  // ============================================================================
  eventName: 11,
  discountRate: 12,

  // ============================================================================
  // TOUR DETAILS (13-22)
  // ============================================================================
  reservationDate: 13,
  bookingType: 14,
  tourPackageName: 15,
  tourDate: 16,
  returnDate: 17,
  tourDuration: 18,
  paymentCondition: 19,
  eligible2ndofmonths: 20,
  availablePaymentTerms: 21,
  daysBetweenBookingAndTourDate: 22,

  // ============================================================================
  // DUO OR GROUP BOOKING (23-25)
  // ============================================================================
  isMainBooker: 23,
  groupIdGroupIdGenerator: 24,
  groupId: 25,

  // ============================================================================
  // RESERVATION EMAIL (26-33)
  // ============================================================================
  includeBccReservation: 26,
  useDiscountedTourCost: 27,
  generateEmailDraft: 28,
  emailDraftLink: 29,
  subjectLineReservation: 30,
  sendEmail: 31,
  sentEmailLink: 32,
  reservationEmailSentDate: 33,

  // ============================================================================
  // PAYMENT SETTING (34-49)
  // ============================================================================
  originalTourCost: 34,
  discountedTourCost: 35,
  reservationFee: 36,
  adminFee: 37,
  paid: 38,
  paidTerms: 39,
  remainingBalance: 40,
  manualCredit: 41,
  creditFrom: 42,
  paymentPlan: 43,
  paymentMethod: 44,
  enablePaymentReminder: 45,
  sentInitialReminderLink: 46,
  bookingStatus: 47,
  paymentProgress: 48,
  guestInfoEmailSentLink: 49,

  // ============================================================================
  // FULL PAYMENT (50-52)
  // ============================================================================
  fullPaymentDueDate: 50,
  fullPaymentAmount: 51,
  fullPaymentDatePaid: 52,

  // ============================================================================
  // PAYMENT TERM 1 - P1 (53-59)
  // ============================================================================
  p1ScheduledReminderDate: 53,
  p1ScheduledEmailLink: 54,
  p1CalendarEventId: 55,
  p1CalendarEventLink: 56,
  p1DueDate: 57,
  p1Amount: 58,
  p1DatePaid: 59,

  // ============================================================================
  // PAYMENT TERM 2 - P2 (60-66)
  // ============================================================================
  p2ScheduledReminderDate: 60,
  p2ScheduledEmailLink: 61,
  p2CalendarEventId: 62,
  p2CalendarEventLink: 63,
  p2DueDate: 64,
  p2Amount: 65,
  p2DatePaid: 66,

  // ============================================================================
  // PAYMENT TERM 3 - P3 (67-73)
  // ============================================================================
  p3ScheduledReminderDate: 67,
  p3ScheduledEmailLink: 68,
  p3CalendarEventId: 69,
  p3CalendarEventLink: 70,
  p3DueDate: 71,
  p3Amount: 72,
  p3DatePaid: 73,

  // ============================================================================
  // PAYMENT TERM 4 - P4 (74-80)
  // ============================================================================
  p4ScheduledReminderDate: 74,
  p4ScheduledEmailLink: 75,
  p4CalendarEventId: 76,
  p4CalendarEventLink: 77,
  p4DueDate: 78,
  p4Amount: 79,
  p4DatePaid: 80,

  // ============================================================================
  // CANCELLATION (81-92)
  // ============================================================================
  reasonForCancellation: 81,
  cancellationRequestDate: 82,
  includeBccCancellation: 83,
  eligibleRefund: 84,
  nonRefundableAmount: 85,
  refundableAmount: 86,
  generateCancellationDraft: 87,
  cancellationEmailDraftLink: 88,
  subjectLineCancellation: 89,
  sendCancellationEmail: 90,
  sentCancellationEmailLink: 91,
  cancellationEmailSentDate: 92,

  // ============================================================================
  // DELETE (93) - Delete column at the end
  // ============================================================================
  delete: 93,
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
  columnId?: string,
): BookingSheetColumn {
  const id = columnId || column.id;
  const order = COLUMN_ORDERS[id];

  if (order === undefined) {
    console.warn(
      `⚠️ No order defined for column: ${id} (${column.data.columnName})`,
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
    ([, ids]) => ids.length > 1,
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
    (a, b) => COLUMN_ORDERS[a] - COLUMN_ORDERS[b],
  );
}

/**
 * Get order range for a specific tab/category
 */
export function getOrderRangeForTab(
  tabName: string,
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
