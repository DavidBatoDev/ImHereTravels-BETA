import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const eligibleRefundColumn: BookingSheetColumn = {
  id: "eligibleRefund",
  data: {
    id: "eligibleRefund",
    columnName: "Eligible Refund",
    dataType: "function",
    function: "getEligibleRefundFunction",
    parentTab: "Cancellation",
    order: 79.5,
    includeInForms: false,
    color: "none",
    width: 250,
    arguments: [
      {
        name: "bookingStatus",
        type: "string",
        columnReference: "Booking Status",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "cancellationRequestDate",
        type: "date | string",
        columnReference: "Cancellation Request Date",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "tourDate",
        type: "date | string",
        columnReference: "Tour Date",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "reasonForCancellation",
        type: "string",
        columnReference: "Reason for Cancellation",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "paymentPlan",
        type: "string",
        columnReference: "Payment Plan",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "paidTerms",
        type: "number | string",
        columnReference: "Paid Terms",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

// Column Function Implementation
/**
 * Excel equivalent:
 * =LET(
 *   hdr, $3:$3,
 *   m, LAMBDA(n, MATCH(n, hdr, 0)),
 *
 *   bookingStatus, INDEX(1003:1003, , m("Booking Status")),
 *   cancellationDate, INDEX(1003:1003, , m("Cancellation Request Date")),
 *   daysBeforeTour, INDEX(1003:1003, , m("Days before Tour Date")),
 *   reason, INDEX(1003:1003, , m("Reason for Cancellation")),
 *   plan, INDEX(1003:1003, , m("Payment Plan")),
 *   paidTerms, TO_PURE_NUMBER(INDEX(1003:1003, , m("Paid Terms"))),
 *
 *   refundRate,
 *     IF(AND(ISNUMBER(SEARCH("Cancelled", bookingStatus)), ISNUMBER(cancellationDate)),
 *       IF(OR(plan="Full Payment", plan="P1", plan="P2", plan="P3", plan="P4"),
 *         IF(paidTerms = 0, "0 Paid Terms, no refund",
 *           IF(daysBeforeTour >= 100, "100% refund minus Admin Fee",
 *             IF(daysBeforeTour >= 60, "50% refund minus Admin Fee",
 *               "Refund Ineligible"
 *             )
 *           )
 *         ),
 *       ""),
 *     ""
 *   ),
 *
 *   IF(reason<>"", refundRate, "")
 * )
 *
 * Description:
 * - Evaluates refund eligibility based on cancellation timing and payment status
 * - Calculates days before tour internally from cancellation date and tour date
 * - Returns refund status string based on days before tour date
 * - Requires both booking to be cancelled and a cancellation reason
 *
 * Refund Logic:
 * - >= 100 days before tour: "100% refund minus Admin Fee"
 * - >= 60 days before tour: "50% refund minus Admin Fee"
 * - < 60 days before tour: "Refund Ineligible"
 * - 0 paid terms: "0 Paid Terms, no refund"
 *
 * Parameters:
 * - bookingStatus → Current booking status
 * - cancellationRequestDate → Date cancellation was requested
 * - tourDate → Date of the tour
 * - reasonForCancellation → Reason provided for cancellation
 * - paymentPlan → Selected payment plan
 * - paidTerms → Total amount paid
 *
 * Returns:
 * - string → Refund eligibility status
 * - "" → if not cancelled or no reason provided
 */

export default async function getEligibleRefund(
  bookingStatus: string,
  cancellationRequestDate: Date | string,
  tourDate: Date | string,
  reasonForCancellation: string,
  paymentPlan: string,
  paidTerms: number | string,
): Promise<string> {
  // Check if booking is cancelled and has a cancellation date
  const isCancelled =
    bookingStatus && bookingStatus.toLowerCase().includes("cancelled");
  const hasCancellationDate = !!cancellationRequestDate;

  // Return empty if not cancelled or no cancellation date
  if (!isCancelled || !hasCancellationDate) {
    return "";
  }

  // Valid payment plans that are eligible for refund evaluation
  const validPlans = ["Full Payment", "P1", "P2", "P3", "P4"];
  if (!validPlans.includes(paymentPlan)) {
    return "";
  }

  // Convert paidTerms to number
  const paidAmount =
    typeof paidTerms === "string" ? parseFloat(paidTerms) : paidTerms;

  // Check if paid terms is 0
  if (paidAmount === 0) {
    return "0 Paid Terms, no refund";
  }

  // Calculate days before tour date
  // Helper to convert Firestore Timestamp or Date to Date object
  const toDate = (value: any): Date => {
    if (value instanceof Date) {
      return value;
    }
    // Handle Firestore Timestamp objects with seconds property
    if (value && typeof value === "object" && "seconds" in value) {
      return new Date(value.seconds * 1000);
    }
    // Handle Firestore Timestamp objects with toDate method
    if (value && typeof value.toDate === "function") {
      return value.toDate();
    }
    // Handle string dates
    return new Date(value);
  };

  const cancellationDateObj = toDate(cancellationRequestDate);
  const tourDateObj = toDate(tourDate);

  // Calculate difference in days
  const diffTime = tourDateObj.getTime() - cancellationDateObj.getTime();
  const daysBeforeTourNum = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Determine refund rate based on days before tour
  let refundRate = "";
  if (daysBeforeTourNum >= 100) {
    refundRate = "100% refund minus Admin Fee";
  } else if (daysBeforeTourNum >= 60) {
    refundRate = "50% refund minus Admin Fee";
  } else {
    refundRate = "Refund Ineligible";
  }

  // Only return refund rate if reason is provided
  return reasonForCancellation ? refundRate : "";
}
