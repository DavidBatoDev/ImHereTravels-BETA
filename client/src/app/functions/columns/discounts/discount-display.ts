import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const discountDisplayColumn: BookingSheetColumn = {
  id: "discountDisplay",
  data: {
    id: "discountDisplay",
    columnName: "Discount Display",
    dataType: "function",
    function: "getDiscountDisplayFunction",
    parentTab: "Discounts",
    order: 10.5,
    includeInForms: false,
    width: 120,
    arguments: [
      {
        name: "discountRate",
        type: "number",
        columnReference: "Discount Rate",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "discountType",
        type: "string",
        columnReference: "Discount Type",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

/**
 * Formats the discount rate for human-readable display.
 * 
 * For percentage discounts: Returns "20.00% off"
 * For flat amount discounts: Returns "£300 off"
 * No discount: Returns ""
 * 
 * Parameters:
 * - discountRate → number (percentage value like 20, or flat amount like 300)
 * - discountType → string indicating "percent" or "amount"
 *
 * Returns:
 * - string → formatted display like "20.00% off" or "£300 off"
 */

export default async function getDiscountDisplayFunction(
  discountRate?: number | null,
  discountType?: string | null
): Promise<string> {
  // No discount
  if (
    discountRate === null ||
    discountRate === undefined ||
    discountRate === 0
  ) {
    return "";
  }

  if (discountType === "percent") {
    // For percentage: format as "20.00% off"
    return `${discountRate.toFixed(2)}% off`;
  } else if (discountType === "amount") {
    // For flat amount: format as "£300 off"
    return `£${Math.round(discountRate)} off`;
  }

  // Default to percentage formatting if type not specified
  return `${discountRate.toFixed(2)}% off`;
}
