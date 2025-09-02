import { Timestamp } from "firebase/firestore";
import { db } from "./firebase-config";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { SheetColumn } from "../src/types/sheet-management";

// ============================================================================
// MIGRATION CONFIGURATION
// ============================================================================

const MIGRATION_ID = "012-default-booking-sheet-columns";
const COLLECTION_NAME = "bookingSheetColumns";

// ============================================================================
// MIGRATION DATA - Default Booking Sheet Columns
// ============================================================================

const defaultBookingColumns: Omit<SheetColumn, "id">[] = [
  {
    id: "bookingId",
    name: "Booking ID",
    type: "string",
    required: true,
    width: 120,
    order: 1,
    visible: true,
    editable: false,
    sortable: true,
    filterable: true,
  },
  {
    id: "bookingCode",
    name: "Booking Code",
    type: "string",
    required: true,
    width: 120,
    order: 2,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "tourCode",
    name: "Tour Code",
    type: "string",
    required: true,
    width: 120,
    order: 3,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "reservationDate",
    name: "Reservation Date",
    type: "date",
    required: true,
    width: 140,
    order: 4,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "bookingType",
    name: "Booking Type",
    type: "select",
    required: true,
    width: 120,
    options: ["Individual", "Group", "Corporate"],
    order: 5,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "bookingStatus",
    name: "Booking Status",
    type: "select",
    required: true,
    width: 120,
    options: ["Confirmed", "Pending", "Cancelled", "Completed"],
    order: 6,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "daysBetweenBookingAndTour",
    name: "Days Between Booking and Tour Date",
    type: "number",
    required: false,
    width: 200,
    order: 7,
    visible: true,
    editable: false,
    sortable: true,
    filterable: true,
  },
  {
    id: "groupId",
    name: "Group ID / Group ID Generator",
    type: "string",
    required: false,
    width: 180,
    order: 8,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "isMainBooker",
    name: "Is Main Booker?",
    type: "boolean",
    required: false,
    width: 140,
    order: 9,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "delete",
    name: "Delete",
    type: "function",
    required: false,
    width: 80,
    order: 10,
    visible: true,
    editable: false,
    sortable: false,
    filterable: false,
  },
  {
    id: "travellerInitials",
    name: "Traveller Initials",
    type: "string",
    required: true,
    width: 140,
    order: 11,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "firstName",
    name: "First Name",
    type: "string",
    required: true,
    width: 120,
    order: 12,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "lastName",
    name: "Last Name",
    type: "string",
    required: true,
    width: 120,
    order: 13,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "fullName",
    name: "Full Name",
    type: "string",
    required: false,
    width: 150,
    order: 14,
    visible: true,
    editable: false,
    sortable: true,
    filterable: true,
  },
  {
    id: "emailAddress",
    name: "Email Address",
    type: "email",
    required: true,
    width: 200,
    order: 15,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "tourPackageNameUniqueCounter",
    name: "Tour Package Name Unique Counter",
    type: "number",
    required: false,
    width: 220,
    order: 16,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "tourPackageName",
    name: "Tour Package Name",
    type: "string",
    required: true,
    width: 200,
    order: 17,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "formattedDate",
    name: "Formatted Date",
    type: "string",
    required: false,
    width: 120,
    order: 18,
    visible: true,
    editable: false,
    sortable: true,
    filterable: true,
  },
  {
    id: "tourDate",
    name: "Tour Date",
    type: "date",
    required: true,
    width: 120,
    order: 19,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "returnDate",
    name: "Return Date",
    type: "date",
    required: false,
    width: 120,
    order: 20,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "tourDuration",
    name: "Tour Duration",
    type: "number",
    required: false,
    width: 120,
    order: 21,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "useDiscountedTourCost",
    name: "Use Discounted Tour Cost?",
    type: "boolean",
    required: false,
    width: 180,
    order: 22,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "originalTourCost",
    name: "Original Tour Cost",
    type: "currency",
    required: true,
    width: 140,
    order: 23,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "discountedTourCost",
    name: "Discounted Tour Cost",
    type: "currency",
    required: false,
    width: 140,
    order: 24,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "reservationEmail",
    name: "Reservation Email",
    type: "email",
    required: false,
    width: 200,
    order: 25,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "includeBccReservation",
    name: "Include BCC (Reservation)",
    type: "boolean",
    required: false,
    width: 180,
    order: 26,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "generateEmailDraft",
    name: "Generate Email Draft",
    type: "boolean",
    required: false,
    width: 160,
    order: 27,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "emailDraftLink",
    name: "Email Draft Link",
    type: "string",
    required: false,
    width: 160,
    order: 28,
    visible: true,
    editable: false,
    sortable: true,
    filterable: true,
  },
  {
    id: "subjectLineReservation",
    name: "Subject Line (Reservation)",
    type: "string",
    required: false,
    width: 200,
    order: 29,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "sendEmail",
    name: "Send Email?",
    type: "boolean",
    required: false,
    width: 120,
    order: 30,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "sentEmailLink",
    name: "Sent Email Link",
    type: "string",
    required: false,
    width: 160,
    order: 31,
    visible: true,
    editable: false,
    sortable: true,
    filterable: true,
  },
  {
    id: "reservationEmailSentDate",
    name: "Reservation Email Sent Date",
    type: "date",
    required: false,
    width: 200,
    order: 32,
    visible: true,
    editable: false,
    sortable: true,
    filterable: true,
  },
  {
    id: "paymentCondition",
    name: "Payment Condition",
    type: "select",
    required: false,
    width: 140,
    options: ["Full Payment", "Partial Payment", "Installment"],
    order: 33,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "eligible2ndOfMonths",
    name: "Eligible 2nd-of-Months",
    type: "boolean",
    required: false,
    width: 180,
    order: 34,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "availablePaymentTerms",
    name: "Available Payment Terms",
    type: "string",
    required: false,
    width: 180,
    order: 35,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "paymentPlan",
    name: "Payment Plan",
    type: "select",
    required: false,
    width: 140,
    options: ["Monthly", "Quarterly", "Custom"],
    order: 36,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "paymentMethod",
    name: "Payment Method",
    type: "select",
    required: false,
    width: 140,
    options: ["Credit Card", "Bank Transfer", "Cash", "PayPal"],
    order: 37,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "enablePaymentReminder",
    name: "Enable Payment Reminder",
    type: "boolean",
    required: false,
    width: 160,
    order: 38,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "paymentProgress",
    name: "Payment Progress",
    type: "number",
    required: false,
    width: 140,
    order: 39,
    visible: true,
    editable: false,
    sortable: true,
    filterable: true,
  },
  {
    id: "fullPayment",
    name: "Full Payment",
    type: "currency",
    required: false,
    width: 140,
    order: 40,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "fullPaymentDueDate",
    name: "Full Payment Due Date",
    type: "date",
    required: false,
    width: 160,
    order: 41,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "fullPaymentAmount",
    name: "Full Payment Amount",
    type: "currency",
    required: false,
    width: 160,
    order: 42,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "fullPaymentDatePaid",
    name: "Full Payment Date Paid",
    type: "date",
    required: false,
    width: 160,
    order: 43,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "paymentTerm1",
    name: "Payment Term 1 (Due Date, Amount, Date Paid, Reminder, Email Link, Calendar Event ID/Link)",
    type: "string",
    required: false,
    width: 300,
    order: 44,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "paymentTerm2",
    name: "Payment Term 2 (same structure)",
    type: "string",
    required: false,
    width: 300,
    order: 45,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "paymentTerm3",
    name: "Payment Term 3 (same structure)",
    type: "string",
    required: false,
    width: 300,
    order: 46,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "paymentTerm4",
    name: "Payment Term 4 (same structure)",
    type: "string",
    required: false,
    width: 300,
    order: 47,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "reservationFee",
    name: "Reservation Fee",
    type: "currency",
    required: false,
    width: 140,
    order: 48,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "paid",
    name: "Paid",
    type: "currency",
    required: false,
    width: 100,
    order: 49,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "remainingBalance",
    name: "Remaining Balance",
    type: "currency",
    required: false,
    width: 140,
    order: 50,
    visible: true,
    editable: false,
    sortable: true,
    filterable: true,
  },
  {
    id: "manualCredit",
    name: "Manual Credit",
    type: "currency",
    required: false,
    width: 140,
    order: 51,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "creditFrom",
    name: "Credit From",
    type: "string",
    required: false,
    width: 120,
    order: 52,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "reasonForCancellation",
    name: "Reason for Cancellation",
    type: "string",
    required: false,
    width: 200,
    order: 53,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "includeBccCancellation",
    name: "Include BCC (Cancellation)",
    type: "boolean",
    required: false,
    width: 180,
    order: 54,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "generateCancellationEmailDraft",
    name: "Generate Cancellation Email Draft",
    type: "boolean",
    required: false,
    width: 200,
    order: 55,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "cancellationEmailDraftLink",
    name: "Cancellation Email Draft Link",
    type: "string",
    required: false,
    width: 200,
    order: 56,
    visible: true,
    editable: false,
    sortable: true,
    filterable: true,
  },
  {
    id: "subjectLineCancellation",
    name: "Subject Line (Cancellation)",
    type: "string",
    required: false,
    width: 200,
    order: 57,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "sendCancellationEmail",
    name: "Send Cancellation Email?",
    type: "boolean",
    required: false,
    width: 180,
    order: 58,
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  },
  {
    id: "sentCancellationEmailLink",
    name: "Sent Cancellation Email Link",
    type: "string",
    required: false,
    width: 200,
    order: 59,
    visible: true,
    editable: false,
    sortable: true,
    filterable: true,
  },
  {
    id: "cancellationEmailSentDate",
    name: "Cancellation Email Sent Date",
    type: "date",
    required: false,
    width: 200,
    order: 60,
    visible: true,
    editable: false,
    sortable: true,
    filterable: true,
  },
];

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

export async function runMigration(dryRun: boolean = false): Promise<{
  success: boolean;
  message: string;
  details?: {
    created: number;
    skipped: number;
    errors: string[];
  };
}> {
  console.log(`🚀 Starting migration: ${MIGRATION_ID}`);
  console.log(`📊 Dry run mode: ${dryRun ? "ON" : "OFF"}`);

  const results = {
    created: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Check if columns already exist
    const existingColumns = await getDocs(collection(db, COLLECTION_NAME));

    if (existingColumns.size > 0) {
      console.log(
        `⚠️  Found ${existingColumns.size} existing columns. Checking for conflicts...`
      );

      // Check for column ID conflicts
      for (const column of defaultBookingColumns) {
        const conflictQuery = query(
          collection(db, COLLECTION_NAME),
          where("id", "==", column.id)
        );
        const conflictDocs = await getDocs(conflictQuery);

        if (conflictDocs.size > 0) {
          console.log(`⚠️  Column ID ${column.id} already exists, skipping...`);
          results.skipped++;
          continue;
        }

        if (!dryRun) {
          try {
            await addDoc(collection(db, COLLECTION_NAME), column);
            console.log(`✅ Created column: ${column.name} (${column.id})`);
            results.created++;
          } catch (error) {
            const errorMsg = `Failed to create column ${column.name}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`;
            console.error(`❌ ${errorMsg}`);
            results.errors.push(errorMsg);
          }
        } else {
          console.log(
            `🔍 [DRY RUN] Would create column: ${column.name} (${column.id})`
          );
          results.created++;
        }
      }
    } else {
      console.log(
        `📝 No existing columns found. Creating all default columns...`
      );

      if (!dryRun) {
        // Use batch write for better performance
        const batch = writeBatch(db);

        for (const column of defaultBookingColumns) {
          try {
            const docRef = doc(collection(db, COLLECTION_NAME));
            batch.set(docRef, column);
          } catch (error) {
            const errorMsg = `Failed to prepare column ${column.name}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`;
            console.error(`❌ ${errorMsg}`);
            results.errors.push(errorMsg);
          }
        }

        try {
          await batch.commit();
          console.log(
            `✅ Created ${defaultBookingColumns.length} columns in batch`
          );
          results.created = defaultBookingColumns.length;
        } catch (error) {
          const errorMsg = `Failed to commit batch: ${
            error instanceof Error ? error.message : "Unknown error"
          }`;
          console.error(`❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      } else {
        console.log(
          `🔍 [DRY RUN] Would create ${defaultBookingColumns.length} columns`
        );
        results.created = defaultBookingColumns.length;
      }
    }

    const success = results.errors.length === 0;
    const message = dryRun
      ? `Migration dry run completed. Would create ${results.created} columns, skip ${results.skipped}.`
      : `Migration completed successfully. Created ${results.created} columns, skipped ${results.skipped}.`;

    console.log(
      `🎯 Migration ${success ? "SUCCESS" : "COMPLETED WITH ERRORS"}`
    );
    console.log(
      `📊 Results: ${results.created} created, ${results.skipped} skipped, ${results.errors.length} errors`
    );

    return {
      success,
      message,
      details: results,
    };
  } catch (error) {
    const errorMsg = `Migration failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(`❌ ${errorMsg}`);
    return {
      success: false,
      message: errorMsg,
    };
  }
}

export async function rollbackMigration(): Promise<{
  success: boolean;
  message: string;
  details?: {
    deleted: number;
    errors: string[];
  };
}> {
  console.log(`🔄 Rolling back migration: ${MIGRATION_ID}`);

  const results = {
    deleted: 0,
    errors: [] as string[],
  };

  try {
    // Find and delete columns created by this migration
    const columnIds = defaultBookingColumns.map((column) => column.id);

    for (const columnId of columnIds) {
      const columnQuery = query(
        collection(db, COLLECTION_NAME),
        where("id", "==", columnId)
      );
      const columnDocs = await getDocs(columnQuery);

      for (const doc of columnDocs.docs) {
        try {
          await deleteDoc(doc.ref);
          console.log(`🗑️  Deleted column: ${doc.data().name} (${columnId})`);
          results.deleted++;
        } catch (error) {
          const errorMsg = `Failed to delete column ${columnId}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`;
          console.error(`❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }
    }

    const success = results.errors.length === 0;
    const message = `Rollback ${
      success ? "completed successfully" : "completed with errors"
    }. Deleted ${results.deleted} columns.`;

    console.log(`🎯 Rollback ${success ? "SUCCESS" : "COMPLETED WITH ERRORS"}`);
    console.log(
      `📊 Results: ${results.deleted} deleted, ${results.errors.length} errors`
    );

    return {
      success,
      message,
      details: results,
    };
  } catch (error) {
    const errorMsg = `Rollback failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(`❌ ${errorMsg}`);
    return {
      success: false,
      message: errorMsg,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  id: MIGRATION_ID,
  name: "Default Booking Sheet Columns",
  description:
    "Populate bookingSheetColumns collection with all 60 default columns for the hybrid booking system",
  run: runMigration,
  rollback: rollbackMigration,
  data: defaultBookingColumns,
};
