import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const travelCreditIssuedColumn: BookingSheetColumn = {
  id: "travelCreditIssued",
  data: {
    id: "travelCreditIssued",
    columnName: "Travel Credit Issued",
    dataType: "function",
    function: "getTravelCreditIssuedFunction",
    parentTab: "Cancellation",
    includeInForms: false,
    showColumn: true,
    color: "blue",
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
        name: "paid",
        type: "number",
        columnReference: "Paid",
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
    ],
  },
};

// Column Function Implementation
/**
 * Calculates travel credit amount when IHT cancels
 *
 * Travel credit system is not yet implemented - this is a placeholder
 * that calculates the credit amount for future use.
 *
 * Returns: "TC: £{amount} (not yet implemented)" or "" if not applicable
 */
export default function getTravelCreditIssuedFunction(
  cancellationInitiatedBy: string | null | undefined,
  paid: number,
  reasonForCancellation: string | null | undefined,
): string {
  // Only applicable when IHT cancels
  if (cancellationInitiatedBy !== "IHT" || !reasonForCancellation) {
    return "";
  }

  // Credit equals full amount paid when IHT cancels
  if (paid > 0) {
    return `TC: £${paid.toFixed(2)} (not yet implemented)`;
  }

  return "";
}
