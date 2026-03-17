import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const p4LateFeeAppliedAtColumn: BookingSheetColumn = {
  id: "p4LateFeeAppliedAt",
  data: {
    id: "p4LateFeeAppliedAt",
    columnName: "P4 Late Fee Applied At",
    dataType: "date",
    parentTab: "Payment Term 4",
    includeInForms: false,
    color: "yellow",
    width: 170,
  },
};
