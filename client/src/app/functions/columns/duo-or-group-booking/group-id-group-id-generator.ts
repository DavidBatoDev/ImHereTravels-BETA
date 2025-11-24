import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const groupIdGroupIdGeneratorColumn: BookingSheetColumn = {
  id: "groupIdGroupIdGenerator",
  data: {
    id: "groupIdGroupIdGenerator",
    columnName: "Group ID / Group ID Generator",
    dataType: "function",
    function: "generateGroupMemberIdFunction",
    parentTab: "If Duo or Group Booking",
    order: 23,
    includeInForms: false,
    color: "yellow",
    width: 310.6666717529297,
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
        name: "tourName",
        type: "string",
        columnReference: "Tour Package Name",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
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
      {
        name: "email",
        type: "string",
        columnReference: "Email Address",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "isActive",
        type: "boolean",
        columnReference: "Is Main Booker?",
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
 * Generate Group/Duo Booking Member ID (standalone version, no allRows needed).
 *
 * @param bookingType  "Duo Booking" | "Group Booking"
 * @param tourName     Tour package name
 * @param firstName    Traveller's first name
 * @param lastName     Traveller's last name
 * @param email        Traveller's email
 * @param isActive     Equivalent of U column (if false => "")
 * @returns string ID or ""
 */
export default function generateGroupMemberIdFunction(
  bookingType: string,
  tourName: string,
  firstName: string,
  lastName: string,
  email: string,
  isActive: boolean
): string {
  // Only Duo or Group bookings apply
  if (!(bookingType === "Duo Booking" || bookingType === "Group Booking")) {
    return "";
  }

  // Only generate ID if isActive is explicitly true
  if (isActive !== true) return "";

  const initials =
    (firstName?.[0] ?? "").toUpperCase() + (lastName?.[0] ?? "").toUpperCase();
  const idPrefix = bookingType === "Duo Booking" ? "DB" : "GB";

  // Hash based on email + traveller identity
  const identity = `${bookingType}|${tourName}|${firstName}|${lastName}|${email}`;
  let hashNum = 0;
  for (let i = 0; i < identity.length; i++) {
    hashNum += identity.charCodeAt(i) * (i + 1);
  }
  const hashTag = String(Math.abs(hashNum) % 10000).padStart(4, "0");

  // Fake member number: derive from hash as a stable 001–999
  const memberNumber = String((Math.abs(hashNum) % 999) + 1).padStart(3, "0");

  return `${idPrefix}-${initials}-${hashTag}-${memberNumber}`;
}
