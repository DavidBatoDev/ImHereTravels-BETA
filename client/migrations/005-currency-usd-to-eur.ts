import { Timestamp } from "firebase/firestore";
import { db } from "./firebase-config";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";

// ============================================================================
// MIGRATION CONFIGURATION
// ============================================================================

const MIGRATION_ID = "005-currency-usd-to-eur";
const COLLECTION_NAME = "tourPackages";

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

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
    // Find all tour packages with USD currency
    const usdQuery = query(
      collection(db, COLLECTION_NAME),
      where("pricing.currency", "==", "USD")
    );

    const usdDocs = await getDocs(usdQuery);

    if (usdDocs.empty) {
      console.log("✅ No tour packages found with USD currency");
      console.log("   Migration completed - nothing to update");
      console.log("");

      return {
        message: `Migration ${MIGRATION_ID} completed - no USD tours found`,
        details: {
          updated: 0,
          skipped: 0,
          errors: results.errors,
        },
      };
    }

    console.log(`📝 Found ${usdDocs.size} tour packages with USD currency`);
    console.log("   Converting to EUR...");
    console.log("");

    for (const docSnapshot of usdDocs.docs) {
      try {
        const tourData = docSnapshot.data();
        const tourName = tourData.name || "Unknown Tour";

        if (dryRun) {
          console.log(`  🔍 Would update: ${tourName} (USD → EUR)`);
          results.updated++;
        } else {
          console.log(`  🔄 Updating: ${tourName} (USD → EUR)`);

          // Update the currency from USD to EUR
          await updateDoc(doc(db, COLLECTION_NAME, docSnapshot.id), {
            "pricing.currency": "EUR",
            metadata: {
              ...tourData.metadata,
              updatedAt: Timestamp.now(),
              updatedBy: "migration-script",
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
        message: `Migration ${MIGRATION_ID} completed successfully - updated ${results.updated} tours to EUR`,
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
    const updatedQuery = query(
      collection(db, COLLECTION_NAME),
      where("metadata.updatedBy", "==", "migration-script")
    );

    const updatedDocs = await getDocs(updatedQuery);

    if (updatedDocs.empty) {
      console.log("   No tours found to rollback");
      return {
        message: `Rollback ${MIGRATION_ID} completed - no items to revert`,
        details: {
          reverted: 0,
          errors: results.errors,
        },
      };
    }

    console.log(`🔄 Reverting ${updatedDocs.size} tours back to USD...`);
    console.log("");

    for (const docSnapshot of updatedDocs.docs) {
      try {
        const tourData = docSnapshot.data();
        const tourName = tourData.name || "Unknown Tour";

        console.log(`  🔄 Reverting: ${tourName} (EUR → USD)`);

        // Revert the currency back to USD
        await updateDoc(doc(db, COLLECTION_NAME, docSnapshot.id), {
          "pricing.currency": "USD",
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
      message: `Rollback ${MIGRATION_ID} completed successfully - reverted ${results.reverted} tours to USD`,
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
