import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const isNoShowColumn: BookingSheetColumn = {
  id: "isNoShow",
  data: {
    id: "isNoShow",
    columnName: "No-Show",
    dataType: "boolean",
    parentTab: "Cancellation",
    includeInForms: false,
    showColumn: true,
    color: "red",
    width: 120,
    defaultValue: false,
  },
};
