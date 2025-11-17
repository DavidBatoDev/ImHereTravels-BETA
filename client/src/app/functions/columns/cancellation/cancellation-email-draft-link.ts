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
  cancellationEmailDraftUrl?: string;
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

    // The bookingId parameter is actually the document ID from the "ID" column
    // Fetch the booking document directly using the document ID
    const bookings = (await firebaseUtils.getCollectionData(
      "bookings"
    )) as BookingData[];

    const bookingDoc = bookings.find((b) => b.id === bookingId);

    if (!bookingDoc) {
      throw new Error(`Booking with document ID ${bookingId} not found`);
    }

    console.log(`Found booking document with ID: ${bookingDoc.id}`);

    // Check if booking already has a Gmail draft URL
    const existingGmailDraftUrl = bookingDoc.cancellationEmailDraftUrl;

    console.log("Cancellation Gmail draft URL exists: ", existingGmailDraftUrl);

    if (existingGmailDraftUrl) {
      if (generateCancellationDraft) {
        // Return existing Gmail draft URL if Generate Cancellation Draft is true
        console.log(
          `Returning existing cancellation Gmail draft URL: ${existingGmailDraftUrl}`
        );
        return existingGmailDraftUrl;
      } else {
        // Clear existing Gmail draft URL if Generate Cancellation Draft is false
        console.log(
          `Clearing existing cancellation Gmail draft URL: ${existingGmailDraftUrl}`
        );

        // Since we're not storing local drafts anymore, we just clear the URL from booking
        await firebaseUtils.updateDocument("bookings", bookingDoc.id, {
          cancellationEmailDraftUrl: null,
          generateCancellationDraft: false,
        });

        console.log("Cancellation Gmail draft URL cleared successfully");
        return "";
      }
    }

    // If no existing draft and Generate Cancellation Draft is true, create new Gmail draft
    if (generateCancellationDraft) {
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

          // Update booking document with Gmail draft URL (not just ID)
          await firebaseUtils.updateDocument("bookings", bookingDoc.id, {
            cancellationEmailDraftUrl: gmailDraftUrl, // Store the clickable URL
            generateCancellationDraft: true,
          });

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
