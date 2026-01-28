import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const fullNameColumn: BookingSheetColumn = {
  id: "fullName",
  data: {
    id: "fullName",
    columnName: "Full Name",
    dataType: "function",
    function: "fullNameFunction",
    parentTab: "Traveler Information",
    includeInForms: false,
    color: "gray",
    width: 327.3333740234375,
    arguments: [
      {
        name: "f",
        type: "string",
        columnReference: "First Name",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "l",
        type: "string",
        columnReference: "Last Name",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

// Column Function Implementation
// fullName.ts
// Created on 9/15/2025
// TypeScript file with export default function

export default function fullNameFunction(
  f: string | null | undefined,
  l: string | null | undefined
) {
  if (f && l) {
    return `${f} ${l}`;
  }

  return "";
}
