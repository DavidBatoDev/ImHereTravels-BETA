import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import GmailApiService from "@/lib/gmail/gmail-api-service";
import EmailTemplateService from "@/services/email-template-service";

// Helper function to get Gmail sent URL
function getGmailSentUrl(messageId: string): string {
  return `https://mail.google.com/mail/u/0/#sent/${messageId}`;
}

// Helper function to format currency
function formatGBP(value: any): string {
  if (!value) return "£0.00";
  return `£${Number(value).toFixed(2)}`;
}

// Helper function to format date
function formatDate(dateValue: any): string {
  if (!dateValue) return "";

  try {
    let date: Date | null = null;

    // Handle Firestore Timestamp objects
    if (dateValue && typeof dateValue === "object") {
      if (dateValue.seconds) {
        date = new Date(dateValue.seconds * 1000);
      }
    }
    // Handle string dates
    else if (typeof dateValue === "string" && dateValue.trim() !== "") {
      date = new Date(dateValue);
    }
    // Handle Date objects
    else if (dateValue instanceof Date) {
      date = dateValue;
    }

    // Validate and format
    if (date && !isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }

    return "";
  } catch (error) {
    console.warn("Error formatting date:", error, "Value:", dateValue);
    return "";
  }
}

// Helper function to re-render template with fresh booking data
async function rerenderEmailTemplate(
  bookingId: string,
  templateId: string,
  templateVariables: Record<string, any>
): Promise<{ subject: string; htmlContent: string }> {
  try {
    // Fetch fresh booking data
    const bookingDoc = await getDoc(doc(db, "bookings", bookingId));

    if (!bookingDoc.exists()) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const bookingData = bookingDoc.data()!;

    // Update template variables with fresh data
    const freshVariables: Record<string, any> = {
      ...templateVariables,
      fullName: bookingData.fullName,
      emailAddress: bookingData.emailAddress,
      tourPackageName: bookingData.tourPackageName,
      bookingId: bookingData.bookingId,
      tourDate: bookingData.tourDate,
      paid: bookingData.paid,
      remainingBalance: bookingData.remainingBalance,
      originalTourCost: bookingData.originalTourCost,
      discountedTourCost: bookingData.discountedTourCost,
      useDiscountedTourCost: bookingData.useDiscountedTourCost,
      paymentMethod: bookingData.paymentCondition || "Other",
      paymentPlan: bookingData.availablePaymentTerms || "",
    };

    // Update payment term data if applicable
    if (templateVariables.paymentTerm) {
      const term = templateVariables.paymentTerm as string;
      const termLower = term.toLowerCase();

      freshVariables[`${termLower}Amount`] = (bookingData as any)[
        `${termLower}Amount`
      ];
      freshVariables[`${termLower}DueDate`] = (bookingData as any)[
        `${termLower}DueDate`
      ];
      freshVariables[`${termLower}DatePaid`] = (bookingData as any)[
        `${termLower}DatePaid`
      ];

      freshVariables.amount = formatGBP(
        (bookingData as any)[`${termLower}Amount`]
      );
      freshVariables.dueDate = formatDate(
        (bookingData as any)[`${termLower}DueDate`]
      );
    }

    // Update term data array if showTable is true
    if (templateVariables.showTable && templateVariables.termData) {
      const terms = ["P1", "P2", "P3", "P4"];
      freshVariables.termData = terms
        .filter((t) => bookingData.availablePaymentTerms?.includes(t))
        .map((t) => ({
          term: t,
          amount: formatGBP(
            (bookingData as any)[`${t.toLowerCase()}Amount`] || 0
          ),
          dueDate: formatDate(
            (bookingData as any)[`${t.toLowerCase()}DueDate`] || ""
          ),
          datePaid: formatDate(
            (bookingData as any)[`${t.toLowerCase()}DatePaid`] || ""
          ),
        }));

      freshVariables.totalAmount = formatGBP(
        bookingData.useDiscountedTourCost
          ? bookingData.discountedTourCost
          : bookingData.originalTourCost
      );
      freshVariables.paid = formatGBP(bookingData.paid);
      freshVariables.remainingBalance = formatGBP(bookingData.remainingBalance);
    }

    // Fetch the template from the database to ensure we're using the latest version
    const templateDoc = await getDoc(doc(db, "emailTemplates", templateId));

    if (!templateDoc.exists()) {
      throw new Error(`Template ${templateId} not found in database`);
    }

    const templateData = templateDoc.data();
    const rawTemplateHtml = templateData.content || "";

    if (!rawTemplateHtml) {
      throw new Error(`Template ${templateId} has no content`);
    }

    const htmlContent = EmailTemplateService.processTemplate(
      rawTemplateHtml,
      freshVariables
    );

    const subject = `Payment Reminder - ${freshVariables.fullName} - ${
      templateVariables.paymentTerm || "Payment"
    } Due`;

    return { subject, htmlContent };
  } catch (error) {
    console.error("Error re-rendering email template:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("Manual trigger for scheduled email processing");

    const now = Timestamp.now();

    // Query for pending emails that should be sent now
    const firestoreQuery = query(
      collection(db, "scheduledEmails"),
      where("status", "==", "pending"),
      where("scheduledFor", "<=", now),
      limit(50) // Process max 50 emails per trigger
    );

    const snapshot = await getDocs(firestoreQuery);

    if (snapshot.empty) {
      console.log("No scheduled emails to process");
      return NextResponse.json({
        success: true,
        message: "No scheduled emails to process",
        processed: 0,
      });
    }

    console.log(`Found ${snapshot.docs.length} emails to process`);

    // Initialize Gmail API service
    const gmailService = new GmailApiService();

    // Load booking columns once for all emails (for updating booking links)
    const columnsSnapshot = await getDocs(
      collection(db, "bookingSheetColumns")
    );
    const columns = columnsSnapshot.docs.map((doc) => ({
      id: doc.id,
      columnName: doc.data().columnName,
      dataType: doc.data().dataType,
    }));

    // Process each scheduled email
    const results = await Promise.allSettled(
      snapshot.docs.map(async (docSnapshot) => {
        const emailData = docSnapshot.data();
        const emailId = docSnapshot.id;

        try {
          let emailSubject = emailData.subject;
          let emailHtmlContent = emailData.htmlContent;

          // Re-render template with fresh data for payment reminders
          if (
            emailData.emailType === "payment-reminder" &&
            emailData.bookingId &&
            emailData.templateId &&
            emailData.templateVariables
          ) {
            try {
              console.log(
                `Re-rendering template for booking ${emailData.bookingId} with fresh data`
              );
              const freshEmail = await rerenderEmailTemplate(
                emailData.bookingId,
                emailData.templateId,
                emailData.templateVariables
              );
              emailSubject = freshEmail.subject;
              emailHtmlContent = freshEmail.htmlContent;
              console.log(
                `Template re-rendered successfully for email ${emailId}`
              );
            } catch (rerenderError) {
              console.warn(
                `Failed to re-render template for email ${emailId}, using original content:`,
                rerenderError
              );
              // Fall back to original content if re-rendering fails
            }
          }

          // Send the email
          const result = await gmailService.sendEmail({
            to: emailData.to,
            subject: emailSubject,
            htmlContent: emailHtmlContent,
            bcc: emailData.bcc,
            cc: emailData.cc,
            from: emailData.from,
            replyTo: emailData.replyTo,
          });

          // Update document with success status
          await updateDoc(doc(db, "scheduledEmails", emailId), {
            status: "sent",
            sentAt: Timestamp.now(),
            messageId: result.messageId,
            attempts: (emailData.attempts || 0) + 1,
            updatedAt: Timestamp.now(),
          });

          console.log(`Successfully sent scheduled email: ${emailId}`);

          // If this is a payment reminder, update the booking with the sent email link
          if (
            emailData.emailType === "payment-reminder" &&
            emailData.bookingId &&
            emailData.templateVariables?.paymentTerm &&
            result.messageId
          ) {
            try {
              const term = emailData.templateVariables.paymentTerm as string;
              const emailLink = getGmailSentUrl(result.messageId);
              const scheduledEmailLinkCol = columns.find(
                (col: any) => col.columnName === `${term} Scheduled Email Link`
              );

              if (scheduledEmailLinkCol) {
                await updateDoc(doc(db, "bookings", emailData.bookingId), {
                  [scheduledEmailLinkCol.id]: emailLink,
                });

                console.log(
                  `Updated ${term} Scheduled Email Link for booking ${emailData.bookingId}`
                );
              }
            } catch (bookingUpdateError) {
              console.error(
                `Error updating booking with email link:`,
                bookingUpdateError
              );
              // Don't fail the whole process if booking update fails
            }
          }

          return { success: true, emailId };
        } catch (error) {
          console.error(`Error sending scheduled email ${emailId}:`, error);

          // Update attempts and potentially mark as failed
          const currentAttempts = (emailData.attempts || 0) + 1;
          const maxAttempts = emailData.maxAttempts || 3;

          const updateData: any = {
            attempts: currentAttempts,
            updatedAt: Timestamp.now(),
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
          };

          if (currentAttempts >= maxAttempts) {
            updateData.status = "failed";
            console.log(
              `Email ${emailId} marked as failed after ${currentAttempts} attempts`
            );
          } else {
            console.log(
              `Email ${emailId} failed, attempt ${currentAttempts}/${maxAttempts}`
            );
          }

          await updateDoc(doc(db, "scheduledEmails", emailId), updateData);

          return {
            success: false,
            emailId,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    // Count successful and failed sends
    const successful = results.filter(
      (result) => result.status === "fulfilled" && result.value.success
    ).length;
    const failed = results.length - successful;

    console.log(
      `Scheduled email processing completed: ${successful} sent, ${failed} failed`
    );

    return NextResponse.json({
      success: true,
      message: "Scheduled email processing completed",
      processed: results.length,
      successful,
      failed,
    });
  } catch (error) {
    console.error("Error in trigger scheduled email processing:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to trigger scheduled email processing",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
