#!/usr/bin/env tsx

/**
 * Rollback Migration 042: Remove Price Snapshot Metadata from Bookings
 *
 * This script rolls back the 042-add-price-snapshot-metadata migration by
 * restoring bookings to their original state before the migration.
 *
 * IMPORTANT: This script requires the snapshot file created during migration:
 * migrations/migration-042-snapshot.json
 *
 * The snapshot file contains the original state of all modified bookings.
 * Without this file, rollback is not possible.
 */

import { collection, writeBatch, doc, deleteField } from "firebase/firestore";
import { db } from "./firebase-config";
import * as fs from "fs";
import * as path from "path";

const MIGRATION_ID = "042-rollback-price-snapshot-metadata";
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

async function rollback() {
  console.log(`\n🔄 Starting rollback: ${MIGRATION_ID}\n`);

  try {
    // Check if snapshot file exists
    if (!fs.existsSync(SNAPSHOT_FILE)) {
      throw new Error(
        `❌ Snapshot file not found: ${SNAPSHOT_FILE}\n` +
          `   Cannot rollback without snapshot file.\n` +
          `   The snapshot should have been created during migration.`,
      );
    }

    // Load snapshot data
    console.log(`📋 Loading snapshot from ${SNAPSHOT_FILE}...`);
    const snapshotData: BookingSnapshot[] = JSON.parse(
      fs.readFileSync(SNAPSHOT_FILE, "utf-8"),
    );

    if (!snapshotData || snapshotData.length === 0) {
      console.log("⚠️  Snapshot file is empty. Nothing to rollback.");
      return;
    }

    console.log(`✅ Loaded ${snapshotData.length} booking snapshots\n`);

    // Prepare batch restore
    const batch = writeBatch(db);
    let restoreCount = 0;

    for (const item of snapshotData) {
      const bookingRef = doc(db, COLLECTION_NAME, item.id);

      // Restore original values (or delete fields if they didn't exist)
      const updates: any = {};

      if (item.original.priceSnapshotDate === undefined) {
        updates.priceSnapshotDate = deleteField();
      } else {
        updates.priceSnapshotDate = item.original.priceSnapshotDate;
      }

      if (item.original.priceSource === undefined) {
        updates.priceSource = deleteField();
      } else {
        updates.priceSource = item.original.priceSource;
      }

      if (item.original.tourPackagePricingVersion === undefined) {
        updates.tourPackagePricingVersion = deleteField();
      } else {
        updates.tourPackagePricingVersion =
          item.original.tourPackagePricingVersion;
      }

      if (item.original.lockPricing === undefined) {
        updates.lockPricing = deleteField();
      } else {
        updates.lockPricing = item.original.lockPricing;
      }

      batch.update(bookingRef, updates);
      restoreCount++;

      // Log progress every 50 bookings
      if (restoreCount % 50 === 0) {
        console.log(`📝 Prepared ${restoreCount} bookings for restore...`);
      }
    }

    // Commit batch restore
    console.log(
      `\n🔄 Committing batch restore for ${restoreCount} bookings...`,
    );
    await batch.commit();

    console.log(`\n✅ Rollback completed successfully!\n`);
    console.log(`📊 Summary:`);
    console.log(`   - Restored: ${restoreCount} bookings`);
    console.log(`   - Snapshot file: ${SNAPSHOT_FILE}\n`);

    // Optionally rename snapshot file to prevent accidental reuse
    const backupPath = SNAPSHOT_FILE.replace(
      ".json",
      `-rolled-back-${Date.now()}.json`,
    );
    console.log(`📦 Backing up snapshot file to ${backupPath}...`);
    fs.renameSync(SNAPSHOT_FILE, backupPath);
    console.log(`✅ Snapshot file backed up\n`);

    console.log(
      `💡 If you need to re-run the migration, run: tsx migrations/042-add-price-snapshot-metadata.ts\n`,
    );
  } catch (error) {
    console.error(`\n❌ Rollback failed:`, error);
    throw error;
  }
}

// Run rollback if called directly
if (require.main === module) {
  rollback()
    .then(() => {
      console.log("✅ Rollback completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Rollback failed:", error);
      process.exit(1);
    });
}

export { rollback };
