import { BookingSheetColumn } from "@/types/booking-sheet-column";
import { firebaseUtils } from "@/app/functions/firebase-utils";

export const tourCodeColumn: BookingSheetColumn = {
  id: "tourCode",
  data: {
    id: "tourCode",
    columnName: "Tour Code",
    dataType: "function",
    function: "lookupTourCodeFunction",
    parentTab: "Identifier",
    order: 3,
    includeInForms: false,
    showColumn: true,
    color: "gray",
    width: 156.66668701171875,
    arguments: [
      {
        name: "tourPackageName",
        type: "string",
        columnReference: "Tour Package Name",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

// Column Function Implementation
// lookup-tour-code.ts
// Created on 9/27/2025
// TypeScript file with Firebase SDK access (pre-authenticated)

// Firebase utilities - injected at runtime (hidden from user)
// These variables are provided by the runtime environment
// Users can use them without seeing the implementation details

// Firebase utilities and services are automatically available
// No need to import or define them - they're injected by the runtime

/**
 * Lookup Tour Code by Tour Package Name
 * Fetches tour packages from Firebase and performs lookup
 *
 * Excel equivalent:
 * =IF(M="","",IFERROR(<lookup>, "XXX"))
 */
export default async function lookupTourCode(
  tourPackageName: string | null | undefined
): Promise<string> {
  // If blank -> ""
  if (!tourPackageName || tourPackageName.trim() === "") return "";

  try {
    // Fetch tour packages from Firebase
    const tourPackages = (await firebaseUtils.getCollectionData(
      "tourPackages"
    )) as Array<{
      id: string;
      name?: string;
      tourCode?: string;
      [key: string]: any;
    }>;

    if (!tourPackages || tourPackages.length === 0) {
      console.warn("No tour packages found in Firebase");
      return "XXX";
    }

    const target = tourPackageName.trim().toLowerCase();

    const found = tourPackages.find(
      (p) => p.name && p.name.trim().toLowerCase() === target
    );

    return found?.tourCode || "XXX";
  } catch (error) {
    console.error("Error fetching tour packages:", error);
    return "XXX";
  }
}
