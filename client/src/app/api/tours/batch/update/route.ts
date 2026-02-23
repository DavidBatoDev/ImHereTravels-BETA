import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, writeBatch, Timestamp } from "firebase/firestore";

const TOURS_COLLECTION = "tourPackages";

/**
 * Convert string dates to Firestore Timestamps for travelDates
 */
function convertTravelDatesToTimestamps(travelDates: any[]): any[] {
  return travelDates.map((td) => {
    const converted: any = {
      startDate: Timestamp.fromDate(new Date(td.startDate)),
      endDate: Timestamp.fromDate(new Date(td.endDate)),
      isAvailable: td.isAvailable,
      maxCapacity: td.maxCapacity || 0,
      currentBookings: td.currentBookings || 0,
    };

    // Include optional fields if they exist
    if (td.tourDays !== undefined && td.tourDays !== null) {
      converted.tourDays = td.tourDays;
    }
    if (td.hasCustomPricing !== undefined) {
      converted.hasCustomPricing = td.hasCustomPricing;
    }
    if (td.customOriginal !== undefined && td.customOriginal !== null) {
      converted.customOriginal = td.customOriginal;
    }
    if (td.customDiscounted !== undefined && td.customDiscounted !== null) {
      converted.customDiscounted = td.customDiscounted;
    }
    if (td.customDeposit !== undefined && td.customDeposit !== null) {
      converted.customDeposit = td.customDeposit;
    }
    if (td.hasCustomOriginal !== undefined) {
      converted.hasCustomOriginal = td.hasCustomOriginal;
    }
    if (td.hasCustomDiscounted !== undefined) {
      converted.hasCustomDiscounted = td.hasCustomDiscounted;
    }
    if (td.hasCustomDeposit !== undefined) {
      converted.hasCustomDeposit = td.hasCustomDeposit;
    }

    return converted;
  });
}

/**
 * POST /api/tours/batch/update - Batch update tours
 */
export async function POST(request: NextRequest) {
  try {
    const { updates } = await request.json();

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "Updates must be a non-empty array" },
        { status: 400 }
      );
    }

    const batch = writeBatch(db);
    const now = Timestamp.now();

    updates.forEach(({ id, data }) => {
      const docRef = doc(db, TOURS_COLLECTION, id);

      const updateData: any = {
        ...data,
        "metadata.updatedAt": now,
      };

      // Convert travelDates if they're being updated
      if (data.travelDates) {
        updateData.travelDates = convertTravelDatesToTimestamps(
          data.travelDates
        );
      }

      batch.update(docRef, updateData);
    });

    await batch.commit();

    console.log(`✅ Batch updated ${updates.length} tours`);

    return NextResponse.json({ success: true, count: updates.length });
  } catch (error) {
    console.error("Error batch updating tours:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to batch update tours",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
