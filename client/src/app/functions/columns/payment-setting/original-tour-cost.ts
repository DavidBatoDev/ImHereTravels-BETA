import { BookingSheetColumn } from "@/types/booking-sheet-column";
import { firebaseUtils } from "@/app/functions/firebase-utils";

export const originalTourCostColumn: BookingSheetColumn = {
  id: "originalTourCost",
  data: {
    id: "originalTourCost",
    columnName: "Original Tour Cost",
    dataType: "function",
    function: "getOriginalTourCostFunction",
    parentTab: "Payment Setting",
    order: 33,
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
        name: "eventName",
        type: "string",
        columnReference: "Event Name",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "discountRate",
        type: "number",
        columnReference: "Discount Rate",
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
 * Excel equivalent:
 * =IF(M998="","",
 *   IF(AND(X998<>"", Y998<>""),
 *     INDEX('{INDEX} Tour Packages'!$A:$ZQ,
 *           MATCH($M998, '{INDEX} Tour Packages'!$A:$A, 0),
 *           MATCH(AH$3, '{INDEX} Tour Packages'!$4:$4, 0)) * (1 - Y998),
 *     INDEX('{INDEX} Tour Packages'!$A:$ZQ,
 *           MATCH($M998, '{INDEX} Tour Packages'!$A:$A, 0),
 *           MATCH(AH$3, '{INDEX} Tour Packages'!$4:$4, 0))
 *   )
 * )
 *
 * Description:
 * - Retrieves the `originalTourCost` (pricing.original) for a given tour package.
 * - If eventName and discountRate are provided, applies the discount to the original cost.
 * - Equivalent to the Excel formula that looks up a value from the `{INDEX} Tour Packages` sheet
 *   using the tour package name as the key, then applies discount if applicable.
 * - If the tour package name is blank or not found, returns an empty string.
 *
 * Parameters:
 * - tourPackageName → string representing the name of the selected tour package.
 * - eventName → optional string representing the discount event name (X column)
 * - discountRate → optional number representing the discount rate as decimal (Y column)
 *
 * Returns:
 * - number → the original cost (with discount applied if eventName and discountRate exist)
 * - "" → if no match or invalid input
 */
export default async function getOriginalTourCost(
  tourPackageName: string,
  eventName?: string | null,
  discountRate?: number | null
): Promise<number | ""> {
  if (!tourPackageName) return "";

  // Fetch all tour packages
  const tourPackages = await firebaseUtils.getCollectionData("tourPackages");
  if (!tourPackages || tourPackages.length === 0) return "";

  // Find the document with matching name
  const matchedPackage = tourPackages.find(
    (pkg: any) =>
      pkg.name?.toLowerCase().trim() === tourPackageName.toLowerCase().trim()
  );

  // Get the base original tour cost
  const baseCost = (matchedPackage as any)?.pricing?.original ?? "";

  if (baseCost === "") return "";

  // If eventName and discountRate exist, apply the discount
  if (eventName && discountRate !== null && discountRate !== undefined) {
    // discountRate is already in decimal form (e.g., 0.10 for 10%)
    const discountedCost = baseCost * (1 - discountRate);
    return discountedCost;
  }

  // Otherwise, return the base cost
  return baseCost;
}
