import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import EmailTemplateService from "./email-template-service";
import GmailApiService from "./gmail-api-service";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

type SheetColumn = {
  id: string;
  columnName: string;
  dataType: string;
  function?: string;
  arguments?: Array<{
    name: string;
    type?: string;
    value?: any;
    columnReference?: string;
    columnReferences?: string[];
  }>;
};

// Helper function to format GBP currency
function formatGBP(value: number | string | null | undefined): string {
  if (!value) return "£0.00";
  return `£${Number(value).toFixed(2)}`;
}

// Helper function to format dates
function formatDate(dateValue: any): string {
  if (!dateValue) return "";

  try {
    let date: Date | null = null;

    // Handle Firestore Timestamp objects
    if (dateValue && typeof dateValue === "object" && dateValue._seconds) {
      date = new Date(dateValue._seconds * 1000);
    }
    // Handle string dates
    else if (typeof dateValue === "string" && dateValue.trim() !== "") {
      date = new Date(dateValue);
    }
    // Handle Date objects
    else if (dateValue instanceof Date) {
      date = dateValue;
    }

    // Validate the date before formatting
    if (date && !isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }

    return "";
  } catch (error) {
    logger.warn("Error formatting date:", error, "Value:", dateValue);
    return "";
  }
}

// Helper function to get Gmail sent URL
function getGmailSentUrl(messageId: string): string {
  return `https://mail.google.com/mail/u/0/#sent/${messageId}`;
}

// Helper function to generate subject line based on payment plan and term
function getPaymentReminderSubject(
  paymentPlan: string,
  term: string,
  tourPackage: string,
  dueDate: string
): string {
  const termNumber = parseInt(term.replace("P", ""));
  const planNumber = parseInt(paymentPlan.replace("P", ""));

  // P1 only - single payment
  if (paymentPlan === "P1" || planNumber === 1) {
    return `Reminder – Your Final Installment for ${tourPackage} is Due on ${dueDate}`;
  }

  // For multi-payment plans
  if (termNumber === planNumber) {
    // Final installment
    return `Reminder – Your Final Installment for ${tourPackage} is Due on ${dueDate}`;
  } else if (termNumber === 1) {
    // First installment
    return `Your 1st Installment for ${tourPackage} is Due on ${dueDate}`;
  } else if (termNumber === 2) {
    // Second installment
    return `Reminder – Your 2nd Installment for ${tourPackage} is Due on ${dueDate}`;
  } else if (termNumber === 3) {
    // Third installment
    return `Reminder – Your 3rd Installment for ${tourPackage} is Due on ${dueDate}`;
  }

  // Default fallback
  return `Reminder – Your Payment for ${tourPackage} is Due on ${dueDate}`;
}

// Helper function to get applicable payment terms based on payment plan
function getApplicableTerms(paymentPlan: string): string[] {
  const allTerms = ["P1", "P2", "P3", "P4"];

  if (paymentPlan === "P2") {
    return allTerms.slice(0, 2);
  } else if (paymentPlan === "P3") {
    return allTerms.slice(0, 3);
  } else if (paymentPlan === "P4") {
    return allTerms;
  }

  // Default to P1 only
  return ["P1"];
}

// Helper function to get column value by column name
function getColumnValue(
  booking: Record<string, any>,
  columnName: string,
  columns: SheetColumn[]
): any {
  const column = columns.find((col) => col.columnName === columnName);
  if (!column) return undefined;
  return booking[column.id];
}

// Helper function to build initial reminder email HTML
async function buildInitialReminderEmailHtml(
  booking: Record<string, any>,
  columns: SheetColumn[],
  terms: string[]
): Promise<string> {
  const fullName = getColumnValue(booking, "Full Name", columns) || "";
  const tourPackage =
    getColumnValue(booking, "Tour Package Name", columns) || "";
  const paymentPlan = getColumnValue(booking, "Payment Plan", columns) || "";
  const paymentMethod =
    getColumnValue(booking, "Payment Method", columns) || "";
  const remainingBalance =
    getColumnValue(booking, "Remaining Balance", columns) || 0;

  // Build payment terms table
  const termRows = terms
    .map((term) => {
      const amount = getColumnValue(booking, `${term} Amount`, columns);
      const dueDate = getColumnValue(booking, `${term} Due Date`, columns);
      const datePaid = getColumnValue(booking, `${term} Date Paid`, columns);

      return `
        <tr ${
          terms.indexOf(term) % 2 === 1
            ? 'style="background-color: #f8f9fa;"'
            : ""
        }>
          <td style="border: 1px solid #ddd; padding: 10px;">${term}</td>
          <td style="border: 1px solid #ddd; padding: 10px;">${formatGBP(
            amount
          )}</td>
          <td style="border: 1px solid #ddd; padding: 10px;">${formatDate(
            dueDate
          )}</td>
          <td style="border: 1px solid #ddd; padding: 10px;">${
            datePaid ? formatDate(datePaid) : "Not paid"
          }</td>
        </tr>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; font-size: 14px; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        th { background-color: #667eea; color: white; padding: 10px; text-align: left; }
        td { border: 1px solid #ddd; padding: 10px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Reminders Enabled</h1>
          <p>Your payment schedule for ${tourPackage}</p>
        </div>
        <div style="padding: 20px;">
          <p>Hi ${fullName},</p>
          
          <p>This email confirms that we've set up automatic payment reminders for your booking: <strong>${tourPackage}</strong>.</p>
          
          <h3 style="color: #667eea;">Payment Plan: ${paymentPlan}</h3>
          <h3 style="color: #667eea;">Payment Method: ${paymentMethod}</h3>
          
          <h3 style="color: #667eea;">Payment Schedule:</h3>
          <table>
            <thead>
              <tr>
                <th>Term</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${termRows}
            </tbody>
          </table>
          
          <p><strong>Remaining Balance:</strong> ${formatGBP(
            remainingBalance
          )}</p>
          
          <h3 style="color: #667eea;">What to Expect:</h3>
          <ul>
            <li>You'll receive email reminders 3 days before each payment due date</li>
            <li>Each reminder will include your current payment status</li>
            <li>You can contact us anytime if you need to adjust your payment plan</li>
          </ul>
          
          <p>If you have any questions about your payment schedule, please don't hesitate to reach out.</p>
          
          <p>
            Best regards,<br>
            <strong>Bella | ImHereTravels</strong><br>
            bella@imheretravels.com
          </p>
        </div>
        <div class="footer">
          <p>ImHereTravels | Creating Unforgettable Adventures</p>
          <img src="https://imheretravels.com/wp-content/uploads/2025/04/ImHereTravels-Logo.png" alt="ImHereTravels Logo" style="width: 120px; margin-top: 10px;">
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Firestore trigger that runs when a booking document is updated
 * Detects when enablePaymentReminder changes to true and:
 * 1. Sends an initial summary email
 * 2. Creates scheduled reminder emails for P1-P4 payment terms
 */
export const onPaymentReminderEnabled = onDocumentUpdated(
  {
    document: "bookings/{bookingId}",
    region: "asia-southeast1",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async (event) => {
    try {
      const bookingId = event.params.bookingId as string;
      const beforeData = event.data?.before.data();
      const afterData = event.data?.after.data();

      if (!beforeData || !afterData) {
        logger.info("No data found in before or after snapshot");
        return;
      }

      logger.info(`📧 Checking payment reminder for booking: ${bookingId}`);

      // Fetch all columns to map column names to IDs
      const columnsSnap = await db.collection("bookingSheetColumns").get();
      const columns: SheetColumn[] = columnsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SheetColumn[];

      logger.info(`📋 Loaded ${columns.length} booking columns`);

      // Find the enablePaymentReminder column
      const enableReminderCol = columns.find(
        (col) => col.columnName === "Enable Payment Reminder"
      );

      if (!enableReminderCol) {
        logger.warn("Enable Payment Reminder column not found");
        return;
      }

      // Check if enablePaymentReminder changed from false to true
      const wasEnabled = beforeData[enableReminderCol.id] === true;
      const isNowEnabled = afterData[enableReminderCol.id] === true;

      if (wasEnabled || !isNowEnabled) {
        logger.info("Payment reminder not newly enabled, skipping");
        return;
      }

      logger.info("✅ Payment reminder newly enabled!");

      // Get booking data with column mappings
      const booking = afterData;

      // Validate payment plan and payment method
      const paymentPlan = getColumnValue(booking, "Payment Plan", columns);
      const paymentMethod = getColumnValue(booking, "Payment Method", columns);
      const emailAddress = getColumnValue(booking, "Email Address", columns);
      const fullName = getColumnValue(booking, "Full Name", columns);
      const tourPackage = getColumnValue(booking, "Tour Package Name", columns);
      const sentInitialReminderLink = getColumnValue(
        booking,
        "Sent Initial Reminder Link",
        columns
      );

      logger.info("Booking details:", {
        paymentPlan,
        paymentMethod,
        emailAddress,
        fullName,
        tourPackage,
        sentInitialReminderLink,
      });

      // Validate required fields
      if (!paymentPlan || !paymentMethod) {
        logger.warn(
          "Payment Plan or Payment Method missing, cannot enable reminders"
        );
        return;
      }

      if (!emailAddress) {
        logger.warn("Email address missing, cannot send reminders");
        return;
      }

      // Check if initial email was already sent
      if (sentInitialReminderLink) {
        logger.info("Initial reminder email already sent, skipping");
        // Still proceed to create scheduled emails if they don't exist
      } else {
        // Send initial summary email
        logger.info("🚀 Sending initial summary email...");

        try {
          const terms = getApplicableTerms(paymentPlan);
          const htmlContent = await buildInitialReminderEmailHtml(
            booking,
            columns,
            terms
          );

          const gmailService = new GmailApiService();
          const subject = `${fullName}, Monthly Payment Reminders for ${tourPackage}`;

          const result = await gmailService.sendEmail({
            to: emailAddress,
            subject,
            htmlContent,
            from: "Bella | ImHereTravels <bella@imheretravels.com>",
          });

          logger.info("✅ Initial email sent successfully:", result.messageId);

          // Update the booking with the sent email link
          const sentEmailLink = getGmailSentUrl(result.messageId);
          const sentInitialReminderLinkCol = columns.find(
            (col) => col.columnName === "Sent Initial Reminder Link"
          );

          if (sentInitialReminderLinkCol) {
            await db
              .collection("bookings")
              .doc(bookingId)
              .update({
                [sentInitialReminderLinkCol.id]: sentEmailLink,
              });
            logger.info("✅ Updated Sent Initial Reminder Link field");
          }
        } catch (error) {
          logger.error("❌ Error sending initial email:", error);
          // Continue to create scheduled emails even if initial email fails
        }
      }

      // Create scheduled reminder emails for P1-P4
      logger.info("📅 Creating scheduled reminder emails...");

      const terms = getApplicableTerms(paymentPlan);
      logger.info(`Terms to process: ${terms.join(", ")}`);

      for (const term of terms) {
        try {
          // Check if scheduled reminder date exists
          const scheduledReminderDate = getColumnValue(
            booking,
            `${term} Scheduled Reminder Date`,
            columns
          );

          if (!scheduledReminderDate) {
            logger.info(`No scheduled reminder date for ${term}, skipping`);
            continue;
          }

          // Check if scheduled email already exists
          const scheduledEmailLink = getColumnValue(
            booking,
            `${term} Scheduled Email Link`,
            columns
          );

          if (scheduledEmailLink) {
            logger.info(`Scheduled email already exists for ${term}, skipping`);
            continue;
          }

          // Get term details
          const amount = getColumnValue(booking, `${term} Amount`, columns);
          const dueDate = getColumnValue(booking, `${term} Due Date`, columns);

          // Convert scheduled reminder date to Timestamp
          let scheduledFor: Timestamp;
          
          logger.info(
            `Processing ${term} scheduled reminder date:`,
            scheduledReminderDate,
            `Type: ${typeof scheduledReminderDate}`
          );

          if (
            scheduledReminderDate &&
            typeof scheduledReminderDate === "object" &&
            scheduledReminderDate._seconds
          ) {
            // Firestore Timestamp object
            scheduledFor = Timestamp.fromMillis(
              scheduledReminderDate._seconds * 1000
            );
            logger.info(`Converted Firestore Timestamp for ${term}`);
          } else if (scheduledReminderDate instanceof Date) {
            // JavaScript Date object
            scheduledFor = Timestamp.fromDate(scheduledReminderDate);
            logger.info(`Converted Date object for ${term}`);
          } else if (typeof scheduledReminderDate === "string") {
            // String date like "2025-10-20"
            // Parse the date and set time to 9 AM (matching scheduler run time)
            const dateObj = new Date(scheduledReminderDate + "T09:00:00+08:00"); // Singapore time
            
            if (isNaN(dateObj.getTime())) {
              logger.warn(
                `Invalid date string format for ${term}: ${scheduledReminderDate}`
              );
              continue;
            }
            
            scheduledFor = Timestamp.fromDate(dateObj);
            logger.info(
              `Converted string date for ${term}: ${scheduledReminderDate} -> ${dateObj.toISOString()}`
            );
          } else {
            logger.warn(
              `Invalid scheduled reminder date for ${term}:`,
              scheduledReminderDate
            );
            continue;
          }

          // Generate subject line
          const subject = getPaymentReminderSubject(
            paymentPlan,
            term,
            tourPackage || "",
            formatDate(dueDate)
          );

          // Build term data for template
          const termData = terms.map((t) => ({
            term: t,
            amount: formatGBP(getColumnValue(booking, `${t} Amount`, columns)),
            dueDate: formatDate(
              getColumnValue(booking, `${t} Due Date`, columns)
            ),
            datePaid: formatDate(
              getColumnValue(booking, `${t} Date Paid`, columns)
            ),
          }));

          // Prepare template variables
          const templateVariables = {
            fullName: fullName || "",
            tourPackage: tourPackage || "",
            paymentMethod: paymentMethod || "",
            paymentTerm: term,
            amount: formatGBP(amount),
            dueDate: formatDate(dueDate),
            bookingId: getColumnValue(booking, "Booking ID", columns) || "",
            tourDate: formatDate(getColumnValue(booking, "Tour Date", columns)),
            paid: formatGBP(getColumnValue(booking, "Paid", columns)),
            remainingBalance: formatGBP(
              getColumnValue(booking, "Remaining Balance", columns)
            ),
            totalAmount: formatGBP(
              getColumnValue(booking, "Use Discounted Tour Cost?", columns)
                ? getColumnValue(booking, "Discounted Tour Cost", columns)
                : getColumnValue(booking, "Original Tour Cost", columns)
            ),
            showTable: term !== "P1",
            termData: termData,
          };

          // Fetch the email template
          const templateDoc = await db
            .collection("emailTemplates")
            .doc("GEB3llGzftDaWRFXj8qz")
            .get();

          let htmlContent = "";

          if (templateDoc.exists) {
            const templateData = templateDoc.data();

            // Process the template with variables (static method)
            htmlContent = EmailTemplateService.processTemplate(
              templateData?.content || "",
              templateVariables
            );
          } else {
            // Fallback to simple HTML if template not found
            logger.warn("Template not found, using fallback HTML");
            htmlContent = `
              <html>
              <body>
                <p>Hi ${fullName},</p>
                <p>This is a reminder that your ${term} payment of ${formatGBP(
              amount
            )} for ${tourPackage} is due on ${formatDate(dueDate)}.</p>
                <p>Best regards,<br>ImHereTravels Team</p>
              </body>
              </html>
            `;
          }

          // Create scheduled email document
          const scheduledEmailDoc = await db.collection("scheduledEmails").add({
            to: emailAddress,
            subject,
            htmlContent,
            from: "Bella | ImHereTravels <bella@imheretravels.com>",
            scheduledFor,
            status: "pending",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            attempts: 0,
            maxAttempts: 3,
            emailType: "payment-reminder",
            bookingId: bookingId,
            templateId: "GEB3llGzftDaWRFXj8qz",
            templateVariables,
          });

          logger.info(
            `✅ Created scheduled email for ${term}: ${scheduledEmailDoc.id}`
          );

          // Update booking with scheduled email document ID
          const scheduledEmailLinkCol = columns.find(
            (col) => col.columnName === `${term} Scheduled Email Link`
          );

          if (scheduledEmailLinkCol) {
            await db
              .collection("bookings")
              .doc(bookingId)
              .update({
                [scheduledEmailLinkCol.id]: `Scheduled: ${scheduledEmailDoc.id}`,
              });
          }
        } catch (error) {
          logger.error(`❌ Error creating scheduled email for ${term}:`, error);
        }
      }

      logger.info("✅ Payment reminder setup completed successfully");
    } catch (error) {
      logger.error("❌ Error in payment reminder trigger:", error);
      throw error;
    }
  }
);
