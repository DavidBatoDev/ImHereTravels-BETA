import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const formattedDateColumn: BookingSheetColumn = {
  id: "formattedDate",
  data: {
    id: "formattedDate",
    columnName: "Formatted Date",
    dataType: "function",
    function: "tourDateToYyyymmddFunction",
    parentTab: "Identifier",
    order: 6,
    includeInForms: false,
    showColumn: true,
    color: "gray",
    width: 182,
    arguments: [
      {
        name: "tourDate",
        type: "string",
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
 * Excel equivalent: =IF(N="","",TEXT(N,"yyyymmdd"))
 *
 * Accepts:
 *  - null/undefined/"" -> returns ""
 *  - Date
 *  - number (ms since epoch)
 *  - string ("September 15, 2025 at 8:00:00 AM UTC+8", "15/09/2025", "2025-09-15")
 *  - Firestore Timestamp (has .toDate())
 *  - { seconds: number, nanoseconds?: number } shape
 *
 * Returns:
 *  - "yyyymmdd" for valid inputs
 *  - "ERROR" for invalid inputs
 */
export default function tourDateToYyyymmddFunction(tourDate: unknown): string {
  // 1) Blank handling
  if (tourDate === null || tourDate === undefined) return "";
  if (typeof tourDate === "string" && tourDate.trim() === "") return "";

  // 2) Try to normalize to a Date
  let date: Date | null = null;

  try {
    // Firestore Timestamp: has .toDate()
    if (
      typeof tourDate === "object" &&
      tourDate !== null &&
      "toDate" in (tourDate as any) &&
      typeof (tourDate as any).toDate === "function"
    ) {
      date = (tourDate as any).toDate();
    }
    // Firestore-like { seconds, nanoseconds }
    else if (
      typeof tourDate === "object" &&
      tourDate !== null &&
      "seconds" in (tourDate as any) &&
      typeof (tourDate as any).seconds === "number"
    ) {
      const s = (tourDate as any).seconds as number;
      const ns =
        typeof (tourDate as any).nanoseconds === "number"
          ? (tourDate as any).nanoseconds
          : 0;
      date = new Date(s * 1000 + Math.floor(ns / 1e6));
    }
    // Already a Date
    else if (tourDate instanceof Date) {
      date = tourDate;
    }
    // Milliseconds timestamp
    else if (typeof tourDate === "number") {
      const d = new Date(tourDate);
      date = isNaN(d.getTime()) ? null : d;
    }
    // String inputs
    else if (typeof tourDate === "string") {
      const raw = tourDate.trim();

      // dd/mm/yyyy
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const [dd, mm, yyyy] = raw.split("/").map(Number);
        date = new Date(yyyy, mm - 1, dd);
      }
      // yyyy-mm-dd
      else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [yyyy, mm, dd] = raw.split("-").map(Number);
        date = new Date(yyyy, mm - 1, dd);
      }
      // Natural/ISO strings (includes "UTC+8")
      else {
        const parsed = new Date(raw);
        date = isNaN(parsed.getTime()) ? null : parsed;
      }
    }

    // 3) Validate
    if (!date || isNaN(date.getTime())) return "ERROR";

    // 4) Format yyyymmdd
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  } catch {
    return "ERROR";
  }
}
