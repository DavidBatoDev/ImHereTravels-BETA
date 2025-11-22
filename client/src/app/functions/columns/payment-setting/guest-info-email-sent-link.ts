import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const guestInfoEmailSentLinkColumn: BookingSheetColumn = {
  id: "guestInfoEmailSentLink",
  data: {
    id: "guestInfoEmailSentLink",
    columnName: "Guest Info Email Sent Link",
    dataType: "string",
    parentTab: "Payment Setting",
    order: 46,
    includeInForms: true,
    color: "yellow",
  },
};
