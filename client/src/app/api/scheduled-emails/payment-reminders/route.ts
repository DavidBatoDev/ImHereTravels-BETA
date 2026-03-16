import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";

type Term = "P1" | "P2" | "P3" | "P4";
const TERM_REGEX = /\bP([1-4])\b/i;

function parseTermFromScheduledEmail(data: Record<string, any>): Term | null {
  const fromTemplate = data?.templateVariables?.paymentTerm;
  if (typeof fromTemplate === "string") {
    const normalized = fromTemplate.toUpperCase();
    if (["P1", "P2", "P3", "P4"].includes(normalized)) {
      return normalized as Term;
    }
  }

  const subject = typeof data?.subject === "string" ? data.subject : "";
  const match = subject.match(TERM_REGEX);
  if (!match?.[1]) return null;
  return `P${match[1]}` as Term;
}

function parseDateValue(rawValue: unknown): Date | null {
  if (!rawValue) return null;

  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
    return rawValue;
  }

  if (
    typeof rawValue === "object" &&
    rawValue !== null &&
    "seconds" in (rawValue as any) &&
    typeof (rawValue as any).seconds === "number"
  ) {
    const ts = rawValue as { seconds: number; nanoseconds?: number };
    return new Date(ts.seconds * 1000 + Math.floor((ts.nanoseconds ?? 0) / 1e6));
  }

  if (typeof rawValue === "string") {
    const raw = rawValue.trim();
    if (!raw) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [yyyy, mm, dd] = raw.split("-").map(Number);
      return new Date(yyyy, mm - 1, dd);
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [dd, mm, yyyy] = raw.split("/").map(Number);
      return new Date(yyyy, mm - 1, dd);
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function parseDueDateForTerm(dueDateRaw: unknown, term: Term): Date | null {
  if (!dueDateRaw) return null;

  const termIndex = Number(term[1]) - 1;
  let dueDateValue: unknown = dueDateRaw;

  if (typeof dueDateRaw === "string" && dueDateRaw.includes(",")) {
    const parts = dueDateRaw.split(",").map((part) => part.trim());
    if (parts.length > termIndex * 2 + 1) {
      dueDateValue = `${parts[termIndex * 2]}, ${parts[termIndex * 2 + 1]}`;
    }
  }

  return parseDateValue(dueDateValue);
}

function toSingapore9am(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return new Date(Date.UTC(year, month, day, 1, 0, 0, 0));
}

/**
 * PATCH /api/scheduled-emails/payment-reminders
 * Recompute scheduledFor for ALL pending payment reminders.
 * Rule: max(term due date - 14 days, reservation date) at Asia/Singapore 09:00.
 */
export async function PATCH(request: NextRequest) {
  try {
    const scheduledEmailsRef = collection(db, "scheduledEmails");
    const q = query(
      scheduledEmailsRef,
      where("emailType", "==", "payment-reminder"),
      where("status", "==", "pending"),
    );

    const snapshot = await getDocs(q);

    let examined = 0;
    let updated = 0;
    let skippedMissingBookingId = 0;
    let skippedMissingBooking = 0;
    let skippedMissingTerm = 0;
    let skippedMissingDueDate = 0;
    let skippedInvalidDueDate = 0;

    const details: Array<{
      emailId: string;
      bookingId?: string;
      term?: string;
      reason: string;
    }> = [];

    const bookingCache = new Map<string, Record<string, any> | null>();
    const batch = writeBatch(db);

    for (const emailDoc of snapshot.docs) {
      examined += 1;
      const emailData = emailDoc.data() as Record<string, any>;

      const bookingId =
        (typeof emailData.bookingId === "string" && emailData.bookingId) ||
        (typeof emailData.templateVariables?.bookingId === "string" &&
          emailData.templateVariables.bookingId) ||
        "";

      if (!bookingId) {
        skippedMissingBookingId += 1;
        details.push({ emailId: emailDoc.id, reason: "missing-booking-id" });
        continue;
      }

      if (!bookingCache.has(bookingId)) {
        const bookingRef = doc(db, "bookings", bookingId);
        const bookingDoc = await getDoc(bookingRef);
        bookingCache.set(
          bookingId,
          bookingDoc.exists()
            ? (bookingDoc.data() as Record<string, any>)
            : null,
        );
      }

      const bookingData = bookingCache.get(bookingId);
      if (!bookingData) {
        skippedMissingBooking += 1;
        details.push({
          emailId: emailDoc.id,
          bookingId,
          reason: "booking-not-found",
        });
        continue;
      }

      const term = parseTermFromScheduledEmail(emailData);
      if (!term) {
        skippedMissingTerm += 1;
        details.push({
          emailId: emailDoc.id,
          bookingId,
          reason: "missing-term",
        });
        continue;
      }

      const dueDateKey = `${term.toLowerCase()}DueDate`;
      if (!bookingData[dueDateKey]) {
        skippedMissingDueDate += 1;
        details.push({
          emailId: emailDoc.id,
          bookingId,
          term,
          reason: "missing-due-date",
        });
        continue;
      }

      const parsedDueDate = parseDueDateForTerm(bookingData[dueDateKey], term);
      if (!parsedDueDate || Number.isNaN(parsedDueDate.getTime())) {
        skippedInvalidDueDate += 1;
        details.push({
          emailId: emailDoc.id,
          bookingId,
          term,
          reason: "invalid-due-date",
        });
        continue;
      }

      const parsedReservationDate = parseDateValue(bookingData.reservationDate);

      const candidateReminderDate = new Date(
        parsedDueDate.getFullYear(),
        parsedDueDate.getMonth(),
        parsedDueDate.getDate() - 14,
      );
      const reminderDate = parsedReservationDate
        ? new Date(
            Math.max(
              candidateReminderDate.getTime(),
              new Date(
                parsedReservationDate.getFullYear(),
                parsedReservationDate.getMonth(),
                parsedReservationDate.getDate(),
              ).getTime(),
            ),
          )
        : candidateReminderDate;
      const scheduledFor = toSingapore9am(reminderDate);

      batch.update(emailDoc.ref, {
        scheduledFor: Timestamp.fromDate(scheduledFor),
        updatedAt: Timestamp.now(),
      });
      updated += 1;
    }

    if (updated > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      data: {
        examined,
        updated,
        skippedMissingBookingId,
        skippedMissingBooking,
        skippedMissingTerm,
        skippedMissingDueDate,
        skippedInvalidDueDate,
        details: details.slice(0, 30),
      },
    });
  } catch (error) {
    console.error("Error rescheduling all pending payment reminders:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to reschedule all pending payment reminders",
      },
      { status: 500 },
    );
  }
}
