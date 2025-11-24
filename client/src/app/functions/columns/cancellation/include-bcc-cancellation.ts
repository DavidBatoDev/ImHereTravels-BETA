import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const includeBccCancellationColumn: BookingSheetColumn = {
  id: "includeBccCancellation",
  data: {
    id: "includeBccCancellation",
    columnName: "Include BCC (Cancellation)",
    dataType: "boolean",
    parentTab: "Cancellation",
    order: 79,
    includeInForms: true,
    color: "orange",
    width: 180,
  },
};
