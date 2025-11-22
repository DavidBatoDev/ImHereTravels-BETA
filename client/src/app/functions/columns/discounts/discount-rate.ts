import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const discountRateColumn: BookingSheetColumn = {
  id: "discountRate",
  data: {
    id: "discountRate",
    columnName: "Discount Rate",
    dataType: "function",
    function: "getDiscountRateFunction",
    parentTab: "Discounts",
    order: 10,
    includeInForms: false,
    width: 120,
    arguments: [
      {
        name: "eventName",
        type: "string",
        columnReference: "Event Name",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
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
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

// Column Function Implementation
// get-discount-rate.ts
// Retrieves the discount rate for a booking based on event name, tour package, and tour date
// This mirrors the spreadsheet formula that looks up discount rates from the Discounted Tour Rates sheet

export default async function getDiscountRateFunction(
  eventName: string | null | undefined,
  tourPackageName: string | null | undefined,
  tourDate: Date | string | null | undefined
): Promise<number | string> {
  // Return empty if any required field is missing
  if (!eventName || !tourPackageName || !tourDate) {
    return "";
  }

  try {
    // Import Firebase functions
    const { collection, query, where, getDocs } = await import(
      "firebase/firestore"
    );
    const { db } = await import("@/app/functions/firebase");

    // Convert tourDate to Date object if it's a string
    let tourDateObj: Date;
    if (typeof tourDate === "string") {
      tourDateObj = new Date(tourDate);
    } else {
      tourDateObj = tourDate;
    }

    // Format the tour date to match the format stored in discount events (YYYY-MM-DD)
    const tourDateStr = tourDateObj.toISOString().split("T")[0];

    // Query for the discount event by name
    const discountEventsRef = collection(db, "discountEvents");
    const eventQuery = query(
      discountEventsRef,
      where("name", "==", eventName),
      where("active", "==", true)
    );

    const eventSnapshot = await getDocs(eventQuery);

    if (eventSnapshot.empty) {
      return "";
    }

    // Get the first matching discount event
    const eventData = eventSnapshot.docs[0].data();
    const items = eventData.items || [];

    // Find the matching tour package and date discount
    for (const item of items) {
      if (item.tourPackageName === tourPackageName) {
        const dateDiscounts = item.dateDiscounts || [];

        // Look through all date discounts for a match
        for (const dateDiscount of dateDiscounts) {
          if (dateDiscount.date === tourDateStr) {
            // Return the discount rate as a decimal (e.g., 0.10 for 10%)
            return (dateDiscount.discountRate || 0) / 100;
          }
        }
      }
    }

    // No matching discount found
    return "";
  } catch (error) {
    console.error("Error fetching discount rate:", error);
    return "";
  }
}
