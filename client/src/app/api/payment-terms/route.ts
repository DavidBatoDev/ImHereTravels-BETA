import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { useAuthStore } from "@/store/auth-store";
import type {
  PaymentTermConfiguration,
  PaymentTermCreateRequest,
} from "@/types/payment-terms";

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
 * POST /api/payment-terms - Create a new payment term
 */
export async function POST(request: NextRequest) {
  try {
    const data: PaymentTermCreateRequest = await request.json();
    const { user } = useAuthStore.getState();
    const userId = user?.uid || "anonymous";

    console.log("Creating payment term with user ID:", userId);

    const now = Timestamp.now();
    const paymentTermData: Omit<PaymentTermConfiguration, "id"> = {
      ...data,
      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      },
    };

    // Sanitize data to remove undefined values
    const sanitizedData = sanitizeData(paymentTermData);

    const docRef = await addDoc(
      collection(db, COLLECTION_NAME),
      sanitizedData
    );

    console.log(`✅ Created payment term with ID: ${docRef.id}`);

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error("Error creating payment term:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create payment term",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payment-terms - Get all payment terms or filtered
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    console.log("GET /api/payment-terms", { activeOnly });

    let q = query(collection(db, COLLECTION_NAME), orderBy("sortOrder", "asc"));

    if (activeOnly) {
      q = query(
        collection(db, COLLECTION_NAME),
        where("isActive", "==", true),
        orderBy("sortOrder", "asc")
      );
    }

    const querySnapshot = await getDocs(q);

    const paymentTerms: PaymentTermConfiguration[] = querySnapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      })
    ) as PaymentTermConfiguration[];

    console.log(`✅ Found ${paymentTerms.length} payment terms`);

    return NextResponse.json({
      success: true,
      paymentTerms,
      total: paymentTerms.length,
    });
  } catch (error) {
    console.error("Error getting payment terms:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch payment terms",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
