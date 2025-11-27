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
} from "firebase/firestore";

// ============================================================================
// MIGRATION CONFIGURATION
// ============================================================================

const MIGRATION_ID = "040-booking-confirmation-email-template";
const COLLECTION_NAME = "emailTemplates";

// ============================================================================
// MIGRATION DATA - Booking Confirmation Email Template
// ============================================================================

const bookingConfirmationTemplate = {
  name: "Booking Confirmation Email - Pre-Departure Pack",
  subject: "🎉 Your Booking is Complete - Pre-Departure Pack Attached!",
  content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation Email</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; margin: 0;">
    <div class="email-header" style="width: 100%; margin: 0 auto; margin-bottom: 10px;">
        <img src="https://imheretravels.com/wp-content/uploads/2024/05/siargao-header-1.webp" alt="ImHereTravels Banner" style="width: 100%; max-width: 636px; height: auto; display: block; margin: 0 auto;">
    </div>
    <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
        
        <!-- Greeting -->
        <p style="font-size: 16px; color: #333333;">Hi <strong>{{fullName}}</strong>,</p>

        <!-- Confirmation Message -->
        <p style="font-size: 16px; color: #333333;">
            🎉 <strong>Congratulations!</strong> Your booking is now fully confirmed and paid!
        </p>
        <p style="font-size: 16px; color: #333333;">
            Thank you for choosing <strong style="color: red;">ImHereTravels</strong> for your adventure. We're thrilled to have you join us for <strong>{{tourPackage}}</strong>!
        </p>

        <!-- Booking Reference -->
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid red; margin: 20px 0;">
            <p style="font-size: 14px; color: #666; margin: 0;">Your Booking Reference:</p>
            <p style="font-size: 20px; font-weight: bold; color: red; margin: 5px 0 0 0;">{{bookingReference}}</p>
        </div>

        <!-- Booking Details -->
        <h2 style="color: red; font-size: 24px; margin-top: 30px; margin-bottom: 15px;">Booking Details</h2>
        <table cellpadding="5" style="border-collapse: collapse; width: 100%; max-width: 600px; color: #333333; margin-bottom: 20px;">
            <tr><td><strong>Traveler Name:</strong></td><td>{{fullName}}</td></tr>
            <tr><td><strong>Tour Name:</strong></td><td>{{tourPackage}}</td></tr>
            <tr><td><strong>Tour Date:</strong></td><td>{{tourDate}}</td></tr>
            <tr><td><strong>Return Date:</strong></td><td>{{returnDate}}</td></tr>
            <tr><td><strong>Tour Duration:</strong></td><td>{{tourDuration}}</td></tr>
            <tr><td><strong>Booking Type:</strong></td><td>{{bookingType}}</td></tr>
            <tr><td><strong>Total Amount Paid:</strong></td><td style="color: green; font-weight: bold;">£{{paid}}</td></tr>
        </table>

        <!-- Payment Summary -->
        <h3 style="font-size: 20px; color: red; margin-top: 30px; margin-bottom: 15px;">Payment Summary</h3>
        <p style="font-size: 16px; color: #333333;">Here's a complete breakdown of your payments:</p>
        
        <div style="padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <table style="width: 100%; font-size: 16px; border-collapse: collapse; table-layout: fixed; border: 1px solid black;">
                <thead style="background-color: #f2f2f2;">
                    <tr>
                        <th align="left" style="padding: 10px; width: 30%; border: 1px solid black;">Payment Term</th>
                        <th align="left" style="padding: 10px; width: 25%; border: 1px solid black;">Amount</th>
                        <th align="left" style="padding: 10px; width: 22%; border: 1px solid black;">Due Date</th>
                        <th align="left" style="padding: 10px; width: 23%; border: 1px solid black;">Date Paid</th>
                    </tr>
                </thead>
                <tbody>
                    {{selectedTerms}}
                </tbody>
            </table>
        </div>

        <!-- Pre-Departure Pack Notice -->
        <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">📋 Pre-Departure Pack Attached</h3>
            <p style="font-size: 16px; color: #856404; margin: 5px 0;">
                We've attached your <strong>Pre-Departure Pack</strong> to this email. This document contains important information about your tour, including:
            </p>
            <ul style="color: #856404; margin: 10px 0; padding-left: 20px;">
                <li>Meeting point and time details</li>
                <li>What to bring and pack</li>
                <li>Tour itinerary highlights</li>
                <li>Emergency contact information</li>
                <li>Important travel tips</li>
            </ul>
            <p style="font-size: 16px; color: #856404; margin: 5px 0;">
                Please review the pack carefully before your tour date.
            </p>
        </div>

        <!-- Next Steps -->
        <h3 style="font-size: 20px; color: red; margin-top: 30px; margin-bottom: 15px;">What's Next?</h3>
        <ol style="font-size: 16px; color: #333333; line-height: 1.6;">
            <li><strong>Review your Pre-Departure Pack</strong> attached to this email</li>
            <li><strong>Mark your calendar</strong> for {{tourDate}}</li>
            <li><strong>Prepare your travel documents</strong> and items mentioned in the pack</li>
            <li><strong>Get excited!</strong> Your adventure is about to begin! 🎒✈️</li>
        </ol>

        <!-- Contact Information -->
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: red; margin-top: 0;">Need Help?</h3>
            <p style="font-size: 16px; color: #333333; margin: 5px 0;">
                If you have any questions or need assistance, feel free to reach out to us:
            </p>
            <ul style="color: #333333; margin: 10px 0; padding-left: 20px;">
                <li>📧 Email: info@imheretravels.com</li>
                <li>📱 WhatsApp: +63 917 123 4567</li>
                <li>🌐 Website: <a href="https://imheretravels.com" style="color: red;">imheretravels.com</a></li>
            </ul>
        </div>

        <!-- Footer -->
        <p style="font-size: 16px; color: #333333; margin-top: 30px;">
            We can't wait to see you on your adventure!
        </p>
        <p style="font-size: 16px; color: #333333;">Safe travels,</p>
        <p style="font-size: 16px; color: #333333;"><strong>The ImHereTravels Team</strong></p>
        
        <div style="text-align: left; margin-top: 30px;">
            <img src="https://imheretravels.com/wp-content/uploads/2025/04/ImHereTravels-Logo.png" alt="ImHereTravels Logo" style="width: 120px; height: auto; display: block;">
        </div>

        <!-- Disclaimer -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #999; line-height: 1.5;">
                This is an automated confirmation email. Please do not reply to this message. 
                If you need assistance, contact us using the information provided above.
            </p>
        </div>
    </div>
</body>
</html>`,
  variables: [
    "fullName",
    "tourPackage",
    "bookingReference",
    "tourDate",
    "returnDate",
    "tourDuration",
    "bookingType",
    "paid",
    "selectedTerms",
  ],
  status: "active",
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
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
 * Main migration function - adds booking confirmation email template
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
    // Add the booking confirmation template
    console.log("📧 Creating booking confirmation email template...");
    const templateRef = collection(db, COLLECTION_NAME);
    await addDoc(templateRef, bookingConfirmationTemplate);
    console.log("✅ Booking confirmation template created successfully");

    // Record successful migration
    await recordMigration();
    console.log(`\n✅ Migration ${MIGRATION_ID} completed successfully!\n`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

/**
 * Rollback function - removes the booking confirmation template
 */
export async function rollbackMigration(): Promise<void> {
  console.log(`\n🔄 Rolling back migration: ${MIGRATION_ID}\n`);

  try {
    // Find and delete the booking confirmation template
    console.log("🗑️  Removing booking confirmation email template...");
    const templatesRef = collection(db, COLLECTION_NAME);
    const q = query(
      templatesRef,
      where("name", "==", bookingConfirmationTemplate.name)
    );
    const snapshot = await getDocs(q);

    const deletePromises = snapshot.docs.map((document) =>
      deleteDoc(doc(db, COLLECTION_NAME, document.id))
    );
    await Promise.all(deletePromises);
    console.log("✅ Booking confirmation template removed");

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
