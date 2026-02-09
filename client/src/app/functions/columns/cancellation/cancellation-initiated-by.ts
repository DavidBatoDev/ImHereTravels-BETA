import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const cancellationInitiatedByColumn: BookingSheetColumn = {
  id: "cancellationInitiatedBy",
  data: {
    id: "cancellationInitiatedBy",
    columnName: "Cancellation Initiated By",
    dataType: "select",
    options: ["", "Guest", "IHT"],
    parentTab: "Cancellation",
    includeInForms: false,
    showColumn: true,
    color: "orange",
    width: 200,
  },
};
