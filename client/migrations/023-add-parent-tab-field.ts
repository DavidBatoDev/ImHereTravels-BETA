import { db } from "./firebase-config";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  deleteField,
} from "firebase/firestore";

const MIGRATION_ID = "023-add-parent-tab-field";
const COLUMNS_COLLECTION = "bookingSheetColumns";

interface ColumnWithParentTab {
  id: string;
  columnName: string;
  dataType: string;
  function?: string;
  arguments?: any[];
  includeInForms: boolean;
  parentTab?: string;
  required?: boolean;
  width?: number;
  order: number;
  visible?: boolean;
  editable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  options?: string[];
  defaultValue?: any;
  validation?: any;
}

// Define parent tab mappings for different column groups
const PARENT_TAB_MAPPINGS: Record<string, string> = {
  // Core Booking Fields (1-10)
  bookingId: "Core Booking",
  bookingCode: "Core Booking",
  tourCode: "Core Booking",
  reservationDate: "Core Booking",
  bookingType: "Core Booking",
  bookingStatus: "Core Booking",
  daysBetweenBookingAndTour: "Core Booking",
  groupId: "Core Booking",
  isMainBooker: "Core Booking",
  delete: "Core Booking",

  // Traveller Information (11-15)
  travellerInitials: "Traveller Information",
  firstName: "Traveller Information",
  lastName: "Traveller Information",
  fullName: "Traveller Information",
  emailAddress: "Traveller Information",

  // Tour Details (16-21)
  tourPackageNameUniqueCounter: "Tour Details",
  tourPackageName: "Tour Details",
  formattedDate: "Tour Details",
  tourDate: "Tour Details",
  returnDate: "Tour Details",
  tourDuration: "Tour Details",

  // Pricing (22-24)
  useDiscountedTourCost: "Pricing",
  originalTourCost: "Pricing",
  discountedTourCost: "Pricing",

  // Email Management - Reservation (25-32)
  reservationEmail: "Email Management - Reservation",
  includeBccReservation: "Email Management - Reservation",
  generateEmailDraft: "Email Management - Reservation",
  emailDraftLink: "Email Management - Reservation",
  subjectLineReservation: "Email Management - Reservation",
  sendEmail: "Email Management - Reservation",
  sentEmailLink: "Email Management - Reservation",
  reservationEmailSentDate: "Email Management - Reservation",

  // Payment Terms (33-39)
  paymentCondition: "Payment Terms",
  eligible2ndOfMonths: "Payment Terms",
  availablePaymentTerms: "Payment Terms",
  paymentPlan: "Payment Terms",
  paymentMethod: "Payment Terms",
  enablePaymentReminder: "Payment Terms",
  paymentProgress: "Payment Terms",

  // Payment Details (40-52)
  fullPayment: "Payment Details",
  fullPaymentDueDate: "Payment Details",
  fullPaymentAmount: "Payment Details",
  fullPaymentDatePaid: "Payment Details",
  paymentTerm1: "Payment Details",
  paymentTerm2: "Payment Details",
  paymentTerm3: "Payment Details",
  paymentTerm4: "Payment Details",
  reservationFee: "Payment Details",
  paid: "Payment Details",
  remainingBalance: "Payment Details",
  manualCredit: "Payment Details",
  creditFrom: "Payment Details",

  // Cancellation Management (53-60)
  reasonForCancellation: "Cancellation Management",
  includeBccCancellation: "Cancellation Management",
  generateCancellationEmailDraft: "Cancellation Management",
  cancellationEmailDraftLink: "Cancellation Management",
  subjectLineCancellation: "Cancellation Management",
  sendCancellationEmail: "Cancellation Management",
  sentCancellationEmailLink: "Cancellation Management",
  cancellationEmailSentDate: "Cancellation Management",
};

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
    })) as (ColumnWithParentTab & { firestoreId: string })[];

    console.log(`📊 Found ${columns.length} columns to migrate`);

    let updatedCount = 0;
    const migrationResults: any[] = [];

    for (const column of columns) {
      try {
        // Check if column already has parentTab field
        if (column.parentTab !== undefined) {
          console.log(
            `⏭️ Column ${column.id} already has parentTab field, skipping`
          );
          migrationResults.push({
            id: column.id,
            status: "skipped",
            reason: "Already has parentTab field",
          });
          continue;
        }

        // Determine parent tab based on column ID
        const parentTab = PARENT_TAB_MAPPINGS[column.id] || "General";

        if (dryRun) {
          console.log(`🔍 [DRY RUN] Would update column ${column.id}:`);
          console.log(`   Adding parentTab: "${parentTab}"`);
        } else {
          // Update the column document
          const columnRef = doc(db, COLUMNS_COLLECTION, column.firestoreId);
          const updateData: any = {
            parentTab: parentTab,
            _migration: MIGRATION_ID,
            _migratedAt: new Date(),
            _migrationNotes: `Added parentTab field with value: "${parentTab}"`,
          };

          await updateDoc(columnRef, updateData);

          console.log(
            `✅ Updated column ${column.id} (${column.firestoreId}): Added parentTab "${parentTab}"`
          );
          updatedCount++;
        }

        migrationResults.push({
          id: column.id,
          status: dryRun ? "would_update" : "updated",
          parentTab: parentTab,
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
    })) as (ColumnWithParentTab & { _migration?: string })[];

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

        // Rollback by removing parentTab field
        const columnRef = doc(db, COLUMNS_COLLECTION, column.id);
        await updateDoc(columnRef, {
          parentTab: deleteField(),
          _migration: deleteField(),
          _migratedAt: deleteField(),
          _migrationNotes: deleteField(),
          _rollback: MIGRATION_ID,
          _rollbackAt: new Date(),
          _rollbackNotes: `Removed parentTab field`,
        });

        console.log(
          `✅ Rolled back column ${column.id}: Removed parentTab field`
        );
        rollbackCount++;

        rollbackResults.push({
          id: column.id,
          status: "rolled_back",
          removedParentTab: column.parentTab,
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
  name: "Add Parent Tab Field",
  description:
    "Adds parentTab field to existing booking sheet columns for better organization and grouping",
  runMigration,
  rollbackMigration,
};
