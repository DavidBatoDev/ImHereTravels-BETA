/**
 * 057 — Prepend domain to relative ctaHref values in details.thingsToKnow.
 *
 * WHAT THIS DOES
 * ──────────────
 * For each tourPackage doc, inspects every item in `details.thingsToKnow`
 * and prepends `https://www.imheretravels.com` to any ctaHref that starts
 * with `/` (relative path). Already-absolute URLs are skipped.
 *
 * ROLLBACK
 * ────────
 * Strips the prepended domain from ctaHref values that start with
 * `https://www.imheretravels.com/`, restoring them to relative paths.
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run057   # preview
 *   npx tsx migrations/migrate.ts 057           # apply
 *   npx tsx migrations/migrate.ts rollback057   # undo
 */

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase-config";

const MIGRATION_ID = "057-prepend-domain-to-things-to-know-hrefs";
const COLLECTION_NAME = "tourPackages";
const DOMAIN = "https://www.imheretravels.com";

type TtkItem = Record<string, unknown>;

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
    const items = details.thingsToKnow as TtkItem[] | undefined;

    if (!Array.isArray(items) || items.length === 0) {
      console.log(`  ⏭️  ${slug}: no thingsToKnow — skipping`);
      skipped++;
      continue;
    }

    const needsUpdate = items.some(
      (item) => typeof item.ctaHref === "string" && item.ctaHref.startsWith("/")
    );

    if (!needsUpdate) {
      console.log(`  ⏭️  ${slug}: all hrefs already absolute — skipping`);
      skipped++;
      continue;
    }

    const updatedItems = items.map((item) => {
      if (typeof item.ctaHref === "string" && item.ctaHref.startsWith("/")) {
        const newHref = `${DOMAIN}${item.ctaHref}`;
        console.log(`      ${item.ctaHref} → ${newHref}`);
        return { ...item, ctaHref: newHref };
      }
      return item;
    });

    console.log(`  ✏️  ${slug}: updating thingsToKnow hrefs`);

    if (dryRun) {
      updated++;
      continue;
    }

    try {
      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        "details.thingsToKnow": updatedItems,
        "metadata.updatedAt": Timestamp.now(),
        "metadata.updatedBy": "migration-script",
        "metadata.migratedBy": MIGRATION_ID,
      });
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
    const details = (data.details ?? {}) as Record<string, unknown>;
    const items = details.thingsToKnow as TtkItem[] | undefined;

    if (!Array.isArray(items)) continue;

    const needsRollback = items.some(
      (item) =>
        typeof item.ctaHref === "string" &&
        item.ctaHref.startsWith(`${DOMAIN}/`)
    );

    if (!needsRollback) continue;

    const rolledBack = items.map((item) => {
      if (
        typeof item.ctaHref === "string" &&
        item.ctaHref.startsWith(`${DOMAIN}/`)
      ) {
        return { ...item, ctaHref: item.ctaHref.slice(DOMAIN.length) };
      }
      return item;
    });

    try {
      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        "details.thingsToKnow": rolledBack,
        "metadata.updatedAt": Timestamp.now(),
        "metadata.updatedBy": "rollback-script",
        "metadata.migratedBy": `rollback-${MIGRATION_ID}`,
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
