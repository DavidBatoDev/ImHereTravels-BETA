import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const reasonForCancellationColumn: BookingSheetColumn = {
  id: "reasonForCancellation",
  data: {
    id: "reasonForCancellation",
    columnName: "Reason for Cancellation",
    dataType: "select",
    parentTab: "Cancellation",
    order: 78,
    includeInForms: true,
    color: "none",
    width: 200,
    options: [
      "",
      "Tour Date is too close from Reservation Date.",
      "The Tour is fully booked.",
      "The Tour has been cancelled.",
      "Guest personal reason",
      "Operational / logistical issue",
      "Unforeseen events (e.g., weather, government restrictions, safety concerns)",
    ],
  },
};
