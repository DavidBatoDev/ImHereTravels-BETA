import { BookingSheetColumn } from "@/types/booking-sheet-column";
import { firebaseUtils } from "@/app/functions/firebase-utils";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { subjectLineReservationColumn } from "./subject-line-reservation";

export const emailDraftLinkColumn: BookingSheetColumn = {
  id: "emailDraftLink",
  data: {
    id: "emailDraftLink",
    columnName: "Email Draft Link",
    dataType: "function",
    function: "generateGmailDraftFunction",
    parentTab: "Reservation Email",
    order: 28,
    includeInForms: false,
    color: "yellow",
    width: 425.3333740234375,
    arguments: [
      {
        name: "bookingId",
        type: "string",
        columnReference: "ID",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "includeBcc",
        type: "boolean",
        columnReference: "Include BCC (Reservation)",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "emailAddress",
        type: "string",
        columnReference: "Email Address",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "generateEmailDraft",
        type: "boolean",
        columnReference: "Generate Email Draft",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

// Column Function Implementation

/**
 * Extract draft ID from Gmail draft URL
 * Examples:
 * - https://mail.google.com/mail/u/0/#drafts?compose=abc123xyz -> abc123xyz
 * - https://mail.google.com/mail/u/0/#drafts/abc123xyz -> abc123xyz
 */
function extractDraftIdFromUrl(url: string): string | null {
  try {
    // Try to extract from query parameter
    const urlObj = new URL(url);
    const composeParam = urlObj.searchParams.get("compose");
    if (composeParam) {
      return composeParam;
    }

    // Try to extract from hash (for Gmail URLs)
    const hash = urlObj.hash;
    const composeMatch = hash.match(/compose=([^&]+)/);
    if (composeMatch) {
      return composeMatch[1];
    }

    // Try to extract from path (e.g., #drafts/abc123xyz)
    const pathMatch = hash.match(/#drafts\/([^?&]+)/);
    if (pathMatch) {
      return pathMatch[1];
    }

    return null;
  } catch (error) {
    console.error("Error parsing draft URL:", error);
    return null;
  }
}

// Define types for the function response
interface GmailDraftResult {
  success: boolean;
  draftId?: string;
  draftUrl?: string; // NEW: The actual Gmail draft URL
  messageId?: string;
  threadId?: string;
  subject?: string;
  email?: string;
  fullName?: string;
  tourPackage?: string;
  isCancellation?: boolean;
  emailType?: string;
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
 * Column function to generate Gmail drafts and return clickable URLs
 * Creates drafts directly in Bella's Gmail account and returns the direct URL
 *
 * @param bookingId - The booking ID to generate draft for
 * @param includeBcc - If true, fetch BCC users from bcc-users collection
 * @param emailAddress - Customer's email address
 * @param generateEmailDraft - True to create draft, false to clear existing
 * @returns Gmail draft URL that Bella can click to open the draft
 */
export default async function generateGmailDraft(
  bookingId: string,
  includeBcc: boolean | null,
  emailAddress: string,
  generateEmailDraft: boolean
): Promise<string> {
  try {
    if (!bookingId) return "";

    console.log(`[EMAIL DRAFT LINK] Called with:`, {
      bookingId,
      generateEmailDraft,
    });

    // If generateEmailDraft is false, always return empty string
    // This ensures the link is cleared immediately when toggled off
    if (!generateEmailDraft) {
      // The bookingId parameter is actually the document ID from the "ID" column
      // Fetch the LATEST booking document directly from Firestore (not cached data)
      const bookingDoc = (await firebaseUtils.getDocumentData(
        "bookings",
        bookingId
      )) as BookingData;

      if (!bookingDoc) {
        throw new Error(`Booking with document ID ${bookingId} not found`);
      }

      console.log(`Found booking document with ID: ${bookingDoc.id}`);

      // Check if we need to delete existing draft when toggling off
      const existingGmailDraftUrl = bookingDoc.emailDraftLink;

      if (existingGmailDraftUrl) {
        // Clear existing Gmail draft URL if Generate Email Draft is false
        console.log(
          `Clearing existing Gmail draft URL: ${existingGmailDraftUrl}`
        );

        // Extract draft ID from URL and delete the Gmail draft
        try {
          const draftId = extractDraftIdFromUrl(existingGmailDraftUrl);
          if (draftId) {
            console.log(`Deleting Gmail draft with ID: ${draftId}`);
            const deleteGmailDraft = httpsCallable(
              functions,
              "deleteGmailDraft"
            );
            await deleteGmailDraft({ draftId });
            console.log("Gmail draft deleted successfully");
          }
        } catch (deleteError) {
          console.error("Error deleting Gmail draft:", deleteError);
          // Continue to clear the URL even if deletion fails
        }

        // Clear the URL from booking
        await firebaseUtils.updateDocument("bookings", bookingDoc.id, {
          emailDraftLink: null,
          generateEmailDraft: false,
          subjectLineReservationColumn: "",
        });
      }

      console.log("Gmail draft URL cleared successfully");
      return "";
    }

    // If Generate Email Draft is true, always create new Gmail draft
    if (generateEmailDraft) {
      // Fetch the booking document to get existing draft URL
      const bookingDoc = (await firebaseUtils.getDocumentData(
        "bookings",
        bookingId
      )) as BookingData;

      if (!bookingDoc) {
        throw new Error(`Booking with document ID ${bookingId} not found`);
      }

      console.log(`Found booking document with ID: ${bookingDoc.id}`);

      const existingGmailDraftUrl = bookingDoc.emailDraftLink;

      // Delete existing draft if it exists
      if (existingGmailDraftUrl) {
        console.log(`Deleting existing Gmail draft before creating new one`);
        try {
          const draftId = extractDraftIdFromUrl(existingGmailDraftUrl);
          if (draftId) {
            const deleteGmailDraft = httpsCallable(
              functions,
              "deleteGmailDraft"
            );
            await deleteGmailDraft({ draftId });
            console.log("Existing Gmail draft deleted successfully");
          }
        } catch (deleteError) {
          console.error("Error deleting existing Gmail draft:", deleteError);
          // Continue to create new draft even if deletion fails
        }
      }
      console.log(`Generating new Gmail draft for booking: ${bookingId}`);

      // Fetch BCC users if includeBcc is true
      let bccList: string[] = [];
      if (includeBcc) {
        try {
          const bccUsers = await firebaseUtils.getCollectionData("bcc-users");

          // Filter active users and extract email addresses
          bccList = bccUsers
            .filter((user: any) => user.isActive === true)
            .map((user: any) => user.email)
            .filter((email: string) => email && email.trim() !== "");

          console.log(`Found ${bccList.length} active BCC users`);
        } catch (bccError) {
          console.error("Error fetching BCC users:", bccError);
          // Continue without BCC if there's an error
        }
      }

      // Use the updated Firebase Functions that creates Gmail drafts
      const generateEmail = httpsCallable(
        functions,
        "generateReservationEmail"
      );

      try {
        const emailResult = await generateEmail({
          bookingId: bookingDoc.id, // Use the document ID, not the bookingId field
          generateDraftCell: true,
          bcc: bccList.length > 0 ? bccList : undefined, // Only include BCC if there are users
        });

        console.log("Gmail draft creation result:", emailResult.data);

        const emailResultData = emailResult.data as GmailDraftResult;
        console.log(
          "Full email result data:",
          JSON.stringify(emailResultData, null, 2)
        );

        if (emailResultData && emailResultData.success) {
          const gmailDraftUrl = emailResultData.draftUrl || "";
          const gmailDraftId = emailResultData.draftId || "";

          console.log(`Generated Gmail draft with ID: ${gmailDraftId}`);
          console.log(`Generated Gmail draft URL: ${gmailDraftUrl}`);

          if (!gmailDraftUrl) {
            console.error("WARNING: Gmail draft URL is empty!");
            console.error("Email result data:", emailResultData);
          }

          // Only update the generateEmailDraft flag, not the emailDraftLink
          // The emailDraftLink will be updated automatically when this function returns the URL
          console.log(
            `Updating generateEmailDraft flag for booking ${bookingDoc.id}`
          );
          await firebaseUtils.updateDocument("bookings", bookingDoc.id, {
            generateEmailDraft: true,
          });
          console.log("Generate email draft flag updated successfully");

          return gmailDraftUrl; // Return Gmail draft URL for the column
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

    return "";
  } catch (error) {
    console.error("Error in generateGmailDraft:", error);
    throw error;
  }
}
