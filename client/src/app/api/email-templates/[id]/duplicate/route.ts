import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, Timestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/auth-store";

const COLLECTION_NAME = "emailTemplates";

/**
 * POST /api/email-templates/[id]/duplicate - Duplicate an email template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user } = useAuthStore.getState();
    const userId = user?.uid || "anonymous";

    // Get original template
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Email template not found" },
        { status: 404 }
      );
    }

    const originalData = docSnap.data();

    // Create duplicate with modified name
    const duplicateData = {
      name: `${originalData.name} (Copy)`,
      subject: originalData.subject,
      content: originalData.content,
      variables: originalData.variables || [],
      variableDefinitions: originalData.variableDefinitions || [],
      status: "draft", // Always set duplicates to draft
      bccGroups: originalData.bccGroups || [],
      metadata: {
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userId,
        usedCount: 0,
      },
    };

    const newDocRef = await addDoc(
      collection(db, COLLECTION_NAME),
      duplicateData
    );

    console.log(`✅ Duplicated email template ${id} to ${newDocRef.id}`);

    return NextResponse.json({ success: true, templateId: newDocRef.id });
  } catch (error) {
    console.error("Error duplicating email template:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to duplicate email template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
