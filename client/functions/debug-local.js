const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
require("dotenv").config();

// Load service account credentials
const serviceAccount = require("../keys/serviceAcc.json");

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
  projectId: "imheretravels",
});

const db = getFirestore();

// Import our email template service
const EmailTemplateService = require("./lib/email-template-service").default;

// Helper function to format GBP currency
function formatGBP(value) {
  if (!value) return "";
  return `£${Number(value).toFixed(2)}`;
}

// Helper function to handle Firestore Timestamps
function formatFirestoreDate(dateValue) {
  if (!dateValue) return "";

  try {
    let date = null;

    // Handle Firestore Timestamp objects
    if (dateValue && typeof dateValue === "object" && dateValue._seconds) {
      date = new Date(dateValue._seconds * 1000);
    }
    // Handle string dates
    else if (typeof dateValue === "string" && dateValue.trim() !== "") {
      date = new Date(dateValue);
    }
    // Handle Date objects
    else if (dateValue instanceof Date) {
      date = dateValue;
    }

    // Validate the date before formatting
    if (date && !isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }

    return "";
  } catch (error) {
    console.warn("Error formatting date:", error, "Value:", dateValue);
    return "";
  }
}

async function debugFunction() {
  console.log("🔍 Starting local debugging...\n");

  try {
    // Get booking data
    console.log("📊 Fetching booking data...");
    const bookingDoc = await db.collection("bookings").doc("0").get();

    if (!bookingDoc.exists) {
      console.log('❌ Booking document "0" not found!');
      return;
    }

    const bookingData = bookingDoc.data();
    console.log("✅ Booking data fetched successfully");
    console.log("📋 Booking data keys:", Object.keys(bookingData));

    // Get template data
    console.log("\n📧 Fetching template data...");
    const templateDoc = await db
      .collection("emailTemplates")
      .doc("BnRGgT6E8SVrXZH961LT")
      .get();

    if (!templateDoc.exists) {
      console.log("❌ Template document not found!");
      return;
    }

    const templateData = templateDoc.data();
    console.log("✅ Template data fetched successfully");
    console.log("📋 Template variables:", templateData.variables);

    // Extract and format template variables
    console.log("\n🔧 Processing template variables...");

    const fullName = bookingData.fullName || "";
    const bookingIdValue = bookingData.bookingId || "";
    const groupId = bookingData.groupIdGroupIdGenerator || "";
    const tourPackage = bookingData.tourPackageName || "";
    const tourDateRaw = bookingData.tourDate;
    const returnDateRaw = bookingData.returnDate;
    const tourDuration = bookingData.tourDuration || "";
    const bookingType = bookingData.bookingType || "";
    const reservationFee = bookingData.reservationFee || 0;
    const remainingBalance = bookingData.remainingBalance || 0;
    const fullPaymentAmount = bookingData.fullPaymentAmount || 0;
    const fullPaymentDueDate = bookingData.fullPaymentDueDate;
    const p1Amount = bookingData.p1Amount || 0;
    const p1DueDate = bookingData.p1DueDate;
    const p2Amount = bookingData.p2Amount || 0;
    const p2DueDate = bookingData.p2DueDate;
    const p3Amount = bookingData.p3Amount || 0;
    const p3DueDate = bookingData.p3DueDate;
    const p4Amount = bookingData.p4Amount || 0;
    const p4DueDate = bookingData.p4DueDate;
    const availablePaymentTerms = bookingData.availablePaymentTerms || "";

    console.log("📅 Raw date values:");
    console.log("  tourDate:", tourDateRaw, typeof tourDateRaw);
    console.log("  returnDate:", returnDateRaw, typeof returnDateRaw);
    console.log(
      "  fullPaymentDueDate:",
      fullPaymentDueDate,
      typeof fullPaymentDueDate
    );
    console.log("  p1DueDate:", p1DueDate, typeof p1DueDate);
    console.log("  p2DueDate:", p2DueDate, typeof p2DueDate);
    console.log("  p3DueDate:", p3DueDate, typeof p3DueDate);
    console.log("  p4DueDate:", p4DueDate, typeof p4DueDate);

    // Prepare template variables
    const templateVariables = {
      fullName,
      tourPackage,
      tourDate: formatFirestoreDate(tourDateRaw),
      returnDate: formatFirestoreDate(returnDateRaw),
      availablePaymentTerms,
      tourDuration,
      bookingType,
      bookingId: bookingIdValue,
      groupId,
      reservationFee: formatGBP(reservationFee),
      remainingBalance: formatGBP(remainingBalance),
      fullPaymentAmount: formatGBP(fullPaymentAmount),
      fullPaymentDueDate: formatFirestoreDate(fullPaymentDueDate),
      p1Amount: formatGBP(p1Amount),
      p1DueDate: formatFirestoreDate(p1DueDate),
      p2Amount: formatGBP(p2Amount),
      p2DueDate: formatFirestoreDate(p2DueDate),
      p3Amount: formatGBP(p3Amount),
      p3DueDate: formatFirestoreDate(p3DueDate),
      p4Amount: formatGBP(p4Amount),
      p4DueDate: formatFirestoreDate(p4DueDate),
      mainBooker: fullName,
      isCancelled: false,
      cancelledRefundAmount: "",
    };

    console.log("\n✅ Template variables processed:");
    Object.entries(templateVariables).forEach(([key, value]) => {
      console.log(`  ${key}: ${value} (${typeof value})`);
    });

    // Check for problematic values
    console.log("\n🔍 Checking for problematic values...");
    Object.entries(templateVariables).forEach(([key, value]) => {
      if (typeof value === "string" && value.includes("Invalid time value")) {
        console.error(`❌ Problematic template variable: ${key} = ${value}`);
      }
    });

    // Test template processing
    console.log("\n🎨 Testing template processing...");
    try {
      const processedHtml = EmailTemplateService.processTemplate(
        templateData.content,
        templateVariables
      );
      console.log("✅ Template processing successful!");
      console.log("📏 Processed HTML length:", processedHtml.length);
      console.log("📄 First 200 characters of processed HTML:");
      console.log(processedHtml.substring(0, 200) + "...");
    } catch (templateError) {
      console.error("❌ Template processing failed:");
      console.error("Error message:", templateError.message);
      console.error("Error stack:", templateError.stack);

      // Try to identify which variable is causing the issue
      console.log("\n🔍 Testing individual variables...");
      const testVariables = {};
      for (const [key, value] of Object.entries(templateVariables)) {
        try {
          testVariables[key] = value;
          EmailTemplateService.processTemplate(
            templateData.content,
            testVariables
          );
          console.log(`✅ ${key}: OK`);
        } catch (error) {
          console.error(`❌ ${key}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.error("❌ Debug failed:", error);
    console.error("Stack:", error.stack);
  }
}

debugFunction();
