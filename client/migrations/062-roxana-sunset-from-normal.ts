/**
 * 062 — Make `philippine-sunset-with-roxana` mirror the normal `philippine-sunset`.
 *
 * WHY
 * ───
 * The Roxana-hosted Philippine Sunset is the same trip experience as the normal
 * Philippine Sunset; only the commercial details differ. This copies the
 * experience content from the source tour onto the Roxana variant while keeping
 * the Roxana doc's own identity + commercials.
 *
 * COPIED from source → target (the "details"):
 *   description, destinations, duration, cardHeaderTitle, cardSubHeader,
 *   details (itinerary/highlights/inclusions/accommodations/keyFacts/faqs/map…),
 *   media (coverImage + gallery), brochureLink, preDeparturePack, depositNote,
 *   footnote, comingSoon
 *
 * PRESERVED on the target (never overwritten):
 *   slug, name, pricing, travelDates, stripePaymentLink, bookingSlug, tourCode,
 *   url, seo, status, isHosted, metadata, pricingHistory, currentVersion
 *
 * Reversible: the target's prior values for the copied keys are stashed in a
 * `_migration062` field before overwriting; rollback restores them.
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run062   # preview
 *   npx tsx migrations/migrate.ts 062           # apply
 *   npx tsx migrations/migrate.ts rollback062   # undo
 */

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteField,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase-config";

const MIGRATION_ID = "062-roxana-sunset-from-normal";
const COLLECTION_NAME = "tourPackages";

const SOURCE_SLUG = "philippine-sunset";
const TARGET_SLUG = "philippine-sunset-with-roxana";
const BACKUP_FIELD = "_migration062";

// Experience content copied from the source onto the target.
const COPY_KEYS = [
  "description",
  "destinations",
  "duration",
  "cardHeaderTitle",
  "cardSubHeader",
  "details",
  "media",
  "brochureLink",
  "preDeparturePack",
  "depositNote",
  "footnote",
  "comingSoon",
] as const;

function findBySlug(
  docs: { id: string; data: () => Record<string, unknown> }[],
  slug: string,
) {
  return docs.find((d) => (d.data() as Record<string, unknown>).slug === slug);
}

function describeValue(v: unknown): string {
  if (Array.isArray(v)) return `array(${v.length})`;
  if (v && typeof v === "object") return `object(${Object.keys(v).length} keys)`;
  if (typeof v === "string") return `"${v.length > 40 ? v.slice(0, 40) + "…" : v}"`;
  return String(v);
}

export async function runMigration(dryRun = false) {
  console.log(`\n🚀 Running ${MIGRATION_ID} (dryRun=${dryRun})`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  const source = findBySlug(snap.docs, SOURCE_SLUG);
  const target = findBySlug(snap.docs, TARGET_SLUG);

  if (!source) {
    console.error(`  ❌ Source tour not found (slug=${SOURCE_SLUG})`);
    return { message: `${MIGRATION_ID} aborted`, details: { copied: 0, errors: 1 } };
  }
  if (!target) {
    console.error(`  ❌ Target tour not found (slug=${TARGET_SLUG})`);
    return { message: `${MIGRATION_ID} aborted`, details: { copied: 0, errors: 1 } };
  }

  const sourceData = source.data() as Record<string, unknown>;
  const targetData = target.data() as Record<string, unknown>;

  console.log(`  📋 Copying from "${SOURCE_SLUG}" → "${TARGET_SLUG}" (doc ${target.id})`);

  const update: Record<string, unknown> = {};
  for (const key of COPY_KEYS) {
    if (key in sourceData) {
      update[key] = sourceData[key];
      console.log(`     • ${key}: ${describeValue(sourceData[key])}`);
    } else {
      console.log(`     • ${key}: (absent on source — skipped)`);
    }
  }

  // Preserve a one-time backup of the target's prior values for the copied keys
  // so rollback is exact. Don't overwrite an existing backup (keeps the true
  // original if the migration is re-run).
  if (!(BACKUP_FIELD in targetData)) {
    const backup: Record<string, unknown> = {};
    const absent: string[] = [];
    for (const key of COPY_KEYS) {
      if (key in targetData) backup[key] = targetData[key];
      else absent.push(key);
    }
    update[BACKUP_FIELD] = { backup, absent };
  } else {
    console.log(`  ℹ️  ${BACKUP_FIELD} already present — keeping the original backup.`);
  }

  if (dryRun) {
    console.log(`\n🧪 DRY RUN complete — no changes written.`);
    return {
      message: `${MIGRATION_ID} dry-run`,
      details: { copied: Object.keys(update).filter((k) => k !== BACKUP_FIELD).length, errors: 0 },
    };
  }

  update["metadata.updatedAt"] = Timestamp.now();
  update["metadata.migratedBy"] = MIGRATION_ID;

  await updateDoc(doc(db, COLLECTION_NAME, target.id), update);
  const copied = Object.keys(update).filter(
    (k) => k !== BACKUP_FIELD && !k.startsWith("metadata."),
  ).length;
  console.log(`\n✅ Copied ${copied} fields onto ${TARGET_SLUG}.`);

  return { message: `${MIGRATION_ID} completed`, details: { copied, errors: 0 } };
}

export async function rollbackMigration() {
  console.log(`\n↩️  Rolling back ${MIGRATION_ID}`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  const target = findBySlug(snap.docs, TARGET_SLUG);
  if (!target) {
    console.error(`  ❌ Target tour not found (slug=${TARGET_SLUG})`);
    return { message: `${MIGRATION_ID} rollback aborted`, details: { restored: 0, errors: 1 } };
  }

  const targetData = target.data() as Record<string, unknown>;
  const stash = targetData[BACKUP_FIELD] as
    | { backup?: Record<string, unknown>; absent?: string[] }
    | undefined;

  if (!stash) {
    console.warn(`  ⚠️  No ${BACKUP_FIELD} backup found — nothing to restore.`);
    return { message: `${MIGRATION_ID} rollback (no backup)`, details: { restored: 0, errors: 0 } };
  }

  const restore: Record<string, unknown> = { ...(stash.backup ?? {}) };
  for (const key of stash.absent ?? []) {
    restore[key] = deleteField();
  }
  restore[BACKUP_FIELD] = deleteField();
  restore["metadata.updatedAt"] = Timestamp.now();

  await updateDoc(doc(db, COLLECTION_NAME, target.id), restore);
  const restored = Object.keys(stash.backup ?? {}).length;
  console.log(`\n✅ Restored ${restored} fields on ${TARGET_SLUG}.`);

  return { message: `${MIGRATION_ID} rolled back`, details: { restored, errors: 0 } };
}
