import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import GmailApiService from "./gmail-api-service";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

export const sendReservationEmail = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info("Send email function called with data:", request.data);

      const { draftId } = request.data;

      if (!draftId) {
        throw new HttpsError("invalid-argument", "draftId is required");
      }

      // Fetch the email draft from Firestore
      const draftDoc = await db.collection("emailDrafts").doc(draftId).get();

      if (!draftDoc.exists) {
        throw new HttpsError("not-found", "Email draft not found");
      }

      const draftData = draftDoc.data();
      if (!draftData) {
        throw new HttpsError("internal", "Failed to fetch draft data");
      }

      logger.info("Draft data:", draftData);

      // Check if email is already sent
      if (draftData.status === "sent") {
        throw new HttpsError("already-exists", "Email has already been sent");
      }

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      // Prepare email data
      const emailData = {
        from:
          draftData.from || "Bella | ImHereTravels <bella@imheretravels.com>",
        to: draftData.to,
        subject: draftData.subject,
        htmlContent: draftData.htmlContent,
        bcc: draftData.bcc || [],
      };

      logger.info("Sending email with Gmail API:", {
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        bcc: emailData.bcc,
        htmlLength: emailData.htmlContent.length,
      });

      // Send the email using Gmail API
      const result = await gmailService.sendEmail(emailData);

      logger.info("Email sent successfully:", result.messageId);

      // Update the draft status to "sent"
      await db.collection("emailDrafts").doc(draftId).update({
        status: "sent",
        updatedAt: new Date(),
        sentAt: new Date(),
        messageId: result.messageId,
      });

      return {
        success: true,
        messageId: result.messageId,
        status: "sent",
        draftId: draftId,
      };
    } catch (error) {
      logger.error("Error sending email:", error);

      // If we have a draftId, update it to failed status
      if (request.data.draftId) {
        try {
          await db
            .collection("emailDrafts")
            .doc(request.data.draftId)
            .update({
              status: "failed",
              updatedAt: new Date(),
              errorMessage:
                error instanceof Error ? error.message : String(error),
            });
        } catch (updateError) {
          logger.error("Error updating draft status to failed:", updateError);
        }
      }

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to send email: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
);
