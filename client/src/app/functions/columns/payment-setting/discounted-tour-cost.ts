import { BookingSheetColumn } from "@/types/booking-sheet-column";
import { firebaseUtils } from "@/app/functions/firebase-utils";

export const discountedTourCostColumn: BookingSheetColumn = {
  id: "discountedTourCost",
  data: {
    id: "discountedTourCost",
    columnName: "Discounted Tour Cost",
    dataType: "function",
    function: "getTourDiscountedCostFunction",
    parentTab: "Payment Setting",
    order: 34,
    includeInForms: false,
    color: "gray",
    width: 205.3333740234375,
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
 * Excel equivalent:
 * =IF(M1002="","",INDEX(
 *     '{INDEX} Tour Packages'!$A:$ZQ,
 *     MATCH($M1002, '{INDEX} Tour Packages'!$A:$A, 0),
 *     MATCH(AG$3, '{INDEX} Tour Packages'!$4:$4, 0)
 *   ))
 *
 * Description:
 * - Retrieves the `deposit` amount (pricing.deposit) for a given tour package.
 * - Equivalent to the Excel formula that looks up a value from the `{INDEX} Tour Packages` sheet
 *   using the tour package name (`M1002`) as the key and the column header in `AG3`.
 * - If the tour package name is blank or not found, returns an empty string.
 *
 * Parameters:
 * - tourPackageName → string representing the name of the selected tour package.
 *
 * Returns:
 * - number → the deposit cost of the tour (pricing.deposit)
 * - "" → if no match or invalid input
 */

export default async function getTourDiscountedCost(
  tourPackageName: string
): Promise<number | ""> {
  if (!tourPackageName) return "";

  // Fetch all tour packages from Firestore
  const tourPackages = await firebaseUtils.getCollectionData("tourPackages");
  if (!tourPackages || tourPackages.length === 0) return "";

  // Find the matching document by tour package name
  const matchedPackage = tourPackages.find(
    (pkg: any) =>
      pkg.name?.toLowerCase().trim() === tourPackageName.toLowerCase().trim()
  );

  // Return the deposit field if found
  const depositCost = matchedPackage?.pricing?.discounted ?? "";

  return depositCost;
}
