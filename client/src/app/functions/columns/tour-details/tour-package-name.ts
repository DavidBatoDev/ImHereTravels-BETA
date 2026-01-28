import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const tourPackageNameColumn: BookingSheetColumn = {
  id: "tourPackageName",
  data: {
    id: "tourPackageName",
    columnName: "Tour Package Name",
    dataType: "select",
    parentTab: "Tour Details",
    includeInForms: true,
    width: 208,
    // Static fallback options
    options: [
      "",
      "India Discovery Tour",
      "Argentina's Wonders",
      "Maldives Bucketlist",
      "New Zealand Expedition",
      "Tanzania Exploration",
      "Sri Lanka Wander Tour",
      "India Holi Festival Tour",
      "Brazil's Treasures",
      "Philippine Sunset",
      "Philippine Sunrise",
      "Siargao Island Adventure",
      "Vietnam Expedition",
      "Japan Adventure (Standard)",
    ],
    // Dynamic options loader from Firestore
    loadOptions: async () => {
      try {
        const { collection, getDocs } = await import("firebase/firestore");
        const { db } = await import("@/app/functions/firebase");

        // Query tour packages collection
        const tourPackagesRef = collection(db, "tourPackages");
        const snapshot = await getDocs(tourPackagesRef);

        // Extract package names
        const packageNames = snapshot.docs
          .map((doc) => doc.data().name)
          .filter(Boolean)
          .sort(); // Sort alphabetically

        // Return with empty option at the beginning
        return packageNames.length > 0
          ? ["", ...packageNames]
          : [
              // Fallback to static options if no data from Firestore
              "",
              "India Discovery Tour",
              "Argentina's Wonders",
              "Maldives Bucketlist",
              "New Zealand Expedition",
              "Tanzania Exploration",
              "Sri Lanka Wander Tour",
              "India Holi Festival Tour",
              "Brazil's Treasures",
              "Philippine Sunset",
              "Philippine Sunrise",
              "Siargao Island Adventure",
              "Vietnam Expedition",
              "Japan Adventure (Standard)",
            ];
      } catch (error) {
        console.error("Error loading tour package names:", error);
        // Return static fallback on error
        return [
          "",
          "India Discovery Tour",
          "Argentina's Wonders",
          "Maldives Bucketlist",
          "New Zealand Expedition",
          "Tanzania Exploration",
          "Sri Lanka Wander Tour",
          "India Holi Festival Tour",
          "Brazil's Treasures",
          "Philippine Sunset",
          "Philippine Sunrise",
          "Siargao Island Adventure",
          "Vietnam Expedition",
          "Japan Adventure (Standard)",
        ];
      }
    },
  },
};
