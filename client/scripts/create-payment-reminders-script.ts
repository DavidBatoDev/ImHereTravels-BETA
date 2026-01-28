import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import EmailTemplateService from "../functions/src/email-template-service";
import { EmailTemplateLoader } from "../functions/src/email-template-loader";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env
dotenv.config();

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  const serviceAccountPath = path.resolve(__dirname, "../../keys/prod-project-service-account.json");
  console.log(`🔑 Using service account key file: ${serviceAccountPath}`);
  initializeApp({
    credential: cert(serviceAccountPath),
  });
}
const db = getFirestore();

type SheetColumn = {
  id: string;
  columnName: string;
  dataType: string;
};

// Minimal column definitions needed for payment reminders
const PAYMENT_REMINDER_COLUMNS: SheetColumn[] = [
  { id: "bookingId", columnName: "Booking ID", dataType: "TEXT" },
  { id: "fullName", columnName: "Full Name", dataType: "TEXT" },
  { id: "emailAddress", columnName: "Email Address", dataType: "EMAIL" },
  { id: "tourPackageName", columnName: "Tour Package Name", dataType: "TEXT" },
  { id: "tourDate", columnName: "Tour Date", dataType: "DATE" },
  { id: "paymentCondition", columnName: "Payment Plan", dataType: "DROPDOWN" },
  { id: "paymentMethod", columnName: "Payment Method", dataType: "DROPDOWN" },
  { id: "paid", columnName: "Paid", dataType: "NUMBER" },
  {
    id: "remainingBalance",
    columnName: "Remaining Balance",
    dataType: "NUMBER",
  },
  {
    id: "useDiscountedTourCost",
    columnName: "Use Discounted Tour Cost?",
    dataType: "CHECKBOX",
  },
  {
    id: "originalTourCost",
    columnName: "Original Tour Cost",
    dataType: "NUMBER",
  },
  {
    id: "discountedTourCost",
    columnName: "Discounted Tour Cost",
    dataType: "NUMBER",
  },
  { id: "p1Amount", columnName: "P1 Amount", dataType: "NUMBER" },
  { id: "p1DueDate", columnName: "P1 Due Date", dataType: "DATE" },
  { id: "p1DatePaid", columnName: "P1 Date Paid", dataType: "DATE" },
  {
    id: "p1ScheduledReminderDate",
    columnName: "P1 Scheduled Reminder Date",
    dataType: "DATE",
  },
  {
    id: "p1ScheduledEmailLink",
    columnName: "P1 Scheduled Email Link",
    dataType: "TEXT",
  },
  { id: "p2Amount", columnName: "P2 Amount", dataType: "NUMBER" },
  { id: "p2DueDate", columnName: "P2 Due Date", dataType: "DATE" },
  { id: "p2DatePaid", columnName: "P2 Date Paid", dataType: "DATE" },
  {
    id: "p2ScheduledReminderDate",
    columnName: "P2 Scheduled Reminder Date",
    dataType: "DATE",
  },
  {
    id: "p2ScheduledEmailLink",
    columnName: "P2 Scheduled Email Link",
    dataType: "TEXT",
  },
  { id: "p3Amount", columnName: "P3 Amount", dataType: "NUMBER" },
  { id: "p3DueDate", columnName: "P3 Due Date", dataType: "DATE" },
  { id: "p3DatePaid", columnName: "P3 Date Paid", dataType: "DATE" },
  {
    id: "p3ScheduledReminderDate",
    columnName: "P3 Scheduled Reminder Date",
    dataType: "DATE",
  },
  {
    id: "p3ScheduledEmailLink",
    columnName: "P3 Scheduled Email Link",
    dataType: "TEXT",
  },
  { id: "p4Amount", columnName: "P4 Amount", dataType: "NUMBER" },
  { id: "p4DueDate", columnName: "P4 Due Date", dataType: "DATE" },
  { id: "p4DatePaid", columnName: "P4 Date Paid", dataType: "DATE" },
  {
    id: "p4ScheduledReminderDate",
    columnName: "P4 Scheduled Reminder Date",
    dataType: "DATE",
  },
  {
    id: "p4ScheduledEmailLink",
    columnName: "P4 Scheduled Email Link",
    dataType: "TEXT",
  },
];

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
    console.warn("Error formatting date:", error, "Value:", dateValue);
    return "";
  }
}

// Helper function to generate subject line based on payment plan and term
function getPaymentReminderSubject(
  paymentPlan: string,
  term: string,
  tourPackage: string,
  dueDate: string,
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
  columns: SheetColumn[],
): any {
  const column = columns.find((col) => col.columnName === columnName);
  if (!column) return undefined;
  return booking[column.id];
}

interface ProcessingStats {
  totalBookings: number;
  eligibleBookings: number;
  processedBookings: number;
  skippedBookings: number;
  scheduledEmailsCreated: number;
  scheduledEmailsMarkedSent: number;
  errors: number;
}

interface BookingProcessResult {
  bookingId: string;
  bookingDocId: string;
  rowNumber: number;
  emailAddress: string;
  fullName: string;
  tourPackage: string;
  paymentPlan: string;
  scheduledEmailsCreated: number;
  scheduledEmailsMarkedSent: number;
  markedSentTerms: string[];
  createdTerms: string[];
  skipped: boolean;
  skipReason?: string;
  error?: string;
}

async function processBooking(
  bookingDocId: string,
  rowNumber: number,
  bookingData: Record<string, any>,
  isDryRun: boolean,
): Promise<BookingProcessResult> {
  const result: BookingProcessResult = {
    bookingId: getColumnValue(bookingData, "Booking ID", PAYMENT_REMINDER_COLUMNS) || bookingDocId,
    bookingDocId,
    rowNumber,
    emailAddress: getColumnValue(bookingData, "Email Address", PAYMENT_REMINDER_COLUMNS) || "",
    fullName: getColumnValue(bookingData, "Full Name", PAYMENT_REMINDER_COLUMNS) || "",
    tourPackage: getColumnValue(bookingData, "Tour Package Name", PAYMENT_REMINDER_COLUMNS) || "",
    paymentPlan: bookingData.availablePaymentTerms || "",
    scheduledEmailsCreated: 0,
    scheduledEmailsMarkedSent: 0,
    markedSentTerms: [],
    createdTerms: [],
    skipped: false,
  };

  try {
    // Validate required fields
    if (!result.paymentPlan) {
      result.skipped = true;
      result.skipReason = "No payment plan";
      return result;
    }

    if (!result.emailAddress) {
      result.skipped = true;
      result.skipReason = "No email address";
      return result;
    }

    // Skip cancelled bookings
    if (result.paymentPlan.toLowerCase().includes("cancel")) {
      result.skipped = true;
      result.skipReason = "Booking cancelled";
      return result;
    }

    const paymentMethod = bookingData.paymentMethod || "Other";
    const terms = getApplicableTerms(result.paymentPlan);

    // Fetch tour package to get cover image
    let tourPackageCoverImage = "";
    try {
      const tourPackageSnap = await db
        .collection("tourPackages")
        .where("name", "==", result.tourPackage)
        .limit(1)
        .get();

      if (!tourPackageSnap.empty) {
        const tourPackageData = tourPackageSnap.docs[0].data();
        tourPackageCoverImage = tourPackageData.media?.coverImage || "";
      }
    } catch (error) {
      console.warn("Could not fetch tour package for cover image:", error);
    }

    for (const term of terms) {
      try {
        // Check if this payment term has already been paid
        const datePaid = getColumnValue(
          bookingData,
          `${term} Date Paid`,
          PAYMENT_REMINDER_COLUMNS,
        );

        // Check if datePaid exists (could be a Firestore timestamp object, Date, or string)
        const isPaymentMade = datePaid && (
          (typeof datePaid === 'object' && datePaid._seconds) || // Firestore timestamp
          datePaid instanceof Date || // Date object
          (typeof datePaid === 'string' && datePaid.trim() !== '') // Non-empty string
        );

        if (isPaymentMade) {
          console.log(`  ⏭️  ${term}: Payment already made, skipping`);
          continue;
        }

        // Check if scheduled email already exists for this booking + term
        const existingEmailsQuery = await db
          .collection("scheduledEmails")
          .where("bookingId", "==", bookingDocId)
          .where("emailType", "==", "payment-reminder")
          .get();

        const existingEmailForTerm = existingEmailsQuery.docs.find((doc) => {
          const data = doc.data();
          return data.templateVariables?.paymentTerm === term;
        });

        if (existingEmailForTerm) {
          console.log(`  ⏭️  ${term}: Scheduled email already exists, skipping`);
          continue;
        }

        // Direct field check (lowercase, e.g., p1ScheduledEmailLink)
        const pxScheduledEmailLinkField = `${term.toLowerCase()}ScheduledEmailLink`;
        const pxScheduledEmailLink = bookingData[pxScheduledEmailLinkField];

        // Check if scheduled reminder date exists
        const scheduledReminderDate = getColumnValue(
          bookingData,
          `${term} Scheduled Reminder Date`,
          PAYMENT_REMINDER_COLUMNS,
        );

        // Skip if no scheduled reminder date (null or empty string)
        if (!scheduledReminderDate || scheduledReminderDate === "") {
          console.log(`  ⏭️  ${term}: No scheduled reminder date, skipping`);
          continue;
        }

        // Get term details
        const amount = getColumnValue(
          bookingData,
          `${term} Amount`,
          PAYMENT_REMINDER_COLUMNS,
        );
        const dueDateRaw = getColumnValue(
          bookingData,
          `${term} Due Date`,
          PAYMENT_REMINDER_COLUMNS,
        );

        // Parse due date for this specific term
        let dueDate = dueDateRaw;
        if (typeof dueDateRaw === "string" && dueDateRaw.includes(",")) {
          const parts = dueDateRaw.split(",").map((p) => p.trim());
          const termIndex = parseInt(term.replace("P", "")) - 1;
          if (parts.length > termIndex * 2 + 1) {
            dueDate = `${parts[termIndex * 2]}, ${parts[termIndex * 2 + 1]}`;
          }
        }

        // Convert scheduled reminder date to Timestamp
        let scheduledFor: Timestamp;

        if (
          scheduledReminderDate &&
          typeof scheduledReminderDate === "object" &&
          scheduledReminderDate._seconds
        ) {
          scheduledFor = Timestamp.fromMillis(scheduledReminderDate._seconds * 1000);
        } else if (scheduledReminderDate instanceof Date) {
          scheduledFor = Timestamp.fromDate(scheduledReminderDate);
        } else if (typeof scheduledReminderDate === "string") {
          // Try parsing the date string directly first (handles formats like "Nov 24, 2025")
          let dateObj = new Date(scheduledReminderDate);
          
          // If that didn't work, try adding time
          if (isNaN(dateObj.getTime())) {
            dateObj = new Date(scheduledReminderDate + " 09:00:00 GMT+0800");
          }
          
          // If still invalid, skip this term
          if (isNaN(dateObj.getTime())) {
            console.warn(`  ⚠️  ${term}: Invalid date string format: ${scheduledReminderDate}`);
            continue;
          }
          
          // Set to 9 AM Singapore time
          dateObj.setHours(9, 0, 0, 0);
          scheduledFor = Timestamp.fromDate(dateObj);
        } else {
          console.warn(`  ⚠️  ${term}: Invalid scheduled reminder date:`, scheduledReminderDate);
          continue;
        }

        // Generate subject line
        const subject = getPaymentReminderSubject(
          result.paymentPlan,
          term,
          result.tourPackage,
          formatDate(dueDate),
        );

        // Build term data for template
        const currentTermIndex = terms.indexOf(term);
        const visibleTerms = terms.slice(0, currentTermIndex + 1);

        const termData = visibleTerms.map((t) => {
          const tDueDateRaw = getColumnValue(
            bookingData,
            `${t} Due Date`,
            PAYMENT_REMINDER_COLUMNS,
          );
          let tDueDate = tDueDateRaw;

          if (typeof tDueDateRaw === "string" && tDueDateRaw.includes(",")) {
            const parts = tDueDateRaw.split(",").map((p) => p.trim());
            const tIndex = parseInt(t.replace("P", "")) - 1;
            if (parts.length > tIndex * 2 + 1) {
              tDueDate = `${parts[tIndex * 2]}, ${parts[tIndex * 2 + 1]}`;
            }
          }

          return {
            term: t,
            amount: formatGBP(
              getColumnValue(bookingData, `${t} Amount`, PAYMENT_REMINDER_COLUMNS),
            ),
            dueDate: formatDate(tDueDate),
            datePaid: formatDate(
              getColumnValue(bookingData, `${t} Date Paid`, PAYMENT_REMINDER_COLUMNS),
            ),
          };
        });

        // Prepare template variables
        const templateVariables = {
          fullName: result.fullName,
          tourPackage: result.tourPackage,
          paymentMethod: paymentMethod,
          paymentTerm: term,
          amount: formatGBP(amount),
          dueDate: formatDate(dueDate),
          bookingId: result.bookingId,
          tourDate: formatDate(
            getColumnValue(bookingData, "Tour Date", PAYMENT_REMINDER_COLUMNS),
          ),
          paid: formatGBP(
            getColumnValue(bookingData, "Paid", PAYMENT_REMINDER_COLUMNS),
          ),
          remainingBalance: formatGBP(
            getColumnValue(bookingData, "Remaining Balance", PAYMENT_REMINDER_COLUMNS),
          ),
          totalAmount: formatGBP(
            getColumnValue(bookingData, "Use Discounted Tour Cost?", PAYMENT_REMINDER_COLUMNS)
              ? getColumnValue(bookingData, "Discounted Tour Cost", PAYMENT_REMINDER_COLUMNS)
              : getColumnValue(bookingData, "Original Tour Cost", PAYMENT_REMINDER_COLUMNS),
          ),
          showTable: term !== "P1",
          termData: termData,
          tourPackageCoverImage,
        };

        // Load raw template HTML
        const rawTemplateHtml = EmailTemplateLoader.loadTemplate(
          "scheduledReminderEmail",
          {} as any,
        );

        // Process template with Nunjucks
        const htmlContent = EmailTemplateService.processTemplate(
          rawTemplateHtml,
          templateVariables,
        );

        // Determine if this email should be marked as "sent"
        // pxScheduledEmailLink was already declared at the top of the loop
        const shouldMarkAsSent = !!pxScheduledEmailLink;

        // Extract messageId from Gmail link if it exists
        let messageId: string | undefined = undefined;
        if (shouldMarkAsSent && pxScheduledEmailLink) {
          // Gmail link format: https://mail.google.com/mail/u/0/#sent/<messageId>
          const gmailLinkMatch = pxScheduledEmailLink.match(
            /https:\/\/mail\.google\.com\/mail\/u\/\d+\/#sent\/([a-zA-Z0-9]+)/
          );
          if (gmailLinkMatch && gmailLinkMatch[1]) {
            messageId = gmailLinkMatch[1];
          }
        }

        if (!isDryRun) {
          // Create scheduled email document
          const emailDoc: any = {
            to: result.emailAddress,
            subject,
            htmlContent,
            from: "Bella | ImHereTravels <bella@imheretravels.com>",
            scheduledFor,
            status: shouldMarkAsSent ? "sent" : "pending",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            attempts: shouldMarkAsSent ? 1 : 0,
            maxAttempts: 3,
            emailType: "payment-reminder",
            bookingId: bookingDocId,
            templateId: "GEB3llGzftDaWRFXj8qz",
            templateVariables,
            source: "migration-script", // Tag to identify this was created by migration
          };

          // If marking as sent, add sent timestamp and messageId
          if (shouldMarkAsSent) {
            emailDoc.sentAt = Timestamp.now();
            if (messageId) {
              emailDoc.messageId = messageId;
            } else {
              emailDoc.messageId = "migrated-from-existing";
            }
          }

          const scheduledEmailDoc = await db.collection("scheduledEmails").add(emailDoc);

          console.log(
            `  ✅ ${term}: Created scheduled email (${shouldMarkAsSent ? "MARKED AS SENT" : "pending"}): ${scheduledEmailDoc.id}`,
          );
        } else {
          console.log(
            `  [DRY RUN] ${term}: Would create scheduled email (${shouldMarkAsSent ? "MARKED AS SENT" : "pending"})`,
          );
        }

        result.scheduledEmailsCreated++;
        result.createdTerms.push(term);

        if (shouldMarkAsSent) {
          result.scheduledEmailsMarkedSent++;
          result.markedSentTerms.push(term);
        }
      } catch (termError) {
        console.error(`  ❌ ${term}: Error creating scheduled email:`, termError);
      }
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Error processing booking:`, error);
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isProduction = args.includes("--production");

  if (!isDryRun && !isProduction) {
    console.error("❌ ERROR: You must specify either --dry-run or --production");
    console.error("Usage:");
    console.error("  npm run create-payment-reminders -- --dry-run");
    console.error("  npm run create-payment-reminders -- --production");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(80));
  console.log("📧 PAYMENT REMINDER MIGRATION SCRIPT");
  console.log("=".repeat(80));
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes will be made)" : "PRODUCTION (will modify database)"}`);
  console.log(`Target: Bookings rows 1-128 with enablePaymentReminder = true`);
  console.log("=".repeat(80) + "\n");

  const stats: ProcessingStats = {
    totalBookings: 0,
    eligibleBookings: 0,
    processedBookings: 0,
    skippedBookings: 0,
    scheduledEmailsCreated: 0,
    scheduledEmailsMarkedSent: 0,
    errors: 0,
  };

  const results: BookingProcessResult[] = [];

  try {
    // Fetch bookings with row numbers 1-128
    console.log("📥 Fetching bookings...\n");
    const bookingsSnapshot = await db
      .collection("bookings")
      .where("enablePaymentReminder", "==", true)
      .get();

    stats.totalBookings = bookingsSnapshot.size;
    console.log(`Found ${stats.totalBookings} bookings with enablePaymentReminder = true\n`);

    // Filter bookings by row number (1-128)
    const bookingsToProcess = bookingsSnapshot.docs.filter((doc) => {
      const row = doc.data().row;
      return row && row >= 1 && row < 129;
    });

    stats.eligibleBookings = bookingsToProcess.length;
    console.log(`${stats.eligibleBookings} bookings have row numbers 1-128\n`);
    console.log("=".repeat(80) + "\n");

    // Process each booking
    for (const doc of bookingsToProcess) {
      const bookingData = doc.data();
      const rowNumber = bookingData.row;

      console.log(`\n📋 Row ${rowNumber}: ${doc.id}`);
      console.log(`   Email: ${bookingData.emailAddress || "N/A"}`);
      console.log(`   Name: ${bookingData.fullName || "N/A"}`);
      console.log(`   Package: ${bookingData.tourPackageName || "N/A"}`);
      console.log(`   Payment Plan: ${bookingData.availablePaymentTerms || "N/A"}`);

      const result = await processBooking(doc.id, rowNumber, bookingData, isDryRun);
      results.push(result);

      if (result.skipped) {
        stats.skippedBookings++;
        console.log(`   ⏭️  Skipped: ${result.skipReason}`);
      } else if (result.error) {
        stats.errors++;
        console.log(`   ❌ Error: ${result.error}`);
      } else {
        stats.processedBookings++;
        stats.scheduledEmailsCreated += result.scheduledEmailsCreated;
        stats.scheduledEmailsMarkedSent += result.scheduledEmailsMarkedSent;

        console.log(`   ✅ Created ${result.scheduledEmailsCreated} scheduled emails`);
        if (result.scheduledEmailsMarkedSent > 0) {
          console.log(
            `   📨 Marked ${result.scheduledEmailsMarkedSent} as sent: ${result.markedSentTerms.join(", ")}`,
          );
        }
      }
    }

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total bookings found: ${stats.totalBookings}`);
    console.log(`Eligible bookings (rows 1-128): ${stats.eligibleBookings}`);
    console.log(`Successfully processed: ${stats.processedBookings}`);
    console.log(`Skipped: ${stats.skippedBookings}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Scheduled emails created: ${stats.scheduledEmailsCreated}`);
    console.log(`Scheduled emails marked as sent: ${stats.scheduledEmailsMarkedSent}`);
    console.log("=".repeat(80) + "\n");

    // Detailed results
    if (results.length > 0) {
      console.log("\n" + "=".repeat(80));
      console.log("📋 DETAILED RESULTS");
      console.log("=".repeat(80) + "\n");

      for (const result of results) {
        if (!result.skipped && !result.error && result.scheduledEmailsCreated > 0) {
          console.log(`Row ${result.rowNumber}: ${result.emailAddress}`);
          console.log(`  Booking ID: ${result.bookingId}`);
          console.log(`  Name: ${result.fullName}`);
          console.log(`  Package: ${result.tourPackage}`);
          console.log(`  Payment Plan: ${result.paymentPlan}`);
          console.log(`  Created emails: ${result.createdTerms.join(", ")}`);
          if (result.markedSentTerms.length > 0) {
            console.log(`  Marked as sent: ${result.markedSentTerms.join(", ")}`);
          }
          console.log("");
        }
      }
    }

    if (isDryRun) {
      console.log("\n" + "⚠️".repeat(40));
      console.log("⚠️  THIS WAS A DRY RUN - NO CHANGES WERE MADE");
      console.log("⚠️  To execute in production, run with --production flag");
      console.log("⚠️".repeat(40) + "\n");
    } else {
      console.log("\n✅ Migration completed successfully!\n");
    }
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log("✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
