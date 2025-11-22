import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const p1ScheduledReminderDateColumn: BookingSheetColumn = {
  id: "p1ScheduledReminderDate",
  data: {
    id: "p1ScheduledReminderDate",
    columnName: "P1 Scheduled Reminder Date",
    dataType: "function",
    function: "getBaseMondayFromP1DueDateFunction",
    parentTab: "Payment Term 1",
    order: 50,
    includeInForms: false,
    color: "yellow",
    width: 180,
    arguments: [
      {
        name: "p1DueDate",
        type: "any",
        columnReference: "P1 Due Date",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p1DatePaid",
        type: "any",
        columnReference: "P1 Date Paid",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

// Column Function Implementation
export default function getBaseMondayFromP1DueDateFunction(
  p1DueDate: any,
  p1DatePaid?: any
): string {
  // --- Return "" if no due date or if there's already a date paid ---
  if (!p1DueDate || p1DatePaid) return "";

  // --- Helper: convert Firestore timestamp / Date / string to Date ---
  const toDate = (val: any): Date | null => {
    if (!val) return null;

    // Firestore Timestamp (either native or Firestore v9 format)
    if (typeof val === "object") {
      // Firestore-style { seconds, nanoseconds }
      if (val?.seconds && typeof val.seconds === "number") {
        return new Date(
          val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6)
        );
      }

      // Firestore legacy format { type: "firestore/timestamp/1.0", seconds, nanoseconds }
      if (
        val?.type === "firestore/timestamp/1.0" &&
        typeof val.seconds === "number"
      ) {
        return new Date(val.seconds * 1000);
      }
    }

    // JS Date instance
    if (val instanceof Date && !isNaN(val.getTime())) return val;

    // Parse string like "Aug 2, 2025"
    if (typeof val === "string" && val.trim() !== "") {
      const parsed = new Date(val);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  };

  const d = toDate(p1DueDate);
  if (!d) return "";

  // Spreadsheet formula: EOMONTH(d,-1) - get last day of previous month
  const eomPrev = new Date(d.getFullYear(), d.getMonth(), 0);

  // limit = lastDay - 6 (a week before month end)
  const limit = new Date(eomPrev);
  limit.setDate(limit.getDate() - 6);

  // Find Monday: limit - MOD(WEEKDAY(limit,2)-1, 7)
  // WEEKDAY(limit, 2) makes Monday = 1, Sunday = 7
  const weekday = ((limit.getDay() + 6) % 7) + 1; // Convert to ISO weekday
  const mod = (weekday - 1) % 7;
  const base = new Date(limit);
  base.setDate(base.getDate() - mod);

  // Format to yyyy-mm-dd string
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}
