import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const nonRefundableAmountColumn: BookingSheetColumn = {
  id: "nonRefundableAmount",
  data: {
    id: "nonRefundableAmount",
    columnName: "Non Refundable Amount",
    dataType: "function",
    function: "getNonRefundableAmountFunction",
    parentTab: "Cancellation",
    order: 80.5,
    includeInForms: false,
    color: "none",
    width: 200,
    arguments: [
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
        name: "eligibleRefund",
        type: "string",
        columnReference: "Eligible Refund",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "reservationFee",
        type: "number | string",
        columnReference: "Reservation Fee",
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
      {
        name: "adminFee",
        type: "number | string",
        columnReference: "Admin Fee",
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
 *   cancellationDate, INDEX(1003:1003,, m("Cancellation Request Date")),
 *   eligibleRefund,   INDEX(1003:1003,, m("Eligible Refund")),
 *   reservationFee,   TO_PURE_NUMBER(INDEX(1003:1003,, m("Reservation Fee"))),
 *   paidTerms,        TO_PURE_NUMBER(INDEX(1003:1003,, m("Paid Terms"))),
 *   adminFee, TO_PURE_NUMBER(INDEX(1003:1003, , m("Admin Fee"))),
 *
 *   refundRate,
 *     IF(eligibleRefund="50% refund minus Admin Fee", 0.5,
 *       IF(eligibleRefund="Refund Ineligible", 1,
 *         0
 *       )
 *     ),
 *
 *   nonRefundableAmount,
 *     IF(ISBLANK(cancellationDate),"",
 *       IF(eligibleRefund="100% refund minus Admin Fee",
 *         reservationFee + adminFee,
 *         IF(OR(eligibleRefund="50% refund minus Admin Fee", eligibleRefund="Refund Ineligible"),
 *           (paidTerms * refundRate) + reservationFee + adminFee,
 *           ""
 *         )
 *       )
 *     ),
 *
 *   nonRefundableAmount
 * )
 *
 * Description:
 * - Calculates the amount that cannot be refunded to the customer
 * - Based on refund eligibility status and payment amounts
 * - Always includes reservation fee and admin fee in non-refundable amount
 *
 * Calculation Logic:
 * - "100% refund minus Admin Fee": reservation fee + admin fee
 * - "50% refund minus Admin Fee": (paid terms × 0.5) + reservation fee + admin fee
 * - "Refund Ineligible": (paid terms × 1) + reservation fee + admin fee
 *
 * Parameters:
 * - cancellationRequestDate → Date cancellation was requested
 * - eligibleRefund → Refund eligibility status
 * - reservationFee → Reservation fee amount
 * - paidTerms → Total amount paid
 * - adminFee → Admin fee (10% of paid terms)
 *
 * Returns:
 * - number → Non-refundable amount
 * - "" → if no cancellation date
 */

export default async function getNonRefundableAmount(
  cancellationRequestDate: Date | string,
  eligibleRefund: string,
  reservationFee: number | string,
  paidTerms: number | string,
  adminFee: number | string,
): Promise<number | string> {
  // Return empty if no cancellation date
  if (!cancellationRequestDate) {
    return "";
  }

  // Helper to convert to number
  const toNumber = (value: any): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const resFee = toNumber(reservationFee);
  const paid = toNumber(paidTerms);
  const admin = toNumber(adminFee);

  // Determine refund rate based on eligible refund status
  let refundRate = 0;
  if (eligibleRefund === "50% refund minus Admin Fee") {
    refundRate = 0.5;
  } else if (eligibleRefund === "Refund Ineligible") {
    refundRate = 1;
  }

  // Calculate non-refundable amount
  if (eligibleRefund === "100% refund minus Admin Fee") {
    // Only reservation fee and admin fee are non-refundable
    return resFee + admin;
  } else if (
    eligibleRefund === "50% refund minus Admin Fee" ||
    eligibleRefund === "Refund Ineligible"
  ) {
    // Percentage of paid terms + reservation fee + admin fee
    return paid * refundRate + resFee + admin;
  }

  // Return empty for other cases
  return "";
}
