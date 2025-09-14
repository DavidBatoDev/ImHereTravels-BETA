#!/usr/bin/env tsx

/**
 * Migration 020: Rebuild columns with custom IDs based on column names
 *
 * This migration recreates the bookingSheetColumns collection from the default booking columns,
 * generating custom IDs based on column names (e.g., "First Name" → "firstName").
 *
 * The migration will:
 * 1. Check if columns already exist (skip if they do)
 * 2. Create all columns from defaultBookingColumns
 * 3. Generate custom IDs from column names using camelCase conversion
 * 4. Use the custom ID as both the Firestore document ID and the column.id field
 *
 * Usage:
 *   npx tsx migrations/migrate.ts 020
 *   npx tsx migrations/migrate.ts dry-run020
 *   npx tsx migrations/migrate.ts rollback020
 */

import {
  collection,
  getDocs,
  writeBatch,
  doc,
  query,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase-config";
import { defaultBookingColumns } from "../src/lib/default-booking-columns";

const MIGRATION_ID = "020";
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
 * Convert a column name to a camelCase ID
 * Examples:
 * - "First Name" → "firstName"
 * - "Booking ID" → "bookingId"
 * - "P1 Due Date" → "p1DueDate"
 * - "Include BCC (Reservation)" → "includeBccReservation"
 */
function generateCustomId(columnName: string): string {
  return columnName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters except spaces
    .replace(/\s+/g, " ") // Normalize multiple spaces to single space
    .trim()
    .split(" ")
    .map((word, index) => {
      if (index === 0) {
        return word; // First word stays lowercase
      }
      return word.charAt(0).toUpperCase() + word.slice(1); // Capitalize first letter of subsequent words
    })
    .join("");
}

/**
 * Run the migration to rebuild columns with custom IDs
 */
async function runMigration(): Promise<void> {
  console.log(
    `🚀 Starting migration ${MIGRATION_ID}: Rebuild columns with custom IDs`
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

    // Step 2: Create columns from default booking columns with custom IDs
    console.log("🔄 Creating columns with custom IDs...");
    const batch = writeBatch(db);
    let createdCount = 0;

    for (const columnDef of defaultBookingColumns) {
      // Generate custom ID from column name
      const customId = generateCustomId(columnDef.columnName);

      // Create the column document with custom ID
      const docRef = doc(db, COLUMNS_COLLECTION, customId);
      const columnData = {
        ...columnDef,
        id: customId, // Set the id field to match the custom ID
      };

      batch.set(docRef, columnData);
      createdCount++;

      console.log(`  📝 Created: ${columnDef.columnName} → ${customId}`);

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
    console.log(`📊 All columns now have custom IDs based on their names`);
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
    `🔍 Dry run for migration ${MIGRATION_ID}: Rebuild columns with custom IDs`
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
    console.log("🔍 Columns that would be created with custom IDs:");
    console.log(
      `📊 Would create ${defaultBookingColumns.length} column documents`
    );

    defaultBookingColumns.forEach((columnDef, index) => {
      const customId = generateCustomId(columnDef.columnName);
      console.log(
        `  ${index + 1}. ${columnDef.columnName} → ${customId} (Order: ${
          columnDef.order
        }, Type: ${columnDef.dataType})`
      );
    });

    console.log("=".repeat(60));
    console.log(`🔍 Dry run completed!`);
    console.log(
      `📊 Would create ${defaultBookingColumns.length} column documents`
    );
    console.log(`📊 All columns would have custom IDs based on their names`);
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
      case "020":
        await runMigration();
        break;
      case "dry-run020":
        await dryRun();
        break;
      case "rollback020":
        await rollbackMigration();
        break;
      default:
        console.log("Usage:");
        console.log(
          "  npx tsx migrations/020-rebuild-columns-with-custom-ids.ts 020"
        );
        console.log(
          "  npx tsx migrations/020-rebuild-columns-with-custom-ids.ts dry-run020"
        );
        console.log(
          "  npx tsx migrations/020-rebuild-columns-with-custom-ids.ts rollback020"
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
