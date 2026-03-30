import { NextRequest, NextResponse } from "next/server";
import { rescheduleAllPendingPaymentReminders } from "@/lib/payment-reminder-rescheduler";

/**
 * PATCH /api/scheduled-emails/payment-reminders
 * Recompute scheduledFor for ALL pending payment reminders.
 * Rule: max(term due date - 14 days, reservation date) at Asia/Singapore 09:00.
 */
export async function PATCH(request: NextRequest) {
  try {
    void request;
    const result = await rescheduleAllPendingPaymentReminders();

    return NextResponse.json({
      success: true,
      data: {
        examined: result.examined,
        updated: result.updated,
        skippedMissingBookingId: result.skippedMissingBookingId,
        skippedMissingBooking: result.skippedMissingBooking,
        skippedMissingTerm: result.skippedMissingTerm,
        skippedMissingDueDate: result.skippedMissingDueDate,
        skippedInvalidDueDate: result.skippedInvalidDueDate,
        details: result.details,
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
