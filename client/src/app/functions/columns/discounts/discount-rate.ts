import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const discountRateColumn: BookingSheetColumn = {
  id: "discountRate",
  data: {
    id: "discountRate",
    columnName: "Discount",
    dataType: "function",
    function: "getDiscountRateFunction",
    parentTab: "Discounts",
    includeInForms: true,
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
// For percentage discounts: returns the percentage value (e.g., 20 for 20%)
// For flat amount discounts: returns the absolute amount off (e.g., 300 for £300 off)
// Returns numeric value for use in dependent calculations

export default async function getDiscountRateFunction(
  eventName: string | null | undefined,
  tourPackageName: string | null | undefined,
  tourDate: any,
): Promise<number> {
  const toNumber = (value: any): number | null => {
    const num =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? parseFloat(value)
          : NaN;
    return Number.isFinite(num) ? num : null;
  };

  // Return empty if any required field is missing
  if (!eventName || !tourPackageName || !tourDate) {
    console.log("🔍 [DISCOUNT-RATE] Missing required args:", {
      eventName,
      tourPackageName,
      tourDate,
    });
    return 0;
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
    // Use timezone-neutral formatting to avoid off-by-one issues
    const tourDateStr = new Date(
      tourDateObj.getTime() - tourDateObj.getTimezoneOffset() * 60 * 1000,
    )
      .toISOString()
      .split("T")[0];

    // Query by name only (do NOT filter by active/schedule) to preserve historical bookings
    // Past bookings should keep their applied discount data even if the event is turned off later.
    const discountEventsRef = collection(db, "discountEvents");
    const { query, where } = await import("firebase/firestore");
    const eventQuery = query(discountEventsRef, where("name", "==", eventName));

    const eventSnapshot = await getDocs(eventQuery);

    if (eventSnapshot.empty) {
      console.log("🔍 [DISCOUNT-RATE] No event found for:", eventName);
      return 0;
    }

    // Get the first matching discount event
    const eventData = eventSnapshot.docs[0].data();
    console.log("🔍 [DISCOUNT-RATE] Event data found:", {
      eventName,
      discountType: eventData.discountType,
      items: eventData.items?.length || 0,
    });
    const items = eventData.items || [];
    console.log(
      "🔍 [DISCOUNT-RATE] Looking for tourPackageName:",
      tourPackageName,
      "in items:",
      items.length,
    );

    // Find the matching tour package in items array
    for (const item of items) {
      // Check if tour package name matches
      if (item.tourPackageName === tourPackageName) {
        console.log(
          "🔍 [DISCOUNT-RATE] Found matching package, looking for date:",
          tourDateStr,
        );
        const dateDiscounts = item.dateDiscounts || [];
        const itemOriginalCost = toNumber(item.originalCost); // Get originalCost from item level

        // Search through dateDiscounts array for matching date
        for (const dateDiscount of dateDiscounts) {
          if (dateDiscount.date === tourDateStr) {
            console.log(
              "🎉 [DISCOUNT-RATE] Found discount date match, full data:",
              JSON.stringify(dateDiscount, null, 2),
            );

            // Check if this is a flat amount discount
            const discountType = eventData.discountType || "percent";

            if (discountType === "amount") {
              // Prefer an explicit discountAmount field if present
              const discountAmountValue = toNumber(
                (dateDiscount as any).discountAmount ??
                  (dateDiscount as any).amount,
              );

              let flatAmount = discountAmountValue;
              console.log(
                "🔍 [DISCOUNT-RATE] discountAmountValue:",
                discountAmountValue,
              );

              // Fallback: derive flat amount from costs (original - discounted)
              // originalCost comes from ITEM level, discountedCost from dateDiscount
              if (flatAmount === null) {
                const originalCost =
                  toNumber(dateDiscount.originalCost) ?? itemOriginalCost; // Try dateDiscount first, fallback to item
                const discountedCost = toNumber(dateDiscount.discountedCost);
                console.log("🔍 [DISCOUNT-RATE] Calculating from costs:", {
                  originalCostRaw: dateDiscount.originalCost,
                  itemOriginalCost: item.originalCost,
                  discountedCostRaw: dateDiscount.discountedCost,
                  originalCostParsed: originalCost,
                  discountedCostParsed: discountedCost,
                });
                if (originalCost !== null && discountedCost !== null) {
                  flatAmount = originalCost - discountedCost;
                  console.log(
                    "🔍 [DISCOUNT-RATE] Calculated flatAmount:",
                    flatAmount,
                  );
                }
              }

              if (flatAmount !== null && flatAmount > 0) {
                const safeAmount = Math.max(flatAmount, 0);
                console.log(
                  "🎉 [DISCOUNT-RATE] Flat amount discount calculated:",
                  {
                    discountAmount: discountAmountValue,
                    originalCost: itemOriginalCost,
                    discountedCost: dateDiscount.discountedCost,
                    flatAmount: safeAmount,
                  },
                );
                // Return numeric value for calculations
                return safeAmount;
              }

              console.log(
                "❌ [DISCOUNT-RATE] No flat amount data available or amount is zero/negative",
                {
                  flatAmount,
                  dateDiscount,
                },
              );
              return 0;
            } else {
              // For percentages, return the numeric rate directly
              const rate = dateDiscount.discountRate || 0;
              const numericRate =
                typeof rate === "number" ? rate : parseFloat(rate) || 0;
              console.log("🎉 [DISCOUNT-RATE] Percentage discount:", {
                rate: numericRate,
              });
              // Return numeric value directly (as percentage, e.g., 20 for 20%)
              return numericRate;
            }
          }
        }
      }
    }

    // No matching discount found
    console.log("❌ [DISCOUNT-RATE] No matching discount found for:", {
      eventName,
      tourPackageName,
      tourDate: tourDateStr,
    });
    return 0;
  } catch (error) {
    console.error("Error fetching discount rate:", error);
    return 0;
  }
}
