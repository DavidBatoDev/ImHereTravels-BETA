import { db } from "./firebase-config";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  where,
} from "firebase/firestore";

const MIGRATION_ID = "017-update-payment-columns";
const COLUMNS_COLLECTION = "bookingSheetColumns";

interface ColumnToUpdate {
  id: string;
  firestoreId: string;
  order: number;
  columnName?: string;
  dataType?: string;
  width?: number;
  includeInForms?: boolean;
  options?: string[];
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
      firestoreId: doc.id,
      ...doc.data(),
    })) as (ColumnToUpdate & { firestoreId: string })[];

    console.log(`📊 Found ${columns.length} columns to migrate`);

    let deletedCount = 0;
    let addedCount = 0;
    let updatedCount = 0;
    const migrationResults: any[] = [];

    // Step 1: Remove "Reservation Email" (order 25) and "Full Payment" (order 40) columns
    const columnsToDelete = columns.filter(
      (col) =>
        col.columnName === "Reservation Email" ||
        col.columnName === "Full Payment"
    );

    for (const column of columnsToDelete) {
      try {
        if (dryRun) {
          console.log(
            `🔍 [DRY RUN] Would delete column: ${column.columnName} (${column.id})`
          );
        } else {
          await deleteDoc(doc(db, COLUMNS_COLLECTION, column.firestoreId));
          console.log(`✅ Deleted column: ${column.columnName} (${column.id})`);
          deletedCount++;
        }

        migrationResults.push({
          id: column.id,
          action: "deleted",
          columnName: column.columnName,
          status: dryRun ? "would_delete" : "deleted",
        });
      } catch (error) {
        console.error(`❌ Failed to delete column ${column.id}:`, error);
        migrationResults.push({
          id: column.id,
          action: "delete",
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Step 2: Remove Payment Term columns (orders 44-47)
    const paymentTermColumns = columns.filter(
      (col) =>
        col.columnName?.includes("Payment Term") &&
        col.order >= 44 &&
        col.order <= 47
    );

    for (const column of paymentTermColumns) {
      try {
        if (dryRun) {
          console.log(
            `🔍 [DRY RUN] Would delete column: ${column.columnName} (${column.id})`
          );
        } else {
          await deleteDoc(doc(db, COLUMNS_COLLECTION, column.firestoreId));
          console.log(`✅ Deleted column: ${column.columnName} (${column.id})`);
          deletedCount++;
        }

        migrationResults.push({
          id: column.id,
          action: "deleted",
          columnName: column.columnName,
          status: dryRun ? "would_delete" : "deleted",
        });
      } catch (error) {
        console.error(`❌ Failed to delete column ${column.id}:`, error);
        migrationResults.push({
          id: column.id,
          action: "delete",
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Step 3: Add new Payment Term columns (P1-P4, each with 7 fields)
    const newPaymentColumns = [
      // P1 columns (order 44-50)
      {
        order: 44,
        name: "P1 Scheduled Reminder Date",
        dataType: "date",
        width: 180,
        includeInForms: true,
      },
      {
        order: 45,
        name: "P1 Scheduled Email Link",
        dataType: "string",
        width: 180,
        includeInForms: false,
      },
      {
        order: 46,
        name: "P1 Calendar Event ID",
        dataType: "string",
        width: 160,
        includeInForms: false,
      },
      {
        order: 47,
        name: "P1 Calendar Event Link",
        dataType: "string",
        width: 160,
        includeInForms: false,
      },
      {
        order: 48,
        name: "P1 Due Date",
        dataType: "date",
        width: 120,
        includeInForms: true,
      },
      {
        order: 49,
        name: "P1 Amount",
        dataType: "currency",
        width: 120,
        includeInForms: true,
      },
      {
        order: 50,
        name: "P1 Date Paid",
        dataType: "date",
        width: 120,
        includeInForms: true,
      },

      // P2 columns (order 51-57)
      {
        order: 51,
        name: "P2 Scheduled Reminder Date",
        dataType: "date",
        width: 180,
        includeInForms: true,
      },
      {
        order: 52,
        name: "P2 Scheduled Email Link",
        dataType: "string",
        width: 180,
        includeInForms: false,
      },
      {
        order: 53,
        name: "P2 Calendar Event ID",
        dataType: "string",
        width: 160,
        includeInForms: false,
      },
      {
        order: 54,
        name: "P2 Calendar Event Link",
        dataType: "string",
        width: 160,
        includeInForms: false,
      },
      {
        order: 55,
        name: "P2 Due Date",
        dataType: "date",
        width: 120,
        includeInForms: true,
      },
      {
        order: 56,
        name: "P2 Amount",
        dataType: "currency",
        width: 120,
        includeInForms: true,
      },
      {
        order: 57,
        name: "P2 Date Paid",
        dataType: "date",
        width: 120,
        includeInForms: true,
      },

      // P3 columns (order 58-64)
      {
        order: 58,
        name: "P3 Scheduled Reminder Date",
        dataType: "date",
        width: 180,
        includeInForms: true,
      },
      {
        order: 59,
        name: "P3 Scheduled Email Link",
        dataType: "string",
        width: 180,
        includeInForms: false,
      },
      {
        order: 60,
        name: "P3 Calendar Event ID",
        dataType: "string",
        width: 160,
        includeInForms: false,
      },
      {
        order: 61,
        name: "P3 Calendar Event Link",
        dataType: "string",
        width: 160,
        includeInForms: false,
      },
      {
        order: 62,
        name: "P3 Due Date",
        dataType: "date",
        width: 120,
        includeInForms: true,
      },
      {
        order: 63,
        name: "P3 Amount",
        dataType: "currency",
        width: 120,
        includeInForms: true,
      },
      {
        order: 64,
        name: "P3 Date Paid",
        dataType: "date",
        width: 120,
        includeInForms: true,
      },

      // P4 columns (order 65-71)
      {
        order: 65,
        name: "P4 Scheduled Reminder Date",
        dataType: "date",
        width: 180,
        includeInForms: true,
      },
      {
        order: 66,
        name: "P4 Scheduled Email Link",
        dataType: "string",
        width: 180,
        includeInForms: false,
      },
      {
        order: 67,
        name: "P4 Calendar Event ID",
        dataType: "string",
        width: 160,
        includeInForms: false,
      },
      {
        order: 68,
        name: "P4 Calendar Event Link",
        dataType: "string",
        width: 160,
        includeInForms: false,
      },
      {
        order: 69,
        name: "P4 Due Date",
        dataType: "date",
        width: 120,
        includeInForms: true,
      },
      {
        order: 70,
        name: "P4 Amount",
        dataType: "currency",
        width: 120,
        includeInForms: true,
      },
      {
        order: 71,
        name: "P4 Date Paid",
        dataType: "date",
        width: 120,
        includeInForms: true,
      },
    ];

    for (const columnData of newPaymentColumns) {
      try {
        const newColumn = {
          id: `col-${columnData.order}`,
          columnName: columnData.name,
          dataType: columnData.dataType,
          width: columnData.width,
          includeInForms: columnData.includeInForms,
          order: columnData.order,
          _migration: MIGRATION_ID,
          _migratedAt: new Date(),
          _migrationNotes: `Added new payment term column: ${columnData.name}`,
        };

        if (dryRun) {
          console.log(
            `🔍 [DRY RUN] Would add column: ${columnData.name} (col-${columnData.order})`
          );
        } else {
          await addDoc(collection(db, COLUMNS_COLLECTION), newColumn);
          console.log(
            `✅ Added column: ${columnData.name} (col-${columnData.order})`
          );
          addedCount++;
        }

        migrationResults.push({
          id: `col-${columnData.order}`,
          action: "added",
          columnName: columnData.name,
          status: dryRun ? "would_add" : "added",
        });
      } catch (error) {
        console.error(`❌ Failed to add column ${columnData.name}:`, error);
        migrationResults.push({
          id: `col-${columnData.order}`,
          action: "add",
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Step 4: Update remaining columns' order numbers to fill gaps
    const remainingColumns = columns.filter(
      (col) =>
        col.columnName !== "Reservation Email" &&
        col.columnName !== "Full Payment" &&
        !col.columnName?.includes("Payment Term") &&
        col.order > 25 // Only update columns after the deleted ones
    );

    // Reorder columns that come after the deleted ones
    const reorderMap: { [key: number]: number } = {
      26: 25, // Include BCC (Reservation) moves from 26 to 25
      27: 26, // Generate Email Draft moves from 27 to 26
      28: 27, // Email Draft Link moves from 28 to 27
      29: 28, // Subject Line (Reservation) moves from 29 to 28
      30: 29, // Send Email? moves from 30 to 29
      31: 30, // Sent Email Link moves from 31 to 30
      32: 31, // Reservation Email Sent Date moves from 32 to 31
      33: 32, // Payment Condition moves from 33 to 32
      34: 33, // Eligible 2nd-of-Months moves from 34 to 33
      35: 34, // Available Payment Terms moves from 35 to 34
      36: 35, // Payment Plan moves from 36 to 35
      37: 36, // Payment Method moves from 37 to 36
      38: 37, // Enable Payment Reminder moves from 38 to 37
      39: 38, // Payment Progress moves from 39 to 38
      41: 39, // Full Payment Due Date moves from 41 to 39
      42: 40, // Full Payment Amount moves from 42 to 40
      43: 41, // Full Payment Date Paid moves from 43 to 41
      48: 42, // Reservation Fee moves from 48 to 42
      49: 43, // Paid moves from 49 to 43
      50: 44, // Remaining Balance moves from 50 to 44
      51: 45, // Manual Credit moves from 51 to 45
      52: 46, // Credit From moves from 52 to 46
      53: 47, // Reason for Cancellation moves from 53 to 47
      54: 48, // Include BCC (Cancellation) moves from 54 to 48
      55: 49, // Generate Cancellation Email Draft moves from 55 to 49
      56: 50, // Cancellation Email Draft Link moves from 56 to 50
      57: 51, // Subject Line (Cancellation) moves from 57 to 51
      58: 52, // Send Cancellation Email? moves from 58 to 52
      59: 53, // Sent Cancellation Email Link moves from 59 to 53
      60: 54, // Cancellation Email Sent Date moves from 60 to 54
    };

    for (const column of remainingColumns) {
      const newOrder = reorderMap[column.order];
      if (newOrder) {
        try {
          if (dryRun) {
            console.log(
              `🔍 [DRY RUN] Would update column ${column.id} order from ${column.order} to ${newOrder}`
            );
          } else {
            await updateDoc(doc(db, COLUMNS_COLLECTION, column.firestoreId), {
              order: newOrder,
              _migration: MIGRATION_ID,
              _migratedAt: new Date(),
              _migrationNotes: `Updated order from ${column.order} to ${newOrder}`,
            });
            console.log(
              `✅ Updated column ${column.id} order from ${column.order} to ${newOrder}`
            );
            updatedCount++;
          }

          migrationResults.push({
            id: column.id,
            action: "reordered",
            columnName: column.columnName,
            oldOrder: column.order,
            newOrder: newOrder,
            status: dryRun ? "would_update" : "updated",
          });
        } catch (error) {
          console.error(`❌ Failed to update column ${column.id}:`, error);
          migrationResults.push({
            id: column.id,
            action: "reorder",
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    const summary = {
      totalColumns: columns.length,
      deletedCount,
      addedCount,
      updatedCount,
      errorCount: migrationResults.filter((r) => r.status === "error").length,
      migrationResults,
    };

    console.log(`📊 Migration Summary:`);
    console.log(`   Total columns processed: ${summary.totalColumns}`);
    console.log(`   Deleted: ${summary.deletedCount}`);
    console.log(`   Added: ${summary.addedCount}`);
    console.log(`   Updated: ${summary.updatedCount}`);
    console.log(`   Errors: ${summary.errorCount}`);

    return {
      success: summary.errorCount === 0,
      message: `Migration completed. Deleted ${summary.deletedCount} columns, added ${summary.addedCount}, updated ${summary.updatedCount}, errors: ${summary.errorCount}`,
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

    // Get all columns that were added by this migration
    const columnsQuery = query(
      collection(db, COLUMNS_COLLECTION),
      where("_migration", "==", MIGRATION_ID)
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
    })) as (ColumnToUpdate & { firestoreId: string })[];

    let rollbackCount = 0;
    const rollbackResults: any[] = [];

    // Delete all columns added by this migration
    for (const column of columns) {
      try {
        await deleteDoc(doc(db, COLUMNS_COLLECTION, column.firestoreId));
        console.log(
          `✅ Rolled back column: ${column.columnName} (${column.id})`
        );
        rollbackCount++;

        rollbackResults.push({
          id: column.id,
          action: "deleted",
          columnName: column.columnName,
          status: "rolled_back",
        });
      } catch (error) {
        console.error(`❌ Failed to rollback column ${column.id}:`, error);
        rollbackResults.push({
          id: column.id,
          action: "rollback",
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
  name: "Update Payment Columns Structure",
  description:
    "Removes Reservation Email and Full Payment columns, replaces Payment Term columns with separate P1-P4 columns (7 fields each)",
  runMigration,
  rollbackMigration,
};
