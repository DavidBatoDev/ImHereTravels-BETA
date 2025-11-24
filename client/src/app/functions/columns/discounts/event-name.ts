import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const eventNameColumn: BookingSheetColumn = {
  id: "eventName",
  data: {
    id: "eventName",
    columnName: "Event Name",
    dataType: "select",
    parentTab: "Discounts",
    order: 9,
    includeInForms: true,
    width: 180,
    options: [""], // Static fallback if dynamic loading fails
    // Dynamic options loader
    loadOptions: async () => {
      try {
        const { collection, query, where, getDocs } = await import(
          "firebase/firestore"
        );
        const { db } = await import("@/app/functions/firebase");

        // Query for active discount events
        const discountEventsRef = collection(db, "discountEvents");
        const activeEventsQuery = query(
          discountEventsRef,
          where("active", "==", true)
        );

        const snapshot = await getDocs(activeEventsQuery);

        // Extract event names
        const eventNames = snapshot.docs
          .map((doc) => doc.data().name)
          .filter(Boolean);

        // Return with empty option at the beginning
        return eventNames.length > 0 ? ["", ...eventNames] : [""];
      } catch (error) {
        console.error("Error loading discount event names:", error);
        // Return static fallback on error
        return [""];
      }
    },
  },
};
