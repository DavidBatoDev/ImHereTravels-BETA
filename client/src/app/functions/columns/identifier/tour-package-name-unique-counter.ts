import { BookingSheetColumn } from "@/types/booking-sheet-column";
import { firebaseUtils, where } from "@/app/functions/firebase-utils";

export const tourPackageNameUniqueCounterColumn: BookingSheetColumn = {
  id: "tourPackageNameUniqueCounter",
  data: {
    id: "tourPackageNameUniqueCounter",
    columnName: "Tour Package Name Unique Counter",
    dataType: "function",
    function: "tourPackageUniqueCounterFunction",
    parentTab: "Identifier",
    includeInForms: false,
    showColumn: true,
    color: "gray",
    width: 294.66668701171875,
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
        name: "email",
        type: "string",
        columnReference: "Email Address",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "tourDate",
        type: "unknown",
        columnReference: "Tour Date",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

// Column Function Implementation

export default async function tourPackageUniqueCounter(
  tourPackageName?: string | null,
  row?: string | number | null
): Promise<string> {
  if (!tourPackageName || !tourPackageName.trim()) return "";
  if (row === null || row === undefined || row === "") return "001";

  // Fetch all bookings with the same package
  const sameTourBookings = await firebaseUtils.getCollectionData("bookings", [
    where("tourPackageName", "==", tourPackageName),
  ]);

  if (!sameTourBookings || sameTourBookings.length === 0) return "001";

  // Sort all bookings by row (string or number)
  const sorted = sameTourBookings
    .filter((b: any) => b?.row !== undefined && b?.row !== null)
    .sort((a: any, b: any) => {
      const aNum = Number(a.row);
      const bNum = Number(b.row);

      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return String(a.row).localeCompare(String(b.row));
    });

  // Find the index of the current booking in that sorted order
  const currentIndex = sorted.findIndex(
    (b: any) => String(b.row) === String(row)
  );

  // Excel logic: if not found, default to last + 1
  const count = currentIndex === -1 ? sorted.length : currentIndex + 1;

  // Return formatted 3-digit string
  return String(count).padStart(3, "0");
}
