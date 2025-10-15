import { google } from "googleapis";

// Gmail API service class for Next.js
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
   * Fetch emails from Gmail account (optimized for performance)
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

      console.log("Fetching emails with options:", options);

      // List messages
      const listResponse = await this.gmail.users.messages.list({
        userId: "me",
        maxResults,
        q: query,
        labelIds,
        pageToken,
      });

      const messageIds = listResponse.data.messages || [];

      if (messageIds.length === 0) {
        return {
          emails: [],
          nextPageToken: listResponse.data.nextPageToken,
          resultSizeEstimate: listResponse.data.resultSizeEstimate || 0,
        };
      }

      // Batch fetch with metadata format for faster loading
      const emails = await this.batchFetchEmails(messageIds);

      return {
        emails,
        nextPageToken: listResponse.data.nextPageToken,
        resultSizeEstimate: listResponse.data.resultSizeEstimate,
      };
    } catch (error) {
      console.error("Error fetching emails:", error);
      throw new Error(`Failed to fetch emails: ${error}`);
    }
  }

  /**
   * Batch fetch emails with concurrent requests for better performance
   * @param messageIds - Array of message IDs to fetch
   * @returns Array of parsed email messages
   */
  private async batchFetchEmails(messageIds: any[]) {
    const batchSize = 10; // Process 10 emails concurrently
    const emails: any[] = [];
    const threadCounts = new Map<string, number>(); // Cache thread counts

    // Process messages in batches for better performance
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);

      // Fetch messages concurrently within each batch
      const batchPromises = batch.map(async (message) => {
        try {
          // Use 'metadata' format for faster fetching (headers only, no body)
          const messageResponse = await this.gmail.users.messages.get({
            userId: "me",
            id: message.id,
            format: "metadata",
            metadataHeaders: [
              "From",
              "To",
              "Subject",
              "Date",
              "Message-ID",
              "In-Reply-To",
              "References",
              "Cc",
              "Bcc",
            ],
          });

          const parsedEmail = this.parseEmailMessage(messageResponse.data);

          // Get thread message count if not already cached
          if (parsedEmail.threadId && !threadCounts.has(parsedEmail.threadId)) {
            try {
              const threadResponse = await this.gmail.users.threads.get({
                userId: "me",
                id: parsedEmail.threadId,
                format: "minimal", // Just get basic thread info
              });

              const messageCount = threadResponse.data.messages?.length || 1;
              threadCounts.set(parsedEmail.threadId, messageCount);
            } catch (threadError) {
              console.warn(
                `Could not fetch thread info for ${parsedEmail.threadId}:`,
                threadError
              );
              threadCounts.set(parsedEmail.threadId, 1);
            }
          }

          // Add thread message count to the email
          parsedEmail.threadMessageCount =
            threadCounts.get(parsedEmail.threadId) || 1;

          return parsedEmail;
        } catch (error) {
          console.error(`Error fetching message ${message.id}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      emails.push(...batchResults.filter((email) => email !== null));
    }

    return emails;
  }

  /**
   * Parse Gmail message into standardized format
   * @param message - Raw Gmail message
   * @returns Parsed email object
   */
  private parseEmailMessage(message: any) {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
        ?.value || "";

    // Parse date
    let date: Date;
    try {
      const dateString = getHeader("Date");
      date = dateString ? new Date(dateString) : new Date();
    } catch (error) {
      console.warn("Invalid date format:", getHeader("Date"));
      date = new Date();
    }

    // Determine if email is sent or received
    const from = getHeader("From");
    const to = getHeader("To");
    const userEmail = process.env.GMAIL_USER || ""; // You might want to get this from the OAuth token
    const isSent =
      from.includes(userEmail) || message.labelIds?.includes("SENT");

    return {
      id: message.id,
      threadId: message.threadId,
      from,
      to,
      subject: getHeader("Subject"),
      date,
      htmlContent: "", // Will be loaded on demand
      textContent: "", // Will be loaded on demand
      labels: message.labelIds || [],
      snippet: message.snippet || "",
      isRead: !message.labelIds?.includes("UNREAD"),
      isSent,
      isReceived: !isSent,
      messageId: getHeader("Message-ID"),
      inReplyTo: getHeader("In-Reply-To"),
      references: getHeader("References"),
      bcc: getHeader("Bcc"),
      cc: getHeader("Cc"),
      isStarred: message.labelIds?.includes("STARRED"),
      hasAttachments:
        message.payload?.parts?.some((part: any) => part.filename) || false,
      isImportant: message.labelIds?.includes("IMPORTANT"),
      threadMessageCount: 1, // Will be updated in batchFetchEmails
    };
  }

  /**
   * Get full email content (body) for a specific message
   * @param messageId - Message ID
   * @returns Email with full content
   */
  async getEmailContent(messageId: string) {
    try {
      const messageResponse = await this.gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      const message = messageResponse.data;
      const parsedEmail = this.parseEmailMessage(message);

      // Extract body content
      const { htmlContent, textContent } = this.extractEmailBody(
        message.payload
      );

      return {
        ...parsedEmail,
        htmlContent,
        textContent,
      };
    } catch (error) {
      console.error("Error fetching email content:", error);
      throw new Error(`Failed to fetch email content: ${error}`);
    }
  }

  /**
   * Extract email body content from Gmail payload
   * @param payload - Gmail message payload
   * @returns HTML and text content
   */
  private extractEmailBody(payload: any) {
    let htmlContent = "";
    let textContent = "";

    const extractContent = (part: any) => {
      if (part.mimeType === "text/html" && part.body?.data) {
        htmlContent = Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.mimeType === "text/plain" && part.body?.data) {
        textContent = Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.parts) {
        part.parts.forEach(extractContent);
      }
    };

    if (payload.parts) {
      payload.parts.forEach(extractContent);
    } else if (payload.body?.data) {
      if (payload.mimeType === "text/html") {
        htmlContent = Buffer.from(payload.body.data, "base64").toString(
          "utf-8"
        );
      } else if (payload.mimeType === "text/plain") {
        textContent = Buffer.from(payload.body.data, "base64").toString(
          "utf-8"
        );
      }
    }

    return { htmlContent, textContent };
  }

  /**
   * Get Gmail labels
   * @returns Array of Gmail labels
   */
  async getLabels() {
    try {
      const response = await this.gmail.users.labels.list({
        userId: "me",
      });

      return response.data.labels || [];
    } catch (error) {
      console.error("Error fetching labels:", error);
      throw new Error(`Failed to fetch labels: ${error}`);
    }
  }

  /**
   * Search emails with query
   * @param searchQuery - Search query
   * @param maxResults - Maximum results to return
   * @returns Search results
   */
  async searchEmails(searchQuery: string, maxResults: number = 25) {
    try {
      return await this.fetchEmails({
        query: searchQuery,
        maxResults,
      });
    } catch (error) {
      console.error("Error searching emails:", error);
      throw new Error(`Failed to search emails: ${error}`);
    }
  }

  /**
   * Get thread messages
   * @param threadId - Thread ID
   * @returns Thread with all messages
   */
  async getThread(threadId: string) {
    try {
      const response = await this.gmail.users.threads.get({
        userId: "me",
        id: threadId,
        format: "metadata",
        metadataHeaders: [
          "From",
          "To",
          "Subject",
          "Date",
          "Message-ID",
          "In-Reply-To",
          "References",
          "Cc",
          "Bcc",
        ],
      });

      const thread = response.data;
      const messages =
        thread.messages?.map((message: any) =>
          this.parseEmailMessage(message)
        ) || [];

      return {
        id: thread.id,
        historyId: thread.historyId,
        messages,
      };
    } catch (error) {
      console.error("Error fetching thread:", error);
      throw new Error(`Failed to fetch thread: ${error}`);
    }
  }

  /**
   * Send an email
   * @param emailData - Email data to send
   * @returns Send result with message ID
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
      // Create the email message
      const messageParts = [
        `To: ${emailData.to}`,
        emailData.cc && emailData.cc.length > 0
          ? `Cc: ${emailData.cc.join(", ")}`
          : "",
        emailData.bcc && emailData.bcc.length > 0
          ? `Bcc: ${emailData.bcc.join(", ")}`
          : "",
        `From: ${emailData.from || "bella@imheretravels.com"}`,
        emailData.replyTo ? `Reply-To: ${emailData.replyTo}` : "",
        `Subject: ${emailData.subject}`,
        "Content-Type: text/html; charset=utf-8",
        "",
        emailData.htmlContent,
      ].filter(Boolean);

      const message = messageParts.join("\n");
      const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Send the email
      const response = await this.gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });

      console.log("Email sent successfully:", response.data.id);

      return {
        success: true,
        messageId: response.data.id,
      };
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error(`Failed to send email: ${error}`);
    }
  }
}

export default GmailApiService;
