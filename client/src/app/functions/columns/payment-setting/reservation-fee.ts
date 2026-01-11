import { BookingSheetColumn } from "@/types/booking-sheet-column";
import { firebaseUtils } from "@/app/functions/firebase-utils";

export const reservationFeeColumn: BookingSheetColumn = {
  id: "reservationFee",
  data: {
    id: "reservationFee",
    columnName: "Reservation Fee",
    dataType: "function",
    function: "getTourCurrencyAndDepositFunction",
    parentTab: "Payment Setting",
    order: 35,
    includeInForms: false,
    color: "gray",
    width: 176.666748046875,
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
 * Excel equivalent:
 * =IF(M1003="","",INDEX(
 *     '{INDEX} Tour Packages'!$A:$ZQ,
 *     MATCH($M1003, '{INDEX} Tour Packages'!$A:$A, 0),
 *     MATCH(AH$3, '{INDEX} Tour Packages'!$4:$4, 0)
 *   ))
 *
 * Description:
 * - Retrieves a formatted string combining the tour package's `currency` and `deposit` amount.
 * - Equivalent to returning `${currency}${deposit}` based on the selected tour package name (`M1003`).
 * - If the tour package name is blank or not found, returns an empty string.
 *
 * Example:
 * - Firestore fields: pricing.currency = "EUR", pricing.deposit = 250
 * - Returns: "EUR250"
 *
 * Parameters:
 * - tourPackageName → string representing the name of the selected tour package.
 *
 * Returns:
 * - string → formatted value like "EUR250"
 * - "" → if no match or invalid input
 */

export default async function getTourCurrencyAndDeposit(
  tourPackageName: string,
  tourDate?: any
): Promise<string | ""> {
  if (!tourPackageName) return "";

  // Fetch tourPackages collection
  const tourPackages = await firebaseUtils.getCollectionData("tourPackages");
  if (!tourPackages || tourPackages.length === 0) return "";

  // Find matching package by name
  const matchedPackage = tourPackages.find(
    (pkg: any) =>
      pkg.name?.toLowerCase().trim() === tourPackageName.toLowerCase().trim()
  ) as any;

  if (!matchedPackage?.pricing) return "";

  let depositAmount = matchedPackage.pricing.deposit;

  // Check for custom deposit price if tourDate is provided
  if (tourDate && (matchedPackage as any)?.travelDates) {
    const travelDateToMatch = new Date(tourDate);
    const matchingTravelDate = (matchedPackage as any).travelDates.find(
      (td: any) => {
        const tdStart = td.startDate?.toDate?.() || new Date(td.startDate);
        return tdStart.toDateString() === travelDateToMatch.toDateString();
      }
    );

    // If custom deposit is set for this date, use it
    if (
      matchingTravelDate?.hasCustomDeposit &&
      matchingTravelDate?.customDeposit !== undefined
    ) {
      depositAmount = matchingTravelDate.customDeposit;
    }
  }

  const { currency } = matchedPackage.pricing;

  // Return formatted currency+deposit (e.g., "EUR250")
  return currency && depositAmount ? depositAmount : "";
}
