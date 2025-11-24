import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const sentInitialReminderLinkColumn: BookingSheetColumn = {
  id: "sentInitialReminderLink",
  data: {
    id: "sentInitialReminderLink",
    columnName: "Sent Initial Reminder Link",
    dataType: "string",
    parentTab: "Payment Setting",
    order: 43,
    includeInForms: false,
    color: "orange",
    width: 200,
  },
};
