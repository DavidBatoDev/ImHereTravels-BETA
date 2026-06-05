/**
 * 056 — Backfill `details.thingsToKnow` and `details.tips` on tourPackages.
 *
 * WHAT THIS DOES
 * ──────────────
 * For each tour doc, independently checks whether `details.thingsToKnow` and
 * `details.tips` are missing or empty. If so, writes the shared default values
 * (previously hardcoded as fallbacks in the www). Docs that already have the
 * field set are skipped for that field.
 *
 * ROLLBACK
 * ────────
 * Removes `details.thingsToKnow` and `details.tips` from docs that were
 * updated (i.e., only those that were missing the field before).
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run056   # preview
 *   npx tsx migrations/migrate.ts 056           # apply
 *   npx tsx migrations/migrate.ts rollback056   # undo
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

const MIGRATION_ID = "056-backfill-things-to-know-and-tips";
const COLLECTION_NAME = "tourPackages";

const DEFAULT_THINGS_TO_KNOW = [
  {
    icon: "info",
    title: "Travel Information",
    description:
      "Get ready for your trip! Find helpful links to everything you need from travel and health requirements to travel guides, visa information, and more here.",
    ctaLabel: "Show more",
    ctaHref: "/travel-information",
  },
  {
    icon: "faq",
    title: "General FAQs",
    description:
      "Have more questions? Check out our FAQs as we might already have the answers.",
    ctaLabel: "Show more",
    ctaHref: "/faqs",
  },
];

const DEFAULT_TIPS = [
  {
    icon: "luggage",
    title: "Pack smart",
    description:
      "Bring comfortable walking shoes, quick-dry clothing, a reusable water bottle, and a power adapter suited for your destination.",
  },
  {
    icon: "shield",
    title: "Travel insurance",
    description:
      "We require all travelers to have valid travel insurance covering medical, cancellation, and activity risks for the duration of the trip.",
  },
  {
    icon: "sun",
    title: "Beat the climate",
    description:
      "Sunscreen, a hat, and insect repellent go a long way. Stay hydrated and listen to your body, especially on active days.",
  },
  {
    icon: "handshake",
    title: "Respect local customs",
    description:
      "Dress modestly at temples, learn a few local greetings, and tip where appropriate — small gestures make a big difference.",
  },
];

function isEmpty(val: unknown): boolean {
  return !val || (Array.isArray(val) && val.length === 0);
}

export async function runMigration(dryRun = false) {
  console.log(`\n🚀 Running ${MIGRATION_ID} (dryRun=${dryRun})`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  console.log(`📦 Found ${snap.size} tour packages\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug : docSnap.id;
    const details = (data.details ?? {}) as Record<string, unknown>;

    const needsThingsToKnow = isEmpty(details.thingsToKnow);
    const needsTips = isEmpty(details.tips);

    if (!needsThingsToKnow && !needsTips) {
      console.log(`  ⏭️  ${slug}: both fields already set — skipping`);
      skipped++;
      continue;
    }

    const fields: string[] = [];
    if (needsThingsToKnow) fields.push("thingsToKnow");
    if (needsTips) fields.push("tips");
    console.log(`  ✏️  ${slug}: backfilling [${fields.join(", ")}]`);

    if (dryRun) {
      updated++;
      continue;
    }

    try {
      const patch: Record<string, unknown> = {
        "metadata.updatedAt": Timestamp.now(),
        "metadata.updatedBy": "migration-script",
        "metadata.migratedBy": MIGRATION_ID,
      };
      if (needsThingsToKnow) patch["details.thingsToKnow"] = DEFAULT_THINGS_TO_KNOW;
      if (needsTips) patch["details.tips"] = DEFAULT_TIPS;

      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), patch);
      updated++;
    } catch (err) {
      console.error(`  ❌ error updating ${slug}:`, err);
      errors++;
    }
  }

  const summary = dryRun
    ? `[DRY RUN] Would update ${updated} docs, skip ${skipped}`
    : `Updated ${updated} docs, skipped ${skipped}, errors ${errors}`;

  console.log(`\n📊 ${MIGRATION_ID}: ${summary}`);
  return { message: summary, details: { updated, skipped, errors } };
}

export async function rollbackMigration() {
  console.log(`\n↩️  Rolling back ${MIGRATION_ID}`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  let removed = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug : docSnap.id;
    const meta = (data.metadata ?? {}) as Record<string, unknown>;

    if (meta.migratedBy !== MIGRATION_ID) continue;

    try {
      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        "details.thingsToKnow": deleteField(),
        "details.tips": deleteField(),
        "metadata.updatedAt": Timestamp.now(),
        "metadata.updatedBy": "rollback-script",
        "metadata.migratedBy": deleteField(),
      });
      console.log(`  ✅ rolled back: ${slug}`);
      removed++;
    } catch (err) {
      console.error(`  ❌ error rolling back ${slug}:`, err);
      errors++;
    }
  }

  const summary = `Rolled back ${removed} docs, errors ${errors}`;
  console.log(`\n📊 Rollback ${MIGRATION_ID}: ${summary}`);
  return { message: summary, details: { removed, errors } };
}
