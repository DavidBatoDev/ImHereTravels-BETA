import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const supplierCostsCommittedColumn: BookingSheetColumn = {
  id: "supplierCostsCommitted",
  data: {
    id: "supplierCostsCommitted",
    columnName: "Supplier Costs Committed",
    dataType: "number",
    parentTab: "Cancellation",
    includeInForms: false,
    showColumn: true,
    color: "orange",
    width: 200,
    defaultValue: 0,
  },
};
