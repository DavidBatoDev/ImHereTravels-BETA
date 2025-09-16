#!/usr/bin/env tsx

/**
 * Migration 019: Recreate columns with correct Firestore document IDs
 *
 * This migration recreates the bookingSheetColumns collection from the default booking columns,
 * ensuring that each column document has its Firestore document ID as the id field.
 *
 * The migration will:
 * 1. Check if columns already exist (skip if they do)
 * 2. Create all columns from defaultBookingColumns
 * 3. Set the id field to match the Firestore document ID
 *
 * Usage:
 *   npx tsx migrations/migrate.ts 019
 *   npx tsx migrations/migrate.ts dry-run019
 *   npx tsx migrations/migrate.ts rollback019
 */

import {
  collection,
  getDocs,
  writeBatch,
  doc,
  query,
  orderBy,
  addDoc,
} from "firebase/firestore";
import { db } from "./firebase-config";
import { defaultBookingColumns } from "../src/lib/default-booking-columns";

const MIGRATION_ID = "019";
const COLUMNS_COLLECTION = "bookingSheetColumns";

interface Column {
  id: string;
  columnName: string;
  order: number;
  dataType: string;
  width: number;
  includeInForms: boolean;
  [key: string]: any;
}

/**
 * Run the migration to recreate columns with correct Firestore document IDs
 */
async function runMigration(): Promise<void> {
  console.log(
    `🚀 Starting migration ${MIGRATION_ID}: Recreate columns with correct Firestore document IDs`
  );
  console.log("=".repeat(60));

  try {
    // Step 1: Check if columns already exist
    console.log("📋 Checking existing columns...");
    const existingColumnsSnapshot = await getDocs(
      collection(db, COLUMNS_COLLECTION)
    );

    if (existingColumnsSnapshot.docs.length > 0) {
      console.log(
        `⚠️  Found ${existingColumnsSnapshot.docs.length} existing columns. Skipping recreation.`
      );
      console.log(
        "   If you want to recreate columns, please delete the collection first."
      );
      return;
    }

    // Step 2: Create columns from default booking columns
    console.log("🔄 Creating columns from default booking columns...");
    const batch = writeBatch(db);
    let createdCount = 0;

    for (const columnDef of defaultBookingColumns) {
      // Create the column document
      const docRef = doc(collection(db, COLUMNS_COLLECTION));
      const columnData = {
        ...columnDef,
        id: docRef.id, // Set the id field to match the Firestore document ID
      };

      batch.set(docRef, columnData);
      createdCount++;

      console.log(`  📝 Created: ${columnDef.columnName} (ID: ${docRef.id})`);

      // Commit batch every 500 documents to avoid Firestore limits
      if (createdCount % 500 === 0) {
        await batch.commit();
        console.log(`  ✅ Processed ${createdCount} columns, committed batch`);
      }
    }

    // Commit any remaining changes
    if (createdCount > 0) {
      await batch.commit();
    }

    console.log("=".repeat(60));
    console.log(`✅ Migration ${MIGRATION_ID} completed successfully!`);
    console.log(`📊 Created ${createdCount} column documents`);
    console.log(
      `📊 All columns now have correct Firestore document IDs as their id field`
    );
  } catch (error) {
    console.error(`❌ Migration ${MIGRATION_ID} failed:`, error);
    throw error;
  }
}

/**
 * Rollback the migration (delete all columns)
 */
async function rollbackMigration(): Promise<void> {
  console.log(`🔄 Starting rollback for migration ${MIGRATION_ID}`);
  console.log("=".repeat(60));

  try {
    // Step 1: Get all columns from Firestore
    console.log("📋 Fetching columns from Firestore...");
    const columnsSnapshot = await getDocs(collection(db, COLUMNS_COLLECTION));

    console.log(`✅ Found ${columnsSnapshot.docs.length} columns`);

    if (columnsSnapshot.docs.length === 0) {
      console.log("ℹ️  No columns to delete. Collection is already empty.");
      return;
    }

    // Step 2: Delete all column documents
    console.log("🔄 Deleting column documents...");
    const batch = writeBatch(db);
    let deletedCount = 0;

    for (const columnDoc of columnsSnapshot.docs) {
      const columnData = columnDoc.data();
      console.log(
        `  🗑️  Deleting: ${columnData.columnName} (ID: ${columnDoc.id})`
      );

      batch.delete(columnDoc.ref);
      deletedCount++;

      // Commit batch every 500 documents to avoid Firestore limits
      if (deletedCount % 500 === 0) {
        await batch.commit();
        console.log(`  ✅ Processed ${deletedCount} columns, committed batch`);
      }
    }

    // Commit any remaining changes
    if (deletedCount > 0) {
      await batch.commit();
    }

    console.log("=".repeat(60));
    console.log(
      `✅ Rollback for migration ${MIGRATION_ID} completed successfully!`
    );
    console.log(`📊 Deleted ${deletedCount} column documents`);
  } catch (error) {
    console.error(`❌ Rollback for migration ${MIGRATION_ID} failed:`, error);
    throw error;
  }
}

/**
 * Dry run - show what would be created without making actual changes
 */
async function dryRun(): Promise<void> {
  console.log(
    `🔍 Dry run for migration ${MIGRATION_ID}: Recreate columns with correct Firestore document IDs`
  );
  console.log("=".repeat(60));

  try {
    // Step 1: Check if columns already exist
    console.log("📋 Checking existing columns...");
    const existingColumnsSnapshot = await getDocs(
      collection(db, COLUMNS_COLLECTION)
    );

    if (existingColumnsSnapshot.docs.length > 0) {
      console.log(
        `⚠️  Found ${existingColumnsSnapshot.docs.length} existing columns.`
      );
      console.log(
        "   Migration would be skipped. Delete the collection first to recreate."
      );
      return;
    }

    // Step 2: Show what would be created
    console.log("🔍 Columns that would be created:");
    console.log(
      `📊 Would create ${defaultBookingColumns.length} column documents`
    );

    defaultBookingColumns.forEach((columnDef, index) => {
      console.log(
        `  ${index + 1}. ${columnDef.columnName} (Order: ${
          columnDef.order
        }, Type: ${columnDef.dataType})`
      );
    });

    console.log("=".repeat(60));
    console.log(`🔍 Dry run completed!`);
    console.log(
      `📊 Would create ${defaultBookingColumns.length} column documents`
    );
    console.log(
      `📊 All columns would have correct Firestore document IDs as their id field`
    );
  } catch (error) {
    console.error(`❌ Dry run for migration ${MIGRATION_ID} failed:`, error);
    throw error;
  }
}

// Main execution
async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case "019":
        await runMigration();
        break;
      case "dry-run019":
        await dryRun();
        break;
      case "rollback019":
        await rollbackMigration();
        break;
      default:
        console.log("Usage:");
        console.log("  npx tsx migrations/019-update-column-ids.ts 019");
        console.log("  npx tsx migrations/019-update-column-ids.ts dry-run019");
        console.log(
          "  npx tsx migrations/019-update-column-ids.ts rollback019"
        );
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { runMigration, rollbackMigration, dryRun };

