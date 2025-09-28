#!/usr/bin/env tsx

/**
 * Migration 026: Move Payment Progress and Guest Info to Payment Setting
 *
 * This migration moves specific columns to the "Payment Setting" parent tab:
 * - Payment Progress: Payment Terms → Payment Setting
 * - Guest Info Email Sent Link: General → Payment Setting
 */

import {
  collection,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import { db } from "./firebase-config";

const MIGRATION_ID = "026-move-payment-progress-to-payment-setting";
const COLLECTION_NAME = "bookingSheetColumns";

// Mapping to move specific columns to Payment Setting
const columnMoves: Record<string, string> = {
  "Payment Progress": "Payment Setting",
  "Guest Info Email Sent Link": "Payment Setting",
};

/**
 * Run the migration
 */
export async function runMigration026(): Promise<void> {
  console.log(`🚀 Starting migration ${MIGRATION_ID}...`);
  console.log("📋 Moving Payment Progress and Guest Info to Payment Setting");

  try {
    const columnsRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(columnsRef);

    if (snapshot.empty) {
      console.log("❌ No columns found in the collection");
      return;
    }

    console.log(`📊 Found ${snapshot.docs.length} columns to check`);

    // Use batch for better performance
    const batch = writeBatch(db);
    let updateCount = 0;
    let skipCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const columnData = docSnapshot.data();
      const columnName = columnData.columnName;
      const currentParentTab = columnData.parentTab;

      if (!columnName) {
        console.log(`⚠️ Skipping column with missing name: ${docSnapshot.id}`);
        skipCount++;
        continue;
      }

      const newParentTab = columnMoves[columnName];

      if (!newParentTab) {
        // This column doesn't need to be moved
        skipCount++;
        continue;
      }

      if (currentParentTab === newParentTab) {
        console.log(
          `✅ Column "${columnName}" already has correct parent tab: ${newParentTab}`
        );
        skipCount++;
        continue;
      }

      console.log(
        `🔄 Moving "${columnName}": ${
          currentParentTab || "None"
        } → ${newParentTab}`
      );

      const columnRef = doc(db, COLLECTION_NAME, docSnapshot.id);
      batch.update(columnRef, {
        parentTab: newParentTab,
        _migration: MIGRATION_ID,
        _migratedAt: new Date(),
        _migrationNotes: `Moved to Payment Setting parent tab`,
      });

      updateCount++;
    }

    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully updated ${updateCount} columns`);
    } else {
      console.log("ℹ️ No columns needed updating");
    }

    console.log(`📊 Migration summary:`);
    console.log(`   - Updated: ${updateCount} columns`);
    console.log(`   - Skipped: ${skipCount} columns`);
    console.log(`✅ Migration ${MIGRATION_ID} completed successfully!`);
  } catch (error) {
    console.error(`❌ Migration ${MIGRATION_ID} failed:`, error);
    throw error;
  }
}

/**
 * Rollback the migration
 */
export async function rollbackMigration026(): Promise<void> {
  console.log(`🔄 Starting rollback for migration ${MIGRATION_ID}...`);

  try {
    const columnsRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(columnsRef);

    if (snapshot.empty) {
      console.log("❌ No columns found in the collection");
      return;
    }

    console.log(`📊 Found ${snapshot.docs.length} columns to rollback`);

    const batch = writeBatch(db);
    let rollbackCount = 0;

    // Define the original parent tabs for rollback
    const originalParentTabs: Record<string, string> = {
      "Payment Progress": "Payment Terms",
      "Guest Info Email Sent Link": "General",
    };

    for (const docSnapshot of snapshot.docs) {
      const columnData = docSnapshot.data();

      if (columnData._migration === MIGRATION_ID) {
        const columnName = columnData.columnName;
        const originalParentTab = originalParentTabs[columnName];

        console.log(
          `🔄 Rolling back column: ${columnName} to ${originalParentTab}`
        );

        const columnRef = doc(db, COLLECTION_NAME, docSnapshot.id);
        batch.update(columnRef, {
          parentTab: originalParentTab,
          _migration: deleteField(),
          _migratedAt: deleteField(),
          _migrationNotes: deleteField(),
          _rollback: MIGRATION_ID,
          _rollbackAt: new Date(),
          _rollbackNotes: `Rolled back to original parent tab`,
        });

        rollbackCount++;
      }
    }

    if (rollbackCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully rolled back ${rollbackCount} columns`);
    } else {
      console.log("ℹ️ No columns found to rollback");
    }

    console.log(
      `✅ Rollback for migration ${MIGRATION_ID} completed successfully!`
    );
  } catch (error) {
    console.error(`❌ Rollback for migration ${MIGRATION_ID} failed:`, error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  const command = process.argv[2];

  if (command === "rollback") {
    rollbackMigration026()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Migration failed:", error);
        process.exit(1);
      });
  } else {
    runMigration026()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Migration failed:", error);
        process.exit(1);
      });
  }
}
