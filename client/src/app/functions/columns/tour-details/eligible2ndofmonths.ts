import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const eligible2ndofmonthsColumn: BookingSheetColumn = {
  id: "eligible2ndofmonths",
  data: {
    id: "eligible2ndofmonths",
    columnName: "Eligible 2nd-of-Months",
    dataType: "function",
    function: "eligibleSecondsCountFunction",
    parentTab: "Tour Details",
    order: 20,
    includeInForms: false,
    showColumn: true,
    color: "gray",
    width: 212.66668701171875,
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
 * =IF(OR(ISBLANK(K), ISBLANK(N)), "",
 *   LET(
 *     resDate, K,
 *     tourDate, N,
 *     fullPaymentDue, tourDate - 30,
 *     monthCount, MAX(0, DATEDIF(resDate, fullPaymentDue, "M") + 1),
 *     secondDates, DATE(YEAR(resDate), MONTH(resDate) + SEQUENCE(monthCount), 2),
 *     validDates, FILTER(secondDates, (secondDates >= resDate + 3) * (secondDates <= fullPaymentDue)),
 *     IF(ISERROR(validDates), 0, COUNTA(validDates))
 *   )
 * )
 *
 * Returns: number | ""  (empty string if either date is blank/invalid)
 */
export default function eligibleSecondsCountFunction(
  reservationDate: unknown, // K
  tourDate: unknown // N
): number | "" {
  // ---------- local helpers (robust parsing like our previous funcs) ----------
  const toDate = (input: unknown): Date | null => {
    if (input === null || input === undefined) return null;
    if (typeof input === "string" && input.trim() === "") return null;

    try {
      // Firestore Timestamp (has .toDate())
      if (
        typeof input === "object" &&
        input !== null &&
        "toDate" in (input as any) &&
        typeof (input as any).toDate === "function"
      ) {
        const d = (input as any).toDate();
        return isNaN(d.getTime()) ? null : d;
      }

      // Firestore-like { seconds, nanoseconds? }
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
        const d = new Date(s * 1000 + Math.floor(ns / 1e6));
        return isNaN(d.getTime()) ? null : d;
      }

      // Already a Date
      if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

      // Milliseconds timestamp
      if (typeof input === "number") {
        const d = new Date(input);
        return isNaN(d.getTime()) ? null : d;
      }

      // String formats
      if (typeof input === "string") {
        const raw = input.trim();

        // dd/mm/yyyy
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
          const [dd, mm, yyyy] = raw.split("/").map(Number);
          const d = new Date(yyyy, mm - 1, dd);
          return isNaN(d.getTime()) ? null : d;
        }

        // yyyy-mm-dd
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          const [yyyy, mm, dd] = raw.split("-").map(Number);
          const d = new Date(yyyy, mm - 1, dd);
          return isNaN(d.getTime()) ? null : d;
        }

        // Natural/ISO strings (incl. "UTC+8")
        const d = new Date(raw);
        return isNaN(d.getTime()) ? null : d;
      }

      return null;
    } catch {
      return null;
    }
  };

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const addDays = (base: Date, days: number): Date => {
    const out = new Date(base);
    out.setDate(out.getDate() + days);
    return out;
  };

  // Similar behavior to DATEDIF(res, end, "M")
  const monthsBetweenInclusiveStart = (a: Date, b: Date): number => {
    const years = b.getFullYear() - a.getFullYear();
    const months = b.getMonth() - a.getMonth();
    let diff = years * 12 + months;
    if (b.getDate() < a.getDate()) diff -= 1;
    return Math.max(0, diff);
  };

  const generateMonthSeconds = (start: Date, count: number): Date[] => {
    const list: Date[] = [];
    // Excel's formula uses: DATE(YEAR(resDate), MONTH(resDate) + SEQUENCE(monthCount), 2)
    // SEQUENCE(monthCount) generates 1..monthCount, so it starts from the next month.
    // To match that behaviour, start at i = 1 and go through <= count.
    for (let i = 1; i <= count; i++) {
      list.push(new Date(start.getFullYear(), start.getMonth() + i, 2));
    }
    return list;
  };

  // ---------- apply logic ----------
  const res = toDate(reservationDate);
  const tour = toDate(tourDate);
  if (!res || !tour) return "";

  const resD = startOfDay(res);
  const tourD = startOfDay(tour);

  const fullPaymentDue = addDays(tourD, -30); // tourDate - 30
  const windowStart = addDays(resD, 3); // resDate + 3

  // monthCount = MAX(0, DATEDIF(resDate, fullPaymentDue, "M") + 1)
  const monthCount = Math.max(
    0,
    monthsBetweenInclusiveStart(resD, fullPaymentDue) + 1
  );

  // secondDates = DATE(YEAR(resDate), MONTH(resDate) + SEQUENCE(monthCount), 2)
  const seconds = generateMonthSeconds(resD, monthCount);

  // validDates: seconds within [res+3, fullPaymentDue]
  const eligible = seconds.filter(
    (d) => d >= windowStart && d <= fullPaymentDue
  );

  // IF(ISERROR(validDates), 0, COUNTA(validDates))
  // In JS, filter won't error; count is just eligible.length
  return eligible.length;
}
