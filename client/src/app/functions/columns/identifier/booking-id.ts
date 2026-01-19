import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const bookingIdColumn: BookingSheetColumn = {
  id: "bookingId",
  data: {
    id: "bookingId",
    columnName: "Booking ID",
    dataType: "function",
    function: "generateBookingReferenceFunction",
    parentTab: "Identifier",
    includeInForms: false,
    showColumn: true,
    color: "gray",
    width: 288,
    arguments: [
      {
        name: "bookingType",
        type: "string",
        columnReference: "Booking Type",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "supportingFields",
        type: "{}",
        columnReferences: [
          "Booking Code",
          "Tour Code",
          "Formatted Date",
          "Traveller Initials",
          "Tour Package Name Unique Counter",
          "Email Address",
          "Full Name",
        ],
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "bookingId",
        type: "string",
        columnReference: "Booking Code",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "tourCode",
        type: "string",
        columnReference: "Tour Code",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "formattedDate",
        type: "string",
        columnReference: "Formatted Date",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "travelsInitial",
        type: "string",
        columnReference: "Traveller Initials",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "tourPackageUniqueCounter",
        type: "string",
        columnReference: "Tour Package Name Unique Counter",
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
 * Replicates the Excel formula:
 * =IF(N="","",IF(COUNTA(L:T)<6,"", B & "-" & C & "-" & D & "-" & E & F))
 *
 * Logic:
 *  - If tourDate is blank -> return ""
 *  - If supportingFields count < 6 -> return ""
 *  - Else -> bookingId-customerId-packageId-inquiryIdsequenceNumber
 */
export default function generateBookingReferenceFunction(
  tourDate: string | null | undefined,
  supportingFields: (string | null | undefined)[],
  bookingCode: string,
  tourCode: string,
  formattedDate: string,
  travelsInitial: string,
  tourPackageUniqueCounter: string
): string {
  // If tour date is blank
  if (!tourDate || tourDate.trim() === "") return "";

  // Count how many supporting fields are non-empty
  const count = supportingFields.filter(
    (v) => v !== null && v !== undefined && v.toString().trim() !== ""
  ).length;
  if (count < 6) return "";

  // Concatenate values with hyphens (note: inquiryId and sequenceNumber have no hyphen between them)
  return `${bookingCode}-${tourCode}-${formattedDate}-${travelsInitial}${tourPackageUniqueCounter}`;
}
