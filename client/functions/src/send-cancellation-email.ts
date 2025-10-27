import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { logger } from "firebase-functions";
import GmailApiService from "./gmail-api-service";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

/**
 * Extract message ID from Gmail draft URL
 * Examples:
 * - https://mail.google.com/mail/u/0/#drafts?compose=abc123xyz -> abc123xyz
 * - https://mail.google.com/mail/u/0/#drafts?compose=abc123xyz -> abc123xyz
 */
function extractMessageIdFromUrl(url: string): string | null {
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

    return null;
  } catch (error) {
    logger.error("Error parsing URL:", error);
    return null;
  }
}

/**
 * Generate Gmail sent email URL
 */
function getGmailSentUrl(messageId: string): string {
  return `https://mail.google.com/mail/u/0/#sent/${messageId}`;
}

export const sendCancellationEmail = onCall(
  {
    region: "asia-southeast1",
    maxInstances: 10,
    timeoutSeconds: 60,
  },
  async (request) => {
    try {
      logger.info("Send cancellation email function called with data:", request.data);

      const { draftUrl } = request.data;

      if (!draftUrl) {
        throw new HttpsError("invalid-argument", "draftUrl is required");
      }

      // Extract messageId from the draft URL
      const messageId = extractMessageIdFromUrl(draftUrl);

      if (!messageId) {
        throw new HttpsError(
          "invalid-argument",
          "Could not extract message ID from draft URL"
        );
      }

      logger.info(`Extracted message ID: ${messageId}`);

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      // Get the draft by message ID to find the draftId
      const draftsResponse = await gmailService.fetchDrafts(100);
      const draft = draftsResponse.drafts.find(
        (d: any) => d.messageId === messageId
      );

      if (!draft) {
        throw new HttpsError(
          "not-found",
          "Cancellation draft not found with the given message ID"
        );
      }

      logger.info(`Found cancellation draft with ID: ${draft.id}`);

      // Send the draft
      const result = await gmailService.sendDraft(draft.id);

      logger.info("Cancellation draft sent successfully:", result.messageId);

      // Generate the sent email URL
      const sentUrl = getGmailSentUrl(result.messageId);

      return {
        success: true,
        messageId: result.messageId,
        threadId: result.threadId,
        status: "sent",
        sentUrl: sentUrl,
        emailType: "cancellation",
      };
    } catch (error) {
      logger.error("Error sending cancellation email:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to send cancellation email: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
);
