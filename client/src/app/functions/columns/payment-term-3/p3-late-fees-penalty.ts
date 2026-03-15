import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const p3LateFeesPenaltyColumn: BookingSheetColumn = {
  id: "p3LateFeesPenalty",
  data: {
    id: "p3LateFeesPenalty",
    columnName: "P3 Late Fees Penalty",
    dataType: "string",
    parentTab: "Payment Term 3",
    includeInForms: false,
    color: "yellow",
    width: 150,
  },
};
