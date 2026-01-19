import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const cancellationRequestDateColumn: BookingSheetColumn = {
  id: "cancellationRequestDate",
  data: {
    id: "cancellationRequestDate",
    columnName: "Cancellation Request Date",
    dataType: "date",
    parentTab: "Cancellation",
    includeInForms: true,
    color: "none",
    width: 200,
  },
};
