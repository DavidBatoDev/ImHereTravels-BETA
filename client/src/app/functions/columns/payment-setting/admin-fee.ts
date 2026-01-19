import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const adminFeeColumn: BookingSheetColumn = {
  id: "adminFee",
  data: {
    id: "adminFee",
    columnName: "Admin Fee",
    dataType: "function",
    function: "getAdminFeeFunction",
    parentTab: "Payment Setting",
    order: 35.5,
    includeInForms: false,
    color: "gray",
    width: 150,
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
        name: "eligibleRefund",
        type: "string",
        columnReference: "Eligible Refund",
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
 * =IF(
 *   ISNUMBER(SEARCH("Cancelled", INDEX(1003:1003, , MATCH("Booking Status", $3:$3, 0)))),
 *   IF(
 *     INDEX(1003:1003, , MATCH("Eligible Refund", $3:$3, 0)) = "Refund Ineligible",
 *     0,
 *     IF(AM1003 = "", "", 0.1 * AM1003)
 *   ),
 *   ""
 * )
 *
 * Description:
 * - Calculates admin fee (10% of paid terms) for cancelled bookings
 * - Returns 0 if refund is ineligible
 * - Returns empty string if not cancelled or no paid terms
 *
 * Parameters:
 * - bookingStatus → Current booking status (e.g., "Cancelled", "Confirmed")
 * - eligibleRefund → Refund eligibility status
 * - paidTerms → Total amount paid across all payment terms
 *
 * Returns:
 * - number → 10% of paidTerms if cancelled and eligible for refund
 * - 0 → if cancelled but refund ineligible
 * - "" → if not cancelled or no paid terms
 */

export default async function getAdminFee(
  bookingStatus: string,
  eligibleRefund: string,
  paidTerms: number | string,
): Promise<number | string> {
  // Check if booking is cancelled
  if (!bookingStatus || !bookingStatus.toLowerCase().includes("cancelled")) {
    return "";
  }

  // If refund is ineligible, admin fee is 0
  if (eligibleRefund === "Refund Ineligible") {
    return 0;
  }

  // Convert paidTerms to number
  const paidAmount =
    typeof paidTerms === "string" ? parseFloat(paidTerms) : paidTerms;

  // If no paid terms or invalid, return empty
  if (!paidAmount || isNaN(paidAmount)) {
    return "";
  }

  // Calculate 10% admin fee
  return 0.1 * paidAmount;
}
