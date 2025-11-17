import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const p1ScheduledReminderDateColumn: BookingSheetColumn = {
  id: 'p1ScheduledReminderDate',
  data: {
    id: 'p1ScheduledReminderDate',
    columnName: 'P1 Scheduled Reminder Date',
    dataType: 'function',
    function: 'getBaseMondayFromP1DueDateFunction',
    parentTab: 'Payment Term 1',
    order: 49,
    includeInForms: false,
    color: 'yellow',
    width: 180,
    arguments: [
      {
        name: 'p1DueDate',
        type: 'any',
        columnReference: 'P1 Due Date',
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'p1DatePaid',
        type: 'any',
        columnReference: 'P1 Date Paid',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
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
        return new Date(val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6));
      }

      // Firestore legacy format { type: "firestore/timestamp/1.0", seconds, nanoseconds }
      if (val?.type === "firestore/timestamp/1.0" && typeof val.seconds === "number") {
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

  // --- EOMONTH(d, -1): last day of previous month ---
  const eomPrev = new Date(d.getFullYear(), d.getMonth(), 0);

  // --- WEEKDAY(EOMONTH(d,-1), 2): Monday = 1, Sunday = 7 ---
  const weekday = ((eomPrev.getDay() + 6) % 7) + 1;

  // --- base = EOMONTH(d,-1) - MOD(WEEKDAY(...)-1,7) ---
  const mod = (weekday - 1) % 7;
  const base = new Date(eomPrev);
  base.setDate(base.getDate() - mod);

  // --- if (d - base < 7 days), then base - 7 days ---
  const diffDays = (d.getTime() - base.getTime()) / (1000 * 60 * 60 * 24);
  const finalDate =
    diffDays < 7
      ? new Date(base.getTime() - 7 * 24 * 60 * 60 * 1000)
      : base;

  // --- Format to yyyy-mm-dd string ---
  const y = finalDate.getFullYear();
  const m = String(finalDate.getMonth() + 1).padStart(2, "0");
  const day = String(finalDate.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}
