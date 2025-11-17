import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const returnDateColumn: BookingSheetColumn = {
  id: "returnDate",
  data: {
    id: "returnDate",
    columnName: "Return Date",
    dataType: "function",
    function: "tourEndDateFromStartAndDurationFunction",
    parentTab: "Tour Details",
    order: 16,
    includeInForms: false,
    showColumn: true,
    color: "gray",
    width: 321.9791717529297,
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
        name: "durationValue",
        type: "unknown",
        columnReference: "Tour Duration",
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
 * =IF(N="","",IFERROR(N + VALUE(REGEXEXTRACT(P, "(\d+)\\s+Days")), ""))
 *
 * - N = tourDate (robust parsing)
 * - P = durationDays (string, e.g. "13 Days")
 * - Returns: "yyyy-mm-dd" (end date) or "" if blank/error
 */
export default function tourEndDateFromStartAndDurationFunction(
  tourDate: unknown,
  durationDays: string | null | undefined
): string {
  // --- helpers ---
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

  const toStartOfDay = (d: Date): Date =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const addDays = (base: Date, days: number): Date => {
    const out = new Date(base);
    out.setDate(out.getDate() + days);
    return out;
  };

  const formatYYYYMMDD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // --- logic ---
  const start = toDate(tourDate);
  if (!start || isNaN(start.getTime())) return "";

  // Extract number from string like "13 Days", "8D", or "15"
  const match =
    typeof durationDays === "string" ? durationDays.match(/\d+/) : null;
  const days = match ? parseInt(match[0], 10) : NaN;

  if (!days || isNaN(days)) return "";

  const end = addDays(toStartOfDay(start), days);
  return formatYYYYMMDD(end);
}
