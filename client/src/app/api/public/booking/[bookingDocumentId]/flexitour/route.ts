import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  calculateScheduledReminderDates,
  calculatePaymentPlanUpdate,
  getAvailablePaymentTerms,
  getDaysBetweenDates,
  getEligible2ndOfMonths,
  getPaymentCondition,
  normalizeTourDateToUTCPlus8Nine,
} from "@/lib/booking-calculations";
import getTotalPaidAmountFunction from "@/app/functions/columns/payment-setting/paid";
import getPaidTerms from "@/app/functions/columns/payment-setting/paid-terms";
import getRemainingBalanceFunction from "@/app/functions/columns/payment-setting/remaining-balance";
import bookingStatusFunction from "@/app/functions/columns/payment-setting/booking-status";
import paymentProgressFunction from "@/app/functions/columns/payment-setting/payment-progress";
import { rebuildPaymentReminderArtifactsForBooking } from "@/lib/payment-reminder-rebuild";
import GmailApiService from "@/lib/gmail/gmail-api-service";

const FLEXITOUR_DEFAULT_MAX_CHANGES = 3;
const GROUP_BOOKING_TYPES = new Set(["Duo Booking", "Group Booking"]);
const FLEXITOUR_ALLOWED_PAYMENT_PLANS = new Set([
  "Full Payment",
  "P1",
  "P2",
  "P3",
  "P4",
]);
const GUEST_PLAN_SELECTION_REQUIRED_REASON = "flexitour_date_change";
const FLEXITOUR_DATE_CHANGE_EMAIL_SUBJECT =
  "Action needed: Choose your new payment plan";

type GuestNotificationCandidate = {
  bookingDocumentId: string;
  bookingId: string;
  accessToken: string;
  emailAddress: string;
  fullName: string;
  tourPackageName: string;
  newTourDate: string;
  remainingBalance: number;
};

type GuestNotificationFailure = {
  bookingDocumentId: string;
  bookingId: string;
  emailAddress: string;
  error: string;
};

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

  if (
    typeof rawValue === "object" &&
    rawValue !== null &&
    "toDate" in (rawValue as any) &&
    typeof (rawValue as any).toDate === "function"
  ) {
    try {
      const parsed = (rawValue as any).toDate();
      if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch {
      return null;
    }
  }

  if (typeof rawValue === "string") {
    const raw = rawValue.trim();
    if (!raw) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [yyyy, mm, dd] = raw.split("-").map(Number);
      return new Date(Date.UTC(yyyy, mm - 1, dd));
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function parseDueDateValue(rawValue: unknown): Date | null {
  if (typeof rawValue === "string") {
    const raw = rawValue.trim();
    if (!raw) return null;

    const explicitDateMatch = raw.match(/[A-Za-z]{3}\s+\d{1,2},\s+\d{4}/);
    if (explicitDateMatch?.[0]) {
      const parsedExplicit = parseDateValue(explicitDateMatch[0]);
      if (parsedExplicit) return parsedExplicit;
    }

    if (raw.includes(",")) {
      const parts = raw.split(",").map((part) => part.trim());
      if (parts.length >= 2) {
        const firstDate = `${parts[0]}, ${parts[1]}`;
        const parsedFirstDate = parseDateValue(firstDate);
        if (parsedFirstDate) return parsedFirstDate;
      }

      const parsedFirstPart = parseDateValue(parts[0]);
      if (parsedFirstPart) return parsedFirstPart;
    }
  }

  return parseDateValue(rawValue);
}

function isDateOnOrAfterToday(date: Date): boolean {
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const targetUtc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  return targetUtc.getTime() >= todayUtc.getTime();
}

function formatDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDaysBetweenToday(date: Date): number {
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);

  const targetUtc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const diffTime = targetUtc.getTime() - todayUtc.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function extractDurationDays(durationValue: unknown): number | null {
  if (typeof durationValue === "number" && Number.isFinite(durationValue)) {
    return durationValue > 0 ? Math.floor(durationValue) : null;
  }

  if (typeof durationValue === "string") {
    const matches = durationValue.match(/\d+/g);
    if (!matches || matches.length === 0) return null;
    const values = matches.map((value) => parseInt(value, 10));
    const validValues = values.filter((value) => Number.isFinite(value) && value > 0);
    if (validValues.length === 0) return null;
    return Math.max(...validValues);
  }

  return null;
}

function calculateReturnDateKey(
  startDate: Date,
  durationValue: unknown,
): string {
  const durationDays = extractDurationDays(durationValue);
  if (!durationDays) return "";

  const endDate = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
    ),
  );
  endDate.setUTCDate(endDate.getUTCDate() + durationDays - 1);
  return formatDateKey(endDate);
}

function getFlexitourCount(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) return fallback;
  const intValue = Math.floor(parsed);
  return intValue < 0 ? fallback : intValue;
}

function normalizeTourDateInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function normalizePaymentPlanInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value.trim().replace(/\s+/g, "").toUpperCase();
  if (!compact) return null;

  if (compact === "FULLPAYMENT" || compact === "FULL_PAYMENT") {
    return "Full Payment";
  }

  if (/^P[1-4]$/.test(compact)) {
    return compact;
  }

  return null;
}

function getEligiblePaymentPlans(paymentCondition: string): string[] {
  if (!paymentCondition || paymentCondition === "Invalid Booking") return [];
  if (paymentCondition === "Last Minute Booking") return ["Full Payment"];

  const planMatch = paymentCondition.match(/P(\d)/);
  const maxTerms = planMatch ? Number(planMatch[1]) : 0;
  if (!Number.isFinite(maxTerms) || maxTerms <= 0) return [];

  const plans: string[] = [];
  for (let i = 1; i <= Math.min(4, maxTerms); i += 1) {
    plans.push(`P${i}`);
  }
  return plans;
}

function getInstallmentPlanTermCount(paymentPlan: string): number {
  const match = paymentPlan.match(/^P([1-4])$/);
  return match ? Number(match[1]) : 0;
}

function hasPaidDate(value: unknown): boolean {
  return parseDateValue(value) !== null;
}

function countPaidInstallmentTerms(bookingData: Record<string, any>): number {
  const paidDates = [
    bookingData.p1DatePaid,
    bookingData.p2DatePaid,
    bookingData.p3DatePaid,
    bookingData.p4DatePaid,
  ];

  return paidDates.filter((dateValue) => hasPaidDate(dateValue)).length;
}

function toNumberOrZero(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function escapeHtml(rawValue: unknown): string {
  const value = `${rawValue ?? ""}`;
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getBookingStatusUrl(accessToken: string): string {
  const baseUrl = (
    process.env.NEXT_PUBLIC_WEBSITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://admin.imheretravels.com"
  ).replace(/\/+$/, "");

  return `${baseUrl}/booking-status/${encodeURIComponent(accessToken)}`;
}

function buildGuestPlanSelectionEmailHtml(candidate: GuestNotificationCandidate): string {
  const safeName = escapeHtml(candidate.fullName || "Traveler");
  const safeTourName = escapeHtml(candidate.tourPackageName || "your tour");
  const safeTourDate = escapeHtml(candidate.newTourDate);
  const safeRemainingBalance = `£${candidate.remainingBalance.toFixed(2)}`;
  const safeBookingStatusUrl = escapeHtml(getBookingStatusUrl(candidate.accessToken));

  return `
<div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; font-size: 14px;">
  <p>Hi ${safeName},</p>
  <p>Your main booker updated your Flexitour date for <strong>${safeTourName}</strong>.</p>
  <p>
    <strong>New tour date:</strong> ${safeTourDate}<br />
    <strong>Current remaining balance:</strong> ${safeRemainingBalance}
  </p>
  <p>
    Your previous payment plan has been cleared for this updated date.
    Please select your new payment plan from your booking status page.
  </p>
  <p>
    <a href="${safeBookingStatusUrl}" target="_blank" rel="noopener noreferrer" style="background:#ef3340; color:#ffffff; text-decoration:none; padding:10px 16px; border-radius:6px; display:inline-block; font-weight:600;">
      Select New Payment Plan
    </a>
  </p>
  <p>If the button does not work, copy and paste this link into your browser:</p>
  <p><a href="${safeBookingStatusUrl}" target="_blank" rel="noopener noreferrer">${safeBookingStatusUrl}</a></p>
  <p>Best regards,<br />Im Here Travels Team</p>
</div>
`.trim();
}

async function sendGuestPlanSelectionNotifications(
  candidates: GuestNotificationCandidate[],
): Promise<{
  targeted: number;
  sent: number;
  failed: number;
  failures: GuestNotificationFailure[];
}> {
  if (candidates.length === 0) {
    return {
      targeted: 0,
      sent: 0,
      failed: 0,
      failures: [],
    };
  }

  const gmailService = new GmailApiService();
  let sentCount = 0;
  const failures: GuestNotificationFailure[] = [];

  for (const candidate of candidates) {
    try {
      await gmailService.sendEmail({
        to: candidate.emailAddress,
        subject: FLEXITOUR_DATE_CHANGE_EMAIL_SUBJECT,
        htmlContent: buildGuestPlanSelectionEmailHtml(candidate),
      });
      sentCount += 1;
    } catch (error) {
      failures.push({
        bookingDocumentId: candidate.bookingDocumentId,
        bookingId: candidate.bookingId,
        emailAddress: candidate.emailAddress,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send guest payment-plan selection email.",
      });
    }
  }

  return {
    targeted: candidates.length,
    sent: sentCount,
    failed: failures.length,
    failures,
  };
}

function lockPaidTermsOnPaymentFields(
  paymentFields: Record<string, any>,
  bookingData: Record<string, any>,
): Record<string, any> {
  const next = { ...paymentFields };
  const termPrefixes = ["p1", "p2", "p3", "p4"] as const;

  termPrefixes.forEach((prefix) => {
    if (!hasPaidDate(bookingData[`${prefix}DatePaid`])) return;

    next[`${prefix}DueDate`] = bookingData[`${prefix}DueDate`] ?? "";
    next[`${prefix}Amount`] = bookingData[`${prefix}Amount`] ?? "";
    next[`${prefix}ScheduledReminderDate`] =
      bookingData[`${prefix}ScheduledReminderDate`] ?? "";
  });

  if (hasPaidDate(bookingData.fullPaymentDatePaid)) {
    next.fullPaymentDueDate = bookingData.fullPaymentDueDate ?? "";
    next.fullPaymentAmount = bookingData.fullPaymentAmount ?? "";
  }

  return next;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingDocumentId: string }> },
) {
  try {
    const { bookingDocumentId } = await params;

    if (!bookingDocumentId) {
      return NextResponse.json(
        { success: false, error: "Access token is required" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    const newTourDateInput = normalizeTourDateInput(body?.newTourDate);
    const selectedPaymentPlan = normalizePaymentPlanInput(body?.paymentPlan);
    const email =
      typeof body?.email === "string" && body.email.trim()
        ? body.email.trim()
        : null;

    if (!newTourDateInput) {
      return NextResponse.json(
        { success: false, error: "newTourDate must be in YYYY-MM-DD format" },
        { status: 400 },
      );
    }

    if (!selectedPaymentPlan || !FLEXITOUR_ALLOWED_PAYMENT_PLANS.has(selectedPaymentPlan)) {
      return NextResponse.json(
        {
          success: false,
          error: "paymentPlan is required and must be one of: P1, P2, P3, P4, Full Payment.",
        },
        { status: 400 },
      );
    }

    const bookingQuery = query(
      collection(db, "bookings"),
      where("access_token", "==", bookingDocumentId),
      limit(1),
    );
    const bookingSnap = await getDocs(bookingQuery);

    if (bookingSnap.empty) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 },
      );
    }

    const viewerBookingDoc = bookingSnap.docs[0];
    const viewerBookingData = viewerBookingDoc.data() as Record<string, any>;

    if (email) {
      const bookingEmail = (viewerBookingData.emailAddress || "")
        .toString()
        .trim()
        .toLowerCase();
      if (bookingEmail !== email.toLowerCase()) {
        return NextResponse.json(
          { success: false, error: "Email does not match booking records" },
          { status: 403 },
        );
      }
    }

    const bookingType = (viewerBookingData.bookingType || "").toString();
    const isGroupBooking = GROUP_BOOKING_TYPES.has(bookingType);
    if (isGroupBooking && viewerBookingData.isMainBooker !== true) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only the main booker can reschedule Duo/Group bookings with Flexitour.",
        },
        { status: 403 },
      );
    }

    const mainBookerId =
      typeof viewerBookingData.mainBookerId === "string" &&
      viewerBookingData.mainBookerId
        ? viewerBookingData.mainBookerId
        : viewerBookingDoc.id;

    let mainBookingDocId = viewerBookingDoc.id;
    let mainBookingData = viewerBookingData;

    if (mainBookerId !== viewerBookingDoc.id) {
      const mainRef = doc(db, "bookings", mainBookerId);
      const mainSnap = await getDoc(mainRef);
      if (mainSnap.exists()) {
        mainBookingDocId = mainSnap.id;
        mainBookingData = mainSnap.data() as Record<string, any>;
      }
    }

    if (
      GROUP_BOOKING_TYPES.has((mainBookingData.bookingType || "").toString()) &&
      mainBookingData.isMainBooker !== true
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Main booker record is invalid for this group booking.",
        },
        { status: 400 },
      );
    }

    const flexitourMaxChanges = getFlexitourCount(
      mainBookingData.flexitourMaxChanges,
      FLEXITOUR_DEFAULT_MAX_CHANGES,
    );
    const flexitourUsedChanges = getFlexitourCount(
      mainBookingData.flexitourUsedChanges,
      0,
    );

    if (flexitourUsedChanges >= flexitourMaxChanges) {
      return NextResponse.json(
        {
          success: false,
          error: `Flexitour change limit reached (${flexitourUsedChanges}/${flexitourMaxChanges}).`,
        },
        { status: 400 },
      );
    }

    const tourPackageName = (mainBookingData.tourPackageName || "")
      .toString()
      .trim();
    if (!tourPackageName) {
      return NextResponse.json(
        { success: false, error: "Booking has no tour package." },
        { status: 400 },
      );
    }

    const tourPackageQuery = query(
      collection(db, "tourPackages"),
      where("name", "==", tourPackageName),
      limit(1),
    );
    const tourPackageSnap = await getDocs(tourPackageQuery);

    if (tourPackageSnap.empty) {
      return NextResponse.json(
        { success: false, error: "Tour package not found for this booking." },
        { status: 404 },
      );
    }

    const tourPackageData = tourPackageSnap.docs[0].data() as Record<string, any>;
    const travelDatesRaw = Array.isArray(tourPackageData.travelDates)
      ? tourPackageData.travelDates
      : [];

    const mainCurrentTourDate = parseDateValue(mainBookingData.tourDate);
    const mainCurrentTourDateKey = mainCurrentTourDate
      ? formatDateKey(mainCurrentTourDate)
      : "";

    const validDateMap = new Map<
      string,
      { startDate: Date; endDate: Date | null }
    >();

    for (const travelDate of travelDatesRaw) {
      if (!travelDate || travelDate.isAvailable !== true) continue;

      const startDate = parseDateValue(travelDate.startDate);
      if (!startDate) continue;

      const dateKey = formatDateKey(startDate);
      if (getDaysBetweenToday(startDate) < 3) continue;
      if (dateKey === mainCurrentTourDateKey) continue;

      const endDate = parseDateValue(travelDate.endDate);
      if (!validDateMap.has(dateKey)) {
        validDateMap.set(dateKey, { startDate, endDate });
      }
    }

    if (validDateMap.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid Flexitour dates are currently available.",
        },
        { status: 400 },
      );
    }

    if (!validDateMap.has(newTourDateInput)) {
      if (newTourDateInput === mainCurrentTourDateKey) {
        return NextResponse.json(
          {
            success: false,
            error: "Selected tour date is the same as your current date.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Selected date is unavailable or not valid for Flexitour.",
        },
        { status: 400 },
      );
    }

    const selectedTravelDate = validDateMap.get(newTourDateInput)!;
    const normalizedNewTourDate = normalizeTourDateToUTCPlus8Nine(newTourDateInput);
    if (!normalizedNewTourDate) {
      return NextResponse.json(
        { success: false, error: "Unable to normalize selected tour date." },
        { status: 400 },
      );
    }
    const newTourDateTimestamp = Timestamp.fromDate(normalizedNewTourDate);

    const linkedBookingsMap = new Map<string, Record<string, any>>();
    linkedBookingsMap.set(mainBookingDocId, mainBookingData);

    const linkedByMainSnap = await getDocs(
      query(collection(db, "bookings"), where("mainBookerId", "==", mainBookingDocId)),
    );
    linkedByMainSnap.docs.forEach((linkedDoc) => {
      linkedBookingsMap.set(linkedDoc.id, linkedDoc.data() as Record<string, any>);
    });

    const mainGroupId =
      typeof mainBookingData.groupId === "string" && mainBookingData.groupId.trim()
        ? mainBookingData.groupId.trim()
        : "";
    if (mainGroupId) {
      const linkedByGroupSnap = await getDocs(
        query(collection(db, "bookings"), where("groupId", "==", mainGroupId)),
      );
      linkedByGroupSnap.docs.forEach((linkedDoc) => {
        linkedBookingsMap.set(linkedDoc.id, linkedDoc.data() as Record<string, any>);
      });
    }

    // Ensure viewer booking is always included for single bookings and legacy records.
    linkedBookingsMap.set(viewerBookingDoc.id, viewerBookingData);

    const changedBy =
      isGroupBooking || GROUP_BOOKING_TYPES.has((mainBookingData.bookingType || "").toString())
        ? "customer_main_booker"
        : "customer_single";
    const changedAt = Timestamp.now();
    const nextFlexitourUsedChanges = flexitourUsedChanges + 1;

    const batch = writeBatch(db);
    const updatedBookingDataMap = new Map<string, Record<string, any>>();
    const reminderWasEnabledMap = new Map<string, boolean>();
    const guestNotificationCandidates: GuestNotificationCandidate[] = [];

    for (const [docId, bookingData] of linkedBookingsMap.entries()) {
      const isMainBookerRecord = docId === mainBookingDocId;
      if (!isMainBookerRecord && bookingData.isMainBooker === true) {
        console.warn(
          "Flexitour detected linked booking with stale isMainBooker flag; treating record as guest.",
          {
            bookingDocumentId: docId,
            bookingId: `${bookingData.bookingId || docId}`,
            authoritativeMainBookingDocumentId: mainBookingDocId,
          },
        );
      }
      const reservationDate =
        bookingData.reservationDate || bookingData.createdAt || new Date();
      const daysBetween = getDaysBetweenDates(reservationDate, normalizedNewTourDate);
      const eligible2ndOfMonths = getEligible2ndOfMonths(
        reservationDate,
        normalizedNewTourDate,
      );
      const paymentCondition = getPaymentCondition(
        normalizedNewTourDate,
        eligible2ndOfMonths,
        daysBetween,
      );
      const availablePaymentTerms = getAvailablePaymentTerms(
        paymentCondition,
        !!bookingData.reasonForCancellation,
      );
      const eligiblePlans = getEligiblePaymentPlans(paymentCondition);
      const paidInstallmentCount = countPaidInstallmentTerms(bookingData);
      const fullPaymentAlreadyPaid = hasPaidDate(bookingData.fullPaymentDatePaid);
      const p1AlreadyPaid = hasPaidDate(bookingData.p1DatePaid);
      const currentP1DueDate = parseDueDateValue(bookingData.p1DueDate);
      const isCurrentP1DueDateOnOrAfterToday =
        currentP1DueDate !== null && isDateOnOrAfterToday(currentP1DueDate);
      const originalTourCost = Number(bookingData.originalTourCost || 0);
      const discountedTourCost =
        bookingData.discountedTourCost === undefined ||
        bookingData.discountedTourCost === null
          ? null
          : Number(bookingData.discountedTourCost);
      const reservationFee = Number(bookingData.reservationFee || 0);
      const manualCredit = Number(bookingData.manualCredit || 0);
      const creditFrom =
        typeof bookingData.creditFrom === "string" ? bookingData.creditFrom : "";
      const existingPaymentPlan =
        typeof bookingData.paymentPlan === "string" ? bookingData.paymentPlan : "";
      const currentRemainingBalanceRaw = getRemainingBalanceFunction(
        bookingData.tourPackageName || "",
        true,
        discountedTourCost ?? undefined,
        originalTourCost,
        reservationFee,
        creditFrom,
        manualCredit,
        existingPaymentPlan,
        bookingData.fullPaymentDatePaid,
        bookingData.fullPaymentAmount,
        bookingData.p1DatePaid,
        bookingData.p1Amount,
        bookingData.p2DatePaid,
        bookingData.p2Amount,
        bookingData.p3DatePaid,
        bookingData.p3Amount,
        bookingData.p4DatePaid,
        bookingData.p4Amount,
        bookingData.p1LateFeesPenalty,
        bookingData.p2LateFeesPenalty,
        bookingData.p3LateFeesPenalty,
        bookingData.p4LateFeesPenalty,
      );
      const currentRemainingBalance = Math.max(
        0,
        Math.round(toNumberOrZero(currentRemainingBalanceRaw) * 100) / 100,
      );

      let paymentFields: Record<string, any>;
      let paymentPlanForStatus = "";
      let isP1SettlementMode = false;
      let shouldRequireGuestPlanSelection = false;
      let reminderWasEnabled = bookingData.enablePaymentReminder === true;
      let shouldDisablePaymentReminders = false;

      if (isMainBookerRecord) {
        if (!eligiblePlans.includes(selectedPaymentPlan)) {
          return NextResponse.json(
            {
              success: false,
              error: `Selected payment plan (${selectedPaymentPlan}) is not eligible for the updated tour date.`,
            },
            { status: 400 },
          );
        }

        isP1SettlementMode =
          selectedPaymentPlan === "P1" &&
          p1AlreadyPaid &&
          !fullPaymentAlreadyPaid &&
          isCurrentP1DueDateOnOrAfterToday &&
          currentRemainingBalance > 0;

        shouldDisablePaymentReminders = selectedPaymentPlan === "Full Payment";
        if (shouldDisablePaymentReminders) {
          reminderWasEnabled = false;
        }

        if (
          selectedPaymentPlan !== "Full Payment" &&
          paidInstallmentCount > 0 &&
          !isP1SettlementMode &&
          getInstallmentPlanTermCount(selectedPaymentPlan) <= paidInstallmentCount
        ) {
          return NextResponse.json(
            {
              success: false,
              error: `Selected payment plan (${selectedPaymentPlan}) cannot be applied because ${paidInstallmentCount} installment term(s) are already paid. Please choose a higher plan depth or Full Payment.`,
            },
            { status: 400 },
          );
        }

        if (fullPaymentAlreadyPaid && selectedPaymentPlan !== "Full Payment") {
          return NextResponse.json(
            {
              success: false,
              error:
                "Selected payment plan is invalid because full payment has already been marked paid.",
            },
            { status: 400 },
          );
        }

        if (
          selectedPaymentPlan === "P1" &&
          p1AlreadyPaid &&
          !isP1SettlementMode
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                !isCurrentP1DueDateOnOrAfterToday
                  ? "P1 settlement is unavailable because the current P1 due date is already in the past. Please choose a higher plan depth or Full Payment."
                  : "P1 is already paid. P1 can only be selected as a settlement plan while the current P1 due date is not yet in the past.",
            },
            { status: 400 },
          );
        }

        paymentPlanForStatus = isP1SettlementMode ? "P2" : selectedPaymentPlan;

        const paymentUpdate = calculatePaymentPlanUpdate({
          paymentPlan: paymentPlanForStatus,
          reservationDate,
          tourDate: normalizedNewTourDate,
          paymentCondition,
          originalTourCost,
          discountedTourCost,
          reservationFee,
          isMainBooker: bookingData.isMainBooker === true,
          creditAmount: manualCredit,
          creditFrom,
          p1Amount: bookingData.p1Amount ?? null,
          p2Amount: bookingData.p2Amount ?? null,
          p3Amount: bookingData.p3Amount ?? null,
          p4Amount: bookingData.p4Amount ?? null,
          p1DatePaid: bookingData.p1DatePaid,
          p2DatePaid: bookingData.p2DatePaid,
          p3DatePaid: bookingData.p3DatePaid,
          p4DatePaid: bookingData.p4DatePaid,
        });

        paymentFields = {
          paymentPlan: paymentUpdate.paymentPlan,
          fullPaymentDueDate: paymentUpdate.fullPaymentDueDate,
          fullPaymentAmount: paymentUpdate.fullPaymentAmount,
          p1DueDate: paymentUpdate.p1DueDate,
          p1Amount: paymentUpdate.p1Amount,
          p2DueDate: paymentUpdate.p2DueDate,
          p2Amount: paymentUpdate.p2Amount,
          p3DueDate: paymentUpdate.p3DueDate,
          p3Amount: paymentUpdate.p3Amount,
          p4DueDate: paymentUpdate.p4DueDate,
          p4Amount: paymentUpdate.p4Amount,
          p1ScheduledReminderDate: paymentUpdate.p1ScheduledReminderDate,
          p2ScheduledReminderDate: paymentUpdate.p2ScheduledReminderDate,
          p3ScheduledReminderDate: paymentUpdate.p3ScheduledReminderDate,
          p4ScheduledReminderDate: paymentUpdate.p4ScheduledReminderDate,
        };

        paymentFields = lockPaidTermsOnPaymentFields(paymentFields, bookingData);

        if (isP1SettlementMode) {
          const p1DueDate =
            (bookingData.p1DueDate || paymentFields.p1DueDate || "").toString();
          const settlementReminders = calculateScheduledReminderDates(
            {
              p1DueDate: "",
              p2DueDate: p1DueDate,
              p3DueDate: "",
              p4DueDate: "",
            },
            reservationDate,
          );

          paymentFields.paymentPlan = "P2";
          paymentFields.fullPaymentDueDate = "";
          paymentFields.fullPaymentAmount = "";
          paymentFields.p2DueDate = p1DueDate;
          paymentFields.p2Amount = currentRemainingBalance;
          paymentFields.p2ScheduledReminderDate =
            settlementReminders.p2ScheduledReminderDate;
          paymentFields.p3DueDate = "";
          paymentFields.p3Amount = "";
          paymentFields.p4DueDate = "";
          paymentFields.p4Amount = "";
          paymentFields.p3ScheduledReminderDate = "";
          paymentFields.p4ScheduledReminderDate = "";
        }

        if (
          selectedPaymentPlan === "Full Payment" &&
          paidInstallmentCount > 0 &&
          !fullPaymentAlreadyPaid
        ) {
          const remainingForFullPayment = getRemainingBalanceFunction(
            bookingData.tourPackageName || "",
            true,
            discountedTourCost ?? undefined,
            originalTourCost,
            reservationFee,
            creditFrom,
            manualCredit,
            "Full Payment",
            bookingData.fullPaymentDatePaid,
            bookingData.fullPaymentAmount,
            bookingData.p1DatePaid,
            bookingData.p1Amount,
            bookingData.p2DatePaid,
            bookingData.p2Amount,
            bookingData.p3DatePaid,
            bookingData.p3Amount,
            bookingData.p4DatePaid,
            bookingData.p4Amount,
            bookingData.p1LateFeesPenalty,
            bookingData.p2LateFeesPenalty,
            bookingData.p3LateFeesPenalty,
            bookingData.p4LateFeesPenalty,
          );

          const remainingAmount =
            typeof remainingForFullPayment === "number"
              ? remainingForFullPayment
              : Number(remainingForFullPayment || 0);
          paymentFields.fullPaymentAmount = Math.max(
            0,
            Math.round(remainingAmount * 100) / 100,
          );
        }
      } else {
        paymentFields = {
          paymentPlan: "",
          fullPaymentDueDate: "",
          fullPaymentAmount: "",
          p1DueDate: "",
          p1Amount: "",
          p2DueDate: "",
          p2Amount: "",
          p3DueDate: "",
          p3Amount: "",
          p4DueDate: "",
          p4Amount: "",
          p1ScheduledReminderDate: "",
          p2ScheduledReminderDate: "",
          p3ScheduledReminderDate: "",
          p4ScheduledReminderDate: "",
        };

        paymentFields = lockPaidTermsOnPaymentFields(paymentFields, bookingData);
      }

      const fullPaymentAmount =
        paymentFields.fullPaymentAmount ?? bookingData.fullPaymentAmount;
      const p1Amount = paymentFields.p1Amount ?? bookingData.p1Amount;
      const p2Amount = paymentFields.p2Amount ?? bookingData.p2Amount;
      const p3Amount = paymentFields.p3Amount ?? bookingData.p3Amount;
      const p4Amount = paymentFields.p4Amount ?? bookingData.p4Amount;

      const paid = getTotalPaidAmountFunction(
        bookingData.tourPackageName || "",
        reservationFee,
        creditFrom,
        manualCredit,
        bookingData.fullPaymentDatePaid,
        fullPaymentAmount,
        bookingData.p1DatePaid,
        p1Amount,
        bookingData.p2DatePaid,
        p2Amount,
        bookingData.p3DatePaid,
        p3Amount,
        bookingData.p4DatePaid,
        p4Amount,
        bookingData.p1LateFeesPenalty,
        bookingData.p2LateFeesPenalty,
        bookingData.p3LateFeesPenalty,
        bookingData.p4LateFeesPenalty,
      );

      const paidTerms = await getPaidTerms(
        bookingData.tourPackageName || "",
        creditFrom,
        manualCredit,
        bookingData.fullPaymentDatePaid,
        fullPaymentAmount,
        bookingData.p1DatePaid,
        p1Amount,
        bookingData.p2DatePaid,
        p2Amount,
        bookingData.p3DatePaid,
        p3Amount,
        bookingData.p4DatePaid,
        p4Amount,
        reservationFee,
      );

      let remainingBalance = getRemainingBalanceFunction(
        bookingData.tourPackageName || "",
        true,
        discountedTourCost ?? undefined,
        originalTourCost,
        reservationFee,
        creditFrom,
        manualCredit,
        paymentPlanForStatus,
        bookingData.fullPaymentDatePaid,
        fullPaymentAmount,
        bookingData.p1DatePaid,
        p1Amount,
        bookingData.p2DatePaid,
        p2Amount,
        bookingData.p3DatePaid,
        p3Amount,
        bookingData.p4DatePaid,
        p4Amount,
        bookingData.p1LateFeesPenalty,
        bookingData.p2LateFeesPenalty,
        bookingData.p3LateFeesPenalty,
        bookingData.p4LateFeesPenalty,
      );

      if (!isMainBookerRecord) {
        const roundedRemainingBalance = Math.max(
          0,
          Math.round(toNumberOrZero(remainingBalance) * 100) / 100,
        );

        shouldRequireGuestPlanSelection =
          roundedRemainingBalance > 0 && !fullPaymentAlreadyPaid;
        remainingBalance = roundedRemainingBalance;

        if (!shouldRequireGuestPlanSelection) {
          paymentPlanForStatus = existingPaymentPlan;
          paymentFields.paymentPlan = existingPaymentPlan;
          remainingBalance = getRemainingBalanceFunction(
            bookingData.tourPackageName || "",
            true,
            discountedTourCost ?? undefined,
            originalTourCost,
            reservationFee,
            creditFrom,
            manualCredit,
            paymentPlanForStatus,
            bookingData.fullPaymentDatePaid,
            fullPaymentAmount,
            bookingData.p1DatePaid,
            p1Amount,
            bookingData.p2DatePaid,
            p2Amount,
            bookingData.p3DatePaid,
            p3Amount,
            bookingData.p4DatePaid,
            p4Amount,
            bookingData.p1LateFeesPenalty,
            bookingData.p2LateFeesPenalty,
            bookingData.p3LateFeesPenalty,
            bookingData.p4LateFeesPenalty,
          );
        } else {
          reminderWasEnabled = false;
          paymentFields.paymentPlan = "";

          const accessToken =
            typeof bookingData.access_token === "string"
              ? bookingData.access_token.trim()
              : "";
          if (
            isValidEmail(bookingData.emailAddress) &&
            accessToken &&
            roundedRemainingBalance > 0
          ) {
            guestNotificationCandidates.push({
              bookingDocumentId: docId,
              bookingId: `${bookingData.bookingId || docId}`,
              accessToken,
              emailAddress: bookingData.emailAddress.trim(),
              fullName:
                typeof bookingData.fullName === "string" &&
                bookingData.fullName.trim()
                  ? bookingData.fullName.trim()
                  : "Traveler",
              tourPackageName: `${bookingData.tourPackageName || ""}`,
              newTourDate: newTourDateInput,
              remainingBalance: roundedRemainingBalance,
            });
          }
        }
      }

      let bookingStatus = "";
      let paymentProgress: string | number = "";

      if (shouldRequireGuestPlanSelection) {
        bookingStatus = "Pending Payment Plan Selection";
        const progressBaseCost =
          (bookingData.isMainBooker === true && discountedTourCost
            ? discountedTourCost
            : originalTourCost) || 0;
        const progressPercent =
          progressBaseCost > 0
            ? Math.round((toNumberOrZero(paid) / progressBaseCost) * 100)
            : 0;
        const boundedPercent = Math.max(0, Math.min(100, progressPercent));
        paymentProgress = `${boundedPercent}%`;
      } else {
        bookingStatus = bookingStatusFunction(
          bookingData.reasonForCancellation || "",
          paymentPlanForStatus,
          remainingBalance,
          bookingData.fullPaymentDatePaid,
          bookingData.p1DatePaid,
          bookingData.p2DatePaid,
          bookingData.p3DatePaid,
          bookingData.p4DatePaid,
        );

        paymentProgress = paymentProgressFunction(
          bookingStatus,
          paymentPlanForStatus,
          bookingData.fullPaymentDatePaid,
          bookingData.p1DatePaid,
          bookingData.p2DatePaid,
          bookingData.p3DatePaid,
          bookingData.p4DatePaid,
        );
      }

      const existingHistory = Array.isArray(bookingData.flexitourHistory)
        ? bookingData.flexitourHistory
        : [];
      const fromTourDate = parseDateValue(bookingData.tourDate);

      const returnDate =
        selectedTravelDate.endDate != null
          ? formatDateKey(selectedTravelDate.endDate)
          : calculateReturnDateKey(normalizedNewTourDate, bookingData.tourDuration);

      const updatePayload: Record<string, any> = {
        tourDate: newTourDateTimestamp,
        returnDate,
        daysBetweenBookingAndTourDate: daysBetween,
        eligible2ndofmonths: eligible2ndOfMonths,
        paymentCondition,
        availablePaymentTerms,
        paid,
        paidTerms,
        remainingBalance,
        paymentProgress,
        bookingStatus,
        ...paymentFields,
        paymentPlanSelectionRequired: shouldRequireGuestPlanSelection,
        paymentPlanSelectionRequiredAt: shouldRequireGuestPlanSelection
          ? changedAt
          : null,
        paymentPlanSelectionRequiredReason: shouldRequireGuestPlanSelection
          ? GUEST_PLAN_SELECTION_REQUIRED_REASON
          : "",
        flexitourP1SettlementMode: isP1SettlementMode,
        flexitourMaxChanges: flexitourMaxChanges || FLEXITOUR_DEFAULT_MAX_CHANGES,
        flexitourUsedChanges: nextFlexitourUsedChanges,
        flexitourHistory: [
          ...existingHistory,
          {
            fromTourDate: fromTourDate ? formatDateKey(fromTourDate) : "",
            toTourDate: newTourDateInput,
            changedAt,
            changedBy,
          },
        ],
        flexitourLastChangedAt: changedAt,
        enablePaymentReminder: shouldRequireGuestPlanSelection
          ? false
          : shouldDisablePaymentReminders
            ? false
            : bookingData.enablePaymentReminder === true,
        selectedPlanAt: shouldRequireGuestPlanSelection
          ? null
          : bookingData.selectedPlanAt ?? null,
        updatedAt: changedAt,
      };

      batch.update(doc(db, "bookings", docId), updatePayload);
      updatedBookingDataMap.set(docId, {
        ...bookingData,
        ...updatePayload,
      });
      reminderWasEnabledMap.set(docId, reminderWasEnabled);
    }

    await batch.commit();

    const guestNotifications =
      await sendGuestPlanSelectionNotifications(guestNotificationCandidates);

    const rebuildResults = await Promise.all(
      Array.from(updatedBookingDataMap.entries()).map(([bookingId, bookingData]) =>
        rebuildPaymentReminderArtifactsForBooking({
          bookingId,
          bookingData,
          reminderWasEnabled: reminderWasEnabledMap.get(bookingId) === true,
        }),
      ),
    );

    return NextResponse.json({
      success: true,
      message: "Flexitour date updated successfully.",
      data: {
        bookingIdsUpdated: Array.from(updatedBookingDataMap.keys()),
        paymentPlan: selectedPaymentPlan,
        flexitourMaxChanges,
        flexitourUsedChanges: nextFlexitourUsedChanges,
        flexitourRemainingChanges: Math.max(
          0,
          flexitourMaxChanges - nextFlexitourUsedChanges,
        ),
        reminderRebuilds: rebuildResults.map((result) => ({
          bookingId: result.bookingId,
          success: result.success,
          reminderWasEnabled: result.reminderWasEnabled,
          reminderRegenerationQueued: result.reminderRegenerationQueued,
          scheduledEmailsFound: result.scheduledEmailsFound,
          scheduledEmailsDeleted: result.scheduledEmailsDeleted,
          calendarEventsFound: result.calendarEventsFound,
          calendarDeleteAttempted: result.calendarDeleteAttempted,
          calendarEventsDeleted: result.calendarEventsDeleted,
          calendarDeleteFailures: result.calendarDeleteFailures,
          warnings: result.warnings,
          errors: result.errors,
        })),
        guestNotifications,
      },
    });
  } catch (error) {
    console.error("Error updating Flexitour booking date:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update Flexitour booking date",
      },
      { status: 500 },
    );
  }
}
