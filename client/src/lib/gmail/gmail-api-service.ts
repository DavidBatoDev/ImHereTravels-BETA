import { google } from "googleapis";
import { avatarService } from "../avatar-service";

// Gmail API service class for Next.js
export class GmailApiService {
  private gmail: any;
  private oauth2Client: any;
  private people: any;

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

    // Initialize People API client for avatars
    this.people = google.people({ version: "v1", auth: this.oauth2Client });
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

          // Ensure we use the full Gmail message ID (not the short version)
          parsedEmail.id = messageResponse.data.id || parsedEmail.id;

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
      mailType: getHeader("X-MailType") as
        | "reply"
        | "replyAll"
        | "forward"
        | "new"
        | undefined,
      bcc: getHeader("Bcc"),
      cc: getHeader("Cc"),
      isStarred: message.labelIds?.includes("STARRED"),
      hasAttachments:
        message.payload?.parts?.some((part: any) => part.filename) || false,
      attachments: this.extractAttachments(message.payload),
      isImportant: message.labelIds?.includes("IMPORTANT"),
      isDraft: message.labelIds?.includes("DRAFT"),
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

      // Fetch and replace inline attachments with base64 data URLs
      let processedHtmlContent = htmlContent;

      if (htmlContent) {
        // Find all inline attachments (parts with Content-ID but no filename or with attachmentId)
        const inlineAttachments: any[] = [];

        const findInlineAttachments = (parts: any[]) => {
          parts.forEach((part: any) => {
            const allHeaders = part.headers || [];
            console.log(
              "Part headers:",
              allHeaders.map((h: any) => `${h.name}=${h.value}`)
            );
            console.log("Part details:", {
              mimeType: part.mimeType,
              attachmentId: part.body?.attachmentId,
              hasParts: !!part.parts,
            });

            const contentId = allHeaders.find(
              (h: any) => h.name.toLowerCase() === "content-id"
            )?.value;

            // Check if this is an image attachment (with or without Content-ID)
            if (
              part.body?.attachmentId &&
              part.mimeType?.startsWith("image/")
            ) {
              console.log("Found image attachment:", {
                mimeType: part.mimeType,
                attachmentId: part.body.attachmentId,
                contentId: contentId || "NO CONTENT-ID",
              });

              if (contentId) {
                inlineAttachments.push({
                  attachmentId: part.body.attachmentId,
                  mimeType: part.mimeType,
                  contentId: contentId,
                });
              } else {
                // Still add it in case we can map it
                inlineAttachments.push({
                  attachmentId: part.body.attachmentId,
                  mimeType: part.mimeType,
                  contentId: null,
                });
              }
            }

            // Recursively check nested parts
            if (part.parts && part.parts.length > 0) {
              findInlineAttachments(part.parts);
            }
          });
        };

        if (message.payload?.parts) {
          findInlineAttachments(message.payload.parts);
        }

        console.log(
          `Found ${inlineAttachments.length} inline attachments to process`
        );

        // Process each inline attachment
        for (const attachment of inlineAttachments) {
          try {
            if (!attachment.contentId) {
              console.log(
                `Skipping attachment without contentId: ${attachment.attachmentId}`
              );
              continue;
            }

            console.log(
              `Processing inline attachment: ${attachment.contentId} -> ${attachment.attachmentId}`
            );

            // Download attachment data - this should already have the base64 data
            const attachmentData = await this.downloadAttachment(
              messageId,
              attachment.attachmentId
            );

            console.log("Attachment data received:", {
              hasData: !!attachmentData.data,
              dataLength: attachmentData.data?.length,
              size: attachmentData.size,
            });

            // Convert to data URL
            const cleanContentId = attachment.contentId.replace(/[<>]/g, "");
            const base64Data = attachmentData.data
              .replace(/-/g, "+")
              .replace(/_/g, "/");
            const dataUrl = `data:${attachment.mimeType};base64,${base64Data}`;

            console.log(
              `Replacing cid:${cleanContentId} with data URL (length: ${dataUrl.length})`
            );

            // Replace cid: references in HTML with data URL
            const regexPattern = new RegExp(
              `cid:${cleanContentId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
              "gi"
            );
            const newContent = processedHtmlContent.replace(
              regexPattern,
              dataUrl
            );

            if (newContent !== processedHtmlContent) {
              console.log(
                `SUCCESS: Replaced cid:${cleanContentId} with data URL`
              );
              processedHtmlContent = newContent;
            } else {
              console.log(
                `WARNING: No cid:${cleanContentId} found in HTML to replace`
              );
              console.log(`Sample HTML: ${htmlContent.substring(0, 500)}`);

              // Try with angle brackets
              const withAngleBrackets = `<${cleanContentId}>`;
              const regexPattern2 = new RegExp(
                `cid:${withAngleBrackets.replace(
                  /[.*+?^${}()|[\]\\]/g,
                  "\\$&"
                )}`,
                "gi"
              );
              const newContent2 = processedHtmlContent.replace(
                regexPattern2,
                dataUrl
              );
              if (newContent2 !== processedHtmlContent) {
                console.log(
                  `SUCCESS: Replaced cid:<${cleanContentId}> with data URL`
                );
                processedHtmlContent = newContent2;
              }
            }
          } catch (error) {
            console.error(
              `Failed to process inline attachment ${attachment.attachmentId}:`,
              error
            );
            // Continue with other attachments even if one fails
          }
        }

        // After processing all attachments, check if there are still any cid: references left
        const remainingCidReferences =
          processedHtmlContent.match(/cid:[^"'\s>]+/g);
        if (remainingCidReferences && remainingCidReferences.length > 0) {
          console.log(
            "WARNING: Still have cid: references after processing:",
            remainingCidReferences
          );
        }
      }

      return {
        ...parsedEmail,
        htmlContent: processedHtmlContent,
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
    threadId?: string;
    inReplyTo?: string;
    references?: string;
    attachments?: Array<{
      name: string;
      type: string;
      size: number;
      data: string; // base64 data
    }>;
  }) {
    try {
      console.log("GmailApiService.sendEmail called with:", {
        to: emailData.to,
        subject: emailData.subject,
        htmlContentLength: emailData.htmlContent?.length || 0,
        htmlContentPreview: emailData.htmlContent?.substring(0, 200) + "...",
      });
      // Use the same approach as the working Firebase Functions version
      const message = this.createEmailMessage({
        to: emailData.to,
        subject: emailData.subject,
        htmlContent: emailData.htmlContent,
        bcc: emailData.bcc || [],
        cc: emailData.cc || [],
        from:
          emailData.from || "Bella | ImHereTravels <bella@imheretravels.com>",
        replyTo: emailData.replyTo,
        inReplyTo: emailData.inReplyTo,
        references: emailData.references,
        attachments: emailData.attachments || [],
      });

      console.log("Final message being sent to Gmail:", {
        messageLength: message.length,
        messagePreview: message.substring(0, 500) + "...",
        hasHtmlContent: message.includes(emailData.htmlContent),
        htmlContentLength: emailData.htmlContent.length,
        threadId: emailData.threadId,
        inReplyTo: emailData.inReplyTo,
      });

      // Send the email with threading support
      const response = await this.gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: message,
          threadId: emailData.threadId, // Add threadId to maintain conversation thread
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

  /**
   * Fetch all emails in a thread
   * @param threadId - Gmail thread ID
   * @returns Array of emails in the thread, sorted chronologically
   */
  async fetchThreadEmails(threadId: string) {
    try {
      console.log("Fetching thread emails for:", threadId);

      // Get thread details
      const threadResponse = await this.gmail.users.threads.get({
        userId: "me",
        id: threadId,
        format: "full", // Get full details for all messages
      });

      const thread = threadResponse.data;
      const messages = thread.messages || [];

      if (messages.length === 0) {
        return [];
      }

      // Parse each message in the thread
      const threadEmails = messages.map((message: any) => {
        const parsedEmail = this.parseEmailMessage(message);

        // Extract full content for each message
        const { htmlContent, textContent } = this.extractEmailBody(
          message.payload
        );

        return {
          ...parsedEmail,
          htmlContent,
          textContent,
          threadMessageCount: messages.length,
        };
      });

      // Sort by date (oldest first for conversation flow)
      threadEmails.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      console.log(
        `Fetched ${threadEmails.length} emails from thread ${threadId}`
      );

      return threadEmails;
    } catch (error) {
      console.error("Error fetching thread emails:", error);
      throw new Error(`Failed to fetch thread emails: ${error}`);
    }
  }

  /**
   * Extract attachment information from message payload
   * @param payload - Gmail message payload
   * @returns Array of attachment metadata
   */
  private extractAttachments(payload: any): any[] {
    const attachments: any[] = [];

    const extractFromParts = (parts: any[]) => {
      parts.forEach((part: any) => {
        // Check if this part has a filename (attachment)
        if (part.filename && part.filename.trim() !== "") {
          const attachment = {
            attachmentId: part.body?.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body?.size || 0,
            contentId: part.headers?.find(
              (h: any) => h.name.toLowerCase() === "content-id"
            )?.value,
          };

          // Only add if it has an attachmentId (actual attachment, not inline content)
          if (attachment.attachmentId) {
            attachments.push(attachment);
          }
        }

        // Recursively check nested parts
        if (part.parts && part.parts.length > 0) {
          extractFromParts(part.parts);
        }
      });
    };

    if (payload?.parts) {
      extractFromParts(payload.parts);
    }

    return attachments;
  }

  /**
   * Download attachment data from Gmail
   * @param messageId - Gmail message ID
   * @param attachmentId - Gmail attachment ID
   * @returns Attachment data with base64 content
   */
  async downloadAttachment(messageId: string, attachmentId: string) {
    try {
      console.log("Downloading attachment:", { messageId, attachmentId });

      const attachmentResponse =
        await this.gmail.users.messages.attachments.get({
          userId: "me",
          messageId: messageId,
          id: attachmentId,
        });

      const attachmentData = attachmentResponse.data;

      return {
        data: attachmentData.data, // Base64 encoded content
        size: attachmentData.size,
      };
    } catch (error) {
      console.error("Error downloading attachment:", error);
      throw new Error(`Failed to download attachment: ${error}`);
    }
  }

  /**
   * Get attachment metadata from Gmail
   * @param messageId - Gmail message ID
   * @param attachmentId - Gmail attachment ID
   * @returns Attachment metadata including MIME type
   */
  async getAttachmentInfo(messageId: string, attachmentId: string) {
    try {
      console.log("Getting attachment info:", { messageId, attachmentId });

      // Get the full message to find attachment metadata
      const messageResponse = await this.gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      const message = messageResponse.data;

      // Find the attachment in the message parts
      const findAttachment = (parts: any[]): any => {
        for (const part of parts) {
          if (part.body?.attachmentId === attachmentId) {
            return {
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size,
            };
          }
          if (part.parts) {
            const found = findAttachment(part.parts);
            if (found) return found;
          }
        }
        return null;
      };

      if (message.payload?.parts) {
        const attachmentInfo = findAttachment(message.payload.parts);
        if (attachmentInfo) {
          return attachmentInfo;
        }
      }

      throw new Error("Attachment not found in message");
    } catch (error) {
      console.error("Error getting attachment info:", error);
      throw new Error(`Failed to get attachment info: ${error}`);
    }
  }

  /**
   * Get avatar URL for an email address
   * @param email - Email address
   * @returns Promise<string> - Avatar URL
   */
  async getAvatarUrl(email: string): Promise<string> {
    return await avatarService.getAvatarUrl(email);
  }

  /**
   * Get avatar URLs for multiple email addresses
   * @param emails - Array of email addresses
   * @returns Promise<Map<string, string>> - Map of email to avatar URL
   */
  async getBatchAvatars(emails: string[]): Promise<Map<string, string>> {
    return await avatarService.getBatchAvatars(emails);
  }

  /**
   * Get avatar initials for an email address
   * @param email - Email address
   * @returns string - Initials
   */
  getAvatarInitials(email: string): string {
    return avatarService.getAvatarInitials(email);
  }

  /**
   * Star an email (add the STARRED label)
   * @param messageId - Gmail message ID
   * @returns Promise with success status
   */
  async starEmail(messageId: string) {
    try {
      await this.gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          addLabelIds: ["STARRED"],
        },
      });

      console.log("Email starred successfully:", messageId);
      return { success: true };
    } catch (error) {
      console.error("Error starring email:", error);
      throw new Error(`Failed to star email: ${error}`);
    }
  }

  /**
   * Unstar an email (remove the STARRED label)
   * @param messageId - Gmail message ID
   * @returns Promise with success status
   */
  async unstarEmail(messageId: string) {
    try {
      await this.gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          removeLabelIds: ["STARRED"],
        },
      });

      console.log("Email unstarred successfully:", messageId);
      return { success: true };
    } catch (error) {
      console.error("Error unstarring email:", error);
      throw new Error(`Failed to unstar email: ${error}`);
    }
  }

  /**
   * Toggle star status of an email
   * @param messageId - Gmail message ID
   * @param isStarred - Current starred status
   * @returns Promise with success status and new starred status
   */
  async toggleStarEmail(messageId: string, isStarred: boolean) {
    try {
      if (isStarred) {
        await this.unstarEmail(messageId);
        return { success: true, isStarred: false };
      } else {
        await this.starEmail(messageId);
        return { success: true, isStarred: true };
      }
    } catch (error) {
      console.error("Error toggling star status:", error);
      throw new Error(`Failed to toggle star status: ${error}`);
    }
  }

  /**
   * Mark an email as read (remove the UNREAD label)
   * @param messageId - Gmail message ID
   * @returns Promise with success status
   */
  async markAsRead(messageId: string) {
    try {
      await this.gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          removeLabelIds: ["UNREAD"],
        },
      });

      console.log("Email marked as read successfully:", messageId);
      return { success: true };
    } catch (error) {
      console.error("Error marking email as read:", error);
      throw new Error(`Failed to mark email as read: ${error}`);
    }
  }

  /**
   * Mark an email as unread (add the UNREAD label)
   * @param messageId - Gmail message ID
   * @returns Promise with success status
   */
  async markAsUnread(messageId: string) {
    try {
      await this.gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          addLabelIds: ["UNREAD"],
        },
      });

      console.log("Email marked as unread successfully:", messageId);
      return { success: true };
    } catch (error) {
      console.error("Error marking email as unread:", error);
      throw new Error(`Failed to mark email as unread: ${error}`);
    }
  }

  /**
   * Archive an email (remove it from INBOX)
   * @param messageId - Gmail message ID
   * @returns Promise with success status
   */
  async archiveEmail(messageId: string) {
    try {
      await this.gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          removeLabelIds: ["INBOX"],
        },
      });

      console.log("Email archived successfully:", messageId);
      return { success: true };
    } catch (error) {
      console.error("Error archiving email:", error);
      throw new Error(`Failed to archive email: ${error}`);
    }
  }

  /**
   * Move an email to trash
   * @param messageId - Gmail message ID
   * @returns Promise with success status
   */
  async trashEmail(messageId: string) {
    try {
      await this.gmail.users.messages.trash({
        userId: "me",
        id: messageId,
      });

      console.log("Email moved to trash successfully:", messageId);
      return { success: true };
    } catch (error) {
      console.error("Error moving email to trash:", error);
      throw new Error(`Failed to move email to trash: ${error}`);
    }
  }

  /**
   * Create a raw email message for Gmail API (same as Firebase Functions version)
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
    inReplyTo?: string;
    references?: string;
    attachments?: Array<{
      name: string;
      type: string;
      size: number;
      data: string; // base64 data
    }>;
  }): string {
    const {
      to,
      subject,
      htmlContent,
      bcc = [],
      cc = [],
      from,
      replyTo,
      inReplyTo,
      references,
      attachments = [],
    } = emailData;

    // If there are attachments, create a multipart email
    if (attachments.length > 0) {
      return this.createMultipartEmail({
        to,
        subject,
        htmlContent,
        bcc,
        cc,
        from,
        replyTo,
        attachments,
      });
    }

    // Simple email without attachments
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

    // Add threading headers for replies
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

  /**
   * Create a multipart email message with attachments
   * @param emailData - Email data with attachments
   * @returns Base64 encoded multipart email message
   */
  private createMultipartEmail(emailData: {
    to: string;
    subject: string;
    htmlContent: string;
    bcc: string[];
    cc: string[];
    from: string;
    replyTo?: string;
    inReplyTo?: string;
    references?: string;
    attachments: Array<{
      name: string;
      type: string;
      size: number;
      data: string; // base64 data
    }>;
  }): string {
    const {
      to,
      subject,
      htmlContent,
      bcc,
      cc,
      from,
      replyTo,
      inReplyTo,
      references,
      attachments,
    } = emailData;

    const boundary = "----=_Part_" + Math.random().toString(36).substr(2, 9);

    const lines = [
      `To: ${to}`,
      `From: ${from}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
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

    // Add threading headers for replies
    if (inReplyTo) {
      lines.push(`In-Reply-To: ${inReplyTo}`);
    }

    if (references) {
      lines.push(`References: ${references}`);
    }

    lines.push("");

    // Add HTML content part
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/html; charset=utf-8");
    lines.push("Content-Transfer-Encoding: 7bit");
    lines.push("");
    lines.push(htmlContent);

    // Add attachment parts
    for (const attachment of attachments) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${attachment.type}`);
      lines.push(
        `Content-Disposition: attachment; filename="${attachment.name}"`
      );
      lines.push("Content-Transfer-Encoding: base64");
      lines.push("");

      // Add the base64 data directly
      lines.push(attachment.data);
    }

    lines.push(`--${boundary}--`);

    const message = lines.join("\r\n");
    return Buffer.from(message).toString("base64url");
  }

  /**
   * Fetch emails with avatar data included
   * @param options - Filtering options for emails
   * @returns Array of email messages with avatar URLs
   */
  async fetchEmailsWithAvatars(
    options: {
      maxResults?: number;
      query?: string;
      labelIds?: string[];
      pageToken?: string;
    } = {}
  ) {
    try {
      // First fetch the emails
      const result = await this.fetchEmails(options);

      // Extract unique email addresses from the emails
      const emails = new Set<string>();
      result.emails.forEach((email: any) => {
        if (email.from) emails.add(email.from);
        if (email.to) emails.add(email.to);
      });

      // Get avatars for all unique emails
      const avatarMap = await this.getBatchAvatars(Array.from(emails));

      // Add avatar URLs to emails
      const emailsWithAvatars = result.emails.map((email: any) => ({
        ...email,
        fromAvatarUrl: avatarMap.get(email.from) || null,
        toAvatarUrl: avatarMap.get(email.to) || null,
      }));

      return {
        ...result,
        emails: emailsWithAvatars,
      };
    } catch (error) {
      console.error("Error fetching emails with avatars:", error);
      throw new Error(`Failed to fetch emails with avatars: ${error}`);
    }
  }
}

export default GmailApiService;
