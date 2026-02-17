import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { PreDeparturePack } from "@/types/pre-departure-pack";

const COLLECTION_NAME = "preDeparturePack";

/**
 * GET /api/pre-departure-packs/by-tour/[tourPackageName] - Find pack by tour package name
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tourPackageName: string }> }
) {
  try {
    const { tourPackageName } = await params;
    const decodedName = decodeURIComponent(tourPackageName);

    console.log(`Finding pack by tour package: ${decodedName}`);

    // Get all packs (Firestore doesn't support querying array contents easily)
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("uploadedAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    const allPacks: PreDeparturePack[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PreDeparturePack[];

    // Find pack containing this tour package
    const pack = allPacks.find((pack) =>
      pack.tourPackages.some(
        (tp) =>
          tp.tourPackageName.toLowerCase().trim() ===
          decodedName.toLowerCase().trim()
      )
    );

    if (!pack) {
      return NextResponse.json(
        {
          success: false,
          error: "No pack found for this tour package",
        },
        { status: 404 }
      );
    }

    console.log(`✅ Found pack for tour package: ${pack.id}`);

    return NextResponse.json({ success: true, pack });
  } catch (error) {
    console.error("Error finding pack by tour package:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to find pre-departure pack",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
