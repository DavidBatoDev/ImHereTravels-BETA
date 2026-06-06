import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, writeBatch } from "firebase/firestore";
import { revalidateWww } from "@/lib/revalidate-www";

const TOURS_COLLECTION = "tourPackages";

/**
 * POST /api/tours/batch/delete - Batch delete tours
 */
export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "IDs must be a non-empty array" },
        { status: 400 }
      );
    }

    const batch = writeBatch(db);

    ids.forEach((id) => {
      const docRef = doc(db, TOURS_COLLECTION, id);
      batch.delete(docRef);
    });

    await batch.commit();

    console.log(`✅ Batch deleted ${ids.length} tours`);

    await revalidateWww();

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error("Error batch deleting tours:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to batch delete tours",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
