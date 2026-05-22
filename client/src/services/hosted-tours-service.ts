import { auth } from "@/lib/firebase";
import { TourPackage, TourFormDataWithStringDates } from "@/types/tours";
import {
  HostedTour,
  HostedTourFormData,
  CreateHostedTourPayload,
  ChangeLogEntry,
  SyncResult,
  getSyncableFieldsFromChanges,
} from "@/types/hosted-tours";
import type { SyncableField } from "@/types/hosted-tours";

const API_BASE = "/api/hosted-tours";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in to manage hosted tours");
  const token = await user.getIdToken(true);
  return { Authorization: `Bearer ${token}` };
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

export async function createHostedTour(
  payload: CreateHostedTourPayload,
): Promise<string> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to create hosted tour");
  }
  return data.hostedTourId;
}

export async function getHostedTours(parentTourId?: string): Promise<HostedTour[]> {
  const url = parentTourId
    ? `${API_BASE}?parentTourId=${encodeURIComponent(parentTourId)}`
    : API_BASE;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.details || data.error || "Failed to fetch hosted tours");
  }
  return data.hostedTours as HostedTour[];
}

export async function getHostedTourById(id: string): Promise<HostedTour | null> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (response.status === 404) return null;
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to fetch hosted tour");
  }
  return data.hostedTour as HostedTour;
}

export async function updateHostedTour(
  id: string,
  updates: Partial<HostedTourFormData>,
): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to update hosted tour");
  }
}

export async function deleteHostedTour(id: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to delete hosted tour");
  }
}

export async function toggleLock(
  id: string,
  isLocked: boolean,
): Promise<void> {
  return updateHostedTour(id, { isLocked } as any);
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

export async function syncFromParent(
  hostedTourId: string,
  fields?: SyncableField[],
): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const body =
    Array.isArray(fields) && fields.length > 0 ? JSON.stringify({ fields }) : undefined;
  const response = await fetch(`${API_BASE}/${hostedTourId}/sync`, {
    method: "POST",
    headers: body
      ? { "Content-Type": "application/json", ...authHeaders }
      : authHeaders,
    body,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to sync hosted tour");
  }
}

export async function syncAllFromParent(
  parentTourId: string,
  changes: ChangeLogEntry[],
  selectedFields?: SyncableField[],
): Promise<SyncResult> {
  const fieldsToSync =
    Array.isArray(selectedFields) && selectedFields.length > 0
      ? selectedFields
      : getSyncableFieldsFromChanges(changes);

  if (fieldsToSync.length === 0) {
    return { synced: [], skipped: [], errors: [] };
  }

  const children = await getHostedTours(parentTourId);
  const result: SyncResult = { synced: [], skipped: [], errors: [] };

  await Promise.allSettled(
    children.map(async (child) => {
      if (child.isLocked) {
        result.skipped.push(child.id);
        return;
      }
      try {
        await syncFromParent(child.id, fieldsToSync);
        result.synced.push(child.id);
      } catch {
        result.errors.push(child.id);
      }
    }),
  );

  return result;
}

// ============================================================================
// CHANGE LOG DIFF
// ============================================================================

function normalizeDateOnly(val: any): string {
  if (!val) return "";
  if (typeof val === "object" && typeof val.toDate === "function") {
    return val.toDate().toISOString().split("T")[0];
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
    return trimmed;
  }
  const parsed = new Date(val);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return String(val);
}

function normalizeText(val: any): string {
  return String(val ?? "").trim();
}

function toNullableNumber(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

function normalizeTravelDates(dates: any[]): string {
  if (!Array.isArray(dates)) return "[]";
  return JSON.stringify(
    dates.map((d) => ({
      startDate: normalizeDateOnly(d.startDate),
      endDate: normalizeDateOnly(d.endDate),
      isAvailable: Boolean(d.isAvailable),
      maxCapacity: toNullableNumber(d.maxCapacity),
      currentBookings: toNullableNumber(d.currentBookings),
      customOriginal: toNullableNumber(d.customOriginal),
      customDiscounted: toNullableNumber(d.customDiscounted),
      customDeposit: toNullableNumber(d.customDeposit),
    })),
  );
}

function normalizeHighlights(highlights: any[]): string {
  if (!Array.isArray(highlights)) return "[]";
  return JSON.stringify(
    highlights
      .map((item) => {
        if (typeof item === "string") {
          return { text: normalizeText(item), image: null };
        }
        if (item && typeof item === "object") {
          const text = normalizeText(item.text);
          const image = normalizeText(item.image) || null;
          return { text, image };
        }
        return { text: normalizeText(item), image: null };
      })
      .filter((item) => item.text !== "" || item.image !== null),
  );
}

function normalizeItinerary(itinerary: any[]): string {
  if (!Array.isArray(itinerary)) return "[]";
  return JSON.stringify(
    itinerary
      .map((item) => ({
        day: toNullableNumber(item?.day),
        title: normalizeText(item?.title),
        description: normalizeText(item?.description),
      }))
      .filter(
        (item) =>
          item.day !== null || item.title !== "" || item.description !== "",
      ),
  );
}

function normalizeRequirements(requirements: any[]): string {
  if (!Array.isArray(requirements)) return "[]";
  return JSON.stringify(
    requirements
      .map((item) => normalizeText(item))
      .filter((item) => item !== ""),
  );
}

const FIELD_LABELS: Record<string, string> = {
  name: "Tour Name",
  url: "Direct URL",
  description: "Description",
  location: "Location",
  duration: "Duration",
  "pricing.original": "Base Price",
  "pricing.discounted": "Discounted Price",
  "pricing.deposit": "Deposit",
  "pricing.currency": "Currency",
  travelDates: "Travel Dates",
  "details.highlights": "Highlights",
  "details.itinerary": "Itinerary",
  "details.requirements": "Requirements",
  brochureLink: "Brochure Link",
  stripePaymentLink: "Stripe Payment Link",
  preDeparturePack: "Pre-departure Pack",
  "media.coverImage": "Cover Image",
  "media.gallery": "Gallery",
};

export function computeChangeLog(
  oldTour: TourPackage,
  newData: TourFormDataWithStringDates,
): ChangeLogEntry[] {
  const changes: ChangeLogEntry[] = [];

  function check(field: string, oldVal: unknown, newVal: unknown) {
    const oldStr = JSON.stringify(oldVal ?? null);
    const newStr = JSON.stringify(newVal ?? null);
    if (oldStr !== newStr) {
      changes.push({
        field,
        label: FIELD_LABELS[field] ?? field,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  // Primitives
  check("name", oldTour.name, newData.name);
  check("url", oldTour.url ?? null, newData.url ?? null);
  check("description", oldTour.description, newData.description);
  check("location", oldTour.location, newData.location);
  check("duration", oldTour.duration, newData.duration);
  check("brochureLink", oldTour.brochureLink ?? null, newData.brochureLink ?? null);
  check("stripePaymentLink", oldTour.stripePaymentLink ?? null, newData.stripePaymentLink ?? null);
  check("preDeparturePack", oldTour.preDeparturePack ?? null, newData.preDeparturePack ?? null);
  check("pricing.original", oldTour.pricing?.original, newData.pricing?.original);
  check("pricing.discounted", oldTour.pricing?.discounted ?? null, newData.pricing?.discounted ?? null);
  check("pricing.deposit", oldTour.pricing?.deposit, newData.pricing?.deposit);
  check("pricing.currency", oldTour.pricing?.currency, newData.pricing?.currency);
  check("media.coverImage", oldTour.media?.coverImage ?? "", newData.media?.coverImage ?? "");

  // Arrays — normalize before comparing
  const oldDates = normalizeTravelDates(oldTour.travelDates ?? []);
  const newDates = normalizeTravelDates(newData.travelDates ?? []);
  if (oldDates !== newDates) {
    changes.push({
      field: "travelDates",
      label: "Travel Dates",
      oldValue: oldTour.travelDates ?? [],
      newValue: newData.travelDates ?? [],
    });
  }

  const oldHighlights = normalizeHighlights(oldTour.details?.highlights ?? []);
  const newHighlights = normalizeHighlights(newData.details?.highlights ?? []);
  if (oldHighlights !== newHighlights) {
    changes.push({
      field: "details.highlights",
      label: "Highlights",
      oldValue: oldTour.details?.highlights ?? [],
      newValue: newData.details?.highlights ?? [],
    });
  }

  const oldItinerary = normalizeItinerary(oldTour.details?.itinerary ?? []);
  const newItinerary = normalizeItinerary(newData.details?.itinerary ?? []);
  if (oldItinerary !== newItinerary) {
    changes.push({
      field: "details.itinerary",
      label: "Itinerary",
      oldValue: oldTour.details?.itinerary ?? [],
      newValue: newData.details?.itinerary ?? [],
    });
  }

  const oldReqs = normalizeRequirements(oldTour.details?.requirements ?? []);
  const newReqs = normalizeRequirements(newData.details?.requirements ?? []);
  if (oldReqs !== newReqs) {
    changes.push({
      field: "details.requirements",
      label: "Requirements",
      oldValue: oldTour.details?.requirements ?? [],
      newValue: newData.details?.requirements ?? [],
    });
  }

  const oldGallery = JSON.stringify(oldTour.media?.gallery ?? []);
  const newGallery = JSON.stringify(newData.media?.gallery ?? []);
  if (oldGallery !== newGallery) {
    changes.push({
      field: "media.gallery",
      label: "Gallery",
      oldValue: oldTour.media?.gallery ?? [],
      newValue: newData.media?.gallery ?? [],
    });
  }

  return changes;
}
