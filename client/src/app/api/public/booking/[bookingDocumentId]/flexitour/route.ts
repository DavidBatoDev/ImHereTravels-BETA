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
  calculateInstallmentAmounts,
  calculatePaymentPlanUpdate,
  calculateScheduledReminderDates,
  generateInstallmentDueDates,
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
import { reschedulePendingPaymentRemindersForBooking } from "@/lib/payment-reminder-rescheduler";

const FLEXITOUR_DEFAULT_MAX_CHANGES = 3;
const GROUP_BOOKING_TYPES = new Set(["Duo Booking", "Group Booking"]);

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
      if (getDaysBetweenToday(startDate) < 2) continue;
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

    for (const [docId, bookingData] of linkedBookingsMap.entries()) {
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
      const availablePaymentTerms = getAvailablePaymentTerms(
        paymentCondition,
        !!bookingData.reasonForCancellation,
      );

      const paymentPlan =
        typeof bookingData.paymentPlan === "string"
          ? bookingData.paymentPlan.trim()
          : "";
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

      let paymentFields: Record<string, any> = {};

      if (paymentPlan) {
        const paymentUpdate = calculatePaymentPlanUpdate({
          paymentPlan,
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
      } else {
        const isLastMinute = paymentCondition === "Last Minute Booking";
        const dueDates = isLastMinute
          ? { p1DueDate: "", p2DueDate: "", p3DueDate: "", p4DueDate: "" }
          : generateInstallmentDueDates(
              reservationDate,
              normalizedNewTourDate,
              "",
              paymentCondition,
            );
        const amounts = isLastMinute
          ? { p1Amount: "", p2Amount: "", p3Amount: "", p4Amount: "" }
          : calculateInstallmentAmounts(
              "",
              originalTourCost,
              discountedTourCost,
              reservationFee,
              bookingData.isMainBooker === true,
              manualCredit,
              creditFrom,
              dueDates.p1DueDate,
              dueDates.p2DueDate,
              dueDates.p3DueDate,
              dueDates.p4DueDate,
            );
        const reminders = calculateScheduledReminderDates(dueDates, reservationDate);

        paymentFields = {
          paymentPlan: "",
          fullPaymentDueDate: "",
          fullPaymentAmount: "",
          p1DueDate: dueDates.p1DueDate,
          p1Amount: amounts.p1Amount,
          p2DueDate: dueDates.p2DueDate,
          p2Amount: amounts.p2Amount,
          p3DueDate: dueDates.p3DueDate,
          p3Amount: amounts.p3Amount,
          p4DueDate: dueDates.p4DueDate,
          p4Amount: amounts.p4Amount,
          p1ScheduledReminderDate: reminders.p1ScheduledReminderDate,
          p2ScheduledReminderDate: reminders.p2ScheduledReminderDate,
          p3ScheduledReminderDate: reminders.p3ScheduledReminderDate,
          p4ScheduledReminderDate: reminders.p4ScheduledReminderDate,
        };
      }

      const fullPaymentAmount = paymentFields.fullPaymentAmount ?? bookingData.fullPaymentAmount;
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

      const remainingBalance = getRemainingBalanceFunction(
        bookingData.tourPackageName || "",
        true,
        discountedTourCost ?? undefined,
        originalTourCost,
        reservationFee,
        creditFrom,
        manualCredit,
        paymentPlan,
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

      const bookingStatus = bookingStatusFunction(
        bookingData.reasonForCancellation || "",
        paymentPlan,
        remainingBalance,
        bookingData.fullPaymentDatePaid,
        bookingData.p1DatePaid,
        bookingData.p2DatePaid,
        bookingData.p3DatePaid,
        bookingData.p4DatePaid,
      );

      const paymentProgress = paymentProgressFunction(
        bookingStatus,
        paymentPlan,
        bookingData.fullPaymentDatePaid,
        bookingData.p1DatePaid,
        bookingData.p2DatePaid,
        bookingData.p3DatePaid,
        bookingData.p4DatePaid,
      );

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
        updatedAt: changedAt,
      };

      batch.update(doc(db, "bookings", docId), updatePayload);
      updatedBookingDataMap.set(docId, {
        ...bookingData,
        ...updatePayload,
      });
    }

    await batch.commit();

    const reminderResults = await Promise.all(
      Array.from(updatedBookingDataMap.entries()).map(([bookingId, bookingData]) =>
        reschedulePendingPaymentRemindersForBooking(bookingId, bookingData),
      ),
    );

    return NextResponse.json({
      success: true,
      message: "Flexitour date updated successfully.",
      data: {
        bookingIdsUpdated: Array.from(updatedBookingDataMap.keys()),
        flexitourMaxChanges,
        flexitourUsedChanges: nextFlexitourUsedChanges,
        flexitourRemainingChanges: Math.max(
          0,
          flexitourMaxChanges - nextFlexitourUsedChanges,
        ),
        reminders: reminderResults.map((result) => ({
          bookingId: result.bookingId,
          examined: result.examined,
          updated: result.updated,
        })),
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
