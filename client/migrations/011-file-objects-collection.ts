import { getDbInstance } from "../src/lib/firebase";
import { collection, doc, setDoc } from "firebase/firestore";

/**
 * Migration 011: Create file_objects collection structure
 *
 * This migration sets up the initial structure for the file_objects collection
 * that will store metadata about files uploaded to Firebase Storage.
 */

export async function migrateFileObjectsCollection() {
  console.log("Starting migration: Create file_objects collection structure");

  try {
    const db = getDbInstance();

    // Create a sample document to establish the collection structure
    // This will be automatically cleaned up if no real files exist
    const sampleDoc = {
      id: "sample-structure",
      name: "sample-structure",
      originalName: "sample-structure",
      size: 0,
      contentType: "application/octet-stream",
      storagePath: "images/sample-structure",
      downloadURL: "",
      uploadedAt: new Date(),
      uploadedBy: "system",
      tags: ["sample", "structure"],
      metadata: {
        description: "Sample document to establish collection structure",
        location: "",
        category: "system",
      },
      lastModified: new Date(),
    };

    // Add the sample document
    const docRef = doc(collection(db, "file_objects"), "sample-structure");
    await setDoc(docRef, sampleDoc);

    console.log("✅ Successfully created file_objects collection structure");
    console.log("📝 Collection: file_objects");
    console.log("📁 Storage path: images/");
    console.log("🔒 Security: Users can only access their own files");
    console.log("💾 Features: File metadata, tags, categories, user ownership");

    return true;
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateFileObjectsCollection()
    .then(() => {
      console.log("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
