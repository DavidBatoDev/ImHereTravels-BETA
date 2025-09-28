#!/usr/bin/env tsx

/**
 * Migration 024: Update Parent Tabs Structure
 *
 * This migration updates the parentTab field for all columns to match the new
 * organized structure with emoji-based parent tabs.
 *
 * New Parent Tab Structure:
 * - 🆔 Identifier
 * - 👤 Traveler Information
 * - 🗺️ Tour Details
 * - 👥 If Duo or Group Booking
 * - 📧 Reservation Email
 * - 💰 Payment Setting
 * - 💳 Full Payment
 * - 💵 Payment Term 1-4
 * - ❌ Cancellation
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

const MIGRATION_ID = "024-update-parent-tabs";
const COLLECTION_NAME = "bookingSheetColumns";

// New parent tab mapping based on column names
const parentTabMapping: Record<string, string> = {
  // 🆔 Identifier
  "Booking ID": "🆔 Identifier",
  "Booking Code": "🆔 Identifier",
  "Tour Code": "🆔 Identifier",
  "Formatted Date": "🆔 Identifier",
  "Traveller Initials": "🆔 Identifier",
  "Tour Package Name Unique Counter": "🆔 Identifier",

  // 👤 Traveler Information
  "Email Address": "👤 Traveler Information",
  "First Name": "👤 Traveler Information",
  "Last Name": "👤 Traveler Information",
  "Full Name": "👤 Traveler Information",

  // 🗺️ Tour Details
  "Reservation Date": "🗺️ Tour Details",
  "Booking Type": "🗺️ Tour Details",
  "Tour Package Name": "🗺️ Tour Details",
  "Tour Date": "🗺️ Tour Details",
  "Return Date": "🗺️ Tour Details",
  "Tour Duration": "🗺️ Tour Details",
  "Payment Condition": "🗺️ Tour Details",
  "Eligible 2nd-of-Months": "🗺️ Tour Details",
  "Days Between Booking and Tour Date": "🗺️ Tour Details",
  "Available Payment Terms": "🗺️ Tour Details",

  // 👥 If Duo or Group Booking
  "Group ID / Group ID Generator": "👥 If Duo or Group Booking",
  "Is Main Booker?": "👥 If Duo or Group Booking",

  // 📧 Reservation Email
  "Include BCC (Reservation)": "📧 Reservation Email",
  "Generate Email Draft": "📧 Reservation Email",
  "Email Draft Link": "📧 Reservation Email",
  "Subject Line (Reservation)": "📧 Reservation Email",
  "Send Email?": "📧 Reservation Email",
  "Sent Email Link": "📧 Reservation Email",
  "Reservation Email Sent Date": "📧 Reservation Email",

  // 💰 Payment Setting
  "Payment Plan": "💰 Payment Setting",
  "Payment Method": "💰 Payment Setting",
  "Enable Payment Reminder": "💰 Payment Setting",
  "Payment Progress": "💰 Payment Setting",
  "Use Discounted Tour Cost?": "💰 Payment Setting",
  "Original Tour Cost": "💰 Payment Setting",
  "Discounted Tour Cost": "💰 Payment Setting",

  // 💳 Full Payment
  "Full Payment Due Date": "💳 Full Payment",
  "Full Payment Amount": "💳 Full Payment",
  "Full Payment Date Paid": "💳 Full Payment",

  // 💵 Payment Term 1
  "P1 Scheduled Reminder Date": "💵 Payment Term 1",
  "P1 Scheduled Email Link": "💵 Payment Term 1",
  "P1 Calendar Event ID": "💵 Payment Term 1",
  "P1 Calendar Event Link": "💵 Payment Term 1",
  "P1 Due Date": "💵 Payment Term 1",
  "P1 Amount": "💵 Payment Term 1",
  "P1 Date Paid": "💵 Payment Term 1",

  // 💵 Payment Term 2
  "P2 Scheduled Reminder Date": "💵 Payment Term 2",
  "P2 Scheduled Email Link": "💵 Payment Term 2",
  "P2 Calendar Event ID": "💵 Payment Term 2",
  "P2 Calendar Event Link": "💵 Payment Term 2",
  "P2 Due Date": "💵 Payment Term 2",
  "P2 Amount": "💵 Payment Term 2",
  "P2 Date Paid": "💵 Payment Term 2",

  // 💵 Payment Term 3
  "P3 Scheduled Reminder Date": "💵 Payment Term 3",
  "P3 Scheduled Email Link": "💵 Payment Term 3",
  "P3 Calendar Event ID": "💵 Payment Term 3",
  "P3 Calendar Event Link": "💵 Payment Term 3",
  "P3 Due Date": "💵 Payment Term 3",
  "P3 Amount": "💵 Payment Term 3",
  "P3 Date Paid": "💵 Payment Term 3",

  // 💵 Payment Term 4
  "P4 Scheduled Reminder Date": "💵 Payment Term 4",
  "P4 Scheduled Email Link": "💵 Payment Term 4",
  "P4 Calendar Event ID": "💵 Payment Term 4",
  "P4 Calendar Event Link": "💵 Payment Term 4",
  "P4 Due Date": "💵 Payment Term 4",
  "P4 Amount": "💵 Payment Term 4",
  "P4 Date Paid": "💵 Payment Term 4",

  // Additional payment-related columns
  "Reservation Fee": "💰 Payment Setting",
  Paid: "💰 Payment Setting",
  "Remaining Balance": "💰 Payment Setting",
  "Manual Credit": "💰 Payment Setting",
  "Credit From": "💰 Payment Setting",

  // ❌ Cancellation
  "Reason for Cancellation": "❌ Cancellation",
  "Include BCC (Cancellation)": "❌ Cancellation",
  "Generate Cancellation Email Draft": "❌ Cancellation",
  "Cancellation Email Draft Link": "❌ Cancellation",
  "Subject Line (Cancellation)": "❌ Cancellation",
  "Send Cancellation Email?": "❌ Cancellation",
  "Sent Cancellation Email Link": "❌ Cancellation",
  "Cancellation Email Sent Date": "❌ Cancellation",

  // Special columns
  Delete: "🆔 Identifier", // Function column
  "Booking Status": "🗺️ Tour Details", // Status column
};

/**
 * Run the migration
 */
export async function runMigration024(): Promise<void> {
  console.log(`🚀 Starting migration ${MIGRATION_ID}...`);
  console.log("📋 Updating parent tabs to new emoji-based structure");

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
      const columnName = columnData.columnName;

      if (!columnName) {
        console.log(`⚠️ Skipping column with missing name: ${docSnapshot.id}`);
        skipCount++;
        continue;
      }

      const newParentTab = parentTabMapping[columnName];

      if (!newParentTab) {
        console.log(`⚠️ No mapping found for column: ${columnName}`);
        skipCount++;
        continue;
      }

      const currentParentTab = columnData.parentTab;

      if (currentParentTab === newParentTab) {
        console.log(
          `✅ Column "${columnName}" already has correct parent tab: ${newParentTab}`
        );
        skipCount++;
        continue;
      }

      console.log(
        `🔄 Updating "${columnName}": ${
          currentParentTab || "None"
        } → ${newParentTab}`
      );

      const columnRef = doc(db, COLLECTION_NAME, docSnapshot.id);
      batch.update(columnRef, {
        parentTab: newParentTab,
        _migration: MIGRATION_ID,
        _migratedAt: new Date(),
        _migrationNotes: `Updated parent tab to new emoji-based structure`,
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
export async function rollbackMigration024(): Promise<void> {
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
          _rollbackNotes: `Rolled back parent tab update`,
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
    rollbackMigration024()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Migration failed:", error);
        process.exit(1);
      });
  } else {
    runMigration024()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Migration failed:", error);
        process.exit(1);
      });
  }
}
