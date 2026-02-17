import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import type { PaymentTermConfiguration, PaymentPlanType } from "@/types/payment-terms";

const COLLECTION_NAME = "paymentTerms";

/**
 * GET /api/payment-terms/active - Get active payment terms for selections
 */
export async function GET() {
  try {
    console.log("GET /api/payment-terms/active");

    const q = query(
      collection(db, COLLECTION_NAME),
      where("isActive", "==", true),
      orderBy("sortOrder", "asc")
    );

    const querySnapshot = await getDocs(q);

    const activeTerms: PaymentTermConfiguration[] = querySnapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      })
    ) as PaymentTermConfiguration[];

    // Format for selection dropdowns
    const selectionOptions = activeTerms.map((term) => ({
      value: term.id,
      label: term.name,
      description: term.description,
      planType: term.paymentPlanType,
    }));

    console.log(`✅ Found ${activeTerms.length} active payment terms`);

    return NextResponse.json({
      success: true,
      paymentTerms: activeTerms,
      selectionOptions,
      total: activeTerms.length,
    });
  } catch (error) {
    console.error("Error getting active payment terms:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch active payment terms",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
