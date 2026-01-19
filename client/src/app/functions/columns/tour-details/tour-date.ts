import { BookingSheetColumn } from "@/types/booking-sheet-column";
import { formatTimestampToDDMMYYYY } from "@/lib/booking-calculations";

export const tourDateColumn: BookingSheetColumn = {
  id: "tourDate",
  data: {
    id: "tourDate",
    columnName: "Tour Date",
    dataType: "select",
    parentTab: "Tour Details",
    includeInForms: true,
    width: 148.666748046875,
    options: [],
    // Load available tour dates from the selected tour package
    loadOptions: async ({ formData }: { formData: Record<string, any> }) => {
      try {
        const tourPackageName = formData.tourPackageName;

        // Import Firebase functions
        const { collection, getDocs, query, where } =
          await import("firebase/firestore");
        const { db } = await import("@/app/functions/firebase");

        const tourPackagesRef = collection(db, "tourPackages");

        // If no tourPackageName provided, load dates from ALL tour packages
        let snapshot;
        if (!tourPackageName) {
          // Load all tour packages
          snapshot = await getDocs(tourPackagesRef);
        } else {
          // Query for specific tour package
          const q = query(
            tourPackagesRef,
            where("name", "==", tourPackageName),
          );
          snapshot = await getDocs(q);
        }

        if (snapshot.empty) {
          console.log(
            tourPackageName
              ? `No tour package found with name: ${tourPackageName}`
              : "No tour packages found",
          );
          return [];
        }

        // Collect all travel dates from all matching tour packages
        const allDates: string[] = [];
        snapshot.docs.forEach((doc) => {
          const tourData = doc.data();
          const travelDates = tourData.travelDates || [];

          // Convert each startDate Timestamp to dd/mm/yyyy format
          travelDates.forEach((td: any) => {
            try {
              const formatted = formatTimestampToDDMMYYYY(td.startDate);
              if (formatted && !allDates.includes(formatted)) {
                allDates.push(formatted);
              }
            } catch (error) {
              console.error("Error formatting travel date:", error, td);
            }
          });
        });

        // Sort dates chronologically
        allDates.sort((a, b) => {
          const [dayA, monthA, yearA] = a.split("/").map(Number);
          const [dayB, monthB, yearB] = b.split("/").map(Number);
          const dateA = new Date(yearA, monthA - 1, dayA);
          const dateB = new Date(yearB, monthB - 1, dayB);
          return dateA.getTime() - dateB.getTime();
        });

        return ["", ...allDates];
      } catch (error) {
        console.error("Error loading tour date options:", error);
        return [];
      }
    },
  },
};
