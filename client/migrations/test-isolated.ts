import { db } from "./firebase-config";
import { collection, addDoc, getDocs } from "firebase/firestore";

// Define types locally to avoid any external imports
interface TestData {
  name: string;
  value: number;
  timestamp: Date;
}

const testData: Omit<TestData, "id">[] = [
  {
    name: "Test Item 1",
    value: 100,
    timestamp: new Date(),
  },
  {
    name: "Test Item 2",
    value: 200,
    timestamp: new Date(),
  },
];

export async function testIsolated(dryRun: boolean = false) {
  try {
    console.log("🔍 Testing isolated migration...");
    console.log(`📊 Dry run mode: ${dryRun ? "ON" : "OFF"}`);

    if (!dryRun) {
      // Test creating a document
      const docRef = await addDoc(
        collection(db, "test_collection"),
        testData[0]
      );
      console.log(`✅ Created test document with ID: ${docRef.id}`);

      // Test reading documents
      const snapshot = await getDocs(collection(db, "test_collection"));
      console.log(`📖 Found ${snapshot.size} documents in test collection`);
    } else {
      console.log("🔍 [DRY RUN] Would create test documents");
    }

    return { success: true, message: "Isolated test passed" };
  } catch (error) {
    console.error("❌ Isolated test failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Test the function directly
if (require.main === module) {
  testIsolated(true).then(console.log);
}
