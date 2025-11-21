import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const tourPackageNameColumn: BookingSheetColumn = {
  id: "tourPackageName",
  data: {
    id: "tourPackageName",
    columnName: "Tour Package Name",
    dataType: "select",
    parentTab: "Tour Details",
    order: 14,
    includeInForms: true,
    width: 208,
    options: [
      "",
      "India Discovery Tour",
      "Argentina's Wonders",
      "Maldives Bucketlist",
      "New Zealand Expedition",
      "Tanzania Exploration",
      "Sri Lanka Wander Tour",
      "India Holi Festival Tour",
      "Brazil's Treasures",
      "Philippines Sunset",
      "Philippine Sunrise",
      "Siargao Island Adventure",
      "Vietnam Expedition",
      "Japan Adventure (Standard)",
    ],
  },
};
