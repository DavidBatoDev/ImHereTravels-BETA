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

export const fetchGmailEmails = onCall(
  {
    region: "asia-southeast1",
    memory: "1GiB", // Increase memory for better performance
    timeoutSeconds: 30, // Reduce timeout for faster failures
  },
  async (request) => {
    try {
      logger.info(
        "Fetch Gmail emails function called with data:",
        request.data
      );

      const {
        maxResults = 25, // Reduce default to load faster
        query = "in:sent OR in:inbox",
        labelIds,
        pageToken,
        searchQuery,
      } = request.data || {};

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      let emails;

      if (searchQuery) {
        // Use search functionality if search query is provided
        emails = await gmailService.searchEmails(searchQuery, maxResults);
      } else {
        // Fetch emails with the provided options (now optimized)
        emails = await gmailService.fetchEmails({
          maxResults,
          query,
          labelIds,
          pageToken,
        });
      }

      logger.info(`Successfully fetched ${emails.emails.length} emails`);

      return {
        success: true,
        emails: emails.emails,
        nextPageToken: emails.nextPageToken,
        resultSizeEstimate: emails.resultSizeEstimate,
      };
    } catch (error) {
      logger.error("Error fetching Gmail emails:", error);

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to fetch emails: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while fetching emails"
      );
    }
  }
);

export const fetchFullEmailContent = onCall(
  {
    region: "asia-southeast1",
    memory: "512MiB",
    timeoutSeconds: 15,
  },
  async (request) => {
    try {
      logger.info(
        "Fetch full email content function called with data:",
        request.data
      );

      const { messageId } = request.data;

      if (!messageId) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required field: messageId"
        );
      }

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      // Fetch full email content
      const email = await gmailService.fetchFullEmailContent(messageId);

      logger.info(`Successfully fetched full content for email ${messageId}`);

      return {
        success: true,
        email,
      };
    } catch (error) {
      logger.error("Error fetching full email content:", error);

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to fetch email content: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while fetching email content"
      );
    }
  }
);

export const sendGmailEmail = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info("Send Gmail email function called with data:", request.data);

      const {
        to,
        subject,
        htmlContent,
        bcc = [],
        from,
        replyTo,
        draftId, // Optional: if updating an existing draft
      } = request.data;

      if (!to || !subject || !htmlContent) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required fields: to, subject, or htmlContent"
        );
      }

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      // Send the email
      const result = await gmailService.sendEmail({
        to,
        subject,
        htmlContent,
        bcc,
        from,
        replyTo,
      });

      logger.info("Email sent successfully:", result.messageId);

      return {
        success: true,
        messageId: result.messageId,
        threadId: result.threadId,
        status: result.status,
        draftId,
      };
    } catch (error) {
      logger.error("Error sending Gmail email:", error);

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to send email: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while sending email"
      );
    }
  }
);

export const getGmailLabels = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info("Get Gmail labels function called");

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      // Get labels
      const labels = await gmailService.getLabels();

      logger.info(`Successfully fetched ${labels.length} labels`);

      return {
        success: true,
        labels,
      };
    } catch (error) {
      logger.error("Error fetching Gmail labels:", error);

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to fetch labels: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while fetching labels"
      );
    }
  }
);

export const createGmailDraft = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info(
        "Create Gmail draft function called with data:",
        request.data
      );

      const {
        to,
        subject,
        htmlContent,
        bcc = [],
        cc = [],
        from,
        replyTo,
      } = request.data;

      if (!to || !subject || !htmlContent) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required fields: to, subject, or htmlContent"
        );
      }

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      // Create the draft
      const result = await gmailService.createDraft({
        to,
        subject,
        htmlContent,
        bcc,
        cc,
        from,
        replyTo,
      });

      logger.info("Draft created successfully:", result.draftId);

      return {
        success: true,
        draftId: result.draftId,
        messageId: result.messageId,
        threadId: result.threadId,
        status: result.status,
      };
    } catch (error) {
      logger.error("Error creating Gmail draft:", error);

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to create draft: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while creating draft"
      );
    }
  }
);

export const updateGmailDraft = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info(
        "Update Gmail draft function called with data:",
        request.data
      );

      const {
        draftId,
        to,
        subject,
        htmlContent,
        bcc = [],
        cc = [],
        from,
        replyTo,
      } = request.data;

      if (!draftId || !to || !subject || !htmlContent) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required fields: draftId, to, subject, or htmlContent"
        );
      }

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      // Update the draft
      const result = await gmailService.updateDraft(draftId, {
        to,
        subject,
        htmlContent,
        bcc,
        cc,
        from,
        replyTo,
      });

      logger.info("Draft updated successfully:", result.draftId);

      return {
        success: true,
        draftId: result.draftId,
        messageId: result.messageId,
        threadId: result.threadId,
        status: result.status,
      };
    } catch (error) {
      logger.error("Error updating Gmail draft:", error);

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to update draft: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while updating draft"
      );
    }
  }
);

export const deleteGmailDraft = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info(
        "Delete Gmail draft function called with data:",
        request.data
      );

      const { draftId } = request.data;

      if (!draftId) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required field: draftId"
        );
      }

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      // Delete the draft
      const result = await gmailService.deleteDraft(draftId);

      logger.info("Draft deleted successfully:", draftId);

      return {
        success: true,
        draftId: result.draftId,
        status: result.status,
      };
    } catch (error) {
      logger.error("Error deleting Gmail draft:", error);

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to delete draft: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while deleting draft"
      );
    }
  }
);

export const fetchGmailDrafts = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info(
        "Fetch Gmail drafts function called with data:",
        request.data
      );

      const { maxResults = 50 } = request.data || {};

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      // Fetch drafts
      const result = await gmailService.fetchDrafts(maxResults);

      logger.info(`Successfully fetched ${result.drafts.length} drafts`);

      return {
        success: true,
        drafts: result.drafts,
        totalDrafts: result.totalDrafts,
      };
    } catch (error) {
      logger.error("Error fetching Gmail drafts:", error);

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to fetch drafts: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while fetching drafts"
      );
    }
  }
);

export const sendGmailDraft = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info("Send Gmail draft function called with data:", request.data);

      const { draftId } = request.data;

      if (!draftId) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required field: draftId"
        );
      }

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      // Send the draft
      const result = await gmailService.sendDraft(draftId);

      logger.info("Draft sent successfully:", result.messageId);

      return {
        success: true,
        messageId: result.messageId,
        threadId: result.threadId,
        status: result.status,
      };
    } catch (error) {
      logger.error("Error sending Gmail draft:", error);

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to send draft: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while sending draft"
      );
    }
  }
);

export const getGmailThread = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info("Get Gmail thread function called with data:", request.data);

      const { threadId } = request.data;

      if (!threadId) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required field: threadId"
        );
      }

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      // Get the thread
      const thread = await gmailService.getEmailThread(threadId);

      logger.info(
        `Successfully fetched thread with ${thread.messages.length} messages`
      );

      return {
        success: true,
        thread,
      };
    } catch (error) {
      logger.error("Error fetching Gmail thread:", error);

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to fetch thread: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while fetching thread"
      );
    }
  }
);

export const fetchGmailThreads = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info(
        "Fetch Gmail threads function called with data:",
        request.data
      );

      const {
        maxResults = 50,
        query = "in:sent OR in:inbox",
        labelIds,
        pageToken,
      } = request.data || {};

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      // Fetch threads
      const result = await gmailService.fetchThreads({
        maxResults,
        query,
        labelIds,
        pageToken,
      });

      logger.info(`Successfully fetched ${result.threads.length} threads`);

      return {
        success: true,
        threads: result.threads,
        nextPageToken: result.nextPageToken,
        resultSizeEstimate: result.resultSizeEstimate,
      };
    } catch (error) {
      logger.error("Error fetching Gmail threads:", error);

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to fetch threads: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while fetching threads"
      );
    }
  }
);

export const replyToGmailEmail = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info(
        "Reply to Gmail email function called with data:",
        request.data
      );

      const {
        threadId,
        originalMessageId,
        to,
        subject,
        htmlContent,
        bcc = [],
        cc = [],
        from,
        inReplyTo,
        references,
      } = request.data;

      if (!threadId || !originalMessageId || !to || !subject || !htmlContent) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required fields: threadId, originalMessageId, to, subject, or htmlContent"
        );
      }

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      // Send the reply
      const result = await gmailService.replyToEmail({
        threadId,
        originalMessageId,
        to,
        subject,
        htmlContent,
        bcc,
        cc,
        from,
        inReplyTo,
        references,
      });

      logger.info("Reply sent successfully:", result.messageId);

      return {
        success: true,
        messageId: result.messageId,
        threadId: result.threadId,
        status: result.status,
      };
    } catch (error) {
      logger.error("Error replying to Gmail email:", error);

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to send reply: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while sending reply"
      );
    }
  }
);

export const forwardGmailEmail = onCall(
  {
    region: "asia-southeast1",
  },
  async (request) => {
    try {
      logger.info(
        "Forward Gmail email function called with data:",
        request.data
      );

      const {
        originalMessageId,
        to,
        subject,
        htmlContent,
        forwardedContent,
        bcc = [],
        cc = [],
        from,
      } = request.data;

      if (
        !originalMessageId ||
        !to ||
        !subject ||
        !htmlContent ||
        !forwardedContent
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Missing required fields: originalMessageId, to, subject, htmlContent, or forwardedContent"
        );
      }

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      // Forward the email
      const result = await gmailService.forwardEmail({
        originalMessageId,
        to,
        subject,
        htmlContent,
        forwardedContent,
        bcc,
        cc,
        from,
      });

      logger.info("Email forwarded successfully:", result.messageId);

      return {
        success: true,
        messageId: result.messageId,
        threadId: result.threadId,
        status: result.status,
      };
    } catch (error) {
      logger.error("Error forwarding Gmail email:", error);

      if (error instanceof Error) {
        throw new HttpsError(
          "internal",
          `Failed to forward email: ${error.message}`
        );
      }

      throw new HttpsError(
        "internal",
        "Unknown error occurred while forwarding email"
      );
    }
  }
);
