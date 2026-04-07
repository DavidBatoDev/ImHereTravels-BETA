// /api/stripe-payments/select-plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  calculateScheduledReminderDates,
  calculatePaymentPlanUpdate,
  type PaymentPlanUpdateInput,
} from "@/lib/booking-calculations";
import getTotalPaidAmountFunction from "@/app/functions/columns/payment-setting/paid";
import getPaidTerms from "@/app/functions/columns/payment-setting/paid-terms";
import getRemainingBalanceFunction from "@/app/functions/columns/payment-setting/remaining-balance";
import bookingStatusFunction from "@/app/functions/columns/payment-setting/booking-status";
import paymentProgressFunction from "@/app/functions/columns/payment-setting/payment-progress";
import { rebuildPaymentReminderArtifactsForBooking } from "@/lib/payment-reminder-rebuild";

const ALLOWED_PAYMENT_PLANS = new Set([
  "Full Payment",
  "P1",
  "P2",
  "P3",
  "P4",
]);

/**
 * Extract payment plan type from payment term name
 * e.g., "P1 - Single Instalment" -> "P1"
 */
function extractPaymentPlanType(name: string): string {
  if (!name) return "";
  if (name.includes(" - ")) {
    return name.split(" - ")[0].trim();
  }
  return name.trim();
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

function hasPaidDate(value: unknown): boolean {
  return parseDateValue(value) !== null;
}

function countPaidInstallmentTerms(bookingData: Record<string, any>): number {
  return [
    bookingData.p1DatePaid,
    bookingData.p2DatePaid,
    bookingData.p3DatePaid,
    bookingData.p4DatePaid,
  ].filter((dateValue) => hasPaidDate(dateValue)).length;
}

function getInstallmentPlanTermCount(paymentPlan: string): number {
  const match = paymentPlan.match(/^P([1-4])$/);
  return match ? Number(match[1]) : 0;
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

export async function POST(req: NextRequest) {
  try {
    const { bookingDocumentId, paymentPlanId, paymentPlanDetails } =
      await req.json();

    if (!bookingDocumentId) {
      return NextResponse.json(
        { error: "Missing required field: bookingDocumentId" },
        { status: 400 },
      );
    }

    if (!paymentPlanId) {
      return NextResponse.json(
        { error: "Missing required field: paymentPlanId" },
        { status: 400 },
      );
    }

    const bookingDocRef = doc(db, "bookings", bookingDocumentId);
    const bookingDocSnap = await getDoc(bookingDocRef);

    if (!bookingDocSnap.exists()) {
      return NextResponse.json(
        { error: "Booking document not found" },
        { status: 404 },
      );
    }

    const bookingData = bookingDocSnap.data() as Record<string, any>;
    const isReselectionRequired =
      bookingData.paymentPlanSelectionRequired === true;

    if (bookingData.paymentPlan && !isReselectionRequired) {
      return NextResponse.json(
        { error: "Booking already has a payment plan selected" },
        { status: 400 },
      );
    }

    // Resolve term name -> normalized plan type
    let resolvedPaymentPlanRaw = `${paymentPlanId}`;
    try {
      const paymentTermDocRef = doc(db, "paymentTerms", `${paymentPlanId}`);
      const paymentTermDocSnap = await getDoc(paymentTermDocRef);

      if (paymentTermDocSnap.exists()) {
        const paymentTermData = paymentTermDocSnap.data();
        const paymentTermName = paymentTermData.name || "";
        resolvedPaymentPlanRaw = extractPaymentPlanType(paymentTermName);
      }
    } catch (err) {
      console.warn(
        "Payment term lookup failed in select-plan, falling back to raw plan id:",
        err,
      );
    }

    const selectedPaymentPlan = normalizePaymentPlanInput(resolvedPaymentPlanRaw);
    if (
      !selectedPaymentPlan ||
      !ALLOWED_PAYMENT_PLANS.has(selectedPaymentPlan)
    ) {
      return NextResponse.json(
        { error: "Invalid payment plan selected." },
        { status: 400 },
      );
    }

    const paymentCondition = `${bookingData.paymentCondition || ""}`;
    const eligiblePlans = getEligiblePaymentPlans(paymentCondition);
    if (!eligiblePlans.includes(selectedPaymentPlan)) {
      return NextResponse.json(
        {
          error: `Selected payment plan (${selectedPaymentPlan}) is not eligible for this booking.`,
        },
        { status: 400 },
      );
    }

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
    const reservationFee = Number(bookingData.reservationFee || 250);
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
    const isP1SettlementMode =
      selectedPaymentPlan === "P1" &&
      p1AlreadyPaid &&
      !fullPaymentAlreadyPaid &&
      isCurrentP1DueDateOnOrAfterToday &&
      currentRemainingBalance > 0;
    const paymentPlanForStatus = isP1SettlementMode ? "P2" : selectedPaymentPlan;

    if (
      selectedPaymentPlan !== "Full Payment" &&
      paidInstallmentCount > 0 &&
      !isP1SettlementMode &&
      getInstallmentPlanTermCount(selectedPaymentPlan) <= paidInstallmentCount
    ) {
      return NextResponse.json(
        {
          error: `Selected payment plan (${selectedPaymentPlan}) cannot be applied because ${paidInstallmentCount} installment term(s) are already paid. Please choose a higher plan depth or Full Payment.`,
        },
        { status: 400 },
      );
    }

    if (fullPaymentAlreadyPaid && selectedPaymentPlan !== "Full Payment") {
      return NextResponse.json(
        {
          error:
            "Selected payment plan is invalid because full payment has already been marked paid.",
        },
        { status: 400 },
      );
    }
    if (selectedPaymentPlan === "P1" && p1AlreadyPaid && !isP1SettlementMode) {
      return NextResponse.json(
        {
          error:
            !isCurrentP1DueDateOnOrAfterToday
              ? "P1 settlement is unavailable because the current P1 due date is already in the past. Please choose a higher plan depth or Full Payment."
              : "P1 is already paid. P1 can only be selected as a settlement plan while the current P1 due date is not yet in the past.",
        },
        { status: 400 },
      );
    }

    const updateInput: PaymentPlanUpdateInput = {
      paymentPlan: paymentPlanForStatus,
      reservationDate: bookingData.reservationDate || bookingData.createdAt,
      tourDate: bookingData.tourDate,
      paymentCondition,
      originalTourCost,
      discountedTourCost,
      reservationFee,
      isMainBooker:
        bookingData.isMainBooker === true || bookingData.isMainBooking !== false,
      creditAmount: manualCredit,
      creditFrom,
      reminderDaysBefore: 7,
      p1Amount: bookingData.p1Amount ?? null,
      p2Amount: bookingData.p2Amount ?? null,
      p3Amount: bookingData.p3Amount ?? null,
      p4Amount: bookingData.p4Amount ?? null,
      p1DatePaid: bookingData.p1DatePaid,
      p2DatePaid: bookingData.p2DatePaid,
      p3DatePaid: bookingData.p3DatePaid,
      p4DatePaid: bookingData.p4DatePaid,
    };

    const paymentUpdate = calculatePaymentPlanUpdate(updateInput);

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
        bookingData.reservationDate || bookingData.createdAt,
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

    const remainingBalanceRaw = getRemainingBalanceFunction(
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
    const remainingBalance = Math.max(
      0,
      Math.round(toNumberOrZero(remainingBalanceRaw) * 100) / 100,
    );

    const bookingStatus = bookingStatusFunction(
      bookingData.reasonForCancellation || "",
      paymentPlanForStatus,
      remainingBalance,
      bookingData.fullPaymentDatePaid,
      bookingData.p1DatePaid,
      bookingData.p2DatePaid,
      bookingData.p3DatePaid,
      bookingData.p4DatePaid,
    );

    const paymentProgress = paymentProgressFunction(
      bookingStatus,
      paymentPlanForStatus,
      bookingData.fullPaymentDatePaid,
      bookingData.p1DatePaid,
      bookingData.p2DatePaid,
      bookingData.p3DatePaid,
      bookingData.p4DatePaid,
    );
    const shouldDisablePaymentReminders = selectedPaymentPlan === "Full Payment";

    await updateDoc(bookingDocRef, {
      ...paymentFields,
      paid,
      paidTerms,
      remainingBalance,
      bookingStatus,
      paymentProgress,
      enablePaymentReminder: shouldDisablePaymentReminders ? false : true,
      selectedPlanAt: serverTimestamp(),
      paymentPlanSelectionRequired: false,
      paymentPlanSelectionRequiredAt: null,
      paymentPlanSelectionRequiredReason: "",
      flexitourP1SettlementMode: isP1SettlementMode,
      updatedAt: serverTimestamp(),
      ...(!bookingData.paymentMethod && { paymentMethod: "Revolut" }),
    });

    if (shouldDisablePaymentReminders) {
      try {
        await rebuildPaymentReminderArtifactsForBooking({
          bookingId: bookingDocumentId,
          bookingData: {
            ...bookingData,
            ...paymentFields,
            enablePaymentReminder: false,
          },
          reminderWasEnabled: false,
        });
      } catch (cleanupError) {
        console.error(
          "Failed to clear payment reminders after selecting Full Payment:",
          cleanupError,
        );
      }
    }

    // Create notification for payment plan selection (best effort)
    try {
      const { createNotification } = await import("@/utils/notification-service");

      const travelerName =
        `${bookingData.firstName || ""} ${bookingData.lastName || ""}`.trim();
      const tourPackageName = bookingData.tourPackageName || "Tour";
      const paymentPlanLabel =
        paymentPlanDetails?.label ||
        paymentFields.paymentPlan ||
        "Payment Plan";

      await createNotification({
        type: "payment_plan_selected",
        title: "Payment Plan Selected",
        body: `${travelerName} selected ${paymentPlanLabel} for ${tourPackageName}`,
        data: {
          bookingId: bookingData.bookingId,
          bookingDocumentId,
          travelerName,
          tourPackageName,
          paymentPlan: paymentPlanLabel,
        },
      });
    } catch (notificationError) {
      console.error("Failed to create payment-plan notification:", notificationError);
    }

    return NextResponse.json({
      success: true,
      bookingDocumentId,
      paymentPlan: paymentFields.paymentPlan,
      message: "Payment plan selected successfully",
    });
  } catch (err: any) {
    console.error("Select plan API error:", err);

    return NextResponse.json(
      {
        error: err.message ?? "Failed to select payment plan",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
