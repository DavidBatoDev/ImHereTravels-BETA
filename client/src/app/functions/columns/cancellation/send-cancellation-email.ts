import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const sendCancellationEmailColumn: BookingSheetColumn = {
  id: "sendCancellationEmail",
  data: {
    id: "sendCancellationEmail",
    columnName: "Send Cancellation Email?",
    dataType: "boolean",
    parentTab: "Cancellation",
    order: 83,
    includeInForms: true,
    color: "yellow",
    width: 180,
  },
};
