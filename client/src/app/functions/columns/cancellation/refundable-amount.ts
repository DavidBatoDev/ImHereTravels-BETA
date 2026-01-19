import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const refundableAmountColumn: BookingSheetColumn = {
  id: "refundableAmount",
  data: {
    id: "refundableAmount",
    columnName: "Refundable Amount",
    dataType: "function",
    function: "getRefundableAmountFunction",
    parentTab: "Cancellation",
    order: 81.5,
    includeInForms: false,
    color: "none",
    width: 200,
    arguments: [
      {
        name: "adminFee",
        type: "number | string",
        columnReference: "Admin Fee",
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
 *   adminFee, TO_PURE_NUMBER(INDEX(1003:1003, , m("Admin Fee"))),
 *   paidTerms, TO_PURE_NUMBER(INDEX(1003:1003, , m("Paid Terms"))),
 *   cancellationDate, INDEX(1003:1003, , m("Cancellation Request Date")),
 *   eligibleRefund, INDEX(1003:1003, , m("Eligible Refund")),
 *
 *   refundableAmount,
 *     IF(NOT(ISBLANK(cancellationDate)),
 *       IF(eligibleRefund = "100% refund minus Admin Fee", (paidTerms * 1) - adminFee,
 *         IF(eligibleRefund = "50% refund minus Admin Fee", (paidTerms * 0.5) - adminFee,
 *           IF(OR(eligibleRefund = "Refund Ineligible", eligibleRefund = "0 Paid Terms, no refund"), 0, "")
 *         )
 *       ),
 *       ""
 *     ),
 *
 *   refundableAmount
 * )
 *
 * Description:
 * - Calculates the amount that can be refunded to the customer
 * - Based on refund eligibility status and payment amounts
 * - Admin fee is always deducted from refundable amount
 *
 * Calculation Logic:
 * - "100% refund minus Admin Fee": (paid terms × 1) - admin fee
 * - "50% refund minus Admin Fee": (paid terms × 0.5) - admin fee
 * - "Refund Ineligible" or "0 Paid Terms, no refund": 0
 *
 * Parameters:
 * - adminFee → Admin fee (10% of paid terms)
 * - paidTerms → Total amount paid
 * - cancellationRequestDate → Date cancellation was requested
 * - eligibleRefund → Refund eligibility status
 *
 * Returns:
 * - number → Refundable amount
 * - "" → if no cancellation date or unrecognized eligibility status
 */

export default async function getRefundableAmount(
  adminFee: number | string,
  paidTerms: number | string,
  cancellationRequestDate: Date | string,
  eligibleRefund: string,
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

  const admin = toNumber(adminFee);
  const paid = toNumber(paidTerms);

  // Calculate refundable amount based on eligibility
  if (eligibleRefund === "100% refund minus Admin Fee") {
    return paid * 1 - admin;
  } else if (eligibleRefund === "50% refund minus Admin Fee") {
    return paid * 0.5 - admin;
  } else if (
    eligibleRefund === "Refund Ineligible" ||
    eligibleRefund === "0 Paid Terms, no refund"
  ) {
    return 0;
  }

  // Return empty for unrecognized eligibility status
  return "";
}
