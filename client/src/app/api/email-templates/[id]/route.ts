import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";

const COLLECTION_NAME = "emailTemplates";

/**
 * GET /api/email-templates/[id] - Get a single email template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Email template not found" },
        { status: 404 }
      );
    }

    const data = docSnap.data();
    const template = {
      id: docSnap.id,
      name: data.name || "",
      subject: data.subject || "",
      content: data.content || "",
      variables: data.variables || [],
      variableDefinitions: data.variableDefinitions || [],
      status: data.status || "draft",
      bccGroups: data.bccGroups || [],
      metadata: {
        createdAt: data.metadata?.createdAt,
        updatedAt: data.metadata?.updatedAt,
        createdBy: data.metadata?.createdBy || "",
        usedCount: data.metadata?.usedCount || 0,
      },
    };

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error("Error fetching email template:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch email template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/email-templates/[id] - Update an email template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();

    const docRef = doc(db, COLLECTION_NAME, id);

    // Check if template exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Email template not found" },
        { status: 404 }
      );
    }

    const existingData = docSnap.data();

    // Prepare update payload
    const updatePayload: any = {};

    // Only include fields that are being updated
    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.subject !== undefined) updatePayload.subject = updates.subject;
    if (updates.content !== undefined) updatePayload.content = updates.content;
    if (updates.variables !== undefined)
      updatePayload.variables = updates.variables;
    if (updates.variableDefinitions !== undefined)
      updatePayload.variableDefinitions = updates.variableDefinitions;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.bccGroups !== undefined)
      updatePayload.bccGroups = updates.bccGroups;

    // Always update metadata
    updatePayload.metadata = {
      ...existingData.metadata,
      updatedAt: Timestamp.now(),
    };

    await updateDoc(docRef, updatePayload);

    console.log(`✅ Updated email template ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating email template:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update email template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/email-templates/[id] - Delete an email template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docRef = doc(db, COLLECTION_NAME, id);

    // Check if template exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Email template not found" },
        { status: 404 }
      );
    }

    await deleteDoc(docRef);

    console.log(`✅ Deleted email template ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting email template:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete email template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
