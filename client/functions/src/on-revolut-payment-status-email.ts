import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import GmailApiService from "./gmail-api-service";
import EmailTemplateService from "./email-template-service";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const APPROVED_TEMPLATE_NAME = "Revolut Payment Approved";
const REJECTED_TEMPLATE_NAME = "Revolut Payment Rejected";

type PaymentStatus = "pending" | "approved" | "rejected";

type RevolutPaymentDoc = {
  payment?: {
    status?: PaymentStatus;
    installmentTerm?: string;
  };
  customer?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  timestamps?: {
    createdAt?: any;
    updatedAt?: any;
  };
  booking?: {
    documentId?: string;
  };
  bookingDocumentId?: string;
  notifications?: {
    approvalEmailSentAt?: any;
    rejectionEmailSentAt?: any;
    approvalEmailMessageId?: string;
    rejectionEmailMessageId?: string;
  };
};

function getStatus(data: RevolutPaymentDoc | undefined): PaymentStatus | null {
  return data?.payment?.status || null;
}

function formatDateLikeSheets(dateValue: any): string {
  if (!dateValue) {
    return "";
  }

  try {
    let date: Date | null = null;

    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (dateValue?._seconds) {
      date = new Date(dateValue._seconds * 1000);
    } else if (dateValue?.seconds) {
      date = new Date(dateValue.seconds * 1000);
    } else if (dateValue?.toDate && typeof dateValue.toDate === "function") {
      date = dateValue.toDate();
    } else if (typeof dateValue === "string" && dateValue.trim()) {
      date = new Date(dateValue.trim());
    }

    if (!date || Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    });
  } catch (error) {
    logger.warn("Unable to format date for Revolut status email", {
      error,
      dateValue,
    });
    return "";
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function formatInstallmentTerm(term: string | undefined): string {
  const normalized = String(term || "").toLowerCase().trim();

  switch (normalized) {
    case "full_payment":
      return "Full Payment";
    case "p1":
      return "P1";
    case "p2":
      return "P2";
    case "p3":
      return "P3";
    case "p4":
      return "P4";
    default:
      return normalized || "Payment";
  }
}

async function getBCCList(): Promise<string[]> {
  try {
    const bccUsersSnap = await db.collection("bcc-users").get();

    return bccUsersSnap.docs
      .map((snapshot) => snapshot.data())
      .filter((user: any) => user.isActive === true)
      .map((user: any) => String(user.email || "").trim())
      .filter((email: string) => email.length > 0);
  } catch (error) {
    logger.error("Failed to fetch active BCC users", error);
    return [];
  }
}

async function getTemplateByName(templateName: string): Promise<any | null> {
  const templatesSnap = await db
    .collection("emailTemplates")
    .where("name", "==", templateName)
    .limit(5)
    .get();

  if (templatesSnap.empty) {
    return null;
  }

  const preferred =
    templatesSnap.docs.find(
      (template) => template.data().status === "active",
    ) || templatesSnap.docs[0];

  return preferred.data();
}

export const onRevolutPaymentStatusEmail = onDocumentUpdated(
  {
    document: "revolutPayments/{paymentId}",
    region: "asia-southeast1",
    timeoutSeconds: 300,
    memory: "1GiB",
  },
  async (event) => {
    const paymentId = event.params.paymentId as string;
    const beforeData = event.data?.before.data() as
      | RevolutPaymentDoc
      | undefined;
    const afterData = event.data?.after.data() as RevolutPaymentDoc | undefined;

    if (!beforeData || !afterData) {
      logger.info("Skipping Revolut status email - missing before/after data", {
        paymentId,
      });
      return;
    }

    const beforeStatus = getStatus(beforeData);
    const afterStatus = getStatus(afterData);

    if (!beforeStatus || !afterStatus || beforeStatus === afterStatus) {
      logger.info("Skipping Revolut status email - no status transition", {
        paymentId,
        beforeStatus,
        afterStatus,
      });
      return;
    }

    if (afterStatus !== "approved" && afterStatus !== "rejected") {
      logger.info("Skipping Revolut status email - unsupported target status", {
        paymentId,
        beforeStatus,
        afterStatus,
      });
      return;
    }

    const notifications = afterData.notifications || {};

    if (afterStatus === "approved" && notifications.approvalEmailSentAt) {
      logger.info("Skipping approved email - already sent", { paymentId });
      return;
    }

    if (afterStatus === "rejected" && notifications.rejectionEmailSentAt) {
      logger.info("Skipping rejected email - already sent", { paymentId });
      return;
    }

    const bookingDocumentId =
      afterData.booking?.documentId || afterData.bookingDocumentId || "";

    if (!bookingDocumentId) {
      logger.warn("Skipping Revolut status email - missing booking reference", {
        paymentId,
      });
      return;
    }

    const bookingDoc = await db
      .collection("bookings")
      .doc(bookingDocumentId)
      .get();

    if (!bookingDoc.exists) {
      logger.warn(
        "Skipping Revolut status email - booking document not found",
        {
          paymentId,
          bookingDocumentId,
        },
      );
      return;
    }

    const bookingData = bookingDoc.data() || {};

    const travelerEmail = String(
      bookingData.emailAddress ||
        bookingData.email ||
        afterData.customer?.email ||
        "",
    ).trim();

    if (!travelerEmail || !travelerEmail.includes("@")) {
      logger.warn("Skipping Revolut status email - invalid traveler email", {
        paymentId,
        travelerEmail,
      });
      return;
    }

    const fullName =
      String(bookingData.fullName || "").trim() ||
      `${String(afterData.customer?.firstName || "").trim()} ${String(
        afterData.customer?.lastName || "",
      ).trim()}`.trim() ||
      "Traveler";

    const templateName =
      afterStatus === "approved"
        ? APPROVED_TEMPLATE_NAME
        : REJECTED_TEMPLATE_NAME;

    const templateData = await getTemplateByName(templateName);

    if (!templateData || !templateData.content) {
      logger.error("Skipping Revolut status email - template not found", {
        paymentId,
        templateName,
      });
      return;
    }

    const appBaseUrl = normalizeBaseUrl(
      process.env.NEXT_PUBLIC_APP_URL || "https://admin.imheretravels.com",
    );
    const accessToken = String(bookingData.access_token || "").trim();

    const bookingStatusUrl = accessToken
      ? `${appBaseUrl}/booking-status/${accessToken}`
      : "";

    const proofDate = formatDateLikeSheets(
      afterData.timestamps?.createdAt || afterData.timestamps?.updatedAt,
    );
    const installmentTermLabel = formatInstallmentTerm(
      afterData.payment?.installmentTerm,
    );

    const templateVariables: Record<string, any> = {
      fullName,
      proofDate,
      bookingStatusUrl,
      bookingId: bookingData.bookingId || "",
      installmentTerm: afterData.payment?.installmentTerm || "",
      installmentTermLabel,
      paymentStatus: afterStatus,
    };

    const processedHtml = EmailTemplateService.processTemplate(
      templateData.content,
      templateVariables,
    );

    const renderedSubject = EmailTemplateService.processTemplate(
      String(templateData.subject || "Payment Status Update"),
      templateVariables,
    );

    const bccList = await getBCCList();

    const gmailService = new GmailApiService();
    const sendResult = await gmailService.sendEmail({
      to: travelerEmail,
      subject: renderedSubject,
      htmlContent: processedHtml,
      bcc: bccList,
      from: "Bella | ImHereTravels <bella@imheretravels.com>",
    });

    const notificationUpdates: Record<string, any> = {
      "notifications.lastDecisionEmailStatus": afterStatus,
      "notifications.lastDecisionEmailMessageId": sendResult.messageId,
      "notifications.lastDecisionEmailSentAt": Timestamp.now(),
      "notifications.lastDecisionEmailEventId": event.id,
    };

    if (afterStatus === "approved") {
      notificationUpdates["notifications.approvalEmailSentAt"] =
        Timestamp.now();
      notificationUpdates["notifications.approvalEmailMessageId"] =
        sendResult.messageId;
    } else {
      notificationUpdates["notifications.rejectionEmailSentAt"] =
        Timestamp.now();
      notificationUpdates["notifications.rejectionEmailMessageId"] =
        sendResult.messageId;
    }

    await db
      .collection("revolutPayments")
      .doc(paymentId)
      .update(notificationUpdates);

    logger.info("✅ Revolut status decision email sent", {
      paymentId,
      bookingDocumentId,
      travelerEmail,
      status: afterStatus,
      messageId: sendResult.messageId,
      bccCount: bccList.length,
    });
  },
);
