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

// Initialize Gmail API Service
const gmailService = new GmailApiService();

/**
 * Extract message ID from Gmail draft URL
 * Examples:
 * - https://mail.google.com/mail/u/0/#drafts?compose=abc123xyz -> abc123xyz
 * - https://FRONTEND_URL/mail/u/0/#drafts?compose=abc123xyz -> abc123xyz
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

// Cloud function to get Gmail draft subject
export const getDraftSubject = onCall(
  {
    region: "asia-southeast1",
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: "512MiB",
    cors: true,
  },
  async (request) => {
    try {
      const { draftUrl } = request.data;

      if (!draftUrl) {
        throw new HttpsError("invalid-argument", "Draft URL is required");
      }

      logger.info(`Getting subject for draft URL: ${draftUrl}`);

      // Extract message ID from URL
      const messageId = extractMessageIdFromUrl(draftUrl);

      if (!messageId) {
        throw new HttpsError(
          "invalid-argument",
          "Could not extract message ID from draft URL"
        );
      }

      logger.info(`Extracted message ID: ${messageId}`);

      // Get the subject from Gmail API
      const subject = await gmailService.getDraftSubject(messageId);

      return {
        success: true,
        subject,
        messageId,
        draftUrl,
      };
    } catch (error) {
      logger.error("Error getting draft subject:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to get draft subject: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
);
