// Types for scheduled emails
export interface ScheduledEmailData {
  to: string;
  subject: string;
  htmlContent: string;
  bcc?: string[];
  cc?: string[];
  from?: string;
  replyTo?: string;
  scheduledFor: string | Date; // ISO string or Date object
  emailType?: string;
  bookingId?: string;
  templateId?: string;
  templateVariables?: Record<string, any>;
  maxAttempts?: number;
}

export interface ScheduledEmail {
  id: string;
  to: string;
  subject: string;
  htmlContent: string;
  bcc?: string[];
  cc?: string[];
  from?: string;
  replyTo?: string;
  scheduledFor: Date;
  status: "pending" | "sent" | "failed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
  attempts: number;
  maxAttempts: number;
  errorMessage?: string;
  sentAt?: Date;
  messageId?: string;
  emailType?: string;
  bookingId?: string;
  templateId?: string;
  templateVariables?: Record<string, any>;
}

// Scheduled Email Service
export class ScheduledEmailService {
  /**
   * Schedule an email to be sent at a specific time
   */
  static async scheduleEmail(emailData: ScheduledEmailData) {
    const scheduledFor =
      typeof emailData.scheduledFor === "string"
        ? emailData.scheduledFor
        : emailData.scheduledFor.toISOString();

    const requestData = {
      to: emailData.to,
      subject: emailData.subject,
      htmlContent: emailData.htmlContent,
      bcc: emailData.bcc,
      cc: emailData.cc,
      from: emailData.from,
      replyTo: emailData.replyTo,
      scheduledFor,
      emailType: emailData.emailType,
      bookingId: emailData.bookingId,
      templateId: emailData.templateId,
      templateVariables: emailData.templateVariables,
      maxAttempts: emailData.maxAttempts,
    };

    // Call Next.js API route instead of Firebase Functions
    const response = await fetch("/api/scheduled-emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to schedule email");
    }

    return result.data;
  }

  /**
   * Cancel a scheduled email
   */
  static async cancelScheduledEmail(scheduledEmailId: string) {
    // Call Next.js API route instead of Firebase Functions
    const response = await fetch(`/api/scheduled-emails/${scheduledEmailId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to cancel scheduled email");
    }

    return result.data;
  }

  /**
   * Get scheduled emails with optional filtering
   */
  static async getScheduledEmails(filters?: {
    status?: "pending" | "sent" | "failed" | "cancelled";
    emailType?: string;
    bookingId?: string;
    limit?: number;
    offset?: number;
  }) {
    // Build query parameters
    const queryParams = new URLSearchParams();

    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.emailType) queryParams.append("emailType", filters.emailType);
    if (filters?.bookingId) queryParams.append("bookingId", filters.bookingId);
    if (filters?.limit) queryParams.append("limit", filters.limit.toString());

    // Call Next.js API route instead of Firebase Functions
    const response = await fetch(`/api/scheduled-emails?${queryParams}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch scheduled emails");
    }

    // Convert Firebase timestamps to Date objects
    const scheduledEmails = result.data.scheduledEmails.map((email: any) => ({
      id: email.id,
      to: email.to,
      subject: email.subject,
      htmlContent: email.htmlContent,
      bcc: email.bcc,
      cc: email.cc,
      from: email.from,
      replyTo: email.replyTo,
      scheduledFor: new Date(email.scheduledFor.seconds * 1000),
      status: email.status,
      createdAt: new Date(email.createdAt.seconds * 1000),
      updatedAt: new Date(email.updatedAt.seconds * 1000),
      attempts: email.attempts,
      maxAttempts: email.maxAttempts,
      errorMessage: email.errorMessage,
      sentAt: email.sentAt ? new Date(email.sentAt.seconds * 1000) : undefined,
      messageId: email.messageId,
      emailType: email.emailType,
      bookingId: email.bookingId,
      templateId: email.templateId,
      templateVariables: email.templateVariables,
    }));

    return {
      success: result.success,
      scheduledEmails,
      count: result.data.count,
    };
  }

  /**
   * Reschedule an existing email
   */
  static async rescheduleEmail(
    scheduledEmailId: string,
    newScheduledFor: string | Date
  ) {
    const newScheduledForISO =
      typeof newScheduledFor === "string"
        ? newScheduledFor
        : newScheduledFor.toISOString();

    // Call Next.js API route instead of Firebase Functions
    const response = await fetch(`/api/scheduled-emails/${scheduledEmailId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        newScheduledFor: newScheduledForISO,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to reschedule email");
    }

    return result.data;
  }

  /**
   * Manually trigger scheduled email processing (for testing)
   */
  static async triggerProcessing() {
    // Call Next.js API route instead of Firebase Functions
    const response = await fetch("/api/scheduled-emails/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to trigger processing");
    }

    return result;
  }

  // Utility methods for common scheduling scenarios

  /**
   * Schedule a booking confirmation email
   */
  static async scheduleBookingConfirmation(
    bookingId: string,
    recipientEmail: string,
    scheduledFor: Date,
    bookingDetails: Record<string, any>
  ) {
    return this.scheduleEmail({
      to: recipientEmail,
      subject: `Booking Confirmation - ${bookingDetails.tourPackage}`,
      htmlContent: this.generateBookingConfirmationEmail(bookingDetails),
      scheduledFor,
      emailType: "booking-confirmation",
      bookingId,
      templateVariables: bookingDetails,
    });
  }

  /**
   * Schedule a reminder email
   */
  static async scheduleReminder(
    recipientEmail: string,
    subject: string,
    content: string,
    scheduledFor: Date,
    bookingId?: string
  ) {
    return this.scheduleEmail({
      to: recipientEmail,
      subject: `Reminder: ${subject}`,
      htmlContent: content,
      scheduledFor,
      emailType: "reminder",
      bookingId,
    });
  }

  /**
   * Schedule a follow-up email
   */
  static async scheduleFollowUp(
    recipientEmail: string,
    subject: string,
    content: string,
    daysFromNow: number,
    bookingId?: string
  ) {
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + daysFromNow);

    return this.scheduleEmail({
      to: recipientEmail,
      subject: `Follow-up: ${subject}`,
      htmlContent: content,
      scheduledFor,
      emailType: "follow-up",
      bookingId,
    });
  }

  /**
   * Generate a booking confirmation email template
   */
  private static generateBookingConfirmationEmail(
    bookingDetails: Record<string, any>
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0; }
              .content { padding: 20px; }
              .booking-details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>Booking Confirmation</h1>
                  <p>Thank you for choosing ImHere Travels!</p>
              </div>
              <div class="content">
                  <p>Dear ${
                    bookingDetails.customerName || "Valued Customer"
                  },</p>
                  <p>Your booking has been confirmed! Here are your details:</p>
                  
                  <div class="booking-details">
                      <h3>Booking Details</h3>
                      <p><strong>Booking ID:</strong> ${
                        bookingDetails.bookingId || "N/A"
                      }</p>
                      <p><strong>Tour Package:</strong> ${
                        bookingDetails.tourPackage || "N/A"
                      }</p>
                      <p><strong>Travel Date:</strong> ${
                        bookingDetails.travelDate || "N/A"
                      }</p>
                      <p><strong>Number of Travelers:</strong> ${
                        bookingDetails.travelers || "N/A"
                      }</p>
                      <p><strong>Total Amount:</strong> ${
                        bookingDetails.totalAmount || "N/A"
                      }</p>
                  </div>
                  
                  <p>We will send you more details closer to your travel date.</p>
                  <p>If you have any questions, please don't hesitate to contact us.</p>
              </div>
              <div class="footer">
                  <p>Best regards,<br>The ImHere Travels Team</p>
                  <p>Email: bella@imheretravels.com | Website: www.imheretravels.com</p>
              </div>
          </div>
      </body>
      </html>
    `;
  }
}

export default ScheduledEmailService;
