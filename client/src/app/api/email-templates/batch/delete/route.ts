import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, writeBatch } from "firebase/firestore";

const COLLECTION_NAME = "emailTemplates";

/**
 * POST /api/email-templates/batch/delete - Bulk delete email templates
 */
export async function POST(request: NextRequest) {
  try {
    const { templateIds } = await request.json();

    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Template IDs must be a non-empty array" },
        { status: 400 }
      );
    }

    const batch = writeBatch(db);

    templateIds.forEach((id: string) => {
      const docRef = doc(db, COLLECTION_NAME, id);
      batch.delete(docRef);
    });

    await batch.commit();

    console.log(`✅ Bulk deleted ${templateIds.length} templates`);

    return NextResponse.json({ success: true, count: templateIds.length });
  } catch (error) {
    console.error("Error bulk deleting templates:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to bulk delete templates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
