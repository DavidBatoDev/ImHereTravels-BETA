import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const bookingCodeColumn: BookingSheetColumn = {
  id: 'bookingCode',
  data: {
    id: 'bookingCode',
    columnName: 'Booking Code',
    dataType: 'function',
    function: 'bookingCodeColumnFunction',
    parentTab: 'Identifier',
    order: 2,
    includeInForms: false,
    showColumn: false,
    color: 'gray',
    width: 167.54165649414062,
    arguments: [
      {
        name: 'bookingType',
        type: 'string',
        columnReference: 'Booking Type',
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
 * Replicates the Excel formula:
 * =IF(L="Single Booking","SB",IF(L="Duo Booking","DB",IF(L="Group Booking","GB","")))
 *
 * Logic:
 *  - If bookingType = "Single Booking" -> "SB"
 *  - If bookingType = "Duo Booking"    -> "DB"
 *  - If bookingType = "Group Booking"  -> "GB"
 *  - Else -> ""
 */
export default function bookingCodeColumnFunction(bookingType: string | null | undefined): string {
  if (!bookingType) return "";

  if (bookingType === "Single Booking") return "SB";
  if (bookingType === "Duo Booking") return "DB";
  if (bookingType === "Group Booking") return "GB";

  return "";
}
