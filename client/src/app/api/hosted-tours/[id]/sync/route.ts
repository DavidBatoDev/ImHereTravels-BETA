import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { verifyRequestUserId } from "@/lib/firebase-admin-auth";
import { SYNCABLE_FIELDS } from "@/types/hosted-tours";
import type { SyncableField } from "@/types/hosted-tours";

const HOSTED_TOURS_COLLECTION = "hostedTours";
const TOURS_COLLECTION = "tourPackages";
const SYNCABLE_FIELD_SET = new Set<SyncableField>(SYNCABLE_FIELDS);

/**
 * POST /api/hosted-tours/[id]/sync
 * Pulls selected syncable fields from the parent tour into this hosted tour.
 * If no field list is provided, all syncable fields are synced.
 * Skipped if isLocked === true.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    // Optional selective payload: { fields: SyncableField[] }.
    let requestedFields: SyncableField[] | null = null;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const body = await request.json();
        if (Array.isArray(body?.fields)) {
          const deduped = Array.from(
            new Set<SyncableField>(
              body.fields.filter(
                (field: unknown): field is SyncableField =>
                  typeof field === "string" &&
                  SYNCABLE_FIELD_SET.has(field as SyncableField),
              ),
            ),
          );
          requestedFields = deduped;
        }
      } catch {
        // Ignore malformed JSON and fallback to full-field sync.
      }
    }

    if (requestedFields && requestedFields.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid sync fields were selected" },
        { status: 400 },
      );
    }

    const { id } = await params;

    const hostedRef = doc(db, HOSTED_TOURS_COLLECTION, id);
    const hostedSnap = await getDoc(hostedRef);

    if (!hostedSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Hosted tour not found" },
        { status: 404 },
      );
    }

    const hostedData = hostedSnap.data();

    if (hostedData.isLocked === true) {
      return NextResponse.json(
        { success: false, error: "This hosted tour is locked and cannot be synced" },
        { status: 400 },
      );
    }

    const parentRef = doc(db, TOURS_COLLECTION, hostedData.parentTourId);
    const parentSnap = await getDoc(parentRef);

    if (!parentSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Parent tour not found" },
        { status: 404 },
      );
    }

    const parentData = parentSnap.data();
    const now = Timestamp.now();
    const fieldsToSync = requestedFields ?? [...SYNCABLE_FIELDS];
    const selectedFields = new Set<SyncableField>(fieldsToSync);

    // Hosted identity/state fields are owned independently and are not synced.
    const syncUpdate: Record<string, unknown> = {
      lastSyncedAt: now,
      lastSyncedVersion: parentData.currentVersion ?? 0,
      "metadata.updatedAt": now,
    };

    if (selectedFields.has("description")) {
      syncUpdate.description = parentData.description;
    }
    if (selectedFields.has("location")) {
      syncUpdate.location = parentData.location;
    }
    if (selectedFields.has("duration")) {
      syncUpdate.duration = parentData.duration;
    }
    if (selectedFields.has("travelDates")) {
      syncUpdate.travelDates = parentData.travelDates ?? [];
    }

    if (
      selectedFields.has("pricing.original") ||
      selectedFields.has("pricing.discounted") ||
      selectedFields.has("pricing.deposit") ||
      selectedFields.has("pricing.currency")
    ) {
      const currentPricing = hostedData.pricing ?? {};
      const parentPricing = parentData.pricing ?? {};
      syncUpdate.pricing = {
        original: selectedFields.has("pricing.original")
          ? parentPricing.original
          : currentPricing.original,
        discounted: selectedFields.has("pricing.discounted")
          ? (parentPricing.discounted ?? null)
          : (currentPricing.discounted ?? null),
        deposit: selectedFields.has("pricing.deposit")
          ? parentPricing.deposit
          : currentPricing.deposit,
        currency: selectedFields.has("pricing.currency")
          ? parentPricing.currency
          : currentPricing.currency,
      };
    }

    if (
      selectedFields.has("details.highlights") ||
      selectedFields.has("details.itinerary") ||
      selectedFields.has("details.requirements")
    ) {
      const currentDetails = hostedData.details ?? {};
      const parentDetails = parentData.details ?? {};
      syncUpdate.details = {
        highlights: selectedFields.has("details.highlights")
          ? (parentDetails.highlights ?? [])
          : (currentDetails.highlights ?? []),
        itinerary: selectedFields.has("details.itinerary")
          ? (parentDetails.itinerary ?? [])
          : (currentDetails.itinerary ?? []),
        requirements: selectedFields.has("details.requirements")
          ? (parentDetails.requirements ?? [])
          : (currentDetails.requirements ?? []),
      };
    }

    if (
      selectedFields.has("media.coverImage") ||
      selectedFields.has("media.gallery")
    ) {
      const currentMedia = hostedData.media ?? {};
      const parentMedia = parentData.media ?? {};
      syncUpdate.media = {
        coverImage: selectedFields.has("media.coverImage")
          ? (parentMedia.coverImage ?? "")
          : (currentMedia.coverImage ?? ""),
        gallery: selectedFields.has("media.gallery")
          ? (parentMedia.gallery ?? [])
          : (currentMedia.gallery ?? []),
      };
    }

    if (selectedFields.has("brochureLink")) {
      syncUpdate.brochureLink = parentData.brochureLink ?? null;
    }
    if (selectedFields.has("stripePaymentLink")) {
      syncUpdate.stripePaymentLink = parentData.stripePaymentLink ?? null;
    }
    if (selectedFields.has("preDeparturePack")) {
      syncUpdate.preDeparturePack = parentData.preDeparturePack ?? null;
    }
    if (selectedFields.has("url")) {
      syncUpdate.url = parentData.url ?? null;
    }

    await updateDoc(hostedRef, syncUpdate);

    console.log(
      `Synced hosted tour ${id} from parent ${hostedData.parentTourId} (${fieldsToSync.join(", ")})`,
    );

    return NextResponse.json({ success: true, fieldsSynced: fieldsToSync });
  } catch (error) {
    console.error("Error syncing hosted tour:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync hosted tour" },
      { status: 500 },
    );
  }
}
