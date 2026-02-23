import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";

const COLLECTION_NAME = "paymentTerms";

/**
 * PATCH /api/payment-terms/[id]/toggle-status - Toggle active status of payment term
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { isActive } = await request.json();

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { success: false, error: "isActive must be a boolean" },
        { status: 400 }
      );
    }

    const docRef = doc(db, COLLECTION_NAME, id);

    await updateDoc(docRef, {
      isActive,
      "metadata.updatedAt": Timestamp.now(),
    });

    console.log(`✅ Toggled payment term ${id} status to ${isActive}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error toggling payment term status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to toggle payment term status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
