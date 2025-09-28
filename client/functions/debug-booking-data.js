const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Load service account credentials
const serviceAccount = require("../keys/serviceAcc.json");

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
  projectId: "imheretravels",
});

const db = getFirestore();

async function debugBookingData() {
  console.log('🔍 Debugging booking data for document "0"...\n');

  try {
    const bookingDoc = await db.collection("bookings").doc("0").get();

    if (!bookingDoc.exists) {
      console.log('❌ Booking document "0" not found!');
      return;
    }

    const bookingData = bookingDoc.data();

    console.log("📊 All booking data:");
    console.log(JSON.stringify(bookingData, null, 2));

    console.log("\n🗓️ Date fields analysis:");

    const dateFields = [
      "tourDate",
      "returnDate",
      "fullPaymentDueDate",
      "p1DueDate",
      "p2DueDate",
      "p3DueDate",
      "p4DueDate",
    ];

    dateFields.forEach((field) => {
      const value = bookingData[field];
      console.log(`${field}: ${value} (type: ${typeof value})`);
      if (value) {
        try {
          const date = new Date(value);
          console.log(
            `  → Parsed as: ${date.toISOString()} (valid: ${!isNaN(
              date.getTime()
            )})`
          );
        } catch (error) {
          console.log(`  → Error parsing: ${error.message}`);
        }
      }
    });
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

debugBookingData();
