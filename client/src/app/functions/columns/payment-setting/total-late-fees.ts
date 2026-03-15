import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const totalLateFeesColumn: BookingSheetColumn = {
  id: "totalLateFees",
  data: {
    id: "totalLateFees",
    columnName: "Total Late Fees",
    dataType: "currency",
    parentTab: "Payment Setting",
    includeInForms: false,
    color: "yellow",
    width: 140,
  },
};
