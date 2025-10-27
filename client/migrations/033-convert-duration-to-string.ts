import { Timestamp } from "firebase/firestore";
import { db } from "./firebase-config";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

// ============================================================================
// MIGRATION CONFIGURATION
// ============================================================================

const MIGRATION_ID = "033-convert-duration-to-string";
const COLLECTION_NAME = "tourPackages";

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Convert numeric duration to string format
 * @param duration - The duration value (number, string, or null/undefined)
 * @returns String in format "X days" or original value if already a string
 */
function convertDurationToString(duration: any): any {
  if (duration === null || duration === undefined) {
    return duration;
  }

  // If already a string, return as-is
  if (typeof duration === "string") {
    return duration;
  }

  // If it's a number, convert to "X days" format
  if (typeof duration === "number") {
    return `${duration} days`;
  }

  // For any other type, try to convert
  const numericValue = Number(duration);
  if (!isNaN(numericValue)) {
    return `${numericValue} days`;
  }

  // Return as-is if conversion fails
  return duration;
}

export async function runMigration(dryRun: boolean = false) {
  console.log(`🚀 Starting migration: ${MIGRATION_ID}`);
  console.log(`📊 Collection: ${COLLECTION_NAME}`);
  console.log(`🔍 Dry run: ${dryRun ? "YES" : "NO"}`);
  console.log("");

  const results = {
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Get all tour packages
    const tourPackagesSnapshot = await getDocs(collection(db, COLLECTION_NAME));

    if (tourPackagesSnapshot.empty) {
      console.log("✅ No tour packages found");
      console.log("   Migration completed - nothing to update");
      console.log("");

      return {
        message: `Migration ${MIGRATION_ID} completed - no tours found`,
        details: {
          updated: 0,
          skipped: 0,
          errors: results.errors,
        },
      };
    }

    console.log(`📝 Found ${tourPackagesSnapshot.size} tour packages`);
    console.log("   Converting duration from number to string...");
    console.log("");

    for (const docSnapshot of tourPackagesSnapshot.docs) {
      try {
        const tourData = docSnapshot.data();
        const tourName = tourData.name || "Unknown Tour";
        const currentDuration = tourData.duration;

        // Check if duration is already a string
        if (typeof currentDuration === "string") {
          console.log(
            `  ⏭️ Skipping: ${tourName} (already string: "${currentDuration}")`
          );
          results.skipped++;
          continue;
        }

        // Convert the duration
        const newDuration = convertDurationToString(currentDuration);

        if (dryRun) {
          console.log(`  🔍 Would update: ${tourName}`);
          console.log(`     Duration: ${currentDuration} → "${newDuration}"`);
          results.updated++;
        } else {
          console.log(`  🔄 Updating: ${tourName}`);
          console.log(`     Duration: ${currentDuration} → "${newDuration}"`);

          // Update the duration field
          await updateDoc(doc(db, COLLECTION_NAME, docSnapshot.id), {
            duration: newDuration,
            metadata: {
              ...tourData.metadata,
              updatedAt: Timestamp.now(),
              updatedBy: "migration-script",
              migratedBy: MIGRATION_ID,
            },
          });

          results.updated++;
        }
      } catch (error) {
        const errorMsg = `Failed to update tour ${
          docSnapshot.data().name || "Unknown"
        }: ${error}`;
        console.error(`  ❌ ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    console.log("");

    if (dryRun) {
      return {
        message: `Migration ${MIGRATION_ID} would update ${results.updated} tours in DRY RUN mode`,
        details: {
          updated: results.updated,
          skipped: results.skipped,
          errors: results.errors,
        },
      };
    } else {
      return {
        message: `Migration ${MIGRATION_ID} completed successfully - updated ${results.updated} tours, skipped ${results.skipped} (already strings)`,
        details: {
          updated: results.updated,
          skipped: results.skipped,
          errors: results.errors,
        },
      };
    }
  } catch (error) {
    const errorMsg = `Migration failed: ${error}`;
    console.error(`❌ ${errorMsg}`);
    results.errors.push(errorMsg);

    return {
      message: `Migration ${MIGRATION_ID} failed`,
      details: {
        updated: results.updated,
        skipped: results.skipped,
        errors: results.errors,
      },
    };
  }
}

export async function rollbackMigration() {
  console.log(`🔄 Rolling back migration: ${MIGRATION_ID}`);
  console.log(`📊 Collection: ${COLLECTION_NAME}`);
  console.log("");

  const results = {
    reverted: 0,
    errors: [] as string[],
  };

  try {
    // Find all tour packages that were updated by this migration
    const tourPackagesSnapshot = await getDocs(collection(db, COLLECTION_NAME));

    if (tourPackagesSnapshot.empty) {
      console.log("   No tours found to rollback");
      return {
        message: `Rollback ${MIGRATION_ID} completed - no items to revert`,
        details: {
          reverted: 0,
          errors: results.errors,
        },
      };
    }

    console.log(
      `🔄 Processing ${tourPackagesSnapshot.size} tours for rollback...`
    );
    console.log("");

    for (const docSnapshot of tourPackagesSnapshot.docs) {
      try {
        const tourData = docSnapshot.data();
        const tourName = tourData.name || "Unknown Tour";

        // Only revert tours that were migrated by this script
        if (tourData.metadata?.migratedBy !== MIGRATION_ID) {
          continue;
        }

        const currentDuration = tourData.duration;

        console.log(`  🔄 Reverting: ${tourName}`);
        console.log(`     Current duration: "${currentDuration}"`);

        // Extract the number from "X days" format
        const numericValue = currentDuration?.toString().match(/\d+/)?.[0];
        const revertedDuration = numericValue ? Number(numericValue) : null;

        console.log(`     Reverted to: ${revertedDuration}`);

        // Revert the duration back to number
        await updateDoc(doc(db, COLLECTION_NAME, docSnapshot.id), {
          duration: revertedDuration,
          metadata: {
            ...tourData.metadata,
            updatedAt: Timestamp.now(),
            updatedBy: "rollback-script",
          },
        });

        results.reverted++;
      } catch (error) {
        const errorMsg = `Failed to revert tour ${
          docSnapshot.data().name || "Unknown"
        }: ${error}`;
        console.error(`  ❌ ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    console.log("");

    return {
      message: `Rollback ${MIGRATION_ID} completed successfully - reverted ${results.reverted} tours`,
      details: {
        reverted: results.reverted,
        errors: results.errors,
      },
    };
  } catch (error) {
    const errorMsg = `Rollback failed: ${error}`;
    console.error(`❌ ${errorMsg}`);
    results.errors.push(errorMsg);

    return {
      message: `Rollback ${MIGRATION_ID} failed`,
      details: {
        reverted: results.reverted,
        errors: results.errors,
      },
    };
  }
}
