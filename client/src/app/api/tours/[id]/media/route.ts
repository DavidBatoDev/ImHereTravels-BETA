import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";

const TOURS_COLLECTION = "tourPackages";

/**
 * PATCH /api/tours/[id]/media - Update tour media (coverImage and/or gallery)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mediaData = await request.json();

    const docRef = doc(db, TOURS_COLLECTION, id);
    const now = Timestamp.now();

    const updateData: any = {
      "metadata.updatedAt": now,
    };

    // Update media fields
    if (mediaData.coverImage !== undefined) {
      updateData["media.coverImage"] = mediaData.coverImage;
    }

    if (mediaData.gallery !== undefined) {
      updateData["media.gallery"] = mediaData.gallery;
    }

    await updateDoc(docRef, updateData);

    console.log(`✅ Updated tour ${id} media`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating tour media:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update tour media",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
