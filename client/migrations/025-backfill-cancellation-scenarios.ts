/**
 * ============================================================================
 * MIGRATION 025: Backfill Cancellation Scenarios
 * ============================================================================
 *
 * Objective:
 * Update existing cancelled bookings with new cancellation scenario fields
 *
 * Changes:
 * 1. Set cancellationInitiatedBy = "Guest" (default assumption for existing cancellations)
 * 2. Set supplierCostsCommitted = 0 (default)
 * 3. Set travelCreditIssued = 0 (default)
 * 4. Set isNoShow = false (default)
 * 5. Recalculate cancellationScenario based on existing data
 *
 * Affected Documents:
 * - All bookings with reasonForCancellation filled
 *
 * Migration Type: DATA UPDATE
 * Reversible: Partially (can revert new fields, but calculated fields will differ)
 *
 * Run Instructions:
 * ```bash
 * npm run migrate:025
 * ```
 */

import { db } from "./firebase-config";
import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
  Timestamp,
} from "firebase/firestore";

// ============================================================================
// MIGRATION CONFIGURATION
// ============================================================================

const MIGRATION_ID = "025-backfill-cancellation-scenarios";
const COLLECTION_NAME = "bookings";
const BATCH_SIZE = 500; // Firestore batch limit

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate days between two dates
 */
function calculateDaysBeforeTour(
  cancellationDate: Date | Timestamp,
  tourDate: Date | Timestamp,
): number {
  const toDate = (value: any): Date => {
    if (value instanceof Date) return value;
    if (value && typeof value === "object" && "seconds" in value) {
      return new Date(value.seconds * 1000);
    }
    if (value && typeof value.toDate === "function") {
      return value.toDate();
    }
    return new Date(value);
  };

  const cancelDate = toDate(cancellationDate);
  const tour = toDate(tourDate);

  const diffTime = tour.getTime() - cancelDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Infer cancellation scenario from existing data
 */
function inferScenario(booking: any): string {
  if (!booking.reasonForCancellation || !booking.cancellationRequestDate) {
    return "";
  }

  const daysBeforeTour = calculateDaysBeforeTour(
    booking.cancellationRequestDate,
    booking.tourDate,
  );

  const isFullPayment =
    booking.paymentPlan === "Full Payment" || booking.fullPaymentDatePaid;
  const isInstallment = ["P1", "P2", "P3", "P4"].includes(
    booking.paymentPlan || "",
  );

  let timing = "";
  if (daysBeforeTour >= 100) timing = "early";
  else if (daysBeforeTour >= 60) timing = "mid-range";
  else timing = "late";

  if (isFullPayment) {
    return `Guest Cancel ${timing.charAt(0).toUpperCase() + timing.slice(1)} (Full Payment) (${daysBeforeTour} days before tour)`;
  } else if (isInstallment) {
    return `Guest Cancel ${timing.charAt(0).toUpperCase() + timing.slice(1)} (Installment) (${daysBeforeTour} days before tour)`;
  }

  return `Guest Cancellation (${daysBeforeTour} days before tour)`;
}

// ============================================================================
// MIGRATION LOGIC
// ============================================================================

export async function migrate() {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🚀 Running Migration: ${MIGRATION_ID}`);
  console.log(`${"=".repeat(80)}\n`);

  try {
    // Step 1: Query all bookings with cancellations
    console.log("📋 Step 1: Querying cancelled bookings...");
    const bookingsRef = collection(db, COLLECTION_NAME);
    const q = query(bookingsRef, where("reasonForCancellation", "!=", null));
    const snapshot = await getDocs(q);

    console.log(`✅ Found ${snapshot.size} cancelled bookings\n`);

    if (snapshot.empty) {
      console.log("ℹ️  No cancelled bookings found. Migration complete.");
      return;
    }

    // Step 2: Process in batches
    console.log("📝 Step 2: Processing bookings in batches...");
    const bookings = snapshot.docs;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const unusualBookings: string[] = [];

    for (let i = 0; i < bookings.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchDocs = bookings.slice(i, i + BATCH_SIZE);

      console.log(`\n  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

      for (const bookingDoc of batchDocs) {
        const booking = bookingDoc.data();
        const bookingRef = doc(db, COLLECTION_NAME, bookingDoc.id);

        // Check if already has new fields (skip if migrated)
        if (booking.cancellationInitiatedBy !== undefined) {
          console.log(`  ⏭️  Skipping ${booking.bookingId} - already migrated`);
          totalSkipped++;
          continue;
        }

        // Prepare updates
        const updates: any = {
          cancellationInitiatedBy: "Guest", // Default assumption
          supplierCostsCommitted: 0,
          travelCreditIssued: 0,
          isNoShow: false,
          cancellationScenario: inferScenario(booking),
        };

        // Flag unusual patterns for manual review
        const paidTerms = booking.paidTerms || 0;
        const paid = booking.paid || 0;
        const refundableAmount = booking.refundableAmount || 0;

        // Check for unusual refund patterns
        if (refundableAmount > paid) {
          unusualBookings.push(
            `${booking.bookingId}: Refundable (${refundableAmount}) > Paid (${paid})`,
          );
        }

        // Check for missing critical data
        if (!booking.cancellationRequestDate || !booking.tourDate) {
          unusualBookings.push(
            `${booking.bookingId}: Missing cancellationRequestDate or tourDate`,
          );
        }

        batch.update(bookingRef, updates);
        totalUpdated++;

        console.log(`  ✅ Updated ${booking.bookingId}`);
      }

      await batch.commit();
      totalProcessed += batchDocs.length;
      console.log(
        `  ✅ Batch committed (${totalProcessed}/${bookings.length})`,
      );
    }

    // Step 3: Report results
    console.log(`\n${"=".repeat(80)}`);
    console.log("📊 MIGRATION RESULTS:");
    console.log(`${"=".repeat(80)}`);
    console.log(`Total Bookings Processed: ${totalProcessed}`);
    console.log(`Total Updated: ${totalUpdated}`);
    console.log(`Total Skipped (already migrated): ${totalSkipped}`);

    if (unusualBookings.length > 0) {
      console.log(`\n⚠️  UNUSUAL BOOKINGS FLAGGED FOR REVIEW:`);
      console.log(`${"=".repeat(80)}`);
      unusualBookings.forEach((msg) => console.log(`  - ${msg}`));
      console.log(
        `\n📝 Please review these ${unusualBookings.length} bookings manually.`,
      );
    }

    console.log(`\n✅ Migration ${MIGRATION_ID} completed successfully!\n`);
  } catch (error) {
    console.error(`\n❌ Migration ${MIGRATION_ID} failed:`, error);
    throw error;
  }
}

// ============================================================================
// ROLLBACK LOGIC (Optional)
// ============================================================================

export async function rollback() {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`⏪ Rolling back Migration: ${MIGRATION_ID}`);
  console.log(`${"=".repeat(80)}\n`);

  console.log("⚠️  WARNING: This will remove the new cancellation fields.");
  console.log(
    "⚠️  Calculated fields (refunds, admin fees) will NOT be reverted.\n",
  );

  try {
    // Query all bookings with the new fields
    const bookingsRef = collection(db, COLLECTION_NAME);
    const q = query(bookingsRef, where("cancellationInitiatedBy", "!=", null));
    const snapshot = await getDocs(q);

    console.log(`✅ Found ${snapshot.size} bookings to rollback\n`);

    if (snapshot.empty) {
      console.log("ℹ️  No bookings to rollback. Migration was not applied.");
      return;
    }

    // Process in batches
    const bookings = snapshot.docs;
    let totalRolledBack = 0;

    for (let i = 0; i < bookings.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchDocs = bookings.slice(i, i + BATCH_SIZE);

      for (const bookingDoc of batchDocs) {
        const bookingRef = doc(db, COLLECTION_NAME, bookingDoc.id);

        // Remove the new fields
        batch.update(bookingRef, {
          cancellationInitiatedBy: null,
          supplierCostsCommitted: 0,
          travelCreditIssued: 0,
          isNoShow: false,
          cancellationScenario: "",
        });

        totalRolledBack++;
      }

      await batch.commit();
      console.log(`✅ Rolled back batch ${Math.floor(i / BATCH_SIZE) + 1}`);
    }

    console.log(
      `\n✅ Rollback completed: ${totalRolledBack} bookings reverted\n`,
    );
  } catch (error) {
    console.error(`\n❌ Rollback failed:`, error);
    throw error;
  }
}

// ============================================================================
// EXECUTION
// ============================================================================

// Run migration if executed directly
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
