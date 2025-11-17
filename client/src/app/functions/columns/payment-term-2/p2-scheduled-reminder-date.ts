import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const p2ScheduledReminderDateColumn: BookingSheetColumn = {
  id: 'p2ScheduledReminderDate',
  data: {
    id: 'p2ScheduledReminderDate',
    columnName: 'P2 Scheduled Reminder Date',
    dataType: 'function',
    function: 'getBaseMondayFromP2DueDateFunction',
    parentTab: 'Payment Term 2',
    order: 56,
    includeInForms: false,
    color: 'yellow',
    width: 218,
    arguments: [
      {
        name: 'p2DueDate',
        type: 'any',
        columnReference: 'P2 Due Date',
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'p2DatePaid',
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
export default function getBaseMondayFromP2DueDateFunction(
  p2DueDate: any,
  p2DatePaid?: any
): string {
  if (!p2DueDate || p2DatePaid) return "";

  const toDate = (val: any): Date | null => {
    if (!val) return null;

    if (typeof val === "object") {
      if (val?.seconds && typeof val.seconds === "number") {
        return new Date(val.seconds * 1000);
      }
      if (val?.type === "firestore/timestamp/1.0" && typeof val.seconds === "number") {
        return new Date(val.seconds * 1000);
      }
    }

    if (val instanceof Date && !isNaN(val.getTime())) return val;

    if (typeof val === "string" && val.trim() !== "") {
      const parts = val.split(",").map((p) => p.trim());
      for (const part of parts) {
        const parsed = new Date(part);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }

    return null;
  };

  const d = toDate(p2DueDate);
  if (!d) return "";

  // Compute the base Monday before the due date month
  const eomPrev = new Date(d.getFullYear(), d.getMonth(), 0);
  const weekday = ((eomPrev.getDay() + 6) % 7) + 1; // ISO weekday
  const mod = (weekday - 1) % 7;
  const base = new Date(eomPrev);
  base.setDate(base.getDate() - mod);

  const diffDays = (d.getTime() - base.getTime()) / (1000 * 60 * 60 * 24);
  const finalDate =
    diffDays < 7
      ? new Date(base.getTime() - 7 * 24 * 60 * 60 * 1000)
      : base;

  // Always return formatted string
  const y = finalDate.getFullYear();
  const m = String(finalDate.getMonth() + 1).padStart(2, "0");
  const day = String(finalDate.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}
