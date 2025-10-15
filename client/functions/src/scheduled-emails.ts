import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
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

/**
 * Schedule an email to be sent at a specific time
 */
export const scheduleEmail = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info("Schedule email function called with data:", request.data);

      const {
        to,
        subject,
        htmlContent,
        bcc = [],
        cc = [],
        from,
        replyTo,
        scheduledFor, // ISO string or timestamp
        emailType,
        bookingId,
        templateId,
        templateVariables,
        maxAttempts = 3,
      } = request.data;

      // Validate required fields
      if (!to || !subject || !htmlContent || !scheduledFor) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required fields: to, subject, htmlContent, or scheduledFor"
        );
      }

      // Parse scheduled time
      const scheduledTime = new Date(scheduledFor);
      if (isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) {
        throw new HttpsError(
          "invalid-argument",
          "scheduledFor must be a valid future date"
        );
      }

      const now = Timestamp.now();
      const scheduledTimestamp = Timestamp.fromDate(scheduledTime);

      // Create scheduled email document
      const scheduledEmailData: ScheduledEmail = {
        to,
        subject,
        htmlContent,
        bcc,
        cc,
        from: from || "Bella | ImHereTravels <bella@imheretravels.com>",
        replyTo,
        scheduledFor: scheduledTimestamp,
        status: "pending",
        createdAt: now,
        updatedAt: now,
        attempts: 0,
        maxAttempts,
        emailType,
        bookingId,
        templateId,
        templateVariables,
      };

      // Save to Firestore
      const docRef = await db
        .collection("scheduledEmails")
        .add(scheduledEmailData);

      logger.info("Email scheduled successfully:", docRef.id);

      return {
        success: true,
        scheduledEmailId: docRef.id,
        scheduledFor: scheduledTime.toISOString(),
        status: "pending",
      };
    } catch (error) {
      logger.error("Error scheduling email:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to schedule email: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while scheduling email"
      );
    }
  }
);

/**
 * Cancel a scheduled email
 */
export const cancelScheduledEmail = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info(
        "Cancel scheduled email function called with data:",
        request.data
      );

      const { scheduledEmailId } = request.data;

      if (!scheduledEmailId) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required field: scheduledEmailId"
        );
      }

      // Get the scheduled email document
      const emailDoc = await db
        .collection("scheduledEmails")
        .doc(scheduledEmailId)
        .get();

      if (!emailDoc.exists) {
        throw new HttpsError("not-found", "Scheduled email not found");
      }

      const emailData = emailDoc.data() as ScheduledEmail;

      // Check if email is already sent or cancelled
      if (emailData.status === "sent") {
        throw new HttpsError(
          "failed-precondition",
          "Cannot cancel an email that has already been sent"
        );
      }

      if (emailData.status === "cancelled") {
        throw new HttpsError(
          "failed-precondition",
          "Email is already cancelled"
        );
      }

      // Update status to cancelled
      await db.collection("scheduledEmails").doc(scheduledEmailId).update({
        status: "cancelled",
        updatedAt: Timestamp.now(),
      });

      logger.info("Scheduled email cancelled successfully:", scheduledEmailId);

      return {
        success: true,
        scheduledEmailId,
        status: "cancelled",
      };
    } catch (error) {
      logger.error("Error cancelling scheduled email:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to cancel scheduled email: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while cancelling scheduled email"
      );
    }
  }
);

/**
 * Get all scheduled emails with optional filtering
 */
export const getScheduledEmails = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info(
        "Get scheduled emails function called with data:",
        request.data
      );

      const {
        status,
        emailType,
        bookingId,
        limit = 50,
        offset = 0,
      } = request.data || {};

      let query = db
        .collection("scheduledEmails")
        .orderBy("scheduledFor", "desc");

      // Apply filters
      if (status) {
        query = query.where("status", "==", status);
      }

      if (emailType) {
        query = query.where("emailType", "==", emailType);
      }

      if (bookingId) {
        query = query.where("bookingId", "==", bookingId);
      }

      // Apply pagination
      query = query.limit(limit);
      if (offset > 0) {
        query = query.offset(offset);
      }

      const snapshot = await query.get();
      const scheduledEmails = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      logger.info(
        `Successfully fetched ${scheduledEmails.length} scheduled emails`
      );

      return {
        success: true,
        scheduledEmails,
        count: scheduledEmails.length,
      };
    } catch (error) {
      logger.error("Error fetching scheduled emails:", error);

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to fetch scheduled emails: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while fetching scheduled emails"
      );
    }
  }
);

/**
 * Reschedule an existing email
 */
export const rescheduleEmail = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info("Reschedule email function called with data:", request.data);

      const { scheduledEmailId, newScheduledFor } = request.data;

      if (!scheduledEmailId || !newScheduledFor) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required fields: scheduledEmailId or newScheduledFor"
        );
      }

      // Parse new scheduled time
      const newScheduledTime = new Date(newScheduledFor);
      if (isNaN(newScheduledTime.getTime()) || newScheduledTime <= new Date()) {
        throw new HttpsError(
          "invalid-argument",
          "newScheduledFor must be a valid future date"
        );
      }

      // Get the scheduled email document
      const emailDoc = await db
        .collection("scheduledEmails")
        .doc(scheduledEmailId)
        .get();

      if (!emailDoc.exists) {
        throw new HttpsError("not-found", "Scheduled email not found");
      }

      const emailData = emailDoc.data() as ScheduledEmail;

      // Check if email can be rescheduled
      if (emailData.status === "sent") {
        throw new HttpsError(
          "failed-precondition",
          "Cannot reschedule an email that has already been sent"
        );
      }

      // Update scheduled time and reset status if it was failed
      const updateData: Partial<ScheduledEmail> = {
        scheduledFor: Timestamp.fromDate(newScheduledTime),
        updatedAt: Timestamp.now(),
      };

      if (emailData.status === "failed") {
        updateData.status = "pending";
        updateData.attempts = 0;
        updateData.errorMessage = undefined;
      }

      await db
        .collection("scheduledEmails")
        .doc(scheduledEmailId)
        .update(updateData);

      logger.info("Email rescheduled successfully:", scheduledEmailId);

      return {
        success: true,
        scheduledEmailId,
        newScheduledFor: newScheduledTime.toISOString(),
        status: updateData.status || emailData.status,
      };
    } catch (error) {
      logger.error("Error rescheduling email:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to reschedule email: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while rescheduling email"
      );
    }
  }
);

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

/**
 * Manual trigger to process scheduled emails (for testing)
 */
export const triggerScheduledEmailProcessing = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info("Manual trigger for scheduled email processing");

      // This will trigger the same logic as the scheduled function
      // but can be called manually for testing
      await processScheduledEmails.run({
        eventId: "manual-trigger",
        timestamp: new Date().toISOString(),
        eventType: "manual",
      } as any);

      return {
        success: true,
        message: "Scheduled email processing triggered successfully",
      };
    } catch (error) {
      logger.error("Error triggering scheduled email processing:", error);

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to trigger processing: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while triggering processing"
      );
    }
  }
);
