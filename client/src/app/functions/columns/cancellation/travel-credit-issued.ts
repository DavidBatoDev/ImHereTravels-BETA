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

/**
 * Extract who initiated cancellation from reason string
 * Looks for "Guest -" or "IHT -" prefix in reason
 */
function extractInitiator(
  reasonForCancellation: string | null | undefined,
): "Guest" | "IHT" | null {
  if (!reasonForCancellation) return null;

  const reason = reasonForCancellation.trim();
  if (reason.startsWith("Guest -") || reason.startsWith("Guest-")) {
    return "Guest";
  }
  if (reason.startsWith("IHT -") || reason.startsWith("IHT-")) {
    return "IHT";
  }

  // Fallback: check if it contains the words anywhere
  const lowerReason = reason.toLowerCase();
  if (lowerReason.includes("iht")) return "IHT";
  if (lowerReason.includes("guest")) return "Guest";

  return null;
}

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
  paid: number,
  reasonForCancellation: string | null | undefined,
): string {
  // Extract who initiated from reason
  const initiatedBy = extractInitiator(reasonForCancellation);

  // Only applicable when IHT cancels
  if (initiatedBy !== "IHT" || !reasonForCancellation) {
    return "";
  }

  // Credit equals full amount paid when IHT cancels
  if (paid > 0) {
    return `TC: £${paid.toFixed(2)} (not yet implemented)`;
  }

  return "";
}
