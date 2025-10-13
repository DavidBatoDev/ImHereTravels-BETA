import { google } from "googleapis";
import { logger } from "firebase-functions";

// Gmail API service class
export class GmailApiService {
  private gmail: any;
  private oauth2Client: any;

  constructor() {
    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      "urn:ietf:wg:oauth:2.0:oob" // For server-side apps
    );

    // Set refresh token credentials
    this.oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    // Initialize Gmail API client
    this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
  }

  /**
   * Fetch emails from Gmail account
   * @param options - Filtering options for emails
   * @returns Array of email messages
   */
  async fetchEmails(
    options: {
      maxResults?: number;
      query?: string;
      labelIds?: string[];
      pageToken?: string;
    } = {}
  ) {
    try {
      const {
        maxResults = 50,
        query = "in:sent OR in:inbox",
        labelIds,
        pageToken,
      } = options;

      logger.info("Fetching emails with options:", options);

      // List messages
      const listResponse = await this.gmail.users.messages.list({
        userId: "me",
        maxResults,
        q: query,
        labelIds,
        pageToken,
      });

      const messageIds = listResponse.data.messages || [];
      const emails = [];

      // Fetch full message details for each message
      for (const message of messageIds) {
        try {
          const messageResponse = await this.gmail.users.messages.get({
            userId: "me",
            id: message.id,
            format: "full",
          });

          const email = this.parseEmailMessage(messageResponse.data);
          emails.push(email);
        } catch (error) {
          logger.error(`Error fetching message ${message.id}:`, error);
        }
      }

      return {
        emails,
        nextPageToken: listResponse.data.nextPageToken,
        resultSizeEstimate: listResponse.data.resultSizeEstimate,
      };
    } catch (error) {
      logger.error("Error fetching emails:", error);
      throw new Error(`Failed to fetch emails: ${error}`);
    }
  }

  /**
   * Send an email using Gmail API
   * @param emailData - Email data including to, subject, content, etc.
   * @returns Message ID and status
   */
  async sendEmail(emailData: {
    to: string;
    subject: string;
    htmlContent: string;
    bcc?: string[];
    cc?: string[];
    from?: string;
    replyTo?: string;
  }) {
    try {
      const {
        to,
        subject,
        htmlContent,
        bcc = [],
        cc = [],
        from = "Bella | ImHereTravels <bella@imheretravels.com>",
        replyTo,
      } = emailData;

      // Create email message
      const message = this.createEmailMessage({
        to,
        subject,
        htmlContent,
        bcc,
        cc,
        from,
        replyTo,
      });

      // Send the email
      const response = await this.gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: message,
        },
      });

      logger.info("Email sent successfully:", response.data.id);

      return {
        messageId: response.data.id,
        threadId: response.data.threadId,
        status: "sent",
      };
    } catch (error) {
      logger.error("Error sending email:", error);
      throw new Error(`Failed to send email: ${error}`);
    }
  }

  /**
   * Parse Gmail message data into a standardized format
   * @param message - Raw Gmail message data
   * @returns Parsed email object
   */
  private parseEmailMessage(message: any) {
    const headers = message.payload.headers;
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
        ?.value || "";

    // Get email body
    let htmlContent = "";
    let textContent = "";

    const extractBody = (payload: any) => {
      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === "text/html" && part.body.data) {
            htmlContent = Buffer.from(part.body.data, "base64").toString();
          } else if (part.mimeType === "text/plain" && part.body.data) {
            textContent = Buffer.from(part.body.data, "base64").toString();
          } else if (part.parts) {
            extractBody(part);
          }
        }
      } else if (payload.body.data) {
        if (payload.mimeType === "text/html") {
          htmlContent = Buffer.from(payload.body.data, "base64").toString();
        } else if (payload.mimeType === "text/plain") {
          textContent = Buffer.from(payload.body.data, "base64").toString();
        }
      }
    };

    extractBody(message.payload);

    // Determine if email was sent or received
    const sentLabels = message.labelIds?.includes("SENT") || false;
    const inboxLabels = message.labelIds?.includes("INBOX") || false;

    return {
      id: message.id,
      threadId: message.threadId,
      from: getHeader("From"),
      to: getHeader("To"),
      subject: getHeader("Subject"),
      date: new Date(parseInt(message.internalDate)),
      htmlContent: htmlContent || textContent,
      textContent,
      labels: message.labelIds || [],
      snippet: message.snippet,
      isRead: !message.labelIds?.includes("UNREAD"),
      isSent: sentLabels,
      isReceived: inboxLabels,
      messageId: getHeader("Message-ID"),
      inReplyTo: getHeader("In-Reply-To"),
      references: getHeader("References"),
      bcc: getHeader("Bcc"),
      cc: getHeader("Cc"),
    };
  }

  /**
   * Create a raw email message for Gmail API
   * @param emailData - Email data
   * @returns Base64 encoded email message
   */
  private createEmailMessage(emailData: {
    to: string;
    subject: string;
    htmlContent: string;
    bcc?: string[];
    cc?: string[];
    from?: string;
    replyTo?: string;
  }): string {
    const {
      to,
      subject,
      htmlContent,
      bcc = [],
      cc = [],
      from,
      replyTo,
    } = emailData;

    const lines = [
      `To: ${to}`,
      `From: ${from}`,
      `Subject: ${subject}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
    ];

    if (cc.length > 0) {
      lines.push(`Cc: ${cc.join(", ")}`);
    }

    if (bcc.length > 0) {
      lines.push(`Bcc: ${bcc.join(", ")}`);
    }

    if (replyTo) {
      lines.push(`Reply-To: ${replyTo}`);
    }

    lines.push("");
    lines.push(htmlContent);

    const message = lines.join("\r\n");
    return Buffer.from(message).toString("base64url");
  }

  /**
   * Get user's Gmail labels
   * @returns Array of Gmail labels
   */
  async getLabels() {
    try {
      const response = await this.gmail.users.labels.list({
        userId: "me",
      });

      return response.data.labels || [];
    } catch (error) {
      logger.error("Error fetching labels:", error);
      throw new Error(`Failed to fetch labels: ${error}`);
    }
  }

  /**
   * Search emails with specific query
   * @param searchQuery - Gmail search query
   * @param maxResults - Maximum number of results
   * @returns Search results
   */
  async searchEmails(searchQuery: string, maxResults: number = 20) {
    return this.fetchEmails({
      query: searchQuery,
      maxResults,
    });
  }

  /**
   * Create a draft email in Gmail
   * @param draftData - Draft email data
   * @returns Draft ID and details
   */
  async createDraft(draftData: {
    to: string;
    subject: string;
    htmlContent: string;
    bcc?: string[];
    cc?: string[];
    from?: string;
    replyTo?: string;
  }) {
    try {
      const {
        to,
        subject,
        htmlContent,
        bcc = [],
        cc = [],
        from = "Bella | ImHereTravels <bella@imheretravels.com>",
        replyTo,
      } = draftData;

      // Create email message
      const message = this.createEmailMessage({
        to,
        subject,
        htmlContent,
        bcc,
        cc,
        from,
        replyTo,
      });

      // Create the draft
      const response = await this.gmail.users.drafts.create({
        userId: "me",
        requestBody: {
          message: {
            raw: message,
          },
        },
      });

      logger.info("Draft created successfully:", response.data.id);

      return {
        draftId: response.data.id,
        messageId: response.data.message.id,
        threadId: response.data.message.threadId,
        status: "draft",
      };
    } catch (error) {
      logger.error("Error creating draft:", error);
      throw new Error(`Failed to create draft: ${error}`);
    }
  }

  /**
   * Update an existing draft
   * @param draftId - ID of the draft to update
   * @param draftData - Updated draft data
   * @returns Updated draft details
   */
  async updateDraft(
    draftId: string,
    draftData: {
      to: string;
      subject: string;
      htmlContent: string;
      bcc?: string[];
      cc?: string[];
      from?: string;
      replyTo?: string;
    }
  ) {
    try {
      const {
        to,
        subject,
        htmlContent,
        bcc = [],
        cc = [],
        from = "Bella | ImHereTravels <bella@imheretravels.com>",
        replyTo,
      } = draftData;

      // Create email message
      const message = this.createEmailMessage({
        to,
        subject,
        htmlContent,
        bcc,
        cc,
        from,
        replyTo,
      });

      // Update the draft
      const response = await this.gmail.users.drafts.update({
        userId: "me",
        id: draftId,
        requestBody: {
          message: {
            raw: message,
          },
        },
      });

      logger.info("Draft updated successfully:", response.data.id);

      return {
        draftId: response.data.id,
        messageId: response.data.message.id,
        threadId: response.data.message.threadId,
        status: "draft",
      };
    } catch (error) {
      logger.error("Error updating draft:", error);
      throw new Error(`Failed to update draft: ${error}`);
    }
  }

  /**
   * Delete a draft
   * @param draftId - ID of the draft to delete
   * @returns Success status
   */
  async deleteDraft(draftId: string) {
    try {
      await this.gmail.users.drafts.delete({
        userId: "me",
        id: draftId,
      });

      logger.info("Draft deleted successfully:", draftId);

      return {
        success: true,
        draftId,
        status: "deleted",
      };
    } catch (error) {
      logger.error("Error deleting draft:", error);
      throw new Error(`Failed to delete draft: ${error}`);
    }
  }

  /**
   * Get all drafts from Gmail
   * @param maxResults - Maximum number of drafts to fetch
   * @returns Array of draft objects
   */
  async fetchDrafts(maxResults: number = 50) {
    try {
      // List drafts
      const listResponse = await this.gmail.users.drafts.list({
        userId: "me",
        maxResults,
      });

      const draftIds = listResponse.data.drafts || [];
      const drafts = [];

      // Fetch full draft details for each draft
      for (const draft of draftIds) {
        try {
          const draftResponse = await this.gmail.users.drafts.get({
            userId: "me",
            id: draft.id,
            format: "full",
          });

          const parsedDraft = this.parseDraftMessage(draftResponse.data);
          drafts.push(parsedDraft);
        } catch (error) {
          logger.error(`Error fetching draft ${draft.id}:`, error);
        }
      }

      return {
        drafts,
        totalDrafts: listResponse.data.resultSizeEstimate || 0,
      };
    } catch (error) {
      logger.error("Error fetching drafts:", error);
      throw new Error(`Failed to fetch drafts: ${error}`);
    }
  }

  /**
   * Send a draft as an email
   * @param draftId - ID of the draft to send
   * @returns Sent message details
   */
  async sendDraft(draftId: string) {
    try {
      const response = await this.gmail.users.drafts.send({
        userId: "me",
        requestBody: {
          id: draftId,
        },
      });

      logger.info("Draft sent successfully:", response.data.id);

      return {
        messageId: response.data.id,
        threadId: response.data.threadId,
        status: "sent",
      };
    } catch (error) {
      logger.error("Error sending draft:", error);
      throw new Error(`Failed to send draft: ${error}`);
    }
  }

  /**
   * Parse Gmail draft data into a standardized format
   * @param draft - Raw Gmail draft data
   * @returns Parsed draft object
   */
  private parseDraftMessage(draft: any) {
    const message = draft.message;
    const headers = message.payload.headers;
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
        ?.value || "";

    // Get email body (similar to parseEmailMessage)
    let htmlContent = "";
    let textContent = "";

    const extractBody = (payload: any) => {
      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === "text/html" && part.body.data) {
            htmlContent = Buffer.from(part.body.data, "base64").toString();
          } else if (part.mimeType === "text/plain" && part.body.data) {
            textContent = Buffer.from(part.body.data, "base64").toString();
          } else if (part.parts) {
            extractBody(part);
          }
        }
      } else if (payload.body.data) {
        if (payload.mimeType === "text/html") {
          htmlContent = Buffer.from(payload.body.data, "base64").toString();
        } else if (payload.mimeType === "text/plain") {
          textContent = Buffer.from(payload.body.data, "base64").toString();
        }
      }
    };

    extractBody(message.payload);

    return {
      id: draft.id,
      messageId: message.id,
      threadId: message.threadId,
      from: getHeader("From"),
      to: getHeader("To"),
      subject: getHeader("Subject"),
      htmlContent: htmlContent || textContent,
      textContent,
      snippet: message.snippet,
      bcc: getHeader("Bcc"),
      cc: getHeader("Cc"),
      createdAt: new Date(parseInt(message.internalDate) || Date.now()),
      status: "draft",
    };
  }

  /**
   * Get a specific email thread with all messages
   * @param threadId - The thread ID to fetch
   * @returns Thread with all messages
   */
  async getEmailThread(threadId: string) {
    try {
      logger.info("Fetching email thread:", threadId);

      const response = await this.gmail.users.threads.get({
        userId: "me",
        id: threadId,
        format: "full",
      });

      const thread = response.data;
      const messages = [];

      // Parse each message in the thread
      for (const message of thread.messages || []) {
        const parsedMessage = this.parseEmailMessage(message);
        messages.push(parsedMessage);
      }

      return {
        id: thread.id,
        historyId: thread.historyId,
        messages: messages.sort((a, b) => a.date.getTime() - b.date.getTime()), // Sort by date
        snippet: thread.snippet,
        messageCount: messages.length,
      };
    } catch (error) {
      logger.error("Error fetching email thread:", error);
      throw new Error(`Failed to fetch email thread: ${error}`);
    }
  }

  /**
   * Reply to an email (adds to existing thread)
   * @param replyData - Reply email data including threadId and original message details
   * @returns Sent reply details
   */
  async replyToEmail(replyData: {
    threadId: string;
    originalMessageId: string;
    to: string;
    subject: string;
    htmlContent: string;
    bcc?: string[];
    cc?: string[];
    from?: string;
    inReplyTo?: string;
    references?: string;
  }) {
    try {
      const {
        threadId,
        originalMessageId,
        to,
        subject,
        htmlContent,
        bcc = [],
        cc = [],
        from = "Bella | ImHereTravels <bella@imheretravels.com>",
        inReplyTo,
        references,
      } = replyData;

      // Create reply message with thread headers
      const message = this.createReplyMessage({
        to,
        subject: subject.startsWith("Re: ") ? subject : `Re: ${subject}`,
        htmlContent,
        bcc,
        cc,
        from,
        inReplyTo: inReplyTo || originalMessageId,
        references: references || originalMessageId,
      });

      // Send the reply
      const response = await this.gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: message,
          threadId: threadId,
        },
      });

      logger.info("Reply sent successfully:", response.data.id);

      return {
        messageId: response.data.id,
        threadId: response.data.threadId,
        status: "sent",
      };
    } catch (error) {
      logger.error("Error sending reply:", error);
      throw new Error(`Failed to send reply: ${error}`);
    }
  }

  /**
   * Get all threads (conversations) from Gmail
   * @param options - Filtering options for threads
   * @returns Array of thread objects
   */
  async fetchThreads(
    options: {
      maxResults?: number;
      query?: string;
      labelIds?: string[];
      pageToken?: string;
    } = {}
  ) {
    try {
      const {
        maxResults = 50,
        query = "in:sent OR in:inbox",
        labelIds,
        pageToken,
      } = options;

      logger.info("Fetching email threads with options:", options);

      // List threads
      const listResponse = await this.gmail.users.threads.list({
        userId: "me",
        maxResults,
        q: query,
        labelIds,
        pageToken,
      });

      const threadIds = listResponse.data.threads || [];
      const threads = [];

      // Fetch basic info for each thread (without full message content for performance)
      for (const threadInfo of threadIds) {
        try {
          const threadResponse = await this.gmail.users.threads.get({
            userId: "me",
            id: threadInfo.id,
            format: "metadata",
            metadataHeaders: ["From", "To", "Subject", "Date"],
          });

          const thread = this.parseThreadMetadata(threadResponse.data);
          threads.push(thread);
        } catch (error) {
          logger.error(`Error fetching thread ${threadInfo.id}:`, error);
        }
      }

      return {
        threads,
        nextPageToken: listResponse.data.nextPageToken,
        resultSizeEstimate: listResponse.data.resultSizeEstimate,
      };
    } catch (error) {
      logger.error("Error fetching threads:", error);
      throw new Error(`Failed to fetch threads: ${error}`);
    }
  }

  /**
   * Forward an email to new recipients
   * @param forwardData - Forward email data
   * @returns Forwarded message details
   */
  async forwardEmail(forwardData: {
    originalMessageId: string;
    to: string;
    subject: string;
    htmlContent: string;
    forwardedContent: string;
    bcc?: string[];
    cc?: string[];
    from?: string;
  }) {
    try {
      const {
        to,
        subject,
        htmlContent,
        forwardedContent,
        bcc = [],
        cc = [],
        from = "Bella | ImHereTravels <bella@imheretravels.com>",
      } = forwardData;

      const fullContent = `
        ${htmlContent}
        <br><br>
        ---------- Forwarded message ----------<br>
        ${forwardedContent}
      `;

      // Create forward message
      const message = this.createEmailMessage({
        to,
        subject: subject.startsWith("Fwd: ") ? subject : `Fwd: ${subject}`,
        htmlContent: fullContent,
        bcc,
        cc,
        from,
      });

      // Send the forwarded email
      const response = await this.gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: message,
        },
      });

      logger.info("Email forwarded successfully:", response.data.id);

      return {
        messageId: response.data.id,
        threadId: response.data.threadId,
        status: "sent",
      };
    } catch (error) {
      logger.error("Error forwarding email:", error);
      throw new Error(`Failed to forward email: ${error}`);
    }
  }

  /**
   * Parse thread metadata for thread list view
   * @param thread - Raw Gmail thread data with metadata
   * @returns Parsed thread object
   */
  private parseThreadMetadata(thread: any) {
    const messages = thread.messages || [];
    const latestMessage = messages[messages.length - 1];
    const firstMessage = messages[0];

    const getHeader = (message: any, name: string) => {
      const headers = message.payload.headers;
      return (
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
          ?.value || ""
      );
    };

    // Determine participants
    const participants = new Set<string>();
    messages.forEach((msg: any) => {
      const from = getHeader(msg, "From");
      const to = getHeader(msg, "To");
      if (from) participants.add(from);
      if (to) participants.add(to);
    });

    return {
      id: thread.id,
      historyId: thread.historyId,
      snippet: thread.snippet,
      messageCount: messages.length,
      subject: getHeader(firstMessage, "Subject"),
      participants: Array.from(participants),
      latestFrom: getHeader(latestMessage, "From"),
      latestDate: new Date(parseInt(latestMessage.internalDate)),
      firstDate: new Date(parseInt(firstMessage.internalDate)),
      labels: latestMessage.labelIds || [],
      isUnread: latestMessage.labelIds?.includes("UNREAD") || false,
      hasAttachments: this.checkForAttachments(latestMessage),
    };
  }

  /**
   * Check if a message has attachments
   * @param message - Gmail message object
   * @returns Boolean indicating if message has attachments
   */
  private checkForAttachments(message: any): boolean {
    const checkParts = (parts: any[]): boolean => {
      if (!parts) return false;

      for (const part of parts) {
        if (part.filename && part.filename.length > 0) {
          return true;
        }
        if (part.parts && checkParts(part.parts)) {
          return true;
        }
      }
      return false;
    };

    return checkParts(message.payload.parts || []);
  }

  /**
   * Create a reply message with proper threading headers
   * @param replyData - Reply email data
   * @returns Base64 encoded reply message
   */
  private createReplyMessage(replyData: {
    to: string;
    subject: string;
    htmlContent: string;
    bcc?: string[];
    cc?: string[];
    from?: string;
    inReplyTo?: string;
    references?: string;
  }): string {
    const {
      to,
      subject,
      htmlContent,
      bcc = [],
      cc = [],
      from,
      inReplyTo,
      references,
    } = replyData;

    const lines = [
      `To: ${to}`,
      `From: ${from}`,
      `Subject: ${subject}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
    ];

    if (cc.length > 0) {
      lines.push(`Cc: ${cc.join(", ")}`);
    }

    if (bcc.length > 0) {
      lines.push(`Bcc: ${bcc.join(", ")}`);
    }

    if (inReplyTo) {
      lines.push(`In-Reply-To: ${inReplyTo}`);
    }

    if (references) {
      lines.push(`References: ${references}`);
    }

    lines.push("");
    lines.push(htmlContent);

    const message = lines.join("\r\n");
    return Buffer.from(message).toString("base64url");
  }
}

export default GmailApiService;
