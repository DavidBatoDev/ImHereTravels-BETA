import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import GmailApiService from "@/lib/gmail/gmail-api-service";
import EmailTemplateService from "@/services/email-template-service";

// Helper function to format currency
function formatGBP(value: any): string {
  if (!value) return "£0.00";
  return `£${Number(value).toFixed(2)}`;
}

// Helper function to parse due date for a specific term
function parseDueDateForTerm(dueDateRaw: any, termIndex: number): string {
  if (!dueDateRaw) return "";

  if (typeof dueDateRaw === "string" && dueDateRaw.includes(",")) {
    const parts = dueDateRaw.split(",").map((p) => p.trim());
    if (parts.length > termIndex * 2 + 1) {
      return `${parts[termIndex * 2]}, ${parts[termIndex * 2 + 1]}`;
    }
  }

  return dueDateRaw;
}

// Helper function to format date
function formatDate(dateValue: any): string {
  if (!dateValue) return "";

  try {
    let date: Date | null = null;
    if (dateValue && typeof dateValue === "object") {
      if (dateValue.seconds) {
        date = new Date(dateValue.seconds * 1000);
      }
    } else if (typeof dateValue === "string" && dateValue.trim() !== "") {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    }

    if (date && !isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
    return "";
  } catch (error) {
    return "";
  }
}

// Helper function to re-render template with fresh booking data
async function rerenderEmailTemplate(
  bookingId: string,
  templateId: string,
  templateVariables: Record<string, any>,
): Promise<{ subject: string; htmlContent: string }> {
  try {
    const bookingDoc = await getDoc(doc(db, "bookings", bookingId));

    if (!bookingDoc.exists()) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const bookingData = bookingDoc.data()!;
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
      paymentMethod: bookingData.paymentMethod || "Other",
      paymentPlan: bookingData.availablePaymentTerms || "",
      accessToken: bookingData.access_token || "",
    };

    if (templateVariables.paymentTerm) {
      const term = templateVariables.paymentTerm as string;
      const termLower = term.toLowerCase();
      const termIndex = parseInt(term.replace("P", "")) - 1;

      const dueDateRaw = (bookingData as any)[`${termLower}DueDate`];
      const parsedDueDate = parseDueDateForTerm(dueDateRaw, termIndex);

      freshVariables[`${termLower}Amount`] = (bookingData as any)[
        `${termLower}Amount`
      ];
      freshVariables[`${termLower}DueDate`] = parsedDueDate;
      freshVariables[`${termLower}DatePaid`] = (bookingData as any)[
        `${termLower}DatePaid`
      ];

      freshVariables.amount = formatGBP(
        (bookingData as any)[`${termLower}Amount`],
      );
      freshVariables.dueDate = formatDate(parsedDueDate);
    }

    if (templateVariables.showTable && templateVariables.termData) {
      const allTerms = ["P1", "P2", "P3", "P4"];
      const paymentPlanValue =
        bookingData.availablePaymentTerms || bookingData.paymentPlan || "";
      let maxTermIndex = 0;

      if (paymentPlanValue.includes("P4")) {
        maxTermIndex = 4;
      } else if (paymentPlanValue.includes("P3")) {
        maxTermIndex = 3;
      } else if (paymentPlanValue.includes("P2")) {
        maxTermIndex = 2;
      } else if (paymentPlanValue.includes("P1")) {
        maxTermIndex = 1;
      }

      const availableTerms = allTerms.slice(0, maxTermIndex);
      const currentTerm = templateVariables.paymentTerm as string;
      const currentTermIndex = allTerms.indexOf(currentTerm);
      const visibleTerms = availableTerms.slice(0, currentTermIndex + 1);

      freshVariables.termData = visibleTerms.map((t) => {
        const tIndex = parseInt(t.replace("P", "")) - 1;
        const tLower = t.toLowerCase();
        const dueDateRaw = (bookingData as any)[`${tLower}DueDate`];
        const parsedDueDate = parseDueDateForTerm(dueDateRaw, tIndex);

        return {
          term: t,
          amount: formatGBP((bookingData as any)[`${tLower}Amount`] || 0),
          dueDate: formatDate(parsedDueDate),
          datePaid: formatDate((bookingData as any)[`${tLower}DatePaid`] || ""),
        };
      });

      freshVariables.totalAmount = formatGBP(
        bookingData.useDiscountedTourCost
          ? bookingData.discountedTourCost
          : bookingData.originalTourCost,
      );
      freshVariables.paid = formatGBP(bookingData.paid);
      freshVariables.remainingBalance = formatGBP(bookingData.remainingBalance);
    }

    const templateDoc = await getDoc(doc(db, "emailTemplates", templateId));
    if (!templateDoc.exists()) {
      throw new Error(`Template ${templateId} not found`);
    }

    const templateData = templateDoc.data();
    const rawTemplateHtml = templateData.content || "";

    const htmlContent = EmailTemplateService.processTemplate(
      rawTemplateHtml,
      freshVariables,
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scheduledEmailId } = await params;
    
    // Get the scheduled email document
    const emailDocRef = doc(db, "scheduledEmails", scheduledEmailId);
    const emailDoc = await getDoc(emailDocRef);

    if (!emailDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Scheduled email not found" },
        { status: 404 }
      );
    }

    const emailData = emailDoc.data();

    if (emailData.status !== "sent" && emailData.status !== "skipped" && emailData.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Only sent, skipped, or pending emails can be sent or resent" },
        { status: 400 }
      );
    }

    const gmailService = new GmailApiService();
    
    let emailSubject = emailData.subject;
    let emailHtmlContent = emailData.htmlContent;
    
    // Re-render template if payment reminder
    if (emailData.emailType === "payment-reminder" && emailData.bookingId && emailData.templateId && emailData.templateVariables) {
      try {
        const freshEmail = await rerenderEmailTemplate(emailData.bookingId, emailData.templateId, emailData.templateVariables);
        emailSubject = freshEmail.subject;
        emailHtmlContent = freshEmail.htmlContent;
      } catch (e) {
        console.warn("Failed to re-render template, using original content", e);
      }
    }

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
    await updateDoc(emailDocRef, {
      status: "sent",
      sentAt: Timestamp.now(),
      messageId: result.messageId,
      attempts: (emailData.attempts || 0) + 1,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ 
      success: true, 
      message: "Email resent successfully", 
      emailId: scheduledEmailId 
    });

  } catch (error) {
    console.error("Error in resend scheduled email API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to resend scheduled email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
