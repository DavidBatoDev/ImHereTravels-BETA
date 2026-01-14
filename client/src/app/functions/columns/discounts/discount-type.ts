import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const discountTypeColumn: BookingSheetColumn = {
  id: "discountType",
  data: {
    id: "discountType",
    columnName: "Discount Type",
    dataType: "function",
    function: "getDiscountTypeFunction",
    parentTab: "Discounts",
    order: 11,
    includeInForms: true,
    width: 120,
    options: ["", "percent", "amount"],
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
    ],
  },
};

// Column Function Implementation
// Retrieves the discount type (percent or amount) for a booking based on event name

export default async function getDiscountTypeFunction(
  eventName: string | null | undefined
): Promise<string> {
  // Return empty if event name is missing
  if (!eventName) {
    return "";
  }

  try {
    // Import Firebase functions
    const { collection, getDocs } = await import("firebase/firestore");
    const { db } = await import("@/app/functions/firebase");
    const { query, where } = await import("firebase/firestore");

    // Query for active discount events matching the event name
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
    const activationMode = eventData.activationMode || "manual";
    const scheduledStart = eventData.scheduledStart
      ? new Date(eventData.scheduledStart)
      : null;
    const scheduledEnd = eventData.scheduledEnd
      ? new Date(eventData.scheduledEnd)
      : null;

    // Honor scheduled activation windows
    if (activationMode === "scheduled") {
      const now = new Date();
      const startsOk = scheduledStart ? now >= scheduledStart : true;
      const endsOk = scheduledEnd ? now <= scheduledEnd : true;
      if (!(startsOk && endsOk)) {
        return "";
      }
    }

    // Return the discount type with user-friendly labels
    const discountType = eventData.discountType || "percent";
    return discountType === "amount" ? "Flat amount" : "Percentage";
  } catch (error) {
    console.error("Error fetching discount type:", error);
    return "";
  }
}
