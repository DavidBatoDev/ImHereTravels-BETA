import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/auth-store";
import type { PreDepartureConfig } from "@/types/pre-departure-pack";

const CONFIG_COLLECTION = "config";
const CONFIG_DOC = "pre-departure";

/**
 * GET /api/pre-departure-packs/config - Get pre-departure configuration
 */
export async function GET() {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Return default config
      return NextResponse.json({
        success: true,
        config: {
          automaticSends: false,
        },
      });
    }

    const config = docSnap.data() as PreDepartureConfig;

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Error fetching pre-departure config:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pre-departure-packs/config - Update pre-departure configuration
 */
export async function PATCH(request: NextRequest) {
  try {
    const { automaticSends } = await request.json();

    if (typeof automaticSends !== "boolean") {
      return NextResponse.json(
        { success: false, error: "automaticSends must be a boolean" },
        { status: 400 }
      );
    }

    const { user } = useAuthStore.getState();
    const userId = user?.uid || "anonymous";

    const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC);

    await updateDoc(docRef, {
      automaticSends,
      lastUpdated: Timestamp.now(),
      updatedBy: userId,
    });

    console.log("✅ Updated pre-departure config");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating pre-departure config:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
