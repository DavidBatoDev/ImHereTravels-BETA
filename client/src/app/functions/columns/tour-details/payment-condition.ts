import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const paymentConditionColumn: BookingSheetColumn = {
  id: "paymentCondition",
  data: {
    id: "paymentCondition",
    columnName: "Payment Condition",
    dataType: "function",
    function: "paymentConditionFunction",
    parentTab: "Tour Details",
    order: 18,
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

  if (
    typeof eligibleSecondCount !== "number" ||
    typeof daysBetweenReservationAndTour !== "number" ||
    !isFinite(eligibleSecondCount) ||
    !isFinite(daysBetweenReservationAndTour)
  ) {
    return ""; // fallback if inputs invalid
  }

  if (eligibleSecondCount === 0 && daysBetweenReservationAndTour < 2) {
    return "Invalid Booking";
  }
  if (eligibleSecondCount === 0 && daysBetweenReservationAndTour >= 2) {
    return "Last Minute Booking";
  }
  if (eligibleSecondCount === 1) return "Standard Booking, P1";
  if (eligibleSecondCount === 2) return "Standard Booking, P2";
  if (eligibleSecondCount === 3) return "Standard Booking, P3";
  if (eligibleSecondCount >= 4) return "Standard Booking, P4";

  return "";
}
