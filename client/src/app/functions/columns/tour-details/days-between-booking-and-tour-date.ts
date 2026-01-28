import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const daysBetweenBookingAndTourDateColumn: BookingSheetColumn = {
  id: "daysBetweenBookingAndTourDate",
  data: {
    id: "daysBetweenBookingAndTourDate",
    columnName: "Days Between Booking and Tour Date",
    dataType: "function",
    function: "daysBetweenReservationAndTourFunction",
    parentTab: "Tour Details",
    includeInForms: false,
    showColumn: true,
    color: "gray",
    width: 312.666748046875,
    arguments: [
      {
        name: "reservationDate",
        type: "unknown",
        columnReference: "Reservation Date",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "tourDate",
        type: "unknown",
        columnReference: "Tour Date",
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
 * =IF(AND(K<>"", N<>""), N - K, "")
 *
 * - K = Reservation Date
 * - N = Tour Date
 * - Returns: number of days between (N - K), or "" if blank/invalid
 */
export default function daysBetweenReservationAndTourFunction(
  reservationDate: unknown,
  tourDate: unknown
): number | "" {
  const toDate = (input: unknown): Date | null => {
    if (input === null || input === undefined) return null;
    if (typeof input === "string" && input.trim() === "") return null;

    try {
      if (
        typeof input === "object" &&
        input !== null &&
        "toDate" in (input as any) &&
        typeof (input as any).toDate === "function"
      ) {
        return (input as any).toDate();
      }
      if (
        typeof input === "object" &&
        input !== null &&
        "seconds" in (input as any) &&
        typeof (input as any).seconds === "number"
      ) {
        const s = (input as any).seconds as number;
        const ns =
          typeof (input as any).nanoseconds === "number"
            ? (input as any).nanoseconds
            : 0;
        return new Date(s * 1000 + Math.floor(ns / 1e6));
      }
      if (input instanceof Date) return input;
      if (typeof input === "number") return new Date(input);
      if (typeof input === "string") {
        const raw = input.trim();
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
          const [dd, mm, yyyy] = raw.split("/").map(Number);
          return new Date(yyyy, mm - 1, dd);
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          const [yyyy, mm, dd] = raw.split("-").map(Number);
          return new Date(yyyy, mm - 1, dd);
        }
        return new Date(raw);
      }
      return null;
    } catch {
      return null;
    }
  };

  const res = toDate(reservationDate);
  const tour = toDate(tourDate);

  if (!res || isNaN(res.getTime()) || !tour || isNaN(tour.getTime())) return "";

  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.round((tour.getTime() - res.getTime()) / msPerDay);

  return diff;
}
