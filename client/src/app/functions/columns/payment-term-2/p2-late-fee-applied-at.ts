import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const p2LateFeeAppliedAtColumn: BookingSheetColumn = {
  id: "p2LateFeeAppliedAt",
  data: {
    id: "p2LateFeeAppliedAt",
    columnName: "P2 Late Fee Applied At",
    dataType: "date",
    parentTab: "Payment Term 2",
    includeInForms: false,
    color: "yellow",
    width: 170,
  },
};
