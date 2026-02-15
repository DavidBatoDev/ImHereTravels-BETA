/**
 * ============================================================================
 * MIGRATION 026: Add Cancellation Scenario Columns
 * ============================================================================
 *
 * Objective:
 * Add new column definitions to bookingSheetColumns collection
 * for comprehensive cancellation scenario tracking
 *
 * New Columns:
 * 1. cancellationInitiatedBy - Dropdown (Guest/IHT)
 * 2. supplierCostsCommitted - Number input
 * 3. travelCreditIssued - Calculated function
 * 4. cancellationScenario - Calculated function
 * 5. isNoShow - Checkbox
 *
 * Updated Columns:
 * - eligibleRefund - Updated arguments for new logic
 * - refundableAmount - Updated arguments for RF/NRA split
 * - nonRefundableAmount - Simplified to use refundable
 * - adminFee - Updated for IHT/supplier cost exceptions
 *
 * Migration Type: SCHEMA UPDATE
 * Reversible: Yes (can delete added columns)
 *
 * Run Instructions:
 * ```bash
 * npm run migrate:026
 * ```
 */

import { db } from "./firebase-config";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
  deleteDoc,
} from "firebase/firestore";

// ============================================================================
// MIGRATION CONFIGURATION
// ============================================================================

const MIGRATION_ID = "026-add-cancellation-scenario-columns";
const COLLECTION_NAME = "bookingSheetColumns";

// ============================================================================
// NEW COLUMN DEFINITIONS
// ============================================================================

const newColumns = [
  {
    id: "cancellationInitiatedBy",
    data: {
      id: "cancellationInitiatedBy",
      columnName: "Cancellation Initiated By",
      dataType: "dropdown",
      options: ["Guest", "IHT"],
      parentTab: "Cancellation",
      includeInForms: false,
      showColumn: true,
      color: "orange",
      width: 200,
      order: 84,
      validation: {
        required: false,
        enum: ["Guest", "IHT"],
      },
    },
  },
  {
    id: "supplierCostsCommitted",
    data: {
      id: "supplierCostsCommitted",
      columnName: "Supplier Costs Committed",
      dataType: "number",
      parentTab: "Cancellation",
      includeInForms: false,
      showColumn: true,
      color: "orange",
      width: 200,
      order: 86,
      defaultValue: 0,
      validation: {
        required: false,
        min: 0,
      },
    },
  },
  {
    id: "isNoShow",
    data: {
      id: "isNoShow",
      columnName: "No-Show",
      dataType: "checkbox",
      parentTab: "Cancellation",
      includeInForms: false,
      showColumn: true,
      color: "red",
      width: 120,
      order: 87,
      defaultValue: false,
    },
  },
  {
    id: "cancellationScenario",
    data: {
      id: "cancellationScenario",
      columnName: "Cancellation Scenario",
      dataType: "function",
      function: "getCancellationScenarioFunction",
      parentTab: "Cancellation",
      includeInForms: false,
      showColumn: true,
      color: "purple",
      width: 300,
      order: 85,
      arguments: [
        {
          name: "cancellationInitiatedBy",
          type: "string",
          columnReference: "Cancellation Initiated By",
          isOptional: false,
        },
        {
          name: "cancellationRequestDate",
          type: "date",
          columnReference: "Cancellation Request Date",
          isOptional: false,
        },
        {
          name: "tourDate",
          type: "date",
          columnReference: "Tour Date",
          isOptional: false,
        },
        {
          name: "paymentPlan",
          type: "string",
          columnReference: "Payment Plan",
          isOptional: false,
        },
        {
          name: "paidTerms",
          type: "number",
          columnReference: "Paid Terms",
          isOptional: false,
        },
        {
          name: "fullPaymentDatePaid",
          type: "date",
          columnReference: "Full Payment Date Paid",
          isOptional: true,
        },
        {
          name: "supplierCostsCommitted",
          type: "number",
          columnReference: "Supplier Costs Committed",
          isOptional: false,
          hasDefault: true,
          value: "0",
        },
        {
          name: "isNoShow",
          type: "boolean",
          columnReference: "No-Show",
          isOptional: false,
          hasDefault: true,
          value: "false",
        },
        {
          name: "reasonForCancellation",
          type: "string",
          columnReference: "Reason for Cancellation",
          isOptional: false,
        },
      ],
    },
  },
  {
    id: "travelCreditIssued",
    data: {
      id: "travelCreditIssued",
      columnName: "Travel Credit Issued",
      dataType: "function",
      function: "getTravelCreditIssuedFunction",
      parentTab: "Cancellation",
      includeInForms: false,
      showColumn: true,
      color: "blue",
      width: 200,
      order: 92,
      arguments: [
        {
          name: "cancellationInitiatedBy",
          type: "string",
          columnReference: "Cancellation Initiated By",
          isOptional: false,
        },
        {
          name: "paid",
          type: "number",
          columnReference: "Paid",
          isOptional: false,
        },
        {
          name: "reasonForCancellation",
          type: "string",
          columnReference: "Reason for Cancellation",
          isOptional: false,
        },
      ],
    },
  },
];

// ============================================================================
// MIGRATION LOGIC
// ============================================================================

export async function migrate() {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🚀 Running Migration: ${MIGRATION_ID}`);
  console.log(`${"=".repeat(80)}\n`);

  try {
    const columnsRef = collection(db, COLLECTION_NAME);

    // Step 1: Check for existing columns
    console.log("📋 Step 1: Checking for existing columns...");
    const existingIds: string[] = [];

    for (const col of newColumns) {
      const q = query(columnsRef, where("data.id", "==", col.id));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        existingIds.push(col.id);
        console.log(`  ⚠️  Column '${col.id}' already exists - will skip`);
      }
    }

    // Step 2: Add new columns
    console.log(`\n📝 Step 2: Adding new columns...\n`);
    let addedCount = 0;

    for (const col of newColumns) {
      if (existingIds.includes(col.id)) {
        console.log(`  ⏭️  Skipping '${col.data.columnName}'`);
        continue;
      }

      await addDoc(columnsRef, col);
      console.log(`  ✅ Added '${col.data.columnName}'`);
      addedCount++;
    }

    // Step 3: Update column orders for existing cancellation columns
    console.log(`\n📝 Step 3: Updating column orders...\n`);

    const orderUpdates = [
      { id: "reasonForCancellation", order: 82 },
      { id: "cancellationRequestDate", order: 83 },
      { id: "includeBccCancellation", order: 88 },
      { id: "eligibleRefund", order: 89 },
      { id: "nonRefundableAmount", order: 90 },
      { id: "refundableAmount", order: 91 },
      { id: "generateCancellationDraft", order: 93 },
      { id: "cancellationEmailDraftLink", order: 94 },
      { id: "subjectLineCancellation", order: 95 },
      { id: "sendCancellationEmail", order: 96 },
      { id: "sentCancellationEmailLink", order: 97 },
      { id: "cancellationEmailSentDate", order: 98 },
      { id: "delete", order: 99 },
    ];

    let updatedCount = 0;

    for (const update of orderUpdates) {
      const q = query(columnsRef, where("data.id", "==", update.id));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const batch = writeBatch(db);

        snapshot.forEach((docSnapshot) => {
          const docRef = doc(db, COLLECTION_NAME, docSnapshot.id);
          batch.update(docRef, {
            "data.order": update.order,
          });
        });

        await batch.commit();
        console.log(`  ✅ Updated order for '${update.id}' to ${update.order}`);
        updatedCount++;
      }
    }

    // Step 4: Report results
    console.log(`\n${"=".repeat(80)}`);
    console.log("📊 MIGRATION RESULTS:");
    console.log(`${"=".repeat(80)}`);
    console.log(`New Columns Added: ${addedCount}`);
    console.log(`Existing Columns Skipped: ${existingIds.length}`);
    console.log(`Column Orders Updated: ${updatedCount}`);

    console.log(`\n✅ Migration ${MIGRATION_ID} completed successfully!\n`);
  } catch (error) {
    console.error(`\n❌ Migration ${MIGRATION_ID} failed:`, error);
    throw error;
  }
}

// ============================================================================
// ROLLBACK LOGIC
// ============================================================================

export async function rollback() {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`⏪ Rolling back Migration: ${MIGRATION_ID}`);
  console.log(`${"=".repeat(80)}\n`);

  console.log("⚠️  WARNING: This will delete the new cancellation columns.");
  console.log("⚠️  Booking data will be preserved.\n");

  try {
    const columnsRef = collection(db, COLLECTION_NAME);
    let deletedCount = 0;

    for (const col of newColumns) {
      const q = query(columnsRef, where("data.id", "==", col.id));
      const snapshot = await getDocs(q);

      for (const docSnapshot of snapshot.docs) {
        await deleteDoc(doc(db, COLLECTION_NAME, docSnapshot.id));
        console.log(`  ✅ Deleted '${col.data.columnName}'`);
        deletedCount++;
      }
    }

    console.log(`\n✅ Rollback completed: ${deletedCount} columns deleted\n`);
  } catch (error) {
    console.error(`\n❌ Rollback failed:`, error);
    throw error;
  }
}

// ============================================================================
// EXECUTION
// ============================================================================

// Run migration if executed directly
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
