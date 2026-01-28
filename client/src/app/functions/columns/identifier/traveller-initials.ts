import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const travellerInitialsColumn: BookingSheetColumn = {
  id: "travellerInitials",
  data: {
    id: "travellerInitials",
    columnName: "Traveller Initials",
    dataType: "function",
    function: "travellerInitialsFunction",
    parentTab: "Identifier",
    includeInForms: false,
    showColumn: true,
    color: "gray",
    width: 271.1041259765625,
    arguments: [
      {
        name: "firstName",
        type: "string",
        columnReference: "First Name",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "lastName",
        type: "string",
        columnReference: "Last Name",
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
 * =UPPER(LEFT(H,1) & LEFT(I,1))
 *
 * @param firstName Traveller's first name (H column)
 * @param lastName  Traveller's last name (I column)
 * @returns Uppercased initials (2 letters) or "" if missing
 */
export default function travellerInitialsFunction(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string {
  const f = firstName && firstName.length > 0 ? firstName[0] : "";
  const l = lastName && lastName.length > 0 ? lastName[0] : "";

  const initials = (f + l).toUpperCase();

  return initials;
}
