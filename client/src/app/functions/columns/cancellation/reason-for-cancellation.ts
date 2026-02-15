import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const reasonForCancellationColumn: BookingSheetColumn = {
  id: "reasonForCancellation",
  data: {
    id: "reasonForCancellation",
    columnName: "Reason for Cancellation",
    dataType: "select",
    parentTab: "Cancellation",
    includeInForms: true,
    color: "none",
    width: 200,
    options: [
      "",
      // Guest-initiated reasons
      "Guest - Personal/medical reasons",
      "Guest - Change of plans",
      "Guest - Financial reasons",
      "Guest - Payment default/missed deadline",
      "Guest - Travel restrictions/visa issues",
      "Guest - Dissatisfaction with itinerary",

      // IHT-initiated reasons
      "IHT - Tour cancelled/unavailable",
      "IHT - Operational/logistical issues",
      "IHT - Force majeure (weather, safety, government restrictions)",
      "IHT - Insufficient bookings",
      "IHT - Safety concerns",
    ],
  },
};
