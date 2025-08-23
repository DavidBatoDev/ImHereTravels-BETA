// Email service interface for easy migration between providers
export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<EmailResult>;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Gmail SMTP implementation
export class GmailProvider implements EmailProvider {
  private smtpConfig: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };

  constructor() {
    this.smtpConfig = {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER || "",
        pass: process.env.GMAIL_APP_PASSWORD || "",
      },
    };
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      // This will be implemented in the Firebase function
      // For now, we'll return a mock result
      return {
        success: true,
        messageId: `gmail_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// SendGrid implementation (for future migration)
export class SendGridProvider implements EmailProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || "";
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      // This will be implemented when migrating to SendGrid
      return {
        success: true,
        messageId: `sendgrid_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Email service factory
export class EmailService {
  private provider: EmailProvider;

  constructor(provider: EmailProvider) {
    this.provider = provider;
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    return this.provider.sendEmail(options);
  }

  // Factory method to create email service with specific provider
  static create(providerType: "gmail" | "sendgrid" = "gmail"): EmailService {
    let provider: EmailProvider;

    switch (providerType) {
      case "gmail":
        provider = new GmailProvider();
        break;
      case "sendgrid":
        provider = new SendGridProvider();
        break;
      default:
        provider = new GmailProvider();
    }

    return new EmailService(provider);
  }
}

// Email templates
export class EmailTemplates {
  static verificationEmail(verificationLink: string, firstName: string): EmailOptions {
    const subject = "Verify Your Email - ImHere Travels";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1f2937; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ImHere Travels</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>Thank you for signing up with ImHere Travels. To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${verificationLink}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${verificationLink}</p>
            <p>This link will expire in 24 hours for security reasons.</p>
            <p>If you didn't create an account with ImHere Travels, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 ImHere Travels. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hello ${firstName}!
      
      Thank you for signing up with ImHere Travels. To complete your registration, please verify your email address by visiting this link:
      
      ${verificationLink}
      
      This link will expire in 24 hours for security reasons.
      
      If you didn't create an account with ImHere Travels, you can safely ignore this email.
      
      Best regards,
      ImHere Travels Team
    `;

    return {
      to: "", // Will be set by the caller
      subject,
      html,
      text,
    };
  }
}
