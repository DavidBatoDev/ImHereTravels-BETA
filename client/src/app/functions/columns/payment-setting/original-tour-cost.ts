import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const originalTourCostColumn: BookingSheetColumn = {
  id: 'originalTourCost',
  data: {
    id: 'originalTourCost',
    columnName: 'Original Tour Cost',
    dataType: 'function',
    function: 'getOriginalTourCostFunction',
    parentTab: 'Payment Setting',
    order: 33,
    includeInForms: false,
    color: 'gray',
    width: 183.3333740234375,
    arguments: [
      {
        name: 'tourPackageName',
        type: 'string',
        columnReference: 'Tour Package Name',
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: '',
      },
    ],
  },
};

// Column Function Implementation
/**
 * Excel equivalent:
 * =IF(M1003="","",INDEX(
 *     '{INDEX} Tour Packages'!$A:$ZQ,
 *     MATCH($M1003, '{INDEX} Tour Packages'!$A:$A, 0),
 *     MATCH(AF$3, '{INDEX} Tour Packages'!$4:$4, 0)
 *   ))
 *
 * Description:
 * - Retrieves the `originalTourCost` (pricing.original) for a given tour package.
 * - Equivalent to the Excel formula that looks up a value from the `{INDEX} Tour Packages` sheet
 *   using the tour package name (`M1003`) as the key.
 * - If the tour package name is blank or not found, returns an empty string.
 *
 * Parameters:
 * - tourPackageName → string representing the name of the selected tour package.
 *
 * Returns:
 * - number → the original cost of the tour (pricing.original)
 * - "" → if no match or invalid input
 */
export default async function getOriginalTourCost(
  tourPackageName: string
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

  // Return the pricing.original field if found
  const originalTourCost = matchedPackage?.pricing?.original ?? "";

  return originalTourCost;
}
