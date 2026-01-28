import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const p4ScheduledReminderDateColumn: BookingSheetColumn = {
  id: "p4ScheduledReminderDate",
  data: {
    id: "p4ScheduledReminderDate",
    columnName: "P4 Scheduled Reminder Date",
    dataType: "function",
    function: "getBaseMondayFromP4DueDateFunction",
    parentTab: "Payment Term 4",
    includeInForms: false,
    color: "yellow",
    width: 211.3333740234375,
    arguments: [
      {
        name: "p4DueDate",
        type: "any",
        columnReference: "P4 Due Date",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p4DatePaid",
        type: "any",
        columnReference: "P4 Date Paid",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

// Column Function Implementation
export default function getBaseMondayFromP4DueDateFunction(
  p4DueDate: any,
  p4DatePaid?: any
): string {
  if (!p4DueDate || p4DatePaid) return "";

  const toDate = (val: any): Date | null => {
    if (!val) return null;

    if (typeof val === "object") {
      if (val?.seconds && typeof val.seconds === "number") {
        return new Date(val.seconds * 1000);
      }
      if (
        val?.type === "firestore/timestamp/1.0" &&
        typeof val.seconds === "number"
      ) {
        return new Date(val.seconds * 1000);
      }
    }

    if (val instanceof Date && !isNaN(val.getTime())) return val;

    if (typeof val === "string" && val.trim() !== "") {
      const parsed = new Date(val);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  };

  const d = toDate(p4DueDate);
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
