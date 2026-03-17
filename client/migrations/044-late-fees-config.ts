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

const MIGRATION_ID = "044-late-fees-config";
const COLLECTION_NAME = "config";
const DOCUMENT_ID = "late-fees";

const lateFeesConfig = {
  enabled: true,
  penaltyPercent: 3,
  graceDays: 3,
  effectiveDate: Timestamp.now(),
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

async function checkMigrationStatus(): Promise<boolean> {
  const migrationsRef = collection(db, "migrations");
  const migrationQuery = query(migrationsRef, where("id", "==", MIGRATION_ID));
  const migrationSnapshot = await getDocs(migrationQuery);
  return !migrationSnapshot.empty;
}

async function recordMigration(): Promise<void> {
  await addDoc(collection(db, "migrations"), {
    id: MIGRATION_ID,
    runAt: Timestamp.now(),
    status: "completed",
  });
}

export async function runMigration(): Promise<void> {
  console.log(`\n🚀 Starting migration: ${MIGRATION_ID}\n`);

  const alreadyRun = await checkMigrationStatus();
  if (alreadyRun) {
    console.log("⚠️  Migration already completed. Skipping...");
    return;
  }

  try {
    const configRef = doc(db, COLLECTION_NAME, DOCUMENT_ID);
    await setDoc(configRef, lateFeesConfig, { merge: true });

    console.log("✅ Late fees config created/updated");
    console.log(`   - Document path: ${COLLECTION_NAME}/${DOCUMENT_ID}`);

    await recordMigration();
    console.log(`\n✅ Migration ${MIGRATION_ID} completed successfully!\n`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

export async function rollbackMigration(): Promise<void> {
  console.log(`\n🔄 Rolling back migration: ${MIGRATION_ID}\n`);

  try {
    const configRef = doc(db, COLLECTION_NAME, DOCUMENT_ID);
    await deleteDoc(configRef);
    console.log("✅ Removed config/late-fees");

    const migrationsRef = collection(db, "migrations");
    const migrationQuery = query(
      migrationsRef,
      where("id", "==", MIGRATION_ID),
    );
    const migrationSnapshot = await getDocs(migrationQuery);

    await Promise.all(
      migrationSnapshot.docs.map((migrationDoc) =>
        deleteDoc(doc(db, "migrations", migrationDoc.id)),
      ),
    );

    console.log(`\n✅ Rollback of ${MIGRATION_ID} completed successfully!\n`);
  } catch (error) {
    console.error("❌ Rollback failed:", error);
    throw error;
  }
}
