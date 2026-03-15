import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const totalLateFeesColumn: BookingSheetColumn = {
  id: "totalLateFees",
  data: {
    id: "totalLateFees",
    columnName: "Total Late Fees",
    dataType: "function",
    function: "getTotalLateFeesFunction",
    parentTab: "Payment Setting",
    includeInForms: false,
    color: "yellow",
    width: 140,
    arguments: [
      {
        name: "p1LateFeesPenalty",
        type: "number",
        columnReference: "P1 Late Fees Penalty",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p2LateFeesPenalty",
        type: "number",
        columnReference: "P2 Late Fees Penalty",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p3LateFeesPenalty",
        type: "number",
        columnReference: "P3 Late Fees Penalty",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p4LateFeesPenalty",
        type: "number",
        columnReference: "P4 Late Fees Penalty",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

// Column Function Implementation
export default function getTotalLateFeesFunction(
  p1LateFeesPenalty?: number | null,
  p2LateFeesPenalty?: number | null,
  p3LateFeesPenalty?: number | null,
  p4LateFeesPenalty?: number | null,
): number {
  return (
    (Number(p1LateFeesPenalty) || 0) +
    (Number(p2LateFeesPenalty) || 0) +
    (Number(p3LateFeesPenalty) || 0) +
    (Number(p4LateFeesPenalty) || 0)
  );
}
