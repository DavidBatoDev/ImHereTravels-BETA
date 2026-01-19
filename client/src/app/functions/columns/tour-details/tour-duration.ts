import { BookingSheetColumn } from "@/types/booking-sheet-column";
import { firebaseUtils } from "@/app/functions/firebase-utils";

export const tourDurationColumn: BookingSheetColumn = {
  id: "tourDuration",
  data: {
    id: "tourDuration",
    columnName: "Tour Duration",
    dataType: "function",
    function: "tourDurationByNameFunction",
    parentTab: "Tour Details",
    includeInForms: false,
    showColumn: true,
    color: "gray",
    width: 150.6666259765625,
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
/**
 * Fetches the tour duration (as string) by tour package name from Firestore.
 *
 * Firestore collection: "tourPackages"
 * Expected fields: { name: string, duration: string | number }
 *
 * @param tourPackageName value from column M
 * @returns duration as string (e.g. "13") or "" if not found
 */
export default async function tourDurationByName(
  tourPackageName?: string | null
): Promise<string> {
  if (!tourPackageName || !tourPackageName.trim()) return "";

  // Fetch all tour packages
  const tourPackages = await firebaseUtils.getCollectionData("tourPackages");
  if (!tourPackages || tourPackages.length === 0) return "";

  // Find matching package by name
  const matchedPackage = tourPackages.find(
    (pkg: any) =>
      pkg.name?.toLowerCase().trim() === tourPackageName.toLowerCase().trim()
  ) as any;

  // Return duration as string (Excel-style)
  return matchedPackage?.duration ? String(matchedPackage.duration) : "";
}
