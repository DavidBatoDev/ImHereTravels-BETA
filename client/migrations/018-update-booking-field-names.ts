#!/usr/bin/env tsx

/**
 * Migration 018: Update booking field names from col-<n> to actual Firestore column IDs
 *
 * This migration fixes the issue where booking documents have field names like "col-1", "col-2", etc.
 * instead of using the actual Firestore document IDs of the columns.
 *
 * The migration will:
 * 1. Fetch all columns from Firestore
 * 2. Create a mapping from col-<n> to actual Firestore column IDs
 * 3. Update all booking documents to use the correct field names
 *
 * Usage:
 *   npx tsx migrations/migrate.ts 018
 *   npx tsx migrations/migrate.ts dry-run018
 *   npx tsx migrations/migrate.ts rollback018
 */

import {
  collection,
  getDocs,
  writeBatch,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase-config";

const MIGRATION_ID = "018";
const COLUMNS_COLLECTION = "bookingSheetColumns";
const BOOKINGS_COLLECTION = "bookings";

interface Column {
  id: string;
  columnName: string;
  order: number;
}

interface BookingData {
  [key: string]: any;
}

/**
 * Run the migration to update booking field names
 */
async function runMigration(): Promise<void> {
  console.log(
    `🚀 Starting migration ${MIGRATION_ID}: Update booking field names`
  );
  console.log("=".repeat(60));

  try {
    // Step 1: Get all columns from Firestore
    console.log("📋 Fetching columns from Firestore...");
    const columnsSnapshot = await getDocs(
      query(collection(db, COLUMNS_COLLECTION), orderBy("order", "asc"))
    );

    const columns: Column[] = columnsSnapshot.docs.map((doc) => ({
      id: doc.id,
      columnName: doc.data().columnName,
      order: doc.data().order,
    }));

    console.log(`✅ Found ${columns.length} columns`);

    // Step 2: Create mapping from col-<n> to actual Firestore column IDs
    console.log("🔗 Creating field name mapping...");
    const fieldNameMapping: { [oldFieldName: string]: string } = {};

    columns.forEach((column, index) => {
      const oldFieldName = `col-${index + 1}`;
      fieldNameMapping[oldFieldName] = column.id;
      console.log(`  ${oldFieldName} → ${column.id} (${column.columnName})`);
    });

    // Step 3: Get all booking documents
    console.log("📄 Fetching booking documents...");
    const bookingsSnapshot = await getDocs(collection(db, BOOKINGS_COLLECTION));
    console.log(`✅ Found ${bookingsSnapshot.docs.length} booking documents`);

    // Step 4: Update booking documents in batches
    console.log("🔄 Updating booking documents...");
    const batch = writeBatch(db);
    let updatedCount = 0;
    let processedCount = 0;

    for (const bookingDoc of bookingsSnapshot.docs) {
      const bookingData = bookingDoc.data() as BookingData;
      const updatedData: BookingData = { ...bookingData };
      let hasChanges = false;

      // Check each field in the booking document
      for (const [fieldName, value] of Object.entries(bookingData)) {
        // If the field name matches the old col-<n> format, update it
        if (fieldName.startsWith("col-") && fieldName in fieldNameMapping) {
          const newFieldName = fieldNameMapping[fieldName];
          updatedData[newFieldName] = value;
          delete updatedData[fieldName];
          hasChanges = true;
          console.log(`  📝 ${bookingDoc.id}: ${fieldName} → ${newFieldName}`);
        }
      }

      // If there were changes, add to batch
      if (hasChanges) {
        batch.update(bookingDoc.ref, updatedData);
        updatedCount++;
      }

      processedCount++;

      // Commit batch every 500 documents to avoid Firestore limits
      if (processedCount % 500 === 0) {
        await batch.commit();
        console.log(
          `  ✅ Processed ${processedCount} documents, committed batch`
        );
      }
    }

    // Commit any remaining changes
    if (updatedCount > 0) {
      await batch.commit();
    }

    console.log("=".repeat(60));
    console.log(`✅ Migration ${MIGRATION_ID} completed successfully!`);
    console.log(`📊 Updated ${updatedCount} booking documents`);
    console.log(`📊 Processed ${processedCount} total documents`);
  } catch (error) {
    console.error(`❌ Migration ${MIGRATION_ID} failed:`, error);
    throw error;
  }
}

/**
 * Rollback the migration (restore col-<n> field names)
 */
async function rollbackMigration(): Promise<void> {
  console.log(`🔄 Starting rollback for migration ${MIGRATION_ID}`);
  console.log("=".repeat(60));

  try {
    // Step 1: Get all columns from Firestore
    console.log("📋 Fetching columns from Firestore...");
    const columnsSnapshot = await getDocs(
      query(collection(db, COLUMNS_COLLECTION), orderBy("order", "asc"))
    );

    const columns: Column[] = columnsSnapshot.docs.map((doc) => ({
      id: doc.id,
      columnName: doc.data().columnName,
      order: doc.data().order,
    }));

    console.log(`✅ Found ${columns.length} columns`);

    // Step 2: Create reverse mapping from Firestore column IDs to col-<n>
    console.log("🔗 Creating reverse field name mapping...");
    const reverseFieldNameMapping: { [firestoreId: string]: string } = {};

    columns.forEach((column, index) => {
      const oldFieldName = `col-${index + 1}`;
      reverseFieldNameMapping[column.id] = oldFieldName;
      console.log(`  ${column.id} → ${oldFieldName} (${column.columnName})`);
    });

    // Step 3: Get all booking documents
    console.log("📄 Fetching booking documents...");
    const bookingsSnapshot = await getDocs(collection(db, BOOKINGS_COLLECTION));
    console.log(`✅ Found ${bookingsSnapshot.docs.length} booking documents`);

    // Step 4: Update booking documents in batches
    console.log("🔄 Rolling back booking documents...");
    const batch = writeBatch(db);
    let updatedCount = 0;
    let processedCount = 0;

    for (const bookingDoc of bookingsSnapshot.docs) {
      const bookingData = bookingDoc.data() as BookingData;
      const updatedData: BookingData = { ...bookingData };
      let hasChanges = false;

      // Check each field in the booking document
      for (const [fieldName, value] of Object.entries(bookingData)) {
        // If the field name matches a Firestore column ID, convert it back to col-<n>
        if (fieldName in reverseFieldNameMapping) {
          const oldFieldName = reverseFieldNameMapping[fieldName];
          updatedData[oldFieldName] = value;
          delete updatedData[fieldName];
          hasChanges = true;
          console.log(`  📝 ${bookingDoc.id}: ${fieldName} → ${oldFieldName}`);
        }
      }

      // If there were changes, add to batch
      if (hasChanges) {
        batch.update(bookingDoc.ref, updatedData);
        updatedCount++;
      }

      processedCount++;

      // Commit batch every 500 documents to avoid Firestore limits
      if (processedCount % 500 === 0) {
        await batch.commit();
        console.log(
          `  ✅ Processed ${processedCount} documents, committed batch`
        );
      }
    }

    // Commit any remaining changes
    if (updatedCount > 0) {
      await batch.commit();
    }

    console.log("=".repeat(60));
    console.log(
      `✅ Rollback for migration ${MIGRATION_ID} completed successfully!`
    );
    console.log(`📊 Updated ${updatedCount} booking documents`);
    console.log(`📊 Processed ${processedCount} total documents`);
  } catch (error) {
    console.error(`❌ Rollback for migration ${MIGRATION_ID} failed:`, error);
    throw error;
  }
}

/**
 * Dry run - show what would be changed without making actual changes
 */
async function dryRun(): Promise<void> {
  console.log(
    `🔍 Dry run for migration ${MIGRATION_ID}: Update booking field names`
  );
  console.log("=".repeat(60));

  try {
    // Step 1: Get all columns from Firestore
    console.log("📋 Fetching columns from Firestore...");
    const columnsSnapshot = await getDocs(
      query(collection(db, COLUMNS_COLLECTION), orderBy("order", "asc"))
    );

    const columns: Column[] = columnsSnapshot.docs.map((doc) => ({
      id: doc.id,
      columnName: doc.data().columnName,
      order: doc.data().order,
    }));

    console.log(`✅ Found ${columns.length} columns`);

    // Step 2: Create mapping from col-<n> to actual Firestore column IDs
    console.log("🔗 Field name mapping that would be applied:");
    const fieldNameMapping: { [oldFieldName: string]: string } = {};

    columns.forEach((column, index) => {
      const oldFieldName = `col-${index + 1}`;
      fieldNameMapping[oldFieldName] = column.id;
      console.log(`  ${oldFieldName} → ${column.id} (${column.columnName})`);
    });

    // Step 3: Get all booking documents
    console.log("📄 Fetching booking documents...");
    const bookingsSnapshot = await getDocs(collection(db, BOOKINGS_COLLECTION));
    console.log(`✅ Found ${bookingsSnapshot.docs.length} booking documents`);

    // Step 4: Analyze what would be changed
    console.log("🔍 Analyzing booking documents...");
    let wouldUpdateCount = 0;
    let totalFieldChanges = 0;

    for (const bookingDoc of bookingsSnapshot.docs) {
      const bookingData = bookingDoc.data() as BookingData;
      let hasChanges = false;
      let fieldChanges = 0;

      // Check each field in the booking document
      for (const [fieldName, value] of Object.entries(bookingData)) {
        // If the field name matches the old col-<n> format, it would be updated
        if (fieldName.startsWith("col-") && fieldName in fieldNameMapping) {
          const newFieldName = fieldNameMapping[fieldName];
          console.log(`  📝 ${bookingDoc.id}: ${fieldName} → ${newFieldName}`);
          hasChanges = true;
          fieldChanges++;
        }
      }

      if (hasChanges) {
        wouldUpdateCount++;
        totalFieldChanges += fieldChanges;
      }
    }

    console.log("=".repeat(60));
    console.log(`🔍 Dry run completed!`);
    console.log(`📊 Would update ${wouldUpdateCount} booking documents`);
    console.log(`📊 Would change ${totalFieldChanges} field names`);
    console.log(`📊 Processed ${bookingsSnapshot.docs.length} total documents`);
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
      case "018":
        await runMigration();
        break;
      case "dry-run018":
        await dryRun();
        break;
      case "rollback018":
        await rollbackMigration();
        break;
      default:
        console.log("Usage:");
        console.log(
          "  npx tsx migrations/018-update-booking-field-names.ts 018"
        );
        console.log(
          "  npx tsx migrations/018-update-booking-field-names.ts dry-run018"
        );
        console.log(
          "  npx tsx migrations/018-update-booking-field-names.ts rollback018"
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
