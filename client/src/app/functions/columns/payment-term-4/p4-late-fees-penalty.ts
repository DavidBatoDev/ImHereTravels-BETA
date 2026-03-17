import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const p4LateFeesPenaltyColumn: BookingSheetColumn = {
  id: "p4LateFeesPenalty",
  data: {
    id: "p4LateFeesPenalty",
    columnName: "P4 Late Fees Penalty",
    dataType: "string",
    parentTab: "Payment Term 4",
    includeInForms: false,
    color: "yellow",
    width: 150,
  },
};
