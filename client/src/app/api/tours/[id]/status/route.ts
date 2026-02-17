import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";

const TOURS_COLLECTION = "tourPackages";

/**
 * PATCH /api/tours/[id]/status - Update tour status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    // Validate status
    if (!["active", "draft", "archived"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status. Must be 'active', 'draft', or 'archived'",
        },
        { status: 400 }
      );
    }

    const docRef = doc(db, TOURS_COLLECTION, id);
    await updateDoc(docRef, {
      status,
      "metadata.updatedAt": Timestamp.now(),
    });

    console.log(`✅ Updated tour ${id} status to ${status}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating tour status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update tour status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
