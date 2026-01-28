import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const paymentConditionColumn: BookingSheetColumn = {
  id: "paymentCondition",
  data: {
    id: "paymentCondition",
    columnName: "Payment Condition",
    dataType: "function",
    function: "paymentConditionFunction",
    parentTab: "Tour Details",
    includeInForms: false,
    showColumn: true,
    color: "gray",
    width: 189.333251953125,
    options: ["", "Full Payment", "Partial Payment", "Installment"],
    arguments: [
      {
        name: "tourDate",
        type: "unknown",
        columnReference: "Tour Date",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "eligibleSecondCount",
        type: "number",
        columnReference: "Eligible 2nd-of-Months",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "daysBetweenReservationAndTour",
        type: "number",
        columnReference: "Days Between Booking and Tour Date",
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
 * =IF(ISBLANK(N),"",
 *   IFS(
 *     AND(R=0, S<2), "Invalid Booking",
 *     AND(R=0, S>=2), "Last Minute Booking",
 *     R=1, "Standard Booking, P1",
 *     R=2, "Standard Booking, P2",
 *     R=3, "Standard Booking, P3",
 *     R>=4, "Standard Booking, P4"
 *   )
 * )
 *
 * @param tourDate                  The tour date (N column)
 * @param eligibleSecondCount       The number of eligible "2nd of month" dates (R column)
 * @param daysBetweenReservationAndTour  Days between reservation date and tour date (S column)
 * @returns "" | the payment condition string
 */
export default function paymentConditionFunction(
  tourDate: unknown,
  eligibleSecondCount: number,
  daysBetweenReservationAndTour: number
): string {
  const isBlankLike = (v: unknown) =>
    v === null || v === undefined || (typeof v === "string" && v.trim() === "");

  if (isBlankLike(tourDate)) return "";

  // Coerce numeric-like inputs (accept numbers or numeric strings).
  const eligibleNum = Number(eligibleSecondCount as any);
  const daysNum = Number(daysBetweenReservationAndTour as any);

  if (!Number.isFinite(eligibleNum) || !Number.isFinite(daysNum)) {
    return ""; // fallback if inputs invalid or non-numeric
  }

  // Use integer counts to match spreadsheet COUNTA/DATEDIF behavior
  const eligible = Math.trunc(eligibleNum);
  const days = Math.trunc(daysNum);

  if (eligible === 0 && days < 2) {
    return "Invalid Booking";
  }
  if (eligible === 0 && days >= 2) {
    return "Last Minute Booking";
  }
  if (eligible === 1) return "Standard Booking, P1";
  if (eligible === 2) return "Standard Booking, P2";
  if (eligible === 3) return "Standard Booking, P3";
  if (eligible >= 4) return "Standard Booking, P4";

  return "";
}
