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
      return date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
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
): Promise<{ subject: string; htmlContent: string; bcc?: string[] }> {
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

      // Always show all terms up to the payment plan
      const visibleTerms = availableTerms;

      // Re-render time is the resend time, so use now to determine Late status
      const sendDate = new Date();
      // Index of the term this email is reminding about
      const currentTermIdx = allTerms.indexOf(
        templateVariables.paymentTerm as string,
      );

      freshVariables.termData = visibleTerms.map((t) => {
        const tIndex = parseInt(t.replace("P", "")) - 1;
        const tLower = t.toLowerCase();
        const dueDateRaw = (bookingData as any)[`${tLower}DueDate`];
        const parsedDueDate = parseDueDateForTerm(dueDateRaw, tIndex);
        const dueDateStr = formatDate(parsedDueDate);
        const datePaidStr = formatDate((bookingData as any)[`${tLower}DatePaid`] || "");
        const isLate = !datePaidStr && !!dueDateStr && new Date(dueDateStr) < sendDate;
        const tIdx = allTerms.indexOf(t);
        const isUpcoming = !datePaidStr && !isLate && tIdx > currentTermIdx;

        return {
          term: t,
          amount: formatGBP((bookingData as any)[`${tLower}Amount`] || 0),
          dueDate: dueDateStr,
          datePaid: datePaidStr,
          isLate,
          isUpcoming,
        };
      });

      freshVariables.totalAmount = formatGBP(
        bookingData.useDiscountedTourCost
          ? bookingData.discountedTourCost
          : bookingData.originalTourCost,
      );
      freshVariables.reservationFee = formatGBP(bookingData.reservationFee);
      freshVariables.paidTerms = formatGBP(bookingData.paidTerms);
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

    let resolvedBcc: string[] = [];
    if (templateData.bccGroups && Array.isArray(templateData.bccGroups) && templateData.bccGroups.length > 0) {
      try {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        // 1. Literal emails
        const literalEmails = templateData.bccGroups.filter((g: any) => typeof g === "string" && emailRegex.test(g));
        resolvedBcc.push(...literalEmails);
        
        // 2. References to bcc-users (by ID or bccId)
        const refIds = templateData.bccGroups.filter((g: any) => typeof g === "string" && !emailRegex.test(g));
        
        if (refIds.length > 0) {
          // Chunk to handle Firestore "in" query limit of 10
          for (let i = 0; i < refIds.length; i += 10) {
            const chunk = refIds.slice(i, i + 10);
            
            // By bccId
            const bccIdQuery = query(collection(db, "bcc-users"), where("bccId", "in", chunk));
            const bccIdSnap = await getDocs(bccIdQuery);
            bccIdSnap.forEach(doc => {
              if (doc.data().email) resolvedBcc.push(doc.data().email);
            });
            
            // By document ID
            try {
              for (const id of chunk) {
                const docRef = doc(db, "bcc-users", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().email) {
                  resolvedBcc.push(docSnap.data().email);
                }
              }
            } catch (e) {
              console.warn("Failed querying bcc-users by document ID", e);
            }
          }
        }
      } catch (e) {
        console.error("Error resolving bcc groups:", e);
      }
    }

    return { subject, htmlContent, bcc: resolvedBcc };
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
    let emailBcc = emailData.bcc || [];
    
    // Re-render template if payment reminder
    if (emailData.emailType === "payment-reminder" && emailData.bookingId && emailData.templateId && emailData.templateVariables) {
      try {
        const freshEmail = await rerenderEmailTemplate(emailData.bookingId, emailData.templateId, emailData.templateVariables);
        emailSubject = freshEmail.subject;
        emailHtmlContent = freshEmail.htmlContent;
        if (freshEmail.bcc && freshEmail.bcc.length > 0) {
          emailBcc = [...new Set([...emailBcc, ...freshEmail.bcc])];
        }
      } catch (e) {
        console.warn("Failed to re-render template, using original content", e);
      }
    }

    const result = await gmailService.sendEmail({
      to: emailData.to,
      subject: emailSubject,
      htmlContent: emailHtmlContent,
      bcc: emailBcc,
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
