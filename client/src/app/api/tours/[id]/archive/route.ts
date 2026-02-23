import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";

const TOURS_COLLECTION = "tourPackages";

/**
 * POST /api/tours/[id]/archive - Archive a tour (soft delete)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const docRef = doc(db, TOURS_COLLECTION, id);
    await updateDoc(docRef, {
      status: "archived",
      "metadata.updatedAt": Timestamp.now(),
    });

    console.log(`✅ Archived tour ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error archiving tour:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to archive tour",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
