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
// Replicates the spreadsheet INDEX-MATCH formula that looks up discount rates

export default async function getDiscountRateFunction(
  eventName: string | null | undefined,
  tourPackageName: string | null | undefined,
  tourDate: any
): Promise<number | string> {
  // Return empty if any required field is missing
  if (!eventName || !tourPackageName || !tourDate) {
    return "";
  }

  try {
    // Import Firebase functions
    const { collection, getDocs } = await import("firebase/firestore");
    const { db } = await import("@/app/functions/firebase");

    // Convert tourDate to Date object based on its type
    let tourDateObj: Date;

    if (typeof tourDate === "string") {
      // Handle string date
      tourDateObj = new Date(tourDate);
    } else if (tourDate instanceof Date) {
      // Handle Date object
      tourDateObj = tourDate;
    } else if (tourDate?.seconds !== undefined) {
      // Handle Firestore Timestamp object
      tourDateObj = new Date(tourDate.seconds * 1000);
    } else if (tourDate?.toDate && typeof tourDate.toDate === "function") {
      // Handle Firestore Timestamp with toDate method
      tourDateObj = tourDate.toDate();
    } else {
      // Try to convert to Date
      tourDateObj = new Date(tourDate);
    }

    // Format the tour date to match the format stored (YYYY-MM-DD)
    const tourDateStr = tourDateObj.toISOString().split("T")[0];

    // Query for active discount events matching the event name
    const discountEventsRef = collection(db, "discountEvents");
    const { query, where } = await import("firebase/firestore");
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

    // Find the matching tour package in items array
    for (const item of items) {
      // Check if tour package name matches
      if (item.tourPackageName === tourPackageName) {
        const dateDiscounts = item.dateDiscounts || [];

        // Search through dateDiscounts array for matching date
        for (const dateDiscount of dateDiscounts) {
          if (dateDiscount.date === tourDateStr) {
            // Return the discount rate as a percentage string (e.g., "20%")
            const rate = dateDiscount.discountRate || 0;
            // Ensure rate is a number and format as percentage
            const numericRate =
              typeof rate === "number" ? rate : parseFloat(rate) || 0;
            return `${numericRate}%`;
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
