import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import {
  calculatePaymentPlanUpdate,
  calculateScheduledReminderDates,
  getDaysBetweenDates,
  getEligible2ndOfMonths,
  getPaymentCondition,
  normalizeTourDateToUTCPlus8Nine,
} from "@/lib/booking-calculations";
import getRemainingBalanceFunction from "@/app/functions/columns/payment-setting/remaining-balance";

const GROUP_BOOKING_TYPES = new Set(["Duo Booking", "Group Booking"]);
const FLEXITOUR_ALLOWED_PAYMENT_PLANS = new Set([
  "Full Payment",
  "P1",
  "P2",
  "P3",
  "P4",
]);

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

function buildPreviewRows(
  bookingData: Record<string, any>,
  paymentFields: Record<string, any>,
  isP1SettlementMode: boolean,
) {
  const rows: Array<{
    id: "full_payment" | "p1" | "p2" | "p3" | "p4";
    term: string;
    dueDate: string;
    amount: number;
    status: "Paid" | "Pending";
  }> = [];

  const config = [
    {
      id: "full_payment" as const,
      term: "Full Payment",
      amountKey: "fullPaymentAmount",
      dueDateKey: "fullPaymentDueDate",
      paidDateKey: "fullPaymentDatePaid",
    },
    {
      id: "p1" as const,
      term: "P1",
      amountKey: "p1Amount",
      dueDateKey: "p1DueDate",
      paidDateKey: "p1DatePaid",
    },
    {
      id: "p2" as const,
      term: isP1SettlementMode ? "P1" : "P2",
      amountKey: "p2Amount",
      dueDateKey: "p2DueDate",
      paidDateKey: "p2DatePaid",
    },
    {
      id: "p3" as const,
      term: "P3",
      amountKey: "p3Amount",
      dueDateKey: "p3DueDate",
      paidDateKey: "p3DatePaid",
    },
    {
      id: "p4" as const,
      term: "P4",
      amountKey: "p4Amount",
      dueDateKey: "p4DueDate",
      paidDateKey: "p4DatePaid",
    },
  ];

  for (const item of config) {
    const amount = toNumberOrZero(paymentFields[item.amountKey]);
    if (amount <= 0) continue;
    rows.push({
      id: item.id,
      term: item.term,
      dueDate: (paymentFields[item.dueDateKey] || "").toString(),
      amount: Math.round(amount * 100) / 100,
      status: hasPaidDate(bookingData[item.paidDateKey]) ? "Paid" : "Pending",
    });
  }

  return rows;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingDocumentId: string }> },
) {
  try {
    const { bookingDocumentId } = await params;
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
            "Only the main booker can preview rescheduling for Duo/Group bookings with Flexitour.",
        },
        { status: 403 },
      );
    }

    const mainBookerId =
      typeof viewerBookingData.mainBookerId === "string" &&
      viewerBookingData.mainBookerId
        ? viewerBookingData.mainBookerId
        : viewerBookingDoc.id;

    let mainBookingData = viewerBookingData;
    if (mainBookerId !== viewerBookingDoc.id) {
      const mainRef = doc(db, "bookings", mainBookerId);
      const mainSnap = await getDoc(mainRef);
      if (mainSnap.exists()) {
        mainBookingData = mainSnap.data() as Record<string, any>;
      }
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

    const validDateMap = new Map<string, Date>();
    for (const travelDate of travelDatesRaw) {
      if (!travelDate || travelDate.isAvailable !== true) continue;
      const startDate = parseDateValue(travelDate.startDate);
      if (!startDate) continue;

      const dateKey = formatDateKey(startDate);
      if (getDaysBetweenToday(startDate) < 3) continue;
      if (dateKey === mainCurrentTourDateKey) continue;
      validDateMap.set(dateKey, startDate);
    }

    if (!validDateMap.has(newTourDateInput)) {
      return NextResponse.json(
        {
          success: false,
          error: "Selected date is unavailable or not valid for Flexitour.",
        },
        { status: 400 },
      );
    }

    const normalizedNewTourDate = normalizeTourDateToUTCPlus8Nine(newTourDateInput);
    if (!normalizedNewTourDate) {
      return NextResponse.json(
        { success: false, error: "Unable to normalize selected tour date." },
        { status: 400 },
      );
    }

    const bookingData = viewerBookingData;
    const reservationDate = bookingData.reservationDate || bookingData.createdAt || new Date();
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
    const eligiblePlans = getEligiblePaymentPlans(paymentCondition);

    if (!eligiblePlans.includes(selectedPaymentPlan)) {
      return NextResponse.json(
        {
          success: false,
          error: `Selected payment plan (${selectedPaymentPlan}) is not eligible for the updated tour date.`,
        },
        { status: 400 },
      );
    }

    const originalTourCost = Number(bookingData.originalTourCost || 0);
    const discountedTourCost =
      bookingData.discountedTourCost === undefined ||
      bookingData.discountedTourCost === null
        ? null
        : Number(bookingData.discountedTourCost);
    const reservationFee = Number(bookingData.reservationFee || 0);
    const manualCredit = Number(bookingData.manualCredit || 0);
    const creditFrom = typeof bookingData.creditFrom === "string" ? bookingData.creditFrom : "";
    const paidInstallmentCount = countPaidInstallmentTerms(bookingData);
    const fullPaymentAlreadyPaid = hasPaidDate(bookingData.fullPaymentDatePaid);
    const p1AlreadyPaid = hasPaidDate(bookingData.p1DatePaid);
    const currentP1DueDate = parseDueDateValue(bookingData.p1DueDate);
    const isCurrentP1DueDateOnOrAfterToday =
      currentP1DueDate !== null && isDateOnOrAfterToday(currentP1DueDate);

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
    const isP1SettlementMode =
      selectedPaymentPlan === "P1" &&
      p1AlreadyPaid &&
      !fullPaymentAlreadyPaid &&
      isCurrentP1DueDateOnOrAfterToday &&
      currentRemainingBalance > 0;

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

    if (selectedPaymentPlan === "P1" && p1AlreadyPaid && !isP1SettlementMode) {
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

    const effectivePaymentPlan = isP1SettlementMode ? "P2" : selectedPaymentPlan;
    const paymentUpdate = calculatePaymentPlanUpdate({
      paymentPlan: effectivePaymentPlan,
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

    let paymentFields: Record<string, any> = {
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
      const p1DueDate = (bookingData.p1DueDate || paymentFields.p1DueDate || "").toString();
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
      paymentFields.fullPaymentAmount = currentRemainingBalance;
    }

    const previewRows = buildPreviewRows(
      bookingData,
      paymentFields,
      isP1SettlementMode,
    );

    const notes: string[] = [];
    notes.push("Paid terms remain locked.");
    if (isP1SettlementMode) {
      notes.push(
        "P1 settlement mode: a second row is displayed as P1 to settle remaining balance.",
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        previewRows,
        effectivePaymentPlan,
        displayMode: isP1SettlementMode ? "p1_settlement" : "standard",
        p1SettlementMode: isP1SettlementMode,
        notes,
      },
    });
  } catch (error) {
    console.error("Error previewing Flexitour booking date:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to preview Flexitour booking date",
      },
      { status: 500 },
    );
  }
}
