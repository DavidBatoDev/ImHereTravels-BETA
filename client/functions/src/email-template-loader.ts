import * as fs from "fs";
import * as path from "path";

export interface EmailTemplateData {
  firstName: string;
  verificationLink: string;
  [key: string]: string;
}

export class EmailTemplateLoader {
  private static templatesPath = path.join(__dirname, "../emails");

  /**
   * Load an HTML email template and replace variables
   * If data is empty, returns raw template without variable replacement
   */
  static loadTemplate(templateName: string, data: EmailTemplateData): string {
    try {
      const templatePath = path.join(
        this.templatesPath,
        `${templateName}.html`
      );
      let html = fs.readFileSync(templatePath, "utf8");

      // If data is empty, return raw template (for Nunjucks processing)
      if (Object.keys(data).length === 0) {
        return html;
      }

      // Replace template variables
      Object.keys(data).forEach((key) => {
        const placeholder = `{{${key}}}`;
        const value = data[key];
        html = html.replace(new RegExp(placeholder, "g"), value);
      });

      return html;
    } catch (error) {
      console.error(`Error loading email template ${templateName}:`, error);

      // Fallback to inline template if file loading fails
      return this.getFallbackTemplate(data);
    }
  }

  /**
   * Fallback template if file loading fails
   */
  private static getFallbackTemplate(data: EmailTemplateData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email - ImHere Travels</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ImHere Travels</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.firstName}!</h2>
            <p>Thank you for signing up with ImHere Travels. To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${data.verificationLink}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${data.verificationLink}</p>
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
  }

  /**
   * Get list of available templates
   */
  static getAvailableTemplates(): string[] {
    try {
      const files = fs.readdirSync(this.templatesPath);
      return files
        .filter((file) => file.endsWith(".html"))
        .map((file) => file.replace(".html", ""));
    } catch (error) {
      console.error("Error reading templates directory:", error);
      return [];
    }
  }
}
