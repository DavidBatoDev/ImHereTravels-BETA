import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const fullPaymentDueDateColumn: BookingSheetColumn = {
  id: "fullPaymentDueDate",
  data: {
    id: "fullPaymentDueDate",
    columnName: "Full Payment Due Date",
    dataType: "function",
    function: "getFullPaymentDueDateFunction",
    parentTab: "Full Payment",
    order: 47,
    includeInForms: false,
    color: "yellow",
    width: 160,
    arguments: [
      {
        name: "reservationDate",
        type: "any",
        columnReference: "Reservation Date",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "paymentPlan",
        type: "string",
        columnReference: "Payment Plan",
        isOptional: true,
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
 *   AND(
 *     NOT(ISBLANK($K1003)),
 *     $AM1003 = "Full Payment"
 *   ),
 *   TEXT($K1003 + 2, "mmm d, yyyy"),
 *   ""
 * )
 *
 * Description:
 * - Returns a formatted date string (e.g., "Apr 25, 2026") if:
 *   • reservationDate ($K1003) is not blank
 *   • paymentPlan ($AM1003) = "Full Payment"
 * - Adds 2 days to reservationDate.
 * - Returns "" otherwise.
 */

export default function getFullPaymentDueDateFunction(
  reservationDate?: Date | string | { seconds: number } | null,
  paymentPlan?: string | null
): string {
  if (!reservationDate || !paymentPlan) return "";

  if (paymentPlan.trim() !== "Full Payment") return "";

  // --- Normalize reservationDate (Firestore timestamp or string) ---
  let date: Date;
  if (reservationDate instanceof Date) {
    date = reservationDate;
  } else if (
    typeof reservationDate === "object" &&
    "seconds" in reservationDate
  ) {
    date = new Date(reservationDate.seconds * 1000);
  } else {
    date = new Date(reservationDate);
  }

  if (isNaN(date.getTime())) return "";

  // --- Add 2 days ---
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + 2);

  // --- Format as "mmm d, yyyy" ---
  return newDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
