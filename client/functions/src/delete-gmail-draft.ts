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
 * Cloud Function to delete a Gmail draft
 * This is called when a user toggles OFF the "Generate Email Draft" switch
 */
export const deleteGmailDraft = onCall(
  {
    region: "asia-southeast1",
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: "512MiB",
    cors: true,
  },
  async (request) => {
    try {
      const { draftId } = request.data;

      if (!draftId) {
        throw new HttpsError("invalid-argument", "Draft ID is required");
      }

      logger.info(`Attempting to delete Gmail draft with ID: ${draftId}`);

      try {
        // First, try to delete directly with the provided ID
        const result = await gmailService.deleteDraft(draftId);
        logger.info(`Gmail draft deleted successfully: ${draftId}`);

        return {
          ...result,
          success: true,
          message: "Gmail draft deleted successfully",
        };
      } catch (directDeleteError: any) {
        // If direct delete fails with 404, try to find the draft by message ID
        logger.info(
          `Direct delete failed, searching for draft by message ID: ${draftId}`
        );

        const actualDraftId = await gmailService.findDraftIdByMessageId(
          draftId
        );

        if (actualDraftId) {
          // Found the draft, now delete it
          const result = await gmailService.deleteDraft(actualDraftId);
          logger.info(
            `Gmail draft deleted successfully using found draft ID: ${actualDraftId}`
          );

          return {
            ...result,
            success: true,
            message: "Gmail draft deleted successfully",
          };
        } else {
          // Draft not found by message ID either
          logger.info(`Draft ${draftId} not found, likely already deleted`);
          return {
            success: true,
            message: "Draft already deleted or does not exist",
          };
        }
      }
    } catch (error: any) {
      logger.error("Error deleting Gmail draft:", error);

      // Handle specific Gmail API errors
      // Check for 404 errors (draft not found)
      if (
        error.code === 404 ||
        error.response?.status === 404 ||
        error.message?.includes("not found") ||
        error.message?.includes("Requested entity was not found")
      ) {
        // Draft already deleted or doesn't exist - this is OK
        logger.info(
          `Draft ${request.data.draftId} not found, likely already deleted`
        );
        return {
          success: true,
          message: "Draft already deleted or does not exist",
        };
      }

      throw new HttpsError(
        "internal",
        `Failed to delete Gmail draft: ${error.message || error}`
      );
    }
  }
);
