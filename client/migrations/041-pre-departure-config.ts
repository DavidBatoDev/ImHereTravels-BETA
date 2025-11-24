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
  setDoc,
} from "firebase/firestore";

// ============================================================================
// MIGRATION CONFIGURATION
// ============================================================================

const MIGRATION_ID = "041-pre-departure-config";
const COLLECTION_NAME = "config";
const DOCUMENT_ID = "pre-departure";

// ============================================================================
// MIGRATION DATA - Pre-Departure Configuration
// ============================================================================

const preDepartureConfig = {
  automaticSends: false, // Default to manual sends for safety
  lastUpdated: Timestamp.now(),
  updatedBy: "system-migration",
  description:
    "Configuration for pre-departure pack email automation. When automaticSends is true, confirmation emails with pre-departure packs are sent automatically when bookings reach 100% payment. When false, emails must be sent manually from the Confirmed Bookings tab.",
};

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Checks if a migration has already been run
 */
async function checkMigrationStatus(): Promise<boolean> {
  const migrationsRef = collection(db, "migrations");
  const q = query(migrationsRef, where("id", "==", MIGRATION_ID));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Records a successful migration
 */
async function recordMigration(): Promise<void> {
  await addDoc(collection(db, "migrations"), {
    id: MIGRATION_ID,
    runAt: Timestamp.now(),
    status: "completed",
  });
}

/**
 * Main migration function - creates pre-departure config document
 */
export async function runMigration(): Promise<void> {
  console.log(`\n🚀 Starting migration: ${MIGRATION_ID}\n`);

  // Check if migration already ran
  const alreadyRun = await checkMigrationStatus();
  if (alreadyRun) {
    console.log("⚠️  Migration already completed. Skipping...");
    return;
  }

  try {
    // Create the config document
    console.log("⚙️  Creating pre-departure configuration document...");
    const configRef = doc(db, COLLECTION_NAME, DOCUMENT_ID);
    await setDoc(configRef, preDepartureConfig);
    console.log("✅ Pre-departure config created successfully");
    console.log("   - automaticSends: false (manual mode by default)");
    console.log("   - Document path: config/pre-departure");

    // Record successful migration
    await recordMigration();
    console.log(`\n✅ Migration ${MIGRATION_ID} completed successfully!\n`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

/**
 * Rollback function - removes the pre-departure config
 */
export async function rollbackMigration(): Promise<void> {
  console.log(`\n🔄 Rolling back migration: ${MIGRATION_ID}\n`);

  try {
    // Delete the config document
    console.log("🗑️  Removing pre-departure configuration document...");
    const configRef = doc(db, COLLECTION_NAME, DOCUMENT_ID);
    await deleteDoc(configRef);
    console.log("✅ Pre-departure config removed");

    // Remove migration record
    const migrationsRef = collection(db, "migrations");
    const migrationQuery = query(
      migrationsRef,
      where("id", "==", MIGRATION_ID)
    );
    const migrationSnapshot = await getDocs(migrationQuery);
    const migrationDeletePromises = migrationSnapshot.docs.map((document) =>
      deleteDoc(doc(db, "migrations", document.id))
    );
    await Promise.all(migrationDeletePromises);

    console.log(`\n✅ Rollback of ${MIGRATION_ID} completed successfully!\n`);
  } catch (error) {
    console.error("❌ Rollback failed:", error);
    throw error;
  }
}
