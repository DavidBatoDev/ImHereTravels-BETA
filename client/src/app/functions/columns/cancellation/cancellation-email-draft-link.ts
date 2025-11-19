import { BookingSheetColumn } from "@/types/booking-sheet-column";
import { firebaseUtils } from "@/app/functions/firebase-utils";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export const cancellationEmailDraftLinkColumn: BookingSheetColumn = {
  id: "cancellationEmailDraftLink",
  data: {
    id: "cancellationEmailDraftLink",
    columnName: "Cancellation Email Draft Link",
    dataType: "function",
    function: "generateCancellationGmailDraftFunction",
    parentTab: "Cancellation",
    order: 80,
    includeInForms: false,
    color: "yellow",
    width: 200,
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
        columnReference: "Include BCC (Cancellation)",
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
        name: "generateCancellationDraft",
        type: "boolean",
        columnReference: "Generate Cancellation Email Draft",
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
  draftUrl?: string;
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
  cancellationEmailDraftLink?: string;
  [key: string]: any;
}

/**
 * Column function to generate Gmail cancellation email drafts and return clickable URLs
 * Creates drafts directly in Bella's Gmail account and returns the direct URL
 *
 * @param bookingId - The booking ID to generate draft for
 * @param includeBcc - If true, fetch BCC users from bcc-users collection
 * @param emailAddress - Customer's email address
 * @param generateCancellationDraft - True to create draft, false to clear existing
 * @returns Gmail draft URL that Bella can click to open the draft
 */
export default async function generateCancellationGmailDraft(
  bookingId: string,
  includeBcc: boolean | null,
  emailAddress: string,
  generateCancellationDraft: boolean
): Promise<string> {
  try {
    if (!bookingId) return "";

    console.log(`[CANCELLATION DRAFT LINK] Called with:`, {
      bookingId,
      generateCancellationDraft,
    });

    // If generateCancellationDraft is false, always return empty string
    // This ensures the link is cleared immediately when toggled off
    if (!generateCancellationDraft) {
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
      let existingGmailDraftUrl = bookingDoc.cancellationEmailDraftLink;

      // Remove SENT: prefix if present to get the actual draft URL
      if (existingGmailDraftUrl && existingGmailDraftUrl.startsWith("SENT:")) {
        existingGmailDraftUrl = existingGmailDraftUrl.substring(5);
      }

      if (existingGmailDraftUrl) {
        // Clear existing Gmail draft URL if Generate Cancellation Draft is false
        console.log(
          `Clearing existing cancellation Gmail draft URL: ${existingGmailDraftUrl}`
        );

        // Extract draft ID from URL and delete the Gmail draft
        try {
          const draftId = extractDraftIdFromUrl(existingGmailDraftUrl);
          if (draftId) {
            console.log(
              `Deleting cancellation Gmail draft with ID: ${draftId}`
            );
            const deleteGmailDraft = httpsCallable(
              functions,
              "deleteGmailDraft"
            );
            await deleteGmailDraft({ draftId });
            console.log("Cancellation Gmail draft deleted successfully");
          }
        } catch (deleteError) {
          console.error(
            "Error deleting cancellation Gmail draft:",
            deleteError
          );
          // Continue to clear the URL even if deletion fails
        }

        // Clear only the generateCancellationDraft flag
        // The cancellationEmailDraftLink will be cleared by the return value
        await firebaseUtils.updateDocument("bookings", bookingDoc.id, {
          generateCancellationDraft: false,
        });
      }

      console.log("Cancellation Gmail draft URL cleared successfully");
      return "";
    }

    // If Generate Cancellation Draft is true, always create new Gmail draft
    if (generateCancellationDraft) {
      // Fetch the booking document to get existing draft URL
      const bookingDoc = (await firebaseUtils.getDocumentData(
        "bookings",
        bookingId
      )) as BookingData;

      if (!bookingDoc) {
        throw new Error(`Booking with document ID ${bookingId} not found`);
      }

      console.log(`Found booking document with ID: ${bookingDoc.id}`);

      let existingGmailDraftUrl = bookingDoc.cancellationEmailDraftLink;

      // Remove SENT: prefix if present to get the actual draft URL
      if (existingGmailDraftUrl && existingGmailDraftUrl.startsWith("SENT:")) {
        existingGmailDraftUrl = existingGmailDraftUrl.substring(5);
      }

      // Delete existing draft if it exists
      if (existingGmailDraftUrl) {
        console.log(
          `Deleting existing cancellation Gmail draft before creating new one`
        );
        try {
          const draftId = extractDraftIdFromUrl(existingGmailDraftUrl);
          if (draftId) {
            const deleteGmailDraft = httpsCallable(
              functions,
              "deleteGmailDraft"
            );
            await deleteGmailDraft({ draftId });
            console.log(
              "Existing cancellation Gmail draft deleted successfully"
            );
          }
        } catch (deleteError) {
          console.error(
            "Error deleting existing cancellation Gmail draft:",
            deleteError
          );
          // Continue to create new draft even if deletion fails
        }
      }
      console.log(
        `Generating new cancellation Gmail draft for booking: ${bookingId}`
      );

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

      // Use the Firebase Functions that creates cancellation Gmail drafts
      const generateEmail = httpsCallable(
        functions,
        "generateCancellationEmail"
      );

      try {
        const emailResult = await generateEmail({
          bookingId: bookingDoc.id, // Use the document ID, not the bookingId field
          generateDraftCell: true,
          bcc: bccList.length > 0 ? bccList : undefined, // Only include BCC if there are users
        });

        console.log(
          "Cancellation Gmail draft creation result:",
          emailResult.data
        );

        const emailResultData = emailResult.data as GmailDraftResult;
        if (emailResultData && emailResultData.success) {
          const gmailDraftUrl = emailResultData.draftUrl || "";
          const gmailDraftId = emailResultData.draftId || "";

          console.log(
            `Generated cancellation Gmail draft with ID: ${gmailDraftId}`
          );
          console.log(
            `Generated cancellation Gmail draft URL: ${gmailDraftUrl}`
          );

          if (!gmailDraftUrl) {
            console.error("WARNING: Cancellation Gmail draft URL is empty!");
            console.error("Email result data:", emailResultData);
          }

          // Only update the generateCancellationDraft flag, not the cancellationEmailDraftLink
          // The cancellationEmailDraftLink will be updated automatically when this function returns the URL
          console.log(
            `Updating generateCancellationDraft flag for booking ${bookingDoc.id}`
          );
          await firebaseUtils.updateDocument("bookings", bookingDoc.id, {
            generateCancellationDraft: true,
          });
          console.log("Generate cancellation draft flag updated successfully");

          return gmailDraftUrl; // Return Gmail draft URL for the column
        } else {
          console.error(
            "Function returned unsuccessful result:",
            emailResultData
          );
          throw new Error("Failed to generate cancellation Gmail draft");
        }
      } catch (functionError: any) {
        console.error(
          "Error calling generateCancellationEmail function:",
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
          `Cancellation Gmail draft creation error: ${
            functionError.code || "unknown"
          } - ${functionError.message || "Unknown error"}`
        );
      }
    }

    // If Generate Cancellation Draft is false and no existing draft, return empty string
    console.log(
      `No action needed - Generate Cancellation Draft is false and no existing draft`
    );
    return "";
  } catch (error) {
    console.error("Error in generateCancellationGmailDraft:", error);
    throw error;
  }
}
