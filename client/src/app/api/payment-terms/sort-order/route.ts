import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";

const COLLECTION_NAME = "paymentTerms";

/**
 * PATCH /api/payment-terms/sort-order - Update sort order of multiple payment terms
 */
export async function PATCH(request: NextRequest) {
  try {
    const { updates } = await request.json();

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "updates must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate updates structure
    for (const update of updates) {
      if (!update.id || typeof update.sortOrder !== "number") {
        return NextResponse.json(
          {
            success: false,
            error: "Each update must have id and sortOrder",
          },
          { status: 400 }
        );
      }
    }

    // Update all in parallel
    const batch = updates.map(async ({ id, sortOrder }) => {
      const docRef = doc(db, COLLECTION_NAME, id);
      return updateDoc(docRef, {
        sortOrder,
        "metadata.updatedAt": Timestamp.now(),
      });
    });

    await Promise.all(batch);

    console.log(`✅ Updated sort order for ${updates.length} payment terms`);

    return NextResponse.json({ success: true, count: updates.length });
  } catch (error) {
    console.error("Error updating sort order:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update sort order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
