import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const p1DatePaidColumn: BookingSheetColumn = {
  id: "p1DatePaid",
  data: {
    id: "p1DatePaid",
    columnName: "P1 Date Paid",
    dataType: "date",
    parentTab: "Payment Term 1",
    includeInForms: true,
    width: 120,
  },
};
