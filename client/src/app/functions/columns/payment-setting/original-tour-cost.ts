import { BookingSheetColumn } from "@/types/booking-sheet-column";
import { firebaseUtils } from "@/app/functions/firebase-utils";

export const originalTourCostColumn: BookingSheetColumn = {
  id: "originalTourCost",
  data: {
    id: "originalTourCost",
    columnName: "Original Tour Cost",
    dataType: "function",
    function: "getOriginalTourCostFunction",
    parentTab: "Tour Details",
    includeInForms: false,
    color: "gray",
    width: 183.3333740234375,
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
      {
        name: "tourDate",
        type: "date",
        columnReference: "Tour Date",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

// Column Function Implementation
/**
 * Description:
 * - Retrieves the base `originalTourCost` (pricing.original) for a given tour package.
 * - No discounts are applied here; discounts are handled by the discounted-tour-cost column.
 * - If the tour package name is blank or not found, returns an empty string.
 *
 * Parameters:
 * - tourPackageName → string representing the name of the selected tour package.
 * - tourDate → optional date used to select a custom original price for that travel date.
 *
 * Returns:
 * - number → the original cost for the tour package (or custom date-specific original price)
 * - "" → if no match or invalid input
 */
export default async function getOriginalTourCost(
  tourPackageName: string,
  tourDate?: any
): Promise<number | ""> {
  if (!tourPackageName) return "";

  // Fetch all tour packages
  const tourPackages = await firebaseUtils.getCollectionData("tourPackages");
  if (!tourPackages || tourPackages.length === 0) return "";

  // Find the document with matching name
  const matchedPackage = tourPackages.find(
    (pkg: any) =>
      pkg.name?.toLowerCase().trim() === tourPackageName.toLowerCase().trim(),
  );

  // Check for custom original price if tourDate is provided
  let baseCost: number | "" = "";
  if (tourDate && (matchedPackage as any)?.travelDates) {
    // Handle Firestore Timestamp object properly
    let travelDateToMatch: Date;
    if (tourDate.seconds !== undefined) {
      // Firestore Timestamp format: {seconds: number, nanoseconds: number}
      travelDateToMatch = new Date(tourDate.seconds * 1000);
    } else if (tourDate.toDate && typeof tourDate.toDate === "function") {
      // Firestore Timestamp instance
      travelDateToMatch = tourDate.toDate();
    } else {
      // Fallback: try to parse as regular date
      travelDateToMatch = new Date(tourDate);
    }

    const matchingTravelDate = (matchedPackage as any).travelDates.find(
      (td: any) => {
        const tdStart = td.startDate?.toDate?.() || new Date(td.startDate);
        return tdStart.toDateString() === travelDateToMatch.toDateString();
      },
    );

    // If custom original price is set for this date, use it
    if (
      matchingTravelDate?.hasCustomOriginal &&
      matchingTravelDate?.customOriginal !== undefined
    ) {
      baseCost = matchingTravelDate.customOriginal;
    } else {
      baseCost = (matchedPackage as any)?.pricing?.original ?? "";
    }
  } else {
    // No tourDate provided, use default pricing
    baseCost = (matchedPackage as any)?.pricing?.original ?? "";
  }

  if (baseCost === "") return "";

  // Always return the base (non-discounted) original cost. Discounts are applied elsewhere.
  return baseCost;
}
