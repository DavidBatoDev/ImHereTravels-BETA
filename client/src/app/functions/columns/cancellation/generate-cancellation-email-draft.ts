import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const generateCancellationEmailDraftColumn: BookingSheetColumn = {
  id: "generateCancellationDraft",
  data: {
    id: "generateCancellationDraft",
    columnName: "Generate Cancellation Email Draft",
    dataType: "boolean",
    parentTab: "Cancellation",
    includeInForms: false,
    color: "orange",
    width: 200,
  },
};
