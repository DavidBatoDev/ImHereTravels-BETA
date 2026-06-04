/**
 * 048 — Enrich tourPackages with www presentation fields and remove capacity fields.
 *
 * WHAT THIS DOES
 * ──────────────
 * 1. Removes `maxCapacity` and `currentBookings` from every travelDate object
 *    (these fields are no longer used; booking capacity is tracked elsewhere).
 *
 * 2. Merges www presentation data into each document from the companion JSON:
 *      048-tour-presentation-data.json
 *    Fields added per tour (all optional / additive):
 *      • `seo`               – meta title/description overrides
 *      • `comingSoon`        – gate full content on www
 *      • `bookingSlug`       – override slug in booking URLs
 *      • `details.route`     – "City A → City B" route string
 *      • `details.tags`      – location/theme tag labels
 *      • `details.inclusions`– What's Included items
 *      • `details.accommodations` – Where We Stay items
 *      • `details.faqs`      – FAQ items
 *      • `details.thingsToKnow` – per-tour Things To Know cards
 *      • `details.tips`      – per-tour Tips
 *      • `details.map`       – map image / embedUrl
 *      • Per-day enrichment: image, accommodation, activities, meals
 *        merged into each `details.itinerary[]` entry by day number.
 *      • Highlight subtitles matched by title into `details.highlights[].subtitle`.
 *
 * HOW TO RUN
 * ──────────
 * 1. Generate the companion JSON (one-time, from www/web):
 *      npx tsx data/scripts/extract-enrichment-for-migration.ts \
 *        > ../../admin/client/migrations/048-tour-presentation-data.json
 *
 * 2. Run the migration:
 *      npx tsx migrations/048-enrich-tour-presentation.ts
 *    or via the migration runner (dry-run first):
 *      npx tsx migrations/run-migration.ts 048 --dry-run
 */

import fs from "fs";
import path from "path";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  FieldValue,
  deleteField,
} from "firebase/firestore";
import { db } from "./firebase-config";

const MIGRATION_ID = "048-enrich-tour-presentation";
const COLLECTION_NAME = "tourPackages";

// ─── Load companion enrichment data ────────────────────────────────────────

const ENRICHMENT_JSON_PATH = path.join(__dirname, "048-tour-presentation-data.json");

interface DayEnrichment {
  day: number;
  image?: string;
  accommodation?: string;
  activities?: string;
  meals?: string;
}

interface HighlightSubtitle {
  text: string;
  subtitle: string;
}

interface TourEnrichment {
  seo?: { title?: string; description?: string };
  comingSoon?: boolean;
  bookingSlug?: string;
  gallery?: { thumbnails?: string[] };
  details?: {
    route?: string;
    tags?: Array<string | { label: string; icon: string }>;
    inclusions?: unknown[];
    accommodations?: unknown[];
    faqs?: unknown[];
    thingsToKnow?: unknown[];
    tips?: unknown[];
    map?: { image?: string; embedUrl?: string };
  };
  itineraryEnrichment?: DayEnrichment[];
  highlightSubtitles?: HighlightSubtitle[];
}

// Known mismatches between Firestore slug and www static file slug.
// Maps Firestore slug → www slug (key in the enrichment JSON).
const SLUG_ALIASES: Record<string, string> = {
  "tanzania-exploration-danielle-erin": "danielleerintanzania",
  "japan-summer-adventure": "japan-adventure",
  "sri-lanka-wander-tour": "sri-langka-wander-tour",
};

function loadEnrichmentData(): Record<string, TourEnrichment> {
  if (!fs.existsSync(ENRICHMENT_JSON_PATH)) {
    console.warn(`\n⚠️  Enrichment JSON not found at:\n   ${ENRICHMENT_JSON_PATH}`);
    console.warn(`   Run the extraction script first (see file header for instructions).`);
    console.warn(`   Proceeding with travelDates cleanup only.\n`);
    return {};
  }
  return JSON.parse(fs.readFileSync(ENRICHMENT_JSON_PATH, "utf-8"));
}

// ─── travelDate cleanup ─────────────────────────────────────────────────────

function stripCapacityFields(travelDates: unknown[]): unknown[] {
  return travelDates.map((td) => {
    if (typeof td !== "object" || td === null) return td;
    const clean = { ...(td as Record<string, unknown>) };
    delete clean.maxCapacity;
    delete clean.currentBookings;
    return clean;
  });
}

// ─── Itinerary enrichment ────────────────────────────────────────────────────

function mergeItineraryEnrichment(
  existingItinerary: unknown[],
  enrichment: DayEnrichment[],
): unknown[] {
  const enrichmentByDay = new Map(enrichment.map((e) => [e.day, e]));
  return existingItinerary.map((d) => {
    if (typeof d !== "object" || d === null) return d;
    const day = d as Record<string, unknown>;
    const dayNum = typeof day.day === "number" ? day.day : undefined;
    if (dayNum === undefined) return day;
    const delta = enrichmentByDay.get(dayNum);
    if (!delta) return day;
    const merged = { ...day };
    if (delta.image) merged.image = delta.image;
    if (delta.accommodation) merged.accommodation = delta.accommodation;
    if (delta.activities) merged.activities = delta.activities;
    if (delta.meals) merged.meals = delta.meals;
    return merged;
  });
}

// ─── Highlight subtitle merging ──────────────────────────────────────────────

function mergeHighlightSubtitles(
  existingHighlights: unknown[],
  subtitles: HighlightSubtitle[],
): unknown[] {
  const subtitleByText = new Map(subtitles.map((s) => [s.text, s.subtitle]));
  return existingHighlights.map((h) => {
    if (typeof h !== "object" || h === null) return h;
    const highlight = h as Record<string, unknown>;
    const text = typeof highlight.text === "string" ? highlight.text : null;
    if (!text) return h;
    const subtitle = subtitleByText.get(text);
    if (!subtitle) return h;
    return { ...highlight, subtitle };
  });
}

// ─── Migration ───────────────────────────────────────────────────────────────

export async function runMigration(dryRun = false) {
  console.log(`\n🚀 Running ${MIGRATION_ID} (dryRun=${dryRun})`);

  const enrichmentData = loadEnrichmentData();
  const enrichedTourCount = Object.keys(enrichmentData).length;
  console.log(`📋 Enrichment data loaded for ${enrichedTourCount} tours`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  console.log(`📦 Found ${snap.size} tour packages`);

  let updated = 0;
  let enriched = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug : docSnap.id;

    try {
      // ── 1. Strip capacity from travelDates ──────────────────────────────
      const existingDates = Array.isArray(data.travelDates)
        ? data.travelDates
        : [];
      const cleanedDates = stripCapacityFields(existingDates);

      const updatePayload: Record<string, unknown> = {
        travelDates: cleanedDates,
        "metadata.updatedAt": Timestamp.now(),
        "metadata.updatedBy": "migration-script",
        "metadata.migratedBy": MIGRATION_ID,
      };

      // ── 2. Merge enrichment ──────────────────────────────────────────────
      const lookupSlug = SLUG_ALIASES[slug] ?? slug;
      const enrichment = enrichmentData[lookupSlug];
      if (enrichment) {
        // Top-level fields
        if (enrichment.seo) updatePayload.seo = enrichment.seo;
        if (enrichment.comingSoon) updatePayload.comingSoon = true;
        if (enrichment.bookingSlug) updatePayload.bookingSlug = enrichment.bookingSlug;

        // details.* fields (additive, using dot-notation to avoid overwriting
        // existing sibling fields like highlights/itinerary/requirements)
        const det = enrichment.details ?? {};
        if (det.route) updatePayload["details.route"] = det.route;
        if (det.tags?.length) updatePayload["details.tags"] = det.tags;
        if (det.inclusions?.length) updatePayload["details.inclusions"] = det.inclusions;
        if (det.accommodations?.length) updatePayload["details.accommodations"] = det.accommodations;
        if (det.faqs?.length) updatePayload["details.faqs"] = det.faqs;
        if (det.thingsToKnow?.length) updatePayload["details.thingsToKnow"] = det.thingsToKnow;
        if (det.tips?.length) updatePayload["details.tips"] = det.tips;
        if (det.map) updatePayload["details.map"] = det.map;

        // Per-day enrichment — read itinerary, merge, write back
        if (enrichment.itineraryEnrichment?.length) {
          const existingItinerary = Array.isArray(data.details)
            ? data.details
            : Array.isArray((data.details as Record<string, unknown>)?.itinerary)
              ? ((data.details as Record<string, unknown>).itinerary as unknown[])
              : [];
          updatePayload["details.itinerary"] = mergeItineraryEnrichment(
            existingItinerary,
            enrichment.itineraryEnrichment,
          );
        }

        // Highlight subtitles — read highlights, merge, write back
        if (enrichment.highlightSubtitles?.length) {
          const existingHighlights = Array.isArray(
            (data.details as Record<string, unknown>)?.highlights,
          )
            ? ((data.details as Record<string, unknown>).highlights as unknown[])
            : [];
          updatePayload["details.highlights"] = mergeHighlightSubtitles(
            existingHighlights,
            enrichment.highlightSubtitles,
          );
        }

        enriched++;
      }

      if (dryRun) {
        console.log(
          `  🧪 [dry-run] would update: ${slug} (enrichment: ${!!enrichment})`,
        );
        updated++;
        continue;
      }

      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), updatePayload);
      console.log(`  ✅ updated: ${slug}${enrichment ? " (+enrichment)" : ""}`);
      updated++;
    } catch (err) {
      console.error(`  ❌ error updating ${slug}:`, err);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total packages: ${snap.size}`);
  console.log(`   Updated:        ${updated}`);
  console.log(`   Enriched:       ${enriched}`);
  console.log(`   Errors:         ${errors}`);

  if (dryRun) {
    console.log(`\n🧪 DRY RUN complete — no changes written to Firestore.`);
  } else {
    console.log(`\n✅ Migration complete!`);
  }

  return {
    message: `${MIGRATION_ID} completed`,
    details: { total: snap.size, updated, enriched, errors },
  };
}

export async function rollbackMigration() {
  console.log(`\n↩️  Rolling back ${MIGRATION_ID}`);
  console.log(`   Rollback removes the presentation fields added in this migration.`);
  console.log(`   maxCapacity/currentBookings are NOT restored (they were intentionally removed).`);
  console.log(`   To restore enrichment fields, restore from a Firestore export taken before this migration.`);
}
