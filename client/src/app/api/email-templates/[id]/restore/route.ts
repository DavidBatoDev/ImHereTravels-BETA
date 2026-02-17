import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";

const COLLECTION_NAME = "emailTemplates";

/**
 * POST /api/email-templates/[id]/restore - Restore an archived email template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docRef = doc(db, COLLECTION_NAME, id);

    await updateDoc(docRef, {
      status: "draft",
      "metadata.updatedAt": Timestamp.now(),
    });

    console.log(`✅ Restored email template ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error restoring email template:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to restore email template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
