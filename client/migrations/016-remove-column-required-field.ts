import { db } from "./firebase-config";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";

const MIGRATION_ID = "016-remove-column-required-field";
const COLUMNS_COLLECTION = "bookingSheetColumns";

interface ColumnWithRequiredField {
  id: string;
  columnName?: string;
  dataType?: string;
  name?: string;
  type?: string;
  required: boolean;
  width?: number;
  order: number;
  options?: string[];
  defaultValue?: any;
  validation?: any;
  function?: string;
  arguments?: any[];
  includeInForms?: boolean;
  _migration?: string;
  _migratedAt?: Date;
  _migrationNotes?: string;
}

export async function runMigration(dryRun: boolean = false): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log(`🚀 Starting migration: ${MIGRATION_ID}`);
    console.log(`📋 Dry run: ${dryRun}`);

    // Get all columns from the collection
    const columnsQuery = query(
      collection(db, COLUMNS_COLLECTION),
      orderBy("order", "asc")
    );
    const columnsSnapshot = await getDocs(columnsQuery);

    if (columnsSnapshot.empty) {
      console.log("ℹ️ No columns found to migrate");
      return {
        success: true,
        message: "No columns found to migrate",
        details: { columnsProcessed: 0 },
      };
    }

    const columns = columnsSnapshot.docs.map((doc) => ({
      firestoreId: doc.id, // Firestore document ID
      ...doc.data(),
    })) as (ColumnWithRequiredField & { firestoreId: string })[];

    console.log(`📊 Found ${columns.length} columns to migrate`);

    let updatedCount = 0;
    const migrationResults: any[] = [];

    for (const column of columns) {
      try {
        // Check if column already has required field removed
        if (!("required" in column)) {
          console.log(
            `⏭️ Column ${column.id} already has required field removed, skipping`
          );
          migrationResults.push({
            id: column.id,
            status: "skipped",
            reason: "Already has required field removed",
          });
          continue;
        }

        if (dryRun) {
          console.log(`🔍 [DRY RUN] Would update column ${column.id}:`);
          console.log(`   Would remove: required=${column.required}`);
        } else {
          // Update the column document to remove required field
          const columnRef = doc(db, COLUMNS_COLLECTION, column.firestoreId);
          await updateDoc(columnRef, {
            required: null,
            _migration: MIGRATION_ID,
            _migratedAt: new Date(),
            _migrationNotes: `Removed required field`,
          });

          console.log(
            `✅ Updated column ${column.id} (${column.firestoreId}): Removed required field`
          );
          updatedCount++;
        }

        migrationResults.push({
          id: column.id,
          status: dryRun ? "would_update" : "updated",
          removedField: {
            required: column.required,
          },
        });
      } catch (error) {
        console.error(`❌ Failed to migrate column ${column.id}:`, error);
        migrationResults.push({
          id: column.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const summary = {
      totalColumns: columns.length,
      updatedCount,
      skippedCount: migrationResults.filter((r) => r.status === "skipped")
        .length,
      errorCount: migrationResults.filter((r) => r.status === "error").length,
      migrationResults,
    };

    console.log(`📊 Migration Summary:`);
    console.log(`   Total columns: ${summary.totalColumns}`);
    console.log(`   Updated: ${summary.updatedCount}`);
    console.log(`   Skipped: ${summary.skippedCount}`);
    console.log(`   Errors: ${summary.errorCount}`);

    return {
      success: summary.errorCount === 0,
      message: `Migration completed. Updated ${summary.updatedCount} columns, skipped ${summary.skippedCount}, errors: ${summary.errorCount}`,
      details: summary,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Migration failed: ${errorMessage}`);
    return {
      success: false,
      message: `Migration failed: ${errorMessage}`,
      details: { error: errorMessage },
    };
  }
}

export async function rollbackMigration(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log(`🔄 Starting rollback for migration: ${MIGRATION_ID}`);

    // Get all columns that were migrated
    const columnsQuery = query(
      collection(db, COLUMNS_COLLECTION),
      orderBy("order", "asc")
    );
    const columnsSnapshot = await getDocs(columnsQuery);

    if (columnsSnapshot.empty) {
      console.log("ℹ️ No columns found to rollback");
      return {
        success: true,
        message: "No columns found to rollback",
        details: { columnsProcessed: 0 },
      };
    }

    const columns = columnsSnapshot.docs.map((doc) => ({
      firestoreId: doc.id,
      ...doc.data(),
    })) as (ColumnWithRequiredField & {
      firestoreId: string;
      _migration?: string;
    })[];

    let rollbackCount = 0;
    const rollbackResults: any[] = [];

    for (const column of columns) {
      try {
        // Check if column was migrated by this migration
        if (column._migration !== MIGRATION_ID) {
          console.log(
            `⏭️ Column ${column.id} not migrated by this migration, skipping rollback`
          );
          continue;
        }

        // Rollback by restoring required field with default value
        const columnRef = doc(db, COLUMNS_COLLECTION, column.firestoreId);
        await updateDoc(columnRef, {
          required: false,
          _migration: undefined,
          _migratedAt: undefined,
          _migrationNotes: undefined,
          _rollback: MIGRATION_ID,
          _rollbackAt: new Date(),
          _rollbackNotes: `Restored required field with default value false`,
        });

        console.log(
          `✅ Rolled back column ${column.id} (${column.firestoreId}): Restored required field`
        );
        rollbackCount++;

        rollbackResults.push({
          id: column.id,
          status: "rolled_back",
          restoredField: {
            required: false,
          },
        });
      } catch (error) {
        console.error(`❌ Failed to rollback column ${column.id}:`, error);
        rollbackResults.push({
          id: column.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const summary = {
      totalColumns: columns.length,
      rollbackCount,
      errorCount: rollbackResults.filter((r) => r.status === "error").length,
      rollbackResults,
    };

    console.log(`📊 Rollback Summary:`);
    console.log(`   Total columns: ${summary.totalColumns}`);
    console.log(`   Rolled back: ${summary.rollbackCount}`);
    console.log(`   Errors: ${summary.errorCount}`);

    return {
      success: summary.errorCount === 0,
      message: `Rollback completed. Rolled back ${summary.rollbackCount} columns, errors: ${summary.errorCount}`,
      details: summary,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Rollback failed: ${errorMessage}`);
    return {
      success: false,
      message: `Rollback failed: ${errorMessage}`,
      details: { error: errorMessage },
    };
  }
}

export default {
  id: MIGRATION_ID,
  name: "Remove Column Required Field",
  description:
    "Removes the required field from all columns in the bookingSheetColumns collection",
  runMigration,
  rollbackMigration,
};
