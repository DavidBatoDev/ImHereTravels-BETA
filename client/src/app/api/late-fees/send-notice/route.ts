import { NextRequest, NextResponse } from "next/server";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import EmailTemplateService from "@/services/email-template-service";
import GmailApiService from "@/lib/gmail/gmail-api-service";

type TermKey = "p1" | "p2" | "p3" | "p4";

type LateFeesConfig = {
  penaltyPercent?: number;
  graceDays?: number;
};

function asDate(value: any): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      const parsed = value.toDate();
      return parsed instanceof Date && !Number.isNaN(parsed.getTime())
        ? parsed
        : null;
    }

    if (typeof value.seconds === "number") {
      const parsed = new Date(value.seconds * 1000);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof value._seconds === "number") {
      const parsed = new Date(value._seconds * 1000);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  return null;
}

function parseTermDueDate(dueDateRaw: any, termIndex: number): Date | null {
  if (!dueDateRaw) return null;

  if (typeof dueDateRaw === "string" && dueDateRaw.includes(",")) {
    const parts = dueDateRaw.split(",").map((part) => part.trim());
    const partStart = termIndex * 2;
    const partEnd = partStart + 1;

    if (parts.length > partEnd) {
      return asDate(`${parts[partStart]}, ${parts[partEnd]}`);
    }
  }

  return asDate(dueDateRaw);
}

function getTermIndex(termKey: TermKey): number {
  switch (termKey) {
    case "p1":
      return 0;
    case "p2":
      return 1;
    case "p3":
      return 2;
    case "p4":
      return 3;
  }
}

function formatGBP(value: number): string {
  return `£${value.toFixed(2)}`;
}

function getTermLabel(termKey: TermKey): string {
  return termKey.toUpperCase();
}

function getGmailSentUrl(messageId: string): string {
  return `https://mail.google.com/mail/u/0/#sent/${messageId}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bookingId = String(body?.bookingId || "").trim();
    const termKey = String(body?.termKey || "")
      .trim()
      .toLowerCase() as TermKey;
    const resend = Boolean(body?.resend);

    if (!bookingId || !["p1", "p2", "p3", "p4"].includes(termKey)) {
      return NextResponse.json(
        {
          success: false,
          error: "bookingId and valid termKey (p1-p4) are required",
        },
        { status: 400 },
      );
    }

    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: "Booking not found",
        },
        { status: 404 },
      );
    }

    const booking = bookingSnap.data() as Record<string, any>;

    if (!booking.emailAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "Booking has no recipient email",
        },
        { status: 400 },
      );
    }

    const termIndex = getTermIndex(termKey);
    const termLabel = getTermLabel(termKey);
    const now = new Date();

    const termAmount = Number(booking[`${termKey}Amount`] || 0);
    const dueDate = parseTermDueDate(booking[`${termKey}DueDate`], termIndex);
    const datePaid = asDate(booking[`${termKey}DatePaid`]);

    if (!dueDate || termAmount <= 0 || datePaid) {
      return NextResponse.json(
        {
          success: false,
          error: "Selected term is not eligible for notice",
        },
        { status: 400 },
      );
    }

    const configSnap = await getDoc(doc(db, "config", "late-fees"));
    const config = (configSnap.data() || {}) as LateFeesConfig;
    const penaltyPercent = Number(config.penaltyPercent ?? 3);
    const graceDays = Number(config.graceDays ?? 3);

    const graceCutoff = new Date(dueDate.getTime());
    graceCutoff.setDate(graceCutoff.getDate() + graceDays);
    if (now < graceCutoff) {
      return NextResponse.json(
        {
          success: false,
          error: "Term is still within grace period",
        },
        { status: 400 },
      );
    }

    const templateSnapshot = await getDocs(
      query(
        collection(db, "emailTemplates"),
        where("name", "==", "Late Fee Notice"),
        limit(5),
      ),
    );

    const templateDoc =
      templateSnapshot.docs.find(
        (entry) => entry.data()?.status === "active",
      ) || templateSnapshot.docs[0];

    const templateData = templateDoc?.data() ?? null;

    let penaltyAmount = Number(booking[`${termKey}LateFeesPenalty`] || 0);
    let appliedPenaltyNow = false;

    if (penaltyAmount <= 0) {
      penaltyAmount = Number(((termAmount * penaltyPercent) / 100).toFixed(2));
      const nowTimestamp = Timestamp.now();

      const applied = await runTransaction(db, async (transaction) => {
        const freshSnapshot = await transaction.get(bookingRef);
        const freshData = (freshSnapshot.data() || {}) as Record<string, any>;
        const freshPenalty = Number(
          freshData[`${termKey}LateFeesPenalty`] || 0,
        );
        const freshAppliedAt = freshData[`${termKey}LateFeeAppliedAt`];

        if (freshPenalty > 0 || freshAppliedAt) {
          return false;
        }

        const freshRemainingBalance = Number(freshData.remainingBalance || 0);
        const freshUpdatedRemaining = Number(
          (freshRemainingBalance + penaltyAmount).toFixed(2),
        );
        const totalLateFees =
          Number(freshData.totalLateFees || 0) + penaltyAmount;

        transaction.update(bookingRef, {
          [`${termKey}LateFeesPenalty`]: penaltyAmount,
          [`${termKey}LateFeeAppliedAt`]: nowTimestamp,
          remainingBalance: freshUpdatedRemaining,
          totalLateFees: Number(totalLateFees.toFixed(2)),
          updatedAt: nowTimestamp,
        });

        return true;
      });

      appliedPenaltyNow = applied;

      const refreshedBookingSnap = await getDoc(bookingRef);
      const refreshedBooking = refreshedBookingSnap.data() as Record<
        string,
        any
      >;
      penaltyAmount = Number(
        refreshedBooking?.[`${termKey}LateFeesPenalty`] || penaltyAmount,
      );
    }

    const refreshedBookingSnap = await getDoc(bookingRef);
    const refreshedBooking = refreshedBookingSnap.data() as Record<string, any>;
    const remainingBalance = Number(
      refreshedBooking?.remainingBalance || booking.remainingBalance || 0,
    );

    const daysOverdue = Math.max(
      0,
      Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const bookingCode =
      refreshedBooking?.bookingId || refreshedBooking?.bookingCode || bookingId;
    const bookingStatusUrl = refreshedBooking?.access_token
      ? `https://admin.imheretravels.com/booking-status/${refreshedBooking.access_token}`
      : "";

    const templateVariables = {
      fullName: refreshedBooking?.fullName || "Customer",
      paymentTerm: termLabel,
      bookingCode,
      tourPackageName: refreshedBooking?.tourPackageName || "",
      originalAmount: formatGBP(termAmount),
      lateFeeAmount: formatGBP(penaltyAmount),
      dueDate: dueDate.toLocaleDateString("en-CA", {
        timeZone: "Asia/Manila",
      }),
      daysOverdue,
      updatedRemainingBalance: formatGBP(remainingBalance),
      bookingStatusUrl,
    };

    const subjectTemplate =
      templateData?.subject ||
      "Action Required: Late Fee Applied to {{ paymentTerm }}";
    const htmlTemplate =
      templateData?.content ||
      "<p>Hi {{ fullName }}, a late fee of {{ lateFeeAmount }} was applied to {{ paymentTerm }}.</p>";

    const subject = EmailTemplateService.processTemplate(
      subjectTemplate,
      templateVariables,
    );
    const htmlContent = EmailTemplateService.processTemplate(
      htmlTemplate,
      templateVariables,
    );

    const gmailService = new GmailApiService();
    const sendResult = await gmailService.sendEmail({
      to: refreshedBooking?.emailAddress,
      subject,
      htmlContent,
    });

    const noticeUrl = getGmailSentUrl(sendResult.messageId);
    await updateDoc(bookingRef, {
      [`${termKey}LateFeesNoticeLink`]: noticeUrl,
      [`${termKey}LateFeeNoticeSentAt`]: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await addDoc(collection(db, "lateFeeNotices"), {
      bookingDocumentId: bookingId,
      bookingId: bookingCode,
      paymentTerm: termLabel,
      recipientName: refreshedBooking?.fullName || "",
      recipientEmail: refreshedBooking?.emailAddress || "",
      tourPackageName: refreshedBooking?.tourPackageName || "",
      originalAmount: termAmount,
      lateFeeAmount: penaltyAmount,
      dueDate: dueDate.toLocaleDateString("en-CA", {
        timeZone: "Asia/Manila",
      }),
      daysOverdue,
      updatedRemainingBalance: remainingBalance,
      status: "sent",
      sentEmailLink: noticeUrl,
      sentAt: Timestamp.now(),
      source: resend ? "manual-row-resend" : "manual-row-apply",
      createdAt: Timestamp.now(),
      lastModified: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      data: {
        bookingId,
        termKey,
        noticeUrl,
        appliedPenaltyNow,
      },
    });
  } catch (error) {
    console.error("Error in late-fees send-notice:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send late fee notice",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
