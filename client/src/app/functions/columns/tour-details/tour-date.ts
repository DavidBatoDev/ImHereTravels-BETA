import { BookingSheetColumn } from '@/types/booking-sheet-column';
import { Timestamp } from '@/app/functions/firebase-utils';

/**
 * Format a date as dd/mm/yyyy string
 */
function formatDateDisplay(date: Date | Timestamp): string {
  let d: Date;
  
  if (date instanceof Timestamp) {
    d = date.toDate();
  } else {
    d = date;
  }
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Parse a dd/mm/yyyy string to a Date
 */
function parseDisplayDate(displayStr: string): Date {
  const [day, month, year] = displayStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

export const tourDateColumn: BookingSheetColumn = {
  id: 'tourDate',
  data: {
    id: 'tourDate',
    columnName: 'Tour Date',
    dataType: 'select',
    parentTab: 'Tour Details',
    includeInForms: true,
    width: 148.666748046875,
    options: [], // Will be populated by loadOptions
    loadOptions: async () => {
      try {
        const { collection, query, getDocs } = await import(
          "firebase/firestore"
        );
        const { db } = await import("@/app/functions/firebase");

        // Query for tour packages with their dates
        const tourPackagesRef = collection(db, "tourPackages");
        const snapshot = await getDocs(query(tourPackagesRef));

        const dateSet = new Set<string>();

        // Extract unique tour dates from all tour packages
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          
          // Check if tourDates array exists
          if (Array.isArray(data.tourDates)) {
            data.tourDates.forEach((dateData: any) => {
              try {
                let date: Date;
                
                // Handle both Timestamp objects and Date strings
                if (dateData.date instanceof Timestamp) {
                  date = dateData.date.toDate();
                } else if (typeof dateData.date === 'string') {
                  date = new Date(dateData.date);
                } else if (dateData.date?.toDate) {
                  date = dateData.date.toDate();
                } else {
                  return;
                }
                
                const displayDate = formatDateDisplay(date);
                dateSet.add(displayDate);
              } catch (error) {
                console.warn("Error parsing tour date:", error);
              }
            });
          }
        });

        // Sort dates chronologically (convert back to Date for sorting)
        const sortedDates = Array.from(dateSet).sort((a, b) => {
          const dateA = parseDisplayDate(a);
          const dateB = parseDisplayDate(b);
          return dateA.getTime() - dateB.getTime();
        });

        // Return with empty option at the beginning
        return sortedDates.length > 0 ? ["", ...sortedDates] : [""];
      } catch (error) {
        console.error("Error loading tour dates:", error);
        // Return static fallback on error
        return [""];
      }
    },
  },
};
