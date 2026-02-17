import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type {
  PreDeparturePack,
  TourPackageAssignment,
} from "@/types/pre-departure-pack";

const COLLECTION_NAME = "preDeparturePack";

/**
 * POST /api/pre-departure-packs/check-availability - Check tour package availability
 */
export async function POST(request: NextRequest) {
  try {
    const { tourPackages, excludePackId } = await request.json();

    if (!Array.isArray(tourPackages)) {
      return NextResponse.json(
        { success: false, error: "tourPackages must be an array" },
        { status: 400 }
      );
    }

    // Get all packs
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("uploadedAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    const allPacks: PreDeparturePack[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PreDeparturePack[];

    const assignedPackages: string[] = [];

    for (const pack of allPacks) {
      // Skip the pack we're updating
      if (excludePackId && pack.id === excludePackId) {
        continue;
      }

      for (const tourPackage of tourPackages as TourPackageAssignment[]) {
        const isAssigned = pack.tourPackages.some(
          (tp) => tp.tourPackageId === tourPackage.tourPackageId
        );

        if (
          isAssigned &&
          !assignedPackages.includes(tourPackage.tourPackageName)
        ) {
          assignedPackages.push(tourPackage.tourPackageName);
        }
      }
    }

    return NextResponse.json({
      success: true,
      assignedPackages,
      hasConflicts: assignedPackages.length > 0,
    });
  } catch (error) {
    console.error("Error checking tour package availability:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check tour package availability",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
