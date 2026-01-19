import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const fullPaymentDueDateColumn: BookingSheetColumn = {
  id: "fullPaymentDueDate",
  data: {
    id: "fullPaymentDueDate",
    columnName: "Full Payment Due Date",
    dataType: "function",
    function: "getFullPaymentDueDateFunction",
    parentTab: "Full Payment",
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
      {
        name: "paymentCondition",
        type: "string",
        columnReference: "Payment Condition",
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
 * Excel equivalent (updated):
 * Returns a formatted date (reservationDate + 2 days) if:
 * - paymentCondition is "Last Minute Booking" (regardless of payment plan), OR
 * - paymentPlan is "Full Payment"
 * Returns "" if a payment plan is selected AND it's not "Full Payment"
 *
 * Description:
 * - Returns a formatted date string (e.g., "Apr 25, 2026") if:
 *   • reservationDate is not blank, AND
 *   • paymentCondition = "Last Minute Booking", OR paymentPlan = "Full Payment"
 * - Adds 2 days to reservationDate.
 * - Returns "" otherwise.
 */

export default function getFullPaymentDueDateFunction(
  reservationDate?: Date | string | { seconds: number } | null,
  paymentPlan?: string | null,
  paymentCondition?: string | null
): string {
  if (!reservationDate) return "";

  // If a payment plan is selected and it's not "Full Payment", hide the value
  if (
    paymentPlan &&
    paymentPlan.trim() !== "" &&
    paymentPlan.trim() !== "Full Payment"
  ) {
    return "";
  }

  // Show value if payment condition is "Last Minute Booking" OR payment plan is "Full Payment"
  const isLastMinute = paymentCondition?.trim() === "Last Minute Booking";
  const isFullPayment = paymentPlan?.trim() === "Full Payment";

  if (!isLastMinute && !isFullPayment) return "";

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
