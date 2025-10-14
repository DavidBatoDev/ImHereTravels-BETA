import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { firebaseUtils } from "@/app/functions/firebase-utils";

// Define types for the function response
interface GmailDraftResult {
  success: boolean;
  draftId?: string;
  localDraftId?: string;
  status: string;
  message: string;
}

// Define booking type
interface BookingData {
  id: string;
  bookingId?: string;
  emailAddress?: string;
  emailDraftLink?: string;
  cancellationEmailDraftId?: string;
  [key: string]: any;
}

/**
 * Column function to generate Gmail drafts using the new Gmail API service
 * This replaces the old email draft approach with Gmail integration
 */
export default async function generateGmailDraft(
  bookingId: string,
  includeBcc: boolean | null,
  emailAddress: string,
  generateEmailDraft: boolean
): Promise<string> {
  try {
    // Get all bookings and filter client-side
    const bookings = (await firebaseUtils.getCollectionData(
      "bookings"
    )) as BookingData[];

    if (!bookingId) return "";

    // Filter to find the booking with matching bookingId AND emailAddress
    const matchingBookings = bookings.filter(
      (booking) =>
        booking.bookingId === bookingId && booking.emailAddress === emailAddress
    );

    if (!matchingBookings || matchingBookings.length === 0) {
      throw new Error(
        `Booking with bookingId ${bookingId} and email ${emailAddress} not found`
      );
    }

    // Get the first matching booking document
    const bookingDoc = matchingBookings[0];

    console.log(`Found booking document with ID: ${bookingDoc.id}`);

    // Check if booking already has a Gmail draft
    const existingGmailDraftId =
      bookingDoc.emailDraftLink || bookingDoc.cancellationEmailDraftId;

    console.log("Gmail draft exists: ", existingGmailDraftId);

    if (existingGmailDraftId) {
      if (generateEmailDraft) {
        // Return existing Gmail draft ID if Generate Email Draft is true
        console.log(`Returning existing Gmail draft: ${existingGmailDraftId}`);
        return existingGmailDraftId;
      } else {
        // Delete existing Gmail draft if Generate Email Draft is false
        console.log(`Deleting existing Gmail draft: ${existingGmailDraftId}`);

        // Call the generate reservation email function to delete the draft
        const generateEmail = httpsCallable(
          functions,
          "generateReservationEmail"
        );
        const result = await generateEmail({
          bookingId: bookingDoc.id, // Use the document ID, not the bookingId field
          generateDraftCell: false, // This will trigger deletion
        });

        const resultData = result.data as GmailDraftResult;
        if (resultData && resultData.success) {
          console.log("Gmail draft deleted successfully");
          return "";
        } else {
          throw new Error("Failed to delete Gmail draft");
        }
      }
    }

    // If no existing draft and Generate Email Draft is true, create new Gmail draft
    if (generateEmailDraft) {
      console.log(`Generating new Gmail draft for booking: ${bookingId}`);

      // Use the updated Firebase Functions that creates Gmail drafts
      const generateEmail = httpsCallable(
        functions,
        "generateReservationEmail"
      );

      try {
        const emailResult = await generateEmail({
          bookingId: bookingDoc.id, // Use the document ID, not the bookingId field
          generateDraftCell: true,
        });

        console.log("Gmail draft creation result:", emailResult.data);

        const emailResultData = emailResult.data as GmailDraftResult;
        if (emailResultData && emailResultData.success) {
          const gmailDraftId = emailResultData.draftId || "";
          const localDraftId = emailResultData.localDraftId || "";

          console.log(`Generated Gmail draft with ID: ${gmailDraftId}`);
          console.log(`Local draft record ID: ${localDraftId}`);

          // Update booking document with Gmail draft ID
          await firebaseUtils.updateDocument("bookings", bookingDoc.id, {
            emailDraftLink: gmailDraftId,
            generateEmailDraft: true,
          });

          return gmailDraftId; // Return Gmail draft ID for the column
        } else {
          console.error(
            "Function returned unsuccessful result:",
            emailResultData
          );
          throw new Error("Failed to generate Gmail draft");
        }
      } catch (functionError: any) {
        console.error(
          "Error calling generateReservationEmail function:",
          functionError
        );

        // Log detailed error information
        if (functionError.code) {
          console.error("Error code:", functionError.code);
        }
        if (functionError.message) {
          console.error("Error message:", functionError.message);
        }
        if (functionError.details) {
          console.error("Error details:", functionError.details);
        }

        // Re-throw with more context
        throw new Error(
          `Gmail draft creation error: ${functionError.code || "unknown"} - ${
            functionError.message || "Unknown error"
          }`
        );
      }
    }

    // If Generate Email Draft is false and no existing draft, return empty string
    console.log(
      `No action needed - Generate Email Draft is false and no existing draft`
    );
    return "";
  } catch (error) {
    console.error("Error in generateGmailDraft:", error);
    throw error;
  }
}
