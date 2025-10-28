import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
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

// Interface for scheduled email
interface ScheduledEmail {
  id?: string;
  to: string;
  subject: string;
  htmlContent: string;
  bcc?: string[];
  cc?: string[];
  from?: string;
  replyTo?: string;
  scheduledFor: Timestamp;
  status: "pending" | "sent" | "failed" | "cancelled";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  attempts: number;
  maxAttempts: number;
  errorMessage?: string;
  sentAt?: Timestamp;
  messageId?: string;
  // Optional metadata
  emailType?: string;
  bookingId?: string;
  templateId?: string;
  templateVariables?: Record<string, any>;
}

type SheetColumn = {
  id: string;
  columnName: string;
  dataType: string;
};

// Helper function to get Gmail sent URL
function getGmailSentUrl(messageId: string): string {
  return `https://mail.google.com/mail/u/0/#sent/${messageId}`;
}

/**
 * Cloud Scheduler function that runs once daily at 9 AM to check for emails to send
 */
export const processScheduledEmails = onSchedule(
  {
    schedule: "0 9 * * *", // Run daily at 9 AM
    region: "asia-southeast1",
    timeZone: "Asia/Singapore", // Adjust to your timezone
  },
  async (event) => {
    try {
      logger.info("Processing scheduled emails...");

      const now = Timestamp.now();

      // Query for pending emails that should be sent now
      const query = db
        .collection("scheduledEmails")
        .where("status", "==", "pending")
        .where("scheduledFor", "<=", now)
        .limit(50); // Process max 50 emails per run since we run daily

      const snapshot = await query.get();

      if (snapshot.empty) {
        logger.info("No scheduled emails to process");
        return;
      }

      logger.info(`Found ${snapshot.docs.length} emails to process`);

      // Load booking columns once for all emails
      const columnsSnap = await db.collection("bookingSheetColumns").get();
      const columns: SheetColumn[] = columnsSnap.docs.map((doc) => ({
        id: doc.id,
        columnName: doc.data().columnName,
        dataType: doc.data().dataType,
      }));

      // Process each scheduled email
      const promises = snapshot.docs.map(async (doc) => {
        const emailData = doc.data() as ScheduledEmail;
        const emailId = doc.id;

        try {
          // Initialize Gmail API service
          const gmailService = new GmailApiService();

          // Send the email
          const result = await gmailService.sendEmail({
            to: emailData.to,
            subject: emailData.subject,
            htmlContent: emailData.htmlContent,
            bcc: emailData.bcc,
            cc: emailData.cc,
            from: emailData.from,
            replyTo: emailData.replyTo,
          });

          // Update document with success status
          await db.collection("scheduledEmails").doc(emailId).update({
            status: "sent",
            sentAt: Timestamp.now(),
            messageId: result.messageId,
            updatedAt: Timestamp.now(),
          });

          logger.info(
            `Successfully sent scheduled email ${emailId} to ${emailData.to}`
          );

          // If this is a payment reminder, update the booking with the sent email link
          if (
            emailData.emailType === "payment-reminder" &&
            emailData.bookingId &&
            emailData.templateVariables?.paymentTerm &&
            result.messageId
          ) {
            try {
              const term = emailData.templateVariables.paymentTerm as string;
              const emailLink = getGmailSentUrl(result.messageId);
              const scheduledEmailLinkCol = columns.find(
                (col) => col.columnName === `${term} Scheduled Email Link`
              );

              if (scheduledEmailLinkCol) {
                await db
                  .collection("bookings")
                  .doc(emailData.bookingId)
                  .update({
                    [scheduledEmailLinkCol.id]: emailLink,
                  });

                logger.info(
                  `Updated ${term} Scheduled Email Link for booking ${emailData.bookingId}`
                );
              }
            } catch (bookingUpdateError) {
              logger.error(
                `Error updating booking with email link:`,
                bookingUpdateError
              );
              // Don't fail the whole process if booking update fails
            }
          }
        } catch (error) {
          logger.error(`Error sending scheduled email ${emailId}:`, error);

          const newAttempts = emailData.attempts + 1;
          const updateData: Partial<ScheduledEmail> = {
            attempts: newAttempts,
            updatedAt: Timestamp.now(),
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
          };

          // Mark as failed if max attempts reached
          if (newAttempts >= emailData.maxAttempts) {
            updateData.status = "failed";
            logger.error(
              `Max attempts reached for email ${emailId}, marking as failed`
            );
          }

          await db
            .collection("scheduledEmails")
            .doc(emailId)
            .update(updateData);
        }
      });

      await Promise.all(promises);
      logger.info("Finished processing scheduled emails");
    } catch (error) {
      logger.error("Error in processScheduledEmails:", error);
    }
  }
);
