#!/usr/bin/env tsx

/**
 * Migration 042: Add Price Snapshot Metadata to Bookings
 *
 * This migration adds price snapshot metadata to all existing bookings to support
 * the tour price history system. This ensures that existing bookings maintain
 * their historical pricing and are not affected when tour package prices are updated.
 *
 * New Fields Added:
 * - priceSnapshotDate: Timestamp → When prices were captured (uses createdAt)
 * - tourPackagePricingVersion: number → Version of pricing used (set to 1 for legacy)
 * - priceSource: string → How prices were determined ('snapshot' for existing bookings)
 * - lockPricing: boolean → Prevents recalculation from current tour packages (true for existing)
 *
 * This migration is IDEMPOTENT - it can be run multiple times safely.
 * Only bookings without priceSnapshotDate will be updated.
 */

import {
  collection,
  getDocs,
  writeBatch,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase-config";
import * as fs from "fs";
import * as path from "path";

const MIGRATION_ID = "042-add-price-snapshot-metadata";
const COLLECTION_NAME = "bookings";
const SNAPSHOT_FILE = path.join(__dirname, "migration-042-snapshot.json");

interface BookingSnapshot {
  id: string;
  original: {
    priceSnapshotDate?: any;
    priceSource?: string;
    tourPackagePricingVersion?: number;
    lockPricing?: boolean;
  };
}

async function migrate() {
  console.log(`\n🚀 Starting migration: ${MIGRATION_ID}\n`);

  try {
    // Fetch all bookings
    console.log(`📋 Fetching all bookings from ${COLLECTION_NAME}...`);
    const bookingsRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(bookingsRef);

    if (snapshot.empty) {
      console.log("⚠️  No bookings found in collection.");
      return;
    }

    console.log(`✅ Found ${snapshot.size} bookings\n`);

    // Prepare batch and snapshot for rollback
    const batch = writeBatch(db);
    const snapshotData: BookingSnapshot[] = [];
    let updateCount = 0;
    let skipCount = 0;

    for (const bookingDoc of snapshot.docs) {
      const booking = bookingDoc.data();
      const bookingId = bookingDoc.id;

      // Skip if already has price snapshot metadata
      if (booking.priceSnapshotDate) {
        skipCount++;
        continue;
      }

      // Store original state for rollback
      snapshotData.push({
        id: bookingId,
        original: {
          priceSnapshotDate: booking.priceSnapshotDate,
          priceSource: booking.priceSource,
          tourPackagePricingVersion: booking.tourPackagePricingVersion,
          lockPricing: booking.lockPricing,
        },
      });

      // Determine snapshot date (use createdAt if available, otherwise current timestamp)
      let snapshotDate: Timestamp;
      if (booking.createdAt) {
        // Handle both Timestamp objects and plain objects with seconds
        if (booking.createdAt instanceof Timestamp) {
          snapshotDate = booking.createdAt;
        } else if (
          typeof booking.createdAt === "object" &&
          "seconds" in booking.createdAt
        ) {
          snapshotDate = new Timestamp(
            booking.createdAt.seconds,
            booking.createdAt.nanoseconds || 0,
          );
        } else {
          snapshotDate = Timestamp.now();
        }
      } else if (booking.reservationDate) {
        // Fallback to reservationDate if createdAt doesn't exist
        if (booking.reservationDate instanceof Timestamp) {
          snapshotDate = booking.reservationDate;
        } else if (
          typeof booking.reservationDate === "object" &&
          "seconds" in booking.reservationDate
        ) {
          snapshotDate = new Timestamp(
            booking.reservationDate.seconds,
            booking.reservationDate.nanoseconds || 0,
          );
        } else {
          snapshotDate = Timestamp.now();
        }
      } else {
        // Last resort: use current timestamp
        snapshotDate = Timestamp.now();
      }

      // Update booking with price metadata
      const bookingRef = doc(db, COLLECTION_NAME, bookingId);
      batch.update(bookingRef, {
        priceSnapshotDate: snapshotDate,
        tourPackagePricingVersion: 1, // Legacy bookings before versioning
        priceSource: "snapshot",
        lockPricing: true, // Lock existing bookings to prevent price drift
      });

      updateCount++;

      // Log progress every 50 bookings
      if (updateCount % 50 === 0) {
        console.log(`📝 Prepared ${updateCount} bookings for update...`);
      }
    }

    if (updateCount === 0) {
      console.log("\n✅ No bookings need updating (all already have metadata)");
      console.log(`ℹ️  Skipped ${skipCount} bookings (already migrated)\n`);
      return;
    }

    // Save snapshot for rollback
    console.log(`\n💾 Saving rollback snapshot to ${SNAPSHOT_FILE}...`);
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshotData, null, 2));
    console.log(`✅ Snapshot saved with ${snapshotData.length} entries\n`);

    // Commit batch update
    console.log(`🔄 Committing batch update for ${updateCount} bookings...`);
    await batch.commit();

    console.log(`\n✅ Migration completed successfully!\n`);
    console.log(`📊 Summary:`);
    console.log(`   - Total bookings: ${snapshot.size}`);
    console.log(`   - Updated: ${updateCount}`);
    console.log(`   - Skipped: ${skipCount}`);
    console.log(`   - Rollback snapshot: ${SNAPSHOT_FILE}\n`);
    console.log(
      `💡 To rollback this migration, run: tsx migrations/042-rollback-price-snapshot-metadata.ts\n`,
    );
  } catch (error) {
    console.error(`\n❌ Migration failed:`, error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log("✅ Migration completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    });
}

export { migrate };
