import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, writeBatch, Timestamp } from "firebase/firestore";
import { TemplateStatus } from "@/types/mail";

const COLLECTION_NAME = "emailTemplates";

/**
 * POST /api/email-templates/batch/update-status - Bulk update template statuses
 */
export async function POST(request: NextRequest) {
  try {
    const { templateIds, status } = await request.json();

    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Template IDs must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!["active", "draft", "archived"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status. Must be 'active', 'draft', or 'archived'",
        },
        { status: 400 }
      );
    }

    const batch = writeBatch(db);

    templateIds.forEach((id: string) => {
      const docRef = doc(db, COLLECTION_NAME, id);
      batch.update(docRef, {
        status,
        "metadata.updatedAt": Timestamp.now(),
      });
    });

    await batch.commit();

    console.log(
      `✅ Bulk updated ${templateIds.length} templates to status: ${status}`
    );

    return NextResponse.json({ success: true, count: templateIds.length });
  } catch (error) {
    console.error("Error bulk updating template statuses:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to bulk update template statuses",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
