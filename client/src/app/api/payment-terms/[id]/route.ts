import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import type { PaymentTermUpdateRequest } from "@/types/payment-terms";

const COLLECTION_NAME = "paymentTerms";

/**
 * Remove undefined values from object to prevent Firestore errors
 */
function sanitizeData(obj: any): any {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Recursively sanitize nested objects
        const nestedSanitized = sanitizeData(value);
        if (Object.keys(nestedSanitized).length > 0) {
          sanitized[key] = nestedSanitized;
        }
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * GET /api/payment-terms/[id] - Get a single payment term
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
        { success: false, error: "Payment term not found" },
        { status: 404 }
      );
    }

    const paymentTerm = {
      id: docSnap.id,
      ...docSnap.data(),
    };

    return NextResponse.json({ success: true, paymentTerm });
  } catch (error) {
    console.error("Error fetching payment term:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch payment term",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/payment-terms/[id] - Update a payment term
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data: Omit<PaymentTermUpdateRequest, "id"> = await request.json();

    const docRef = doc(db, COLLECTION_NAME, id);

    // Check if exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Payment term not found" },
        { status: 404 }
      );
    }

    const existingData = docSnap.data();

    const updatePayload = {
      ...data,
      metadata: {
        ...existingData.metadata,
        updatedAt: Timestamp.now(),
      },
    };

    // Sanitize data to remove undefined values
    const sanitizedPayload = sanitizeData(updatePayload);

    await updateDoc(docRef, sanitizedPayload);

    console.log(`✅ Updated payment term ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating payment term:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update payment term",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payment-terms/[id] - Delete a payment term
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docRef = doc(db, COLLECTION_NAME, id);

    // Check if exists
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Payment term not found" },
        { status: 404 }
      );
    }

    await deleteDoc(docRef);

    console.log(`✅ Deleted payment term ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment term:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete payment term",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
