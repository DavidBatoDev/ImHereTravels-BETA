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
  p1LateFeesPenalty?: number | string | null,
  p2LateFeesPenalty?: number | string | null,
  p3LateFeesPenalty?: number | string | null,
  p4LateFeesPenalty?: number | string | null,
): number {
  const toNumber = (value: number | string | null | undefined): number => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === "string") {
      const normalized = value.replace(/[^\d.-]/g, "").trim();
      if (!normalized) return 0;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  };

  return (
    toNumber(p1LateFeesPenalty) +
    toNumber(p2LateFeesPenalty) +
    toNumber(p3LateFeesPenalty) +
    toNumber(p4LateFeesPenalty)
  );
}
