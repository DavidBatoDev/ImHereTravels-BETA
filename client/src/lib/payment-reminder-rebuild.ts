import { db } from "@/lib/firebase";
import { google } from "googleapis";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

const TERM_PREFIXES = ["p1", "p2", "p3", "p4"] as const;
const MAX_BATCH_UPDATES = 450;

type CalendarDeleteFailure = {
  eventId: string;
  reason: string;
};

export interface PaymentReminderRebuildResult {
  bookingId: string;
  reminderWasEnabled: boolean;
  reminderRegenerationQueued: boolean;
  scheduledEmailsFound: number;
  scheduledEmailsDeleted: number;
  calendarEventsFound: number;
  calendarDeleteAttempted: number;
  calendarEventsDeleted: number;
  calendarDeleteFailures: CalendarDeleteFailure[];
  fieldsCleared: boolean;
  warnings: string[];
  success: boolean;
  errors: string[];
}

interface RebuildPaymentReminderArtifactsInput {
  bookingId: string;
  bookingData?: Record<string, any> | null;
  reminderWasEnabled: boolean;
}

function collectCalendarEventIds(bookingData: Record<string, any>): string[] {
  const ids = new Set<string>();

  for (const prefix of TERM_PREFIXES) {
    const eventId = bookingData[`${prefix}CalendarEventId`];
    if (typeof eventId === "string" && eventId.trim()) {
      ids.add(eventId.trim());
    }
  }

  return Array.from(ids);
}

function buildClearReminderFieldsPayload(): Record<string, any> {
  const payload: Record<string, any> = {
    sentInitialReminderLink: "",
  };

  for (const prefix of TERM_PREFIXES) {
    payload[`${prefix}ScheduledEmailLink`] = "";
    payload[`${prefix}ScheduledReminderLink`] = "";
    payload[`${prefix}CalendarEventId`] = "";
    payload[`${prefix}CalendarEventLink`] = "";
  }

  return payload;
}

async function deleteScheduledReminderEmails(
  bookingId: string,
): Promise<{ found: number; deleted: number; error?: string }> {
  try {
    const scheduledEmailsRef = collection(db, "scheduledEmails");
    const remindersQuery = query(
      scheduledEmailsRef,
      where("bookingId", "==", bookingId),
      where("emailType", "==", "payment-reminder"),
    );
    const snapshot = await getDocs(remindersQuery);

    if (snapshot.empty) {
      return { found: 0, deleted: 0 };
    }

    let deleted = 0;
    let batch = writeBatch(db);
    let pendingDeletes = 0;

    for (const emailDoc of snapshot.docs) {
      batch.delete(emailDoc.ref);
      deleted += 1;
      pendingDeletes += 1;

      if (pendingDeletes >= MAX_BATCH_UPDATES) {
        await batch.commit();
        batch = writeBatch(db);
        pendingDeletes = 0;
      }
    }

    if (pendingDeletes > 0) {
      await batch.commit();
    }

    return {
      found: snapshot.docs.length,
      deleted,
    };
  } catch (error) {
    return {
      found: 0,
      deleted: 0,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete scheduled reminder emails.",
    };
  }
}

function createCalendarClient():
  | { calendar: ReturnType<typeof google.calendar>; warning?: undefined }
  | { calendar: null; warning: string } {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return {
      calendar: null,
      warning:
        "Missing Google OAuth credentials for calendar deletion (GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN).",
    };
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "urn:ietf:wg:oauth:2.0:oob",
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return {
    calendar: google.calendar({ version: "v3", auth: oauth2Client }),
  };
}

async function bestEffortDeleteCalendarEvents(
  eventIds: string[],
): Promise<{
  attempted: number;
  deleted: number;
  failures: CalendarDeleteFailure[];
  warning?: string;
}> {
  if (eventIds.length === 0) {
    return { attempted: 0, deleted: 0, failures: [] };
  }

  const { calendar, warning } = createCalendarClient();
  if (!calendar) {
    return {
      attempted: eventIds.length,
      deleted: 0,
      failures: eventIds.map((eventId) => ({
        eventId,
        reason: warning,
      })),
      warning,
    };
  }

  const failures: CalendarDeleteFailure[] = [];
  let deleted = 0;

  for (const eventId of eventIds) {
    try {
      await calendar.events.delete({
        calendarId: "primary",
        eventId,
      });
      deleted += 1;
    } catch (error) {
      failures.push({
        eventId,
        reason:
          error instanceof Error
            ? error.message
            : "Failed to delete calendar event.",
      });
    }
  }

  return {
    attempted: eventIds.length,
    deleted,
    failures,
    warning,
  };
}

export async function rebuildPaymentReminderArtifactsForBooking({
  bookingId,
  bookingData,
  reminderWasEnabled,
}: RebuildPaymentReminderArtifactsInput): Promise<PaymentReminderRebuildResult> {
  const result: PaymentReminderRebuildResult = {
    bookingId,
    reminderWasEnabled,
    reminderRegenerationQueued: false,
    scheduledEmailsFound: 0,
    scheduledEmailsDeleted: 0,
    calendarEventsFound: 0,
    calendarDeleteAttempted: 0,
    calendarEventsDeleted: 0,
    calendarDeleteFailures: [],
    fieldsCleared: false,
    warnings: [],
    success: false,
    errors: [],
  };

  try {
    let currentBookingData = bookingData ?? null;
    if (!currentBookingData) {
      const bookingSnap = await getDoc(doc(db, "bookings", bookingId));
      if (!bookingSnap.exists()) {
        result.errors.push("Booking not found for reminder rebuild.");
        return result;
      }
      currentBookingData = bookingSnap.data() as Record<string, any>;
    }

    const deleteEmailResult = await deleteScheduledReminderEmails(bookingId);
    result.scheduledEmailsFound = deleteEmailResult.found;
    result.scheduledEmailsDeleted = deleteEmailResult.deleted;
    if (deleteEmailResult.error) {
      result.warnings.push(deleteEmailResult.error);
    }

    const calendarEventIds = collectCalendarEventIds(currentBookingData);
    result.calendarEventsFound = calendarEventIds.length;

    const calendarDeleteResult =
      await bestEffortDeleteCalendarEvents(calendarEventIds);
    result.calendarDeleteAttempted = calendarDeleteResult.attempted;
    result.calendarEventsDeleted = calendarDeleteResult.deleted;
    result.calendarDeleteFailures = calendarDeleteResult.failures;
    if (calendarDeleteResult.warning) {
      result.warnings.push(calendarDeleteResult.warning);
    }
    if (calendarDeleteResult.failures.length > 0) {
      result.warnings.push(
        `Failed to delete ${calendarDeleteResult.failures.length} calendar event(s).`,
      );
    }

    const clearPayload = buildClearReminderFieldsPayload();
    await updateDoc(doc(db, "bookings", bookingId), {
      ...clearPayload,
      enablePaymentReminder: false,
      updatedAt: new Date(),
    });
    result.fieldsCleared = true;

    if (reminderWasEnabled) {
      await updateDoc(doc(db, "bookings", bookingId), {
        enablePaymentReminder: true,
        updatedAt: new Date(),
      });
      result.reminderRegenerationQueued = true;
    }

    result.success = true;
    return result;
  } catch (error) {
    result.errors.push(
      error instanceof Error
        ? error.message
        : "Unexpected error while rebuilding payment reminders.",
    );
    result.success = false;
    return result;
  }
}
