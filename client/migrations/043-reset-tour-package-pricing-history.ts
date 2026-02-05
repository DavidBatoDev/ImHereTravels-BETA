#!/usr/bin/env tsx

/**
 * Migration 043: Reset Tour Package Pricing History
 *
 * This migration removes all pricingHistory entries from tourPackages
 * and resets currentVersion to 1.
 */

import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "./firebase-config";

const MIGRATION_ID = "043-reset-tour-package-pricing-history";
const COLLECTION_NAME = "tourPackages";
const BATCH_SIZE = 400;

async function migrate() {
  console.log(`\n🚀 Starting migration: ${MIGRATION_ID}\n`);

  try {
    console.log(`📋 Fetching all tour packages from ${COLLECTION_NAME}...`);
    const tourPackagesRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(tourPackagesRef);

    if (snapshot.empty) {
      console.log("⚠️  No tour packages found in collection.");
      return;
    }

    console.log(`✅ Found ${snapshot.size} tour packages\n`);

    let updateCount = 0;
    let batch = writeBatch(db);
    let batchCount = 0;

    for (const tourDoc of snapshot.docs) {
      const tourRef = doc(db, COLLECTION_NAME, tourDoc.id);
      batch.update(tourRef, {
        pricingHistory: [],
        currentVersion: 1,
      });

      updateCount++;
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`\n✅ Migration completed successfully!`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Total tour packages: ${snapshot.size}`);
    console.log(`   - Updated: ${updateCount}`);
  } catch (error) {
    console.error(`\n❌ Migration failed:`, error);
    throw error;
  }
}

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
