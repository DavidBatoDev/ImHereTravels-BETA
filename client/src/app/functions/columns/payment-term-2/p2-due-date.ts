import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const p2DueDateColumn: BookingSheetColumn = {
  id: 'p2DueDate',
  data: {
    id: 'p2DueDate',
    columnName: 'P2 Due Date',
    dataType: 'function',
    function: 'getP2DueDateFunction',
    parentTab: 'Payment Term 2',
    order: 60,
    includeInForms: false,
    color: 'yellow',
    width: 120,
    arguments: [
      {
        name: 'reservationDate',
        type: 'unknown',
        columnReference: 'Reservation Date',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'tourDate',
        type: 'unknown',
        columnReference: 'Tour Date',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'paymentPlan',
        type: 'string',
        columnReference: 'Payment Plan',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'paymentCondition',
        type: 'string',
        columnReference: 'Payment Condition',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
    ],
  },
};

// Column Function Implementation
/**
 * Converts various date formats into a normalized "yyyy-mm-dd" string.
 * Same helper used across P1–P4 functions.
 */
export function tourDateToYyyymmdd(tourDate: unknown): string {
  if (tourDate === null || tourDate === undefined) return "";
  if (typeof tourDate === "string" && tourDate.trim() === "") return "";

  let date: Date | null = null;
  try {
    if (
      typeof tourDate === "object" &&
      tourDate !== null &&
      "toDate" in (tourDate as any) &&
      typeof (tourDate as any).toDate === "function"
    ) {
      date = (tourDate as any).toDate();
    } else if (
      typeof tourDate === "object" &&
      tourDate !== null &&
      "seconds" in (tourDate as any)
    ) {
      const s = (tourDate as any).seconds as number;
      const ns =
        typeof (tourDate as any).nanoseconds === "number"
          ? (tourDate as any).nanoseconds
          : 0;
      date = new Date(s * 1000 + Math.floor(ns / 1e6));
    } else if (tourDate instanceof Date) {
      date = tourDate;
    } else if (typeof tourDate === "number") {
      const d = new Date(tourDate);
      date = isNaN(d.getTime()) ? null : d;
    } else if (typeof tourDate === "string") {
      const raw = tourDate.trim();
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const [dd, mm, yyyy] = raw.split("/").map(Number);
        date = new Date(yyyy, mm - 1, dd);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [yyyy, mm, dd] = raw.split("-").map(Number);
        date = new Date(yyyy, mm - 1, dd);
      } else {
        const parsed = new Date(raw);
        date = isNaN(parsed.getTime()) ? null : parsed;
      }
    } else return "ERROR";

    if (!date || isNaN(date.getTime())) return "ERROR";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  } catch {
    return "ERROR";
  }
}

/**
 * Excel equivalent:
 * =IF(OR($AM="Full Payment",$AM="P1",ISBLANK($K)),"",
 *   IF(OR($Q="Standard Booking, P2",$Q="Standard Booking, P3",$Q="Standard Booking, P4"),
 *     TEXTJOIN(", ",TRUE,TEXT(INDEX(validDates,1),"mmm d, yyyy"),TEXT(INDEX(validDates,2),"mmm d, yyyy")),
 *     "")
 * )
 */
export default function getP2DueDateFunction(
  reservationDate?: unknown,
  tourDate?: unknown,
  paymentPlan?: string,
  paymentCondition?: string,
): string | "" | "ERROR" {
  if (paymentPlan === "Full Payment" || paymentPlan === "P1") return "";
  if (!reservationDate) return "";

  const validConditions = [
    "Standard Booking, P2",
    "Standard Booking, P3",
    "Standard Booking, P4",
  ];
  if (!validConditions.includes(paymentCondition ?? "")) return "";

  const resYmd = tourDateToYyyymmdd(reservationDate);
  const tourYmd = tourDateToYyyymmdd(tourDate);
  if (resYmd === "" || tourYmd === "") return "";
  if (resYmd === "ERROR" || tourYmd === "ERROR") return "ERROR";

  const res = new Date(resYmd);
  const tour = new Date(tourYmd);
  const monthCount =
    (tour.getFullYear() - res.getFullYear()) * 12 +
    (tour.getMonth() - res.getMonth()) +
    1;

  const DAY_MS = 86400000;
  const secondDates = Array.from({ length: monthCount }, (_, i) =>
    new Date(res.getFullYear(), res.getMonth() + i + 1, 2),
  );
  const validDates = secondDates.filter(
    (d) =>
      d.getTime() > res.getTime() + 2 * DAY_MS &&
      d.getTime() <= tour.getTime() - 3 * DAY_MS,
  );

  if (validDates.length < 2) return "";
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(validDates[0])}, ${fmt(validDates[1])}`;
}
