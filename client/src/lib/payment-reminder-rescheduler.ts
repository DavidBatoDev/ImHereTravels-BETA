import { db } from "@/lib/firebase";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";

type Term = "P1" | "P2" | "P3" | "P4";

const TERM_REGEX = /\bP([1-4])\b/i;
const MAX_BATCH_UPDATES = 450;

export interface BookingReminderRescheduleResult {
  bookingId: string;
  examined: number;
  updated: number;
  skippedNonPending: number;
  skippedMissingTerm: number;
  skippedMissingDueDate: number;
  skippedInvalidDueDate: number;
  details: Array<{ emailId: string; term?: Term; reason: string }>;
}

export interface AllRemindersRescheduleResult {
  examined: number;
  updated: number;
  skippedMissingBookingId: number;
  skippedMissingBooking: number;
  skippedMissingTerm: number;
  skippedMissingDueDate: number;
  skippedInvalidDueDate: number;
  details: Array<{
    emailId: string;
    bookingId?: string;
    term?: Term;
    reason: string;
  }>;
}

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
  // SGT (UTC+8) 09:00 on local date => 01:00 UTC
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return new Date(Date.UTC(year, month, day, 1, 0, 0, 0));
}

function resolveReminderDate(
  dueDate: Date,
  reservationDateRaw: unknown,
): Date {
  const reservationDate = parseDateValue(reservationDateRaw);
  const candidateReminderDate = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate() - 14,
  );

  if (!reservationDate) return candidateReminderDate;

  return new Date(
    Math.max(
      candidateReminderDate.getTime(),
      new Date(
        reservationDate.getFullYear(),
        reservationDate.getMonth(),
        reservationDate.getDate(),
      ).getTime(),
    ),
  );
}

function extractBookingIdFromEmail(data: Record<string, any>): string {
  return (
    (typeof data.bookingId === "string" && data.bookingId) ||
    (typeof data.templateVariables?.bookingId === "string" &&
      data.templateVariables.bookingId) ||
    ""
  );
}

export async function reschedulePendingPaymentRemindersForBooking(
  bookingId: string,
  bookingDataOverride?: Record<string, any> | null,
): Promise<BookingReminderRescheduleResult> {
  let examined = 0;
  let updated = 0;
  let skippedNonPending = 0;
  let skippedMissingTerm = 0;
  let skippedMissingDueDate = 0;
  let skippedInvalidDueDate = 0;

  const details: Array<{ emailId: string; term?: Term; reason: string }> = [];

  let bookingData = bookingDataOverride ?? null;
  if (!bookingData) {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingDoc = await getDoc(bookingRef);
    if (!bookingDoc.exists()) {
      return {
        bookingId,
        examined,
        updated,
        skippedNonPending,
        skippedMissingTerm,
        skippedMissingDueDate,
        skippedInvalidDueDate,
        details: [{ emailId: "", reason: "booking-not-found" }],
      };
    }
    bookingData = bookingDoc.data() as Record<string, any>;
  }

  const scheduledEmailsRef = collection(db, "scheduledEmails");
  const remindersQuery = query(
    scheduledEmailsRef,
    where("bookingId", "==", bookingId),
    where("emailType", "==", "payment-reminder"),
  );
  const snapshot = await getDocs(remindersQuery);

  let batch = writeBatch(db);
  let pendingBatchUpdates = 0;

  for (const emailDoc of snapshot.docs) {
    examined += 1;
    const emailData = emailDoc.data() as Record<string, any>;

    if (emailData.status !== "pending") {
      skippedNonPending += 1;
      details.push({ emailId: emailDoc.id, reason: "non-pending-status" });
      continue;
    }

    const term = parseTermFromScheduledEmail(emailData);
    if (!term) {
      skippedMissingTerm += 1;
      details.push({ emailId: emailDoc.id, reason: "missing-term" });
      continue;
    }

    const dueDateKey = `${term.toLowerCase()}DueDate`;
    const dueDateRaw = bookingData[dueDateKey];
    if (!dueDateRaw) {
      skippedMissingDueDate += 1;
      details.push({ emailId: emailDoc.id, term, reason: "missing-due-date" });
      continue;
    }

    const parsedDueDate = parseDueDateForTerm(dueDateRaw, term);
    if (!parsedDueDate || Number.isNaN(parsedDueDate.getTime())) {
      skippedInvalidDueDate += 1;
      details.push({ emailId: emailDoc.id, term, reason: "invalid-due-date" });
      continue;
    }

    const reminderDate = resolveReminderDate(
      parsedDueDate,
      bookingData.reservationDate,
    );
    const scheduledFor = toSingapore9am(reminderDate);

    batch.update(emailDoc.ref, {
      scheduledFor: Timestamp.fromDate(scheduledFor),
      updatedAt: Timestamp.now(),
    });
    updated += 1;
    pendingBatchUpdates += 1;

    if (pendingBatchUpdates >= MAX_BATCH_UPDATES) {
      await batch.commit();
      batch = writeBatch(db);
      pendingBatchUpdates = 0;
    }
  }

  if (pendingBatchUpdates > 0) {
    await batch.commit();
  }

  return {
    bookingId,
    examined,
    updated,
    skippedNonPending,
    skippedMissingTerm,
    skippedMissingDueDate,
    skippedInvalidDueDate,
    details: details.slice(0, 30),
  };
}

export async function rescheduleAllPendingPaymentReminders(): Promise<AllRemindersRescheduleResult> {
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
    term?: Term;
    reason: string;
  }> = [];

  const scheduledEmailsRef = collection(db, "scheduledEmails");
  const remindersQuery = query(
    scheduledEmailsRef,
    where("emailType", "==", "payment-reminder"),
    where("status", "==", "pending"),
  );
  const snapshot = await getDocs(remindersQuery);

  const bookingCache = new Map<string, Record<string, any> | null>();
  let batch = writeBatch(db);
  let pendingBatchUpdates = 0;

  for (const emailDoc of snapshot.docs) {
    examined += 1;
    const emailData = emailDoc.data() as Record<string, any>;
    const bookingId = extractBookingIdFromEmail(emailData);

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
    const dueDateRaw = bookingData[dueDateKey];
    if (!dueDateRaw) {
      skippedMissingDueDate += 1;
      details.push({
        emailId: emailDoc.id,
        bookingId,
        term,
        reason: "missing-due-date",
      });
      continue;
    }

    const parsedDueDate = parseDueDateForTerm(dueDateRaw, term);
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

    const reminderDate = resolveReminderDate(
      parsedDueDate,
      bookingData.reservationDate,
    );
    const scheduledFor = toSingapore9am(reminderDate);

    batch.update(emailDoc.ref, {
      scheduledFor: Timestamp.fromDate(scheduledFor),
      updatedAt: Timestamp.now(),
    });
    updated += 1;
    pendingBatchUpdates += 1;

    if (pendingBatchUpdates >= MAX_BATCH_UPDATES) {
      await batch.commit();
      batch = writeBatch(db);
      pendingBatchUpdates = 0;
    }
  }

  if (pendingBatchUpdates > 0) {
    await batch.commit();
  }

  return {
    examined,
    updated,
    skippedMissingBookingId,
    skippedMissingBooking,
    skippedMissingTerm,
    skippedMissingDueDate,
    skippedInvalidDueDate,
    details: details.slice(0, 30),
  };
}
