import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { useAuthStore } from "@/store/auth-store";

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
 * GET /api/tours/[id] - Get a single tour
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docRef = doc(db, TOURS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Tour not found" },
        { status: 404 }
      );
    }

    const tour = { id: docSnap.id, ...docSnap.data() };
    return NextResponse.json({ success: true, tour });
  } catch (error) {
    console.error("Error fetching tour:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tour",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tours/[id] - Update a tour
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();
    const { user } = useAuthStore.getState();
    const currentUserId = user?.uid || "anonymous";

    console.log(`Updating tour ${id} with user ID:`, currentUserId);

    const docRef = doc(db, TOURS_COLLECTION, id);
    const now = Timestamp.now();

    // Get current tour data to check for changes
    const currentDoc = await getDoc(docRef);
    if (!currentDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Tour not found" },
        { status: 404 }
      );
    }

    const currentData = currentDoc.data();

    const updateData: any = {
      ...updates,
      "metadata.updatedAt": now,
    };

    // Protect server-managed pricing fields from being overwritten
    delete updateData.pricingHistory;
    delete updateData.currentVersion;

    // Convert travelDates if they're being updated
    if (updates.travelDates) {
      updateData.travelDates = convertTravelDatesToTimestamps(
        updates.travelDates
      );
    }

    // Handle media updates properly
    if (updates.media) {
      updateData.media = {
        coverImage: updates.media.coverImage || currentData.media?.coverImage || "",
        gallery: updates.media.gallery || currentData.media?.gallery || [],
      };
    }

    await updateDoc(docRef, updateData);

    console.log(`✅ Updated tour ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating tour:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update tour",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tours/[id] - Delete a tour
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docRef = doc(db, TOURS_COLLECTION, id);

    // Check if tour exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Tour not found" },
        { status: 404 }
      );
    }

    await deleteDoc(docRef);

    console.log(`✅ Deleted tour ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tour:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete tour",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
