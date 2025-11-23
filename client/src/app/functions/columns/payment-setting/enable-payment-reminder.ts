import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const enablePaymentReminderColumn: BookingSheetColumn = {
  id: "enablePaymentReminder",
  data: {
    id: "enablePaymentReminder",
    columnName: "Enable Payment Reminder",
    dataType: "boolean",
    parentTab: "Payment Setting",
    order: 42,
    includeInForms: true,
    color: "orange",
    width: 239.3333740234375,
  },
};
