import { db } from "./firebase-config";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";

const MIGRATION_ID = "014-update-column-interface";
const COLUMNS_COLLECTION = "bookingSheetColumns";

interface OldSheetColumn {
  id: string;
  name: string;
  type: string;
  required: boolean;
  width?: number;
  order: number;
  visible: boolean;
  editable: boolean;
  sortable: boolean;
  filterable: boolean;
  options?: string[];
  defaultValue?: any;
  validation?: any;
}

interface NewSheetColumn {
  id: string;
  columnName: string; // Renamed from 'name'
  dataType: string; // Renamed from 'type'
  function?: string; // New field for function columns
  arguments?: any[]; // New field for function arguments
  includeInForms: boolean; // New field for form inclusion
  required: boolean;
  width?: number;
  order: number;
  visible: boolean;
  editable: boolean;
  sortable: boolean;
  filterable: boolean;
  options?: string[];
  defaultValue?: any;
  validation?: any;
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
    })) as (OldSheetColumn & { firestoreId: string })[];

    console.log(`📊 Found ${columns.length} columns to migrate`);

    let updatedCount = 0;
    const migrationResults: any[] = [];

    for (const column of columns) {
      try {
        // Check if column already has new interface
        if ("columnName" in column && "dataType" in column) {
          console.log(
            `⏭️ Column ${column.id} already has new interface, skipping`
          );
          migrationResults.push({
            id: column.id,
            status: "skipped",
            reason: "Already has new interface",
          });
          continue;
        }

        // Create new column structure
        const newColumn: NewSheetColumn = {
          id: column.id,
          columnName: column.name, // Map old 'name' to new 'columnName'
          dataType: column.type, // Map old 'type' to new 'dataType'
          function: undefined, // New field
          arguments: undefined, // New field
          includeInForms: column.type !== "function", // Auto-set based on type
          required: column.required,
          width: column.width,
          order: column.order,
          visible: column.visible,
          editable: column.editable,
          sortable: column.sortable,
          filterable: column.filterable,
          options: column.options,
          defaultValue: column.defaultValue,
          validation: column.validation,
        };

        if (dryRun) {
          console.log(`🔍 [DRY RUN] Would update column ${column.id}:`);
          console.log(`   Old: name="${column.name}", type="${column.type}"`);
          console.log(
            `   New: columnName="${newColumn.columnName}", dataType="${newColumn.dataType}", includeInForms=${newColumn.includeInForms}`
          );
        } else {
          // Update the column document
          const columnRef = doc(db, COLUMNS_COLLECTION, column.firestoreId);
          const updateData: any = {
            columnName: newColumn.columnName,
            dataType: newColumn.dataType,
            includeInForms: newColumn.includeInForms,
            _migration: MIGRATION_ID,
            _migratedAt: new Date(),
            _migrationNotes: `Updated from old interface (name->columnName, type->dataType, added includeInForms)`,
          };

          // Only add function and arguments if they have values
          if (newColumn.function !== undefined) {
            updateData.function = newColumn.function;
          }
          if (newColumn.arguments !== undefined) {
            updateData.arguments = newColumn.arguments;
          }

          await updateDoc(columnRef, updateData);

          console.log(
            `✅ Updated column ${column.id} (${column.firestoreId}): ${column.name} -> ${newColumn.columnName}`
          );
          updatedCount++;
        }

        migrationResults.push({
          id: column.id,
          status: dryRun ? "would_update" : "updated",
          oldName: column.name,
          newColumnName: newColumn.columnName,
          oldType: column.type,
          newDataType: newColumn.dataType,
          includeInForms: newColumn.includeInForms,
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
      id: doc.id,
      ...doc.data(),
    })) as (NewSheetColumn & { _migration?: string })[];

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

        // Rollback to old interface
        const columnRef = doc(db, COLUMNS_COLLECTION, column.id);
        await updateDoc(columnRef, {
          name: column.columnName, // Map back to old 'name'
          type: column.dataType, // Map back to old 'type'
          _migration: undefined,
          _migratedAt: undefined,
          _migrationNotes: undefined,
          _rollback: MIGRATION_ID,
          _rollbackAt: new Date(),
          _rollbackNotes: `Rolled back to old interface (columnName->name, dataType->type, removed includeInForms)`,
        });

        console.log(
          `✅ Rolled back column ${column.id}: ${column.columnName} -> ${column.columnName}`
        );
        rollbackCount++;

        rollbackResults.push({
          id: column.id,
          status: "rolled_back",
          oldColumnName: column.columnName,
          newName: column.columnName,
          oldDataType: column.dataType,
          newType: column.dataType,
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
  name: "Update Column Interface",
  description:
    "Updates existing columns from old interface (name, type) to new interface (columnName, dataType, includeInForms, function, arguments)",
  runMigration,
  rollbackMigration,
};
