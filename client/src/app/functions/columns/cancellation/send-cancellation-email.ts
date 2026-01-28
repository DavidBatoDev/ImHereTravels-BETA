import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const sendCancellationEmailColumn: BookingSheetColumn = {
  id: "sendCancellationEmail",
  data: {
    id: "sendCancellationEmail",
    columnName: "Send Cancellation Email?",
    dataType: "boolean",
    parentTab: "Cancellation",
    includeInForms: true,
    color: "yellow",
    width: 180,
  },
};
