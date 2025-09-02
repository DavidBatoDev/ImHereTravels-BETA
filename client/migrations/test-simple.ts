import { db } from "./firebase-config";
import { collection, getDocs } from "firebase/firestore";

export async function testSimple() {
  try {
    console.log("🔍 Testing simple Firebase connection...");
    const snapshot = await getDocs(collection(db, "test"));
    console.log("✅ Firebase connection successful!");
    return { success: true, message: "Connection test passed" };
  } catch (error) {
    console.error("❌ Firebase connection failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Test the function directly
if (require.main === module) {
  testSimple().then(console.log);
}
