#!/usr/bin/env tsx

/**
 * Migration 025: Remove Emojis from Parent Tabs
 *
 * This migration removes emojis from the parentTab field for all columns,
 * keeping only the text names for a cleaner look.
 *
 * Changes:
 * - 🆔 Identifier → Identifier
 * - 👤 Traveler Information → Traveler Information
 * - 🗺️ Tour Details → Tour Details
 * - 👥 If Duo or Group Booking → If Duo or Group Booking
 * - 📧 Reservation Email → Reservation Email
 * - 💰 Payment Setting → Payment Setting
 * - 💳 Full Payment → Full Payment
 * - 💵 Payment Term 1-4 → Payment Term 1-4
 * - ❌ Cancellation → Cancellation
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

const MIGRATION_ID = "025-remove-emoji-from-parent-tabs";
const COLLECTION_NAME = "bookingSheetColumns";

// Mapping to remove emojis from parent tabs
const emojiRemovalMapping: Record<string, string> = {
  "🆔 Identifier": "Identifier",
  "👤 Traveler Information": "Traveler Information",
  "🗺️ Tour Details": "Tour Details",
  "👥 If Duo or Group Booking": "If Duo or Group Booking",
  "📧 Reservation Email": "Reservation Email",
  "💰 Payment Setting": "Payment Setting",
  "💳 Full Payment": "Full Payment",
  "💵 Payment Term 1": "Payment Term 1",
  "💵 Payment Term 2": "Payment Term 2",
  "💵 Payment Term 3": "Payment Term 3",
  "💵 Payment Term 4": "Payment Term 4",
  "❌ Cancellation": "Cancellation",
};

/**
 * Run the migration
 */
export async function runMigration025(): Promise<void> {
  console.log(`🚀 Starting migration ${MIGRATION_ID}...`);
  console.log("📋 Removing emojis from parent tabs");

  try {
    const columnsRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(columnsRef);

    if (snapshot.empty) {
      console.log("❌ No columns found in the collection");
      return;
    }

    console.log(`📊 Found ${snapshot.docs.length} columns to update`);

    // Use batch for better performance
    const batch = writeBatch(db);
    let updateCount = 0;
    let skipCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const columnData = docSnapshot.data();
      const currentParentTab = columnData.parentTab;

      if (!currentParentTab) {
        console.log(
          `⚠️ Skipping column with no parent tab: ${columnData.columnName}`
        );
        skipCount++;
        continue;
      }

      const newParentTab = emojiRemovalMapping[currentParentTab];

      if (!newParentTab) {
        console.log(
          `⚠️ No emoji removal mapping found for parent tab: ${currentParentTab}`
        );
        skipCount++;
        continue;
      }

      if (currentParentTab === newParentTab) {
        console.log(
          `✅ Column "${columnData.columnName}" already has emoji-free parent tab: ${newParentTab}`
        );
        skipCount++;
        continue;
      }

      console.log(
        `🔄 Updating "${columnData.columnName}": ${currentParentTab} → ${newParentTab}`
      );

      const columnRef = doc(db, COLLECTION_NAME, docSnapshot.id);
      batch.update(columnRef, {
        parentTab: newParentTab,
        _migration: MIGRATION_ID,
        _migratedAt: new Date(),
        _migrationNotes: `Removed emojis from parent tab`,
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
export async function rollbackMigration025(): Promise<void> {
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

    for (const docSnapshot of snapshot.docs) {
      const columnData = docSnapshot.data();

      if (columnData._migration === MIGRATION_ID) {
        console.log(`🔄 Rolling back column: ${columnData.columnName}`);

        const columnRef = doc(db, COLLECTION_NAME, docSnapshot.id);
        batch.update(columnRef, {
          parentTab: deleteField(),
          _migration: deleteField(),
          _migratedAt: deleteField(),
          _migrationNotes: deleteField(),
          _rollback: MIGRATION_ID,
          _rollbackAt: new Date(),
          _rollbackNotes: `Rolled back emoji removal`,
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
    rollbackMigration025()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Migration failed:", error);
        process.exit(1);
      });
  } else {
    runMigration025()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Migration failed:", error);
        process.exit(1);
      });
  }
}
