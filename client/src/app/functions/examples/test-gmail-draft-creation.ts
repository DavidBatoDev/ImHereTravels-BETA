/**
 * Example: Testing the simplified Gmail draft creation
 *
 * This shows how the new generateReservationEmail function works:
 * - Creates drafts directly in Bella's Gmail account
 * - No local emailDrafts collection storage
 * - Returns the actual Gmail draft URL for easy access
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "../../../lib/firebase";

// Define the function interface
const generateReservationEmail = httpsCallable(
  functions,
  "generateReservationEmail"
);

interface GmailDraftResponse {
  success: boolean;
  draftId: string;
  draftUrl: string; // NEW: Direct Gmail URL to open the draft
  messageId: string;
  threadId: string;
  subject: string;
  email: string;
  fullName: string;
  tourPackage: string;
  isCancellation: boolean;
  emailType: "reservation" | "cancellation";
  status: string;
  message: string;
}

/**
 * Test creating a Gmail draft for a booking
 */
export async function testGmailDraftCreation() {
  try {
    console.log("🚀 Testing Gmail draft creation...");

    // Example booking ID - replace with a real one from your database
    const testBookingId = "your-booking-id-here";

    const result = await generateReservationEmail({
      bookingId: testBookingId,
      generateDraftCell: true, // Set to true to create draft
    });

    const data = result.data as GmailDraftResponse;

    if (data.success) {
      console.log("✅ Gmail draft created successfully!");
      console.log(`📧 Draft ID: ${data.draftId}`);
      console.log(`🔗 Gmail URL: ${data.draftUrl}`);
      console.log(`📬 Email: ${data.email}`);
      console.log(`👤 Customer: ${data.fullName}`);
      console.log(`🎯 Subject: ${data.subject}`);
      console.log(`📦 Tour: ${data.tourPackage}`);
      console.log(`📝 Type: ${data.emailType}`);

      // The draft URL can be used directly by Bella
      console.log(`\n🎯 Bella can click this URL to open the draft:`);
      console.log(data.draftUrl);

      return {
        success: true,
        draftUrl: data.draftUrl,
        draftId: data.draftId,
        customerEmail: data.email,
        customerName: data.fullName,
      };
    } else {
      console.error("❌ Failed to create Gmail draft:", data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.error("💥 Error testing Gmail draft creation:", error);
    return { success: false, error };
  }
}

/**
 * Test skipping draft creation
 */
export async function testSkipDraftCreation() {
  try {
    console.log("🚫 Testing skip draft creation...");

    const testBookingId = "your-booking-id-here";

    const result = await generateReservationEmail({
      bookingId: testBookingId,
      generateDraftCell: false, // Set to false to skip creation
    });

    const data = result.data as any;

    console.log("✅ Skip response:", data);

    return data;
  } catch (error) {
    console.error("💥 Error testing skip draft:", error);
    return { success: false, error };
  }
}

/**
 * Key Benefits of the New Implementation:
 *
 * 1. ✨ SIMPLIFIED: No more local emailDrafts collection
 * 2. 🎯 DIRECT ACCESS: Returns actual Gmail draft URL
 * 3. 🔗 CLICKABLE LINK: Bella can directly open drafts from the URL
 * 4. 🚀 FASTER: Less database operations
 * 5. 📧 GMAIL NATIVE: Uses Bella's actual Gmail account
 *
 * Example URL format: https://mail.google.com/mail/u/0/#drafts/[draft-id]
 *
 * Usage in your app:
 * - Call the function with a booking ID
 * - Get the draftUrl from the response
 * - Display it as a clickable link for Bella
 * - She can click to open and send the email
 */
