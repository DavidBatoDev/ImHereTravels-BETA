/**
 * 063 — Backfill the booking link for tours without a Stripe payment link.
 *
 * WHY
 * ───
 * The www tour page's "Reserve Now" CTA uses `stripePaymentLink`. When that's
 * empty it now falls back (at render time) to the in-house reservation booking
 * form. This migration materialises that fallback into the data so the link is
 * explicit and editable in the admin form: every tour that has no
 * `stripePaymentLink` yet gets
 *
 *     https://admin.imheretravels.com/reservation-booking-form?tour=<slug>
 *
 * The `?tour=<slug>` query param pre-selects the tour in the reservation form
 * (the form reads it via `searchParams.get("tour")`). The path-segment form
 * `/reservation-booking-form/<slug>` is NOT used — there is no such route, it
 * would 404. `<slug>` is the tour doc's own `slug` (matches what the form
 * looks up).
 *
 * SCOPE
 * ─────
 *   • Only tours where `stripePaymentLink` is missing or blank are touched.
 *   • Tours that already have any `stripePaymentLink` (real Stripe link or a
 *     previously-set reservation URL) are left untouched.
 *   • Tours without a `slug` are skipped (can't build a usable link).
 *
 * Reversible: each filled doc records `_migration063` so rollback removes the
 * field again, restoring the original empty state.
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run063   # preview
 *   npx tsx migrations/migrate.ts 063           # apply
 *   npx tsx migrations/migrate.ts rollback063   # undo
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

const MIGRATION_ID = "063-backfill-reservation-booking-link";
const COLLECTION_NAME = "tourPackages";
const BACKUP_FIELD = "_migration063";

const RESERVATION_BOOKING_FORM_URL =
  "https://admin.imheretravels.com/reservation-booking-form";

function hasLink(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export async function runMigration(dryRun = false) {
  console.log(`\n🚀 Running ${MIGRATION_ID} (dryRun=${dryRun})`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));

  let updated = 0;
  let skippedHasLink = 0;
  let skippedNoSlug = 0;
  let errors = 0;

  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug.trim() : "";
    const name = (data.name as string) ?? d.id;

    if (hasLink(data.stripePaymentLink)) {
      skippedHasLink++;
      console.log(`  ⏭️  "${name}" — already has a link, skipped.`);
      continue;
    }

    if (!slug) {
      skippedNoSlug++;
      console.warn(`  ⚠️  "${name}" (${d.id}) — no slug, cannot build link. Skipped.`);
      continue;
    }

    const link = `${RESERVATION_BOOKING_FORM_URL}?tour=${slug}`;
    console.log(`  ✏️  "${name}" → ${link}`);

    if (dryRun) {
      updated++;
      continue;
    }

    try {
      await updateDoc(doc(db, COLLECTION_NAME, d.id), {
        stripePaymentLink: link,
        // Marker so rollback knows this doc was filled by us (was empty before).
        [BACKUP_FIELD]: {
          filledWith: link,
          prevWasEmptyString: data.stripePaymentLink === "",
        },
        "metadata.updatedAt": Timestamp.now(),
        "metadata.migratedBy": MIGRATION_ID,
      });
      updated++;
    } catch (err) {
      errors++;
      console.error(`  ❌ Failed to update "${name}" (${d.id}):`, err);
    }
  }

  if (dryRun) {
    console.log(`\n🧪 DRY RUN complete — no changes written.`);
  } else {
    console.log(`\n✅ Backfilled ${updated} tour booking links.`);
  }
  console.log(
    `📊 ${updated} ${dryRun ? "would be " : ""}updated, ${skippedHasLink} already had a link, ${skippedNoSlug} skipped (no slug), ${errors} errors.`,
  );

  return {
    message: `${MIGRATION_ID} ${dryRun ? "dry-run" : "completed"}`,
    details: { updated, skippedHasLink, skippedNoSlug, errors },
  };
}

export async function rollbackMigration() {
  console.log(`\n↩️  Rolling back ${MIGRATION_ID}`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));

  let restored = 0;
  let errors = 0;

  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    const stash = data[BACKUP_FIELD] as
      | { filledWith?: string; prevWasEmptyString?: boolean }
      | undefined;

    if (!stash) continue;

    // Only revert if the current value is still the one we wrote — don't clobber
    // a real Stripe link someone added after the migration.
    const restore: Record<string, unknown> = { [BACKUP_FIELD]: deleteField() };
    if (data.stripePaymentLink === stash.filledWith) {
      restore.stripePaymentLink = stash.prevWasEmptyString
        ? ""
        : deleteField();
    } else {
      console.log(
        `  ℹ️  "${(data.name as string) ?? d.id}" — link changed since migration, keeping it.`,
      );
    }
    restore["metadata.updatedAt"] = Timestamp.now();

    try {
      await updateDoc(doc(db, COLLECTION_NAME, d.id), restore);
      restored++;
    } catch (err) {
      errors++;
      console.error(`  ❌ Failed to roll back "${d.id}":`, err);
    }
  }

  console.log(`\n✅ Rolled back ${restored} tours.`);
  return {
    message: `${MIGRATION_ID} rolled back`,
    details: { restored, errors },
  };
}
