import { db } from "./firebase-config";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import {
  ALL_COLUMN_IDS,
  createInitialColumnsMetadata,
} from "../src/lib/columns-metadata";

// ============================================================================
// MIGRATION CONFIGURATION
// ============================================================================

const MIGRATION_ID = "034-initialize-columns-metadata";

// ============================================================================
// MIGRATION FUNCTION
// ============================================================================

async function runMigration(): Promise<{
  success: boolean;
  message: string;
  details?: {
    usersUpdated: number;
    errors: string[];
  };
}> {
  try {
    console.log(`🚀 Starting migration: ${MIGRATION_ID}`);
    console.log(`📋 Initializing columnsMetadata for all users...`);
    console.log(`🔢 Total columns: ${ALL_COLUMN_IDS.length}`);

    // Get all users
    const usersCollection = collection(db, "users");
    const usersSnapshot = await getDocs(usersCollection);

    console.log(`👥 Found ${usersSnapshot.size} users`);

    let usersUpdated = 0;
    const errors: string[] = [];

    // Get initial columnsMetadata structure
    const columnsMetadata = createInitialColumnsMetadata();

    // Update each user
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userId = userDoc.id;
        const userData = userDoc.data();

        // Check if user already has columnsMetadata
        const existingMetadata = userData?.preferences?.columnsMetadata;

        // Merge existing metadata with complete column list
        const mergedMetadata = {
          widths: existingMetadata?.widths || {},
          visibility: {
            ...columnsMetadata.visibility,
            ...(existingMetadata?.visibility || {}),
          },
          order:
            existingMetadata?.order && existingMetadata.order.length > 0
              ? existingMetadata.order
              : columnsMetadata.order,
          frozen: existingMetadata?.frozen || [],
        };

        // Ensure all columns are in visibility map (fill in missing ones as true)
        ALL_COLUMN_IDS.forEach((columnId) => {
          if (mergedMetadata.visibility[columnId] === undefined) {
            mergedMetadata.visibility[columnId] = true;
          }
        });

        // Update user preferences with complete columnsMetadata
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          "preferences.columnsMetadata": mergedMetadata,
        });

        usersUpdated++;
        console.log(
          `✅ Updated user ${userId} (${
            existingMetadata ? "merged with existing" : "created new"
          })`
        );
      } catch (error) {
        const errorMsg = `Error updating user ${userDoc.id}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`\n✅ Migration completed successfully!`);
    console.log(`📊 Users updated: ${usersUpdated}`);
    console.log(`❌ Errors: ${errors.length}`);

    return {
      success: true,
      message: `Successfully initialized columnsMetadata for ${usersUpdated} users`,
      details: {
        usersUpdated,
        errors,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(`❌ Migration failed: ${errorMessage}`);

    return {
      success: false,
      message: `Migration failed: ${errorMessage}`,
    };
  }
}

// ============================================================================
// ROLLBACK FUNCTION
// ============================================================================

async function rollbackMigration(): Promise<{
  success: boolean;
  message: string;
  details?: {
    usersRolledBack: number;
    errors: string[];
  };
}> {
  try {
    console.log(`🔄 Rolling back migration: ${MIGRATION_ID}`);

    // Get all users
    const usersCollection = collection(db, "users");
    const usersSnapshot = await getDocs(usersCollection);

    let usersRolledBack = 0;
    const errors: string[] = [];

    // Remove columnsMetadata from each user
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userId = userDoc.id;
        const userRef = doc(db, "users", userId);

        // Remove columnsMetadata field
        await updateDoc(userRef, {
          "preferences.columnsMetadata": null,
        });

        usersRolledBack++;
        console.log(`✅ Rolled back user ${userId}`);
      } catch (error) {
        const errorMsg = `Error rolling back user ${userDoc.id}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`\n✅ Rollback completed!`);
    console.log(`📊 Users rolled back: ${usersRolledBack}`);

    return {
      success: true,
      message: `Successfully rolled back ${usersRolledBack} users`,
      details: {
        usersRolledBack,
        errors,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(`❌ Rollback failed: ${errorMessage}`);

    return {
      success: false,
      message: `Rollback failed: ${errorMessage}`,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  id: MIGRATION_ID,
  name: "Initialize Columns Metadata in User Preferences",
  description:
    "Adds columnsMetadata (widths, visibility, order, frozen) to all user preferences with all columns visible by default",
  run: runMigration,
  rollback: rollbackMigration,
};
