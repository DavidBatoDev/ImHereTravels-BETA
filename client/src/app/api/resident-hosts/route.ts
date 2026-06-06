import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { verifyRequestUserId } from "@/lib/firebase-admin-auth";
import { encodeGallerySlides, decodeGallerySlides } from "@/lib/resident-hosts-gallery";

const RESIDENT_HOSTS_COLLECTION = "residentHost";

/**
 * POST /api/resident-hosts - Create a new resident host
 */
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await verifyRequestUserId(
      request.headers.get("authorization"),
    );

    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const hostData = await request.json();

    const now = Timestamp.now();

    const residentHost: any = {
      ...hostData,
      // Default the relational classification field so it always exists.
      attachedTourIds: Array.isArray(hostData.attachedTourIds)
        ? hostData.attachedTourIds
        : [],
      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy: currentUserId,
      },
    };

    // Firestore forbids nested arrays — store gallerySlides as array-of-maps.
    if (hostData.gallerySlides !== undefined) {
      residentHost.gallerySlides = encodeGallerySlides(hostData.gallerySlides);
    }

    const docRef = await addDoc(
      collection(db, RESIDENT_HOSTS_COLLECTION),
      residentHost,
    );

    console.log(`✅ Created resident host with ID: ${docRef.id}`);

    return NextResponse.json({ success: true, hostId: docRef.id });
  } catch (error) {
    console.error("Error creating resident host:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create resident host",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/resident-hosts - Get all resident hosts with optional search/status filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const querySnapshot = await getDocs(
      collection(db, RESIDENT_HOSTS_COLLECTION),
    );
    const hosts: any[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as any;
      // Decode the stored array-of-maps gallery back to the editor [][][] shape.
      if (data.gallerySlides !== undefined) {
        data.gallerySlides = decodeGallerySlides(data.gallerySlides);
      }
      hosts.push({ id: doc.id, ...data });
    });

    let filtered = hosts;

    if (status) {
      filtered = filtered.filter((h) => h.status === status);
    }

    // Firestore has no full-text search; filter by name/title/slug client-side.
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          h.displayName?.toLowerCase().includes(term) ||
          h.pageTitle?.toLowerCase().includes(term) ||
          h.slug?.toLowerCase().includes(term),
      );
    }

    console.log(`✅ Found ${filtered.length} resident hosts`);

    return NextResponse.json({
      success: true,
      hosts: filtered,
      count: filtered.length,
    });
  } catch (error) {
    console.error("Error getting resident hosts:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch resident hosts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
