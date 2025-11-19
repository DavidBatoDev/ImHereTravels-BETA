import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import GmailApiService from "./gmail-api-service";
import EmailTemplateService from "./email-template-service";
import { EmailTemplateLoader } from "./email-template-loader";
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

// Helper function to re-render template with fresh booking data
async function rerenderEmailTemplate(
  bookingId: string,
  templateId: string,
  templateVariables: Record<string, any>
): Promise<{ subject: string; htmlContent: string }> {
  try {
    // Fetch fresh booking data
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();

    if (!bookingDoc.exists) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const bookingData = bookingDoc.data()!;

    // Update template variables with fresh data
    const freshVariables: Record<string, any> = {
      ...templateVariables,
      // Update key fields with fresh data
      fullName: bookingData.fullName,
      emailAddress: bookingData.emailAddress,
      tourPackageName: bookingData.tourPackageName,
      bookingId: bookingData.bookingId,
      tourDate: bookingData.tourDate,
      paid: bookingData.paid,
      remainingBalance: bookingData.remainingBalance,
      originalTourCost: bookingData.originalTourCost,
      discountedTourCost: bookingData.discountedTourCost,
      useDiscountedTourCost: bookingData.useDiscountedTourCost,
      paymentMethod: bookingData.paymentCondition || "Other",
      paymentPlan: bookingData.availablePaymentTerms || "",
    };

    // Update payment term data if applicable
    if (templateVariables.paymentTerm) {
      const term = templateVariables.paymentTerm as string;
      const termLower = term.toLowerCase();

      freshVariables[`${termLower}Amount`] = (bookingData as any)[
        `${termLower}Amount`
      ];
      freshVariables[`${termLower}DueDate`] = (bookingData as any)[
        `${termLower}DueDate`
      ];
      freshVariables[`${termLower}DatePaid`] = (bookingData as any)[
        `${termLower}DatePaid`
      ];
    }

    // Update term data array if showTable is true
    if (templateVariables.showTable && templateVariables.termData) {
      const terms = ["P1", "P2", "P3", "P4"];
      freshVariables.termData = terms
        .filter((t) => bookingData.availablePaymentTerms?.includes(t))
        .map((t) => ({
          term: t,
          amount: (bookingData as any)[`${t.toLowerCase()}Amount`] || 0,
          dueDate: (bookingData as any)[`${t.toLowerCase()}DueDate`] || "",
          datePaid: (bookingData as any)[`${t.toLowerCase()}DatePaid`] || "",
        }));
    }

    // Load and render the template
    const templateName =
      templateId === "scheduledReminderEmail"
        ? "scheduledReminderEmail"
        : templateId;

    const rawTemplate = await EmailTemplateLoader.loadTemplate(
      templateName,
      {} as any
    );
    const htmlContent = await EmailTemplateService.processTemplate(
      rawTemplate,
      freshVariables
    );

    // Generate subject with fresh data
    const subject = `Payment Reminder - ${freshVariables.fullName} - ${
      templateVariables.paymentTerm || "Payment"
    } Due`;

    return { subject, htmlContent };
  } catch (error) {
    logger.error("Error re-rendering email template:", error);
    throw error;
  }
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

          let emailSubject = emailData.subject;
          let emailHtmlContent = emailData.htmlContent;

          // Re-render template with fresh data for payment reminders
          if (
            emailData.emailType === "payment-reminder" &&
            emailData.bookingId &&
            emailData.templateId &&
            emailData.templateVariables
          ) {
            try {
              logger.info(
                `Re-rendering template for booking ${emailData.bookingId} with fresh data`
              );
              const freshEmail = await rerenderEmailTemplate(
                emailData.bookingId,
                emailData.templateId,
                emailData.templateVariables
              );
              emailSubject = freshEmail.subject;
              emailHtmlContent = freshEmail.htmlContent;
              logger.info(
                `Template re-rendered successfully for email ${emailId}`
              );
            } catch (rerenderError) {
              logger.warn(
                `Failed to re-render template for email ${emailId}, using original content:`,
                rerenderError
              );
              // Fall back to original content if re-rendering fails
            }
          }

          // Send the email
          const result = await gmailService.sendEmail({
            to: emailData.to,
            subject: emailSubject,
            htmlContent: emailHtmlContent,
            bcc: emailData.bcc,
            cc: emailData.cc,
            from: emailData.from,
            replyTo: emailData.replyTo,
          });

          const sentTimestamp = Timestamp.now();

          // Create sent attempt record
          await db
            .collection("scheduledEmails")
            .doc(emailId)
            .collection("sentAttempts")
            .add({
              attemptNumber: emailData.attempts + 1,
              status: "success",
              sentAt: sentTimestamp,
              messageId: result.messageId,
              to: emailData.to,
              subject: emailSubject,
              bcc: emailData.bcc || [],
              cc: emailData.cc || [],
              emailType: emailData.emailType,
              bookingId: emailData.bookingId,
            });

          // Update document with success status
          await db.collection("scheduledEmails").doc(emailId).update({
            status: "sent",
            sentAt: sentTimestamp,
            messageId: result.messageId,
            updatedAt: sentTimestamp,
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
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          // Create failed attempt record
          await db
            .collection("scheduledEmails")
            .doc(emailId)
            .collection("sentAttempts")
            .add({
              attemptNumber: newAttempts,
              status: "failed",
              attemptedAt: Timestamp.now(),
              errorMessage: errorMessage,
              to: emailData.to,
              subject: emailData.subject,
              emailType: emailData.emailType,
              bookingId: emailData.bookingId,
            });

          const updateData: Partial<ScheduledEmail> = {
            attempts: newAttempts,
            updatedAt: Timestamp.now(),
            errorMessage: errorMessage,
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
