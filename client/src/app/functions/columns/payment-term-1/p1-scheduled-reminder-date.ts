import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const p1ScheduledReminderDateColumn: BookingSheetColumn = {
  id: "p1ScheduledReminderDate",
  data: {
    id: "p1ScheduledReminderDate",
    columnName: "P1 Scheduled Reminder Date",
    dataType: "function",
    function: "getBaseMondayFromP1DueDateFunction",
    parentTab: "Payment Term 1",
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
        name: "reservationDate",
        type: "any",
        columnReference: "Reservation Date",
        isOptional: true,
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
  reservationDate?: any,
  p1DatePaid?: any,
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
          val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6),
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
  const reservation = toDate(reservationDate);

  // 14 days before due date (calendar arithmetic avoids the DST trap where
  // subtracting N * 86400000 ms can land at 23:00 on the wrong day)
  const reminder = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 14);

  const reminderDay = new Date(
    reminder.getFullYear(),
    reminder.getMonth(),
    reminder.getDate(),
  );
  const reservationDay = reservation
    ? new Date(
        reservation.getFullYear(),
        reservation.getMonth(),
        reservation.getDate(),
      )
    : null;
  const finalReminder =
    reservationDay && reminderDay < reservationDay ? reservationDay : reminderDay;

  // Format to yyyy-mm-dd string
  const y = finalReminder.getFullYear();
  const m = String(finalReminder.getMonth() + 1).padStart(2, "0");
  const day = String(finalReminder.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}
