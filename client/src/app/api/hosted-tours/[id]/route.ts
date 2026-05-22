import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { verifyRequestUserId } from "@/lib/firebase-admin-auth";

const HOSTED_TOURS_COLLECTION = "hostedTours";

function convertTravelDatesToTimestamps(travelDates: any[]): any[] {
  return travelDates.map((td) => {
    const converted: any = {
      startDate: Timestamp.fromDate(new Date(td.startDate)),
      endDate: Timestamp.fromDate(new Date(td.endDate)),
      isAvailable: td.isAvailable,
      maxCapacity: td.maxCapacity ?? null,
      currentBookings: td.currentBookings ?? null,
    };

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
 * GET /api/hosted-tours/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const docRef = doc(db, HOSTED_TOURS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Hosted tour not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      hostedTour: { id: docSnap.id, ...docSnap.data() },
    });
  } catch (error) {
    console.error("Error fetching hosted tour:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch hosted tour" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/hosted-tours/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUserId = await verifyRequestUserId(
      request.headers.get("authorization"),
    );

    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const updates = await request.json();

    const docRef = doc(db, HOSTED_TOURS_COLLECTION, id);
    const currentSnap = await getDoc(docRef);

    if (!currentSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Hosted tour not found" },
        { status: 404 },
      );
    }

    const currentData = currentSnap.data();
    const now = Timestamp.now();

    const updateData: any = {
      ...updates,
      "metadata.updatedAt": now,
    };

    // Block immutable fields
    delete updateData.parentTourId;
    delete updateData.parentTourName;
    delete updateData.metadata;

    // Convert travel dates
    if (updates.travelDates) {
      updateData.travelDates = convertTravelDatesToTimestamps(
        updates.travelDates,
      );
    }

    // Merge media
    if (updates.media) {
      updateData.media = {
        coverImage:
          updates.media.coverImage ?? currentData.media?.coverImage ?? "",
        gallery: updates.media.gallery ?? currentData.media?.gallery ?? [],
      };
    }

    await updateDoc(docRef, updateData);

    console.log(`✅ Updated hosted tour ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating hosted tour:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update hosted tour" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/hosted-tours/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUserId = await verifyRequestUserId(
      request.headers.get("authorization"),
    );

    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const docRef = doc(db, HOSTED_TOURS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Hosted tour not found" },
        { status: 404 },
      );
    }

    await deleteDoc(docRef);

    console.log(`✅ Deleted hosted tour ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting hosted tour:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete hosted tour" },
      { status: 500 },
    );
  }
}
