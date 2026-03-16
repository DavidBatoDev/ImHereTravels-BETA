import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

if (getApps().length === 0) {
  const serviceAccountPath = path.resolve(
    __dirname,
    "../../keys/prod-project-service-account.json",
  );
  console.log(`Using service account key file: ${serviceAccountPath}`);
  initializeApp({
    credential: cert(serviceAccountPath),
  });
}

const db = getFirestore();

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

  if (dueDateValue instanceof Date && !Number.isNaN(dueDateValue.getTime())) {
    return dueDateValue;
  }

  if (
    typeof dueDateValue === "object" &&
    dueDateValue !== null &&
    "seconds" in (dueDateValue as any) &&
    typeof (dueDateValue as any).seconds === "number"
  ) {
    const ts = dueDateValue as { seconds: number; nanoseconds?: number };
    return new Date(
      ts.seconds * 1000 + Math.floor((ts.nanoseconds ?? 0) / 1e6),
    );
  }

  if (typeof dueDateValue === "string") {
    const raw = dueDateValue.trim();
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

function toSingapore9am(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return new Date(Date.UTC(year, month, day, 1, 0, 0, 0));
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isProduction = args.includes("--production");

  if (!isDryRun && !isProduction) {
    console.error("ERROR: You must specify either --dry-run or --production");
    console.error("Usage:");
    console.error(
      "  npm run reschedule-pending-payment-reminders -- --dry-run",
    );
    console.error(
      "  npm run reschedule-pending-payment-reminders -- --production",
    );
    process.exit(1);
  }

  console.log("\n" + "=".repeat(80));
  console.log("PENDING PAYMENT REMINDER RESCHEDULE SCRIPT");
  console.log("=".repeat(80));
  console.log(
    `Mode: ${
      isDryRun
        ? "DRY RUN (no changes will be made)"
        : "PRODUCTION (will update data)"
    }`,
  );
  console.log("Rule: dueDate - 14 days at 09:00 Asia/Singapore");
  console.log(
    "Scope: scheduledEmails where emailType=payment-reminder and status=pending",
  );
  console.log("=".repeat(80) + "\n");

  const snapshot = await db
    .collection("scheduledEmails")
    .where("emailType", "==", "payment-reminder")
    .get();

  console.log(`Fetched ${snapshot.size} payment reminder scheduled emails`);

  let examined = 0;
  let pendingCount = 0;
  let updated = 0;
  let skippedNonPending = 0;
  let skippedMissingBooking = 0;
  let skippedMissingTerm = 0;
  let skippedMissingDueDate = 0;
  let skippedInvalidDueDate = 0;

  const bookingCache: Record<string, Record<string, any> | null> = {};
  const updates: Array<{ id: string; scheduledFor: Date }> = [];

  for (const emailDoc of snapshot.docs) {
    examined += 1;
    const emailData = emailDoc.data() as Record<string, any>;

    if (emailData.status !== "pending") {
      skippedNonPending += 1;
      continue;
    }
    pendingCount += 1;

    const bookingId =
      (typeof emailData.bookingId === "string" && emailData.bookingId) ||
      (typeof emailData.templateVariables?.bookingId === "string" &&
        emailData.templateVariables.bookingId) ||
      "";

    if (!bookingId) {
      skippedMissingBooking += 1;
      continue;
    }

    if (!(bookingId in bookingCache)) {
      const bookingRef = db.collection("bookings").doc(bookingId);
      const bookingDoc = await bookingRef.get();
      bookingCache[bookingId] = bookingDoc.exists
        ? (bookingDoc.data() as Record<string, any>)
        : null;
    }

    const booking = bookingCache[bookingId];
    if (!booking) {
      skippedMissingBooking += 1;
      continue;
    }

    const term = parseTermFromScheduledEmail(emailData);
    if (!term) {
      skippedMissingTerm += 1;
      continue;
    }

    const dueDateKey = `${term.toLowerCase()}DueDate`;
    if (!booking[dueDateKey]) {
      skippedMissingDueDate += 1;
      continue;
    }

    const parsedDueDate = parseDueDateForTerm(booking[dueDateKey], term);
    if (!parsedDueDate || Number.isNaN(parsedDueDate.getTime())) {
      skippedInvalidDueDate += 1;
      continue;
    }

    const reminderDate = new Date(
      parsedDueDate.getFullYear(),
      parsedDueDate.getMonth(),
      parsedDueDate.getDate() - 14,
    );
    const scheduledFor = toSingapore9am(reminderDate);

    updates.push({ id: emailDoc.id, scheduledFor });
    updated += 1;
  }

  console.log("\n" + "=".repeat(80));
  console.log("ANALYSIS SUMMARY");
  console.log("=".repeat(80));
  console.log(`Examined: ${examined}`);
  console.log(`Pending in scope: ${pendingCount}`);
  console.log(`Will update: ${updated}`);
  console.log(`Skipped (non-pending): ${skippedNonPending}`);
  console.log(`Skipped (missing booking): ${skippedMissingBooking}`);
  console.log(`Skipped (missing term): ${skippedMissingTerm}`);
  console.log(`Skipped (missing due date): ${skippedMissingDueDate}`);
  console.log(`Skipped (invalid due date): ${skippedInvalidDueDate}`);
  console.log("=".repeat(80) + "\n");

  if (updates.length > 0) {
    console.log("Sample updates (first 10):");
    updates.slice(0, 10).forEach((item) => {
      console.log(`  ${item.id} -> ${item.scheduledFor.toISOString()}`);
    });
    if (updates.length > 10) {
      console.log(`  ... and ${updates.length - 10} more`);
    }
    console.log("");
  }

  if (isDryRun) {
    console.log("Dry run complete. No writes performed.");
    return;
  }

  const batchSize = 500;
  let batch = db.batch();
  let pendingBatchOps = 0;
  let committed = 0;

  for (const item of updates) {
    const ref = db.collection("scheduledEmails").doc(item.id);
    batch.update(ref, {
      scheduledFor: Timestamp.fromDate(item.scheduledFor),
      updatedAt: Timestamp.now(),
      rescheduleSource: "pending-payment-reminder-migration",
    });
    pendingBatchOps += 1;

    if (pendingBatchOps === batchSize) {
      await batch.commit();
      committed += pendingBatchOps;
      console.log(`Committed ${committed}/${updates.length}`);
      batch = db.batch();
      pendingBatchOps = 0;
    }
  }

  if (pendingBatchOps > 0) {
    await batch.commit();
    committed += pendingBatchOps;
  }

  console.log("\nMigration complete");
  console.log(`Updated documents: ${committed}`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
