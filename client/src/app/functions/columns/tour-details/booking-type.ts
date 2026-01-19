import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const bookingTypeColumn: BookingSheetColumn = {
  id: "bookingType",
  data: {
    id: "bookingType",
    columnName: "Booking Type",
    dataType: "select",
    parentTab: "Tour Details",
    includeInForms: true,
    color: "none",
    width: 158,
    options: ["", "Single Booking", "Duo Booking", "Group Booking"],
  },
};
