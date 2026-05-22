import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { verifyRequestUserId } from "@/lib/firebase-admin-auth";

const HOSTED_TOURS_COLLECTION = "hostedTours";
const TOURS_COLLECTION = "tourPackages";

function normalizeForComparison(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function toMillis(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * GET /api/hosted-tours - Get all hosted tours (optionally filtered by parentTourId)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentTourId = searchParams.get("parentTourId");

    const q = parentTourId
      ? query(
        collection(db, HOSTED_TOURS_COLLECTION),
        where("parentTourId", "==", parentTourId),
      )
      : query(collection(db, HOSTED_TOURS_COLLECTION));

    const snapshot = await getDocs(q);
    const hostedTours: any[] = [];
    snapshot.forEach((d) => {
      hostedTours.push({ id: d.id, ...d.data() });
    });
    hostedTours.sort(
      (a, b) => toMillis(b?.metadata?.createdAt) - toMillis(a?.metadata?.createdAt),
    );

    return NextResponse.json({ success: true, hostedTours });
  } catch (error) {
    console.error("Error fetching hosted tours:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch hosted tours",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/hosted-tours - Create a hosted tour from a parent tour
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    console.log("[hosted-tours POST] Authorization header present:", !!authHeader);

    const currentUserId = await verifyRequestUserId(authHeader);
    console.log("[hosted-tours POST] Verified userId:", currentUserId);

    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { parentTourId, name, slug, tourCode, url } = body;

    if (!parentTourId || !name || !slug || !tourCode || !url) {
      return NextResponse.json(
        { success: false, error: "parentTourId, name, slug, tourCode, and url are required" },
        { status: 400 },
      );
    }

    // Fetch parent tour
    const parentRef = doc(db, TOURS_COLLECTION, parentTourId);
    const parentSnap = await getDoc(parentRef);

    if (!parentSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Parent tour not found" },
        { status: 404 },
      );
    }

    const parentData = parentSnap.data();

    // Validate name and tourCode differ from parent
    if (normalizeForComparison(name) === normalizeForComparison(parentData.name)) {
      return NextResponse.json(
        { success: false, error: "Hosted tour name must be different from the parent tour name" },
        { status: 400 },
      );
    }

    if (tourCode.trim().toUpperCase() === parentData.tourCode?.trim().toUpperCase()) {
      return NextResponse.json(
        { success: false, error: "Hosted tour code must be different from the parent tour code" },
        { status: 400 },
      );
    }

    const normalizedUrl = url.trim();
    if (!isValidUrl(normalizedUrl)) {
      return NextResponse.json(
        { success: false, error: "Hosted tour URL must be a valid URL" },
        { status: 400 },
      );
    }

    if (
      parentData.url &&
      normalizeForComparison(normalizedUrl) === normalizeForComparison(parentData.url)
    ) {
      return NextResponse.json(
        { success: false, error: "Hosted tour URL must be different from the parent tour URL" },
        { status: 400 },
      );
    }

    const now = Timestamp.now();

    // Copy all eligible fields from parent, override name/slug
    const hostedTour: any = {
      parentTourId,
      parentTourName: parentData.name,

      name: name.trim(),
      slug: slug.trim(),
      url: normalizedUrl,
      tourCode: tourCode.trim().toUpperCase(),
      description: parentData.description,
      location: parentData.location,
      duration: parentData.duration,
      travelDates: parentData.travelDates ?? [],
      pricing: parentData.pricing,
      details: parentData.details ?? { highlights: [], itinerary: [], requirements: [] },
      media: {
        coverImage: parentData.media?.coverImage ?? "",
        gallery: parentData.media?.gallery ?? [],
      },
      status: parentData.status ?? "draft",
      brochureLink: parentData.brochureLink ?? null,
      stripePaymentLink: parentData.stripePaymentLink ?? null,
      preDeparturePack: parentData.preDeparturePack ?? null,

      isLocked: false,
      lastSyncedAt: now,
      lastSyncedVersion: parentData.currentVersion ?? 0,

      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy: currentUserId,
      },
    };

    const docRef = await addDoc(
      collection(db, HOSTED_TOURS_COLLECTION),
      hostedTour,
    );

    console.log(`✅ Created hosted tour with ID: ${docRef.id}`);

    return NextResponse.json({ success: true, hostedTourId: docRef.id });
  } catch (error) {
    console.error("Error creating hosted tour:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create hosted tour",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
