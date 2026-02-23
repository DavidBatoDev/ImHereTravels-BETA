import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/auth-store";
import { DEFAULT_PAYMENT_TERMS } from "@/types/payment-terms";

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
 * POST /api/payment-terms/initialize-defaults - Initialize default payment terms
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = useAuthStore.getState();
    const userId = user?.uid || "system";

    console.log("Initializing default payment terms...");

    // Check if payment terms already exist
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));

    if (querySnapshot.size > 0) {
      return NextResponse.json({
        success: true,
        message: "Payment terms already exist",
        count: querySnapshot.size,
      });
    }

    // Create default payment terms
    const createdIds: string[] = [];

    for (const defaultTerm of DEFAULT_PAYMENT_TERMS) {
      const now = Timestamp.now();
      const paymentTermData = {
        ...defaultTerm,
        metadata: {
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
        },
      };

      const sanitizedData = sanitizeData(paymentTermData);
      const docRef = await addDoc(
        collection(db, COLLECTION_NAME),
        sanitizedData
      );
      createdIds.push(docRef.id);
    }

    console.log(`✅ Initialized ${createdIds.length} default payment terms`);

    return NextResponse.json({
      success: true,
      message: "Default payment terms initialized successfully",
      count: createdIds.length,
      ids: createdIds,
    });
  } catch (error) {
    console.error("Error initializing default payment terms:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize default payment terms",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
