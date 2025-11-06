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
 * Extract message ID from Gmail URL
 * Examples:
 * - https://mail.google.com/mail/u/0/#sent/abc123xyz -> abc123xyz
 * - https://mail.google.com/mail/u/0/#drafts?compose=abc123xyz -> abc123xyz
 * - Direct message ID: abc123xyz -> abc123xyz
 */
function extractMessageIdFromUrl(urlOrId: string): string | null {
  try {
    // If it's already just an ID (no URL structure), return it
    if (!urlOrId.includes("http") && !urlOrId.includes("/")) {
      return urlOrId;
    }

    // Try to extract from URL
    const urlObj = new URL(urlOrId);

    // Try query parameter first (for compose URLs)
    const composeParam = urlObj.searchParams.get("compose");
    if (composeParam) {
      return composeParam;
    }

    // Try hash fragments (for Gmail URLs)
    const hash = urlObj.hash;

    // Extract from #sent/abc123xyz pattern
    const sentMatch = hash.match(/sent\/([^/]+)/);
    if (sentMatch) {
      return sentMatch[1];
    }

    // Extract from #drafts?compose=abc123xyz pattern
    const composeMatch = hash.match(/compose=([^&]+)/);
    if (composeMatch) {
      return composeMatch[1];
    }

    // Extract from other hash patterns like #inbox/abc123xyz
    const hashMatch = hash.match(/#[^/]+\/([^/]+)/);
    if (hashMatch) {
      return hashMatch[1];
    }

    return null;
  } catch (error) {
    logger.error("Error parsing URL:", error);
    // If URL parsing fails, assume the whole string is the message ID
    return urlOrId;
  }
}

// Cloud function to get email details
export const getEmailDetails = onCall(
  {
    region: "asia-southeast1",
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: "512MiB",
    cors: true,
  },
  async (request) => {
    try {
      const { messageIdOrUrl } = request.data;

      if (!messageIdOrUrl) {
        throw new HttpsError("invalid-argument", "messageIdOrUrl is required");
      }

      logger.info(`Getting email details for: ${messageIdOrUrl}`);

      // Extract message ID from URL or use directly
      const messageId = extractMessageIdFromUrl(messageIdOrUrl);

      if (!messageId) {
        throw new HttpsError(
          "invalid-argument",
          "Could not extract message ID from the provided input"
        );
      }

      logger.info(`Extracted message ID: ${messageId}`);

      // Fetch the email details using Gmail API
      const emailDetails = await gmailService.fetchFullEmailContent(messageId);

      return {
        success: true,
        messageId: emailDetails.id,
        threadId: emailDetails.threadId,
        subject: emailDetails.subject,
        from: emailDetails.from,
        to: emailDetails.to,
        date: emailDetails.date,
        snippet: emailDetails.snippet,
        htmlContent: emailDetails.htmlContent,
        textContent: emailDetails.textContent,
        cc: emailDetails.cc,
        bcc: emailDetails.bcc,
        isRead: emailDetails.isRead,
        isStarred: emailDetails.isStarred,
        isImportant: emailDetails.isImportant,
        hasAttachments: emailDetails.hasAttachments,
        labels: emailDetails.labels || [],
      };
    } catch (error) {
      logger.error("Error getting email details:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to get email details: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
);
