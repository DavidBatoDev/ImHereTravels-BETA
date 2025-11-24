import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const p2DatePaidColumn: BookingSheetColumn = {
  id: "p2DatePaid",
  data: {
    id: "p2DatePaid",
    columnName: "P2 Date Paid",
    dataType: "date",
    parentTab: "Payment Term 2",
    order: 63,
    includeInForms: true,
    width: 120,
  },
};
