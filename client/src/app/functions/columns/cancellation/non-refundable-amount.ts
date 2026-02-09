import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const nonRefundableAmountColumn: BookingSheetColumn = {
  id: "nonRefundableAmount",
  data: {
    id: "nonRefundableAmount",
    columnName: "Non Refundable Amount",
    dataType: "function",
    function: "getNonRefundableAmountFunction",
    parentTab: "Cancellation",
    includeInForms: false,
    color: "none",
    width: 200,
    arguments: [
      {
        name: "cancellationInitiatedBy",
        type: "string",
        columnReference: "Cancellation Initiated By",
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
      {
        name: "paid",
        type: "number | string",
        columnReference: "Paid",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "refundableAmount",
        type: "number | string",
        columnReference: "Refundable Amount",
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
 * Calculates non-refundable amount based on cancellation scenario
 *
 * Key Principle: refundable + nonRefundable = totalPaid
 *
 * This ensures accounting accuracy regardless of scenario complexity.
 *
 * Special Cases:
 * - IHT cancellations: nonRefundable = 0 (everything refundable)
 * - Guest no-show: nonRefundable = totalPaid (nothing refundable)
 * - Guest late cancellation: nonRefundable = totalPaid
 * - Guest early/mid cancellation: nonRefundable = totalPaid - refundable
 *
 * The refundable amount calculation handles all the complexity
 * (RF treatment, NRA split, admin fees, supplier costs), so we
 * simply subtract it from total paid to get non-refundable.
 *
 * Parameters:
 * - cancellationInitiatedBy → Who cancelled ("Guest" | "IHT")
 * - cancellationRequestDate → Date cancellation was requested
 * - eligibleRefund → Refund eligibility status
 * - paid → Total amount paid
 * - refundableAmount → Calculated refundable amount
 *
 * Returns:
 * - number → Non-refundable amount
 * - "" → if no cancellation date
 */

export default async function getNonRefundableAmount(
  cancellationInitiatedBy: string | null | undefined,
  cancellationRequestDate: Date | string,
  eligibleRefund: string,
  paid: number | string,
  refundableAmount: number | string,
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

  const totalPaid = toNumber(paid);
  const refundable = toNumber(refundableAmount);

  // Simple calculation: non-refundable = total paid - refundable
  // This ensures the amounts always balance
  const nonRefundable = totalPaid - refundable;

  // Ensure non-negative (should not happen, but safety check)
  return Math.max(0, nonRefundable);
}
