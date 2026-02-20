// /api/stripe-payments/select-plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  calculatePaymentPlanUpdate,
  type PaymentPlanUpdateInput,
} from "@/lib/booking-calculations";

/**
 * Extract payment plan type from payment term name
 * e.g., "P1 - Single Instalment" → "P1"
 * If no "-" exists, returns the whole name
 */
function extractPaymentPlanType(name: string): string {
  if (!name) return "";
  if (name.includes(" - ")) {
    return name.split(" - ")[0].trim();
  }
  return name.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { bookingDocumentId, paymentPlanId, paymentPlanDetails } =
      await req.json();

    // Validate required fields
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

    console.log("📝 Processing payment plan selection:", {
      bookingDocumentId,
      paymentPlanId,
      paymentPlanDetails,
    });

    // Fetch the booking document
    const bookingDocRef = doc(db, "bookings", bookingDocumentId);
    const bookingDocSnap = await getDoc(bookingDocRef);

    if (!bookingDocSnap.exists()) {
      return NextResponse.json(
        { error: "Booking document not found" },
        { status: 404 },
      );
    }

    const bookingData = bookingDocSnap.data();

    // Check if payment plan already selected
    if (bookingData.paymentPlan) {
      return NextResponse.json(
        { error: "Booking already has a payment plan selected" },
        { status: 400 },
      );
    }

    console.log("📊 Processing booking with payment plan");

    // Fetch the payment term document to get the name
    let paymentPlanString = paymentPlanId;

    try {
      const paymentTermDocRef = doc(db, "paymentTerms", paymentPlanId);
      const paymentTermDocSnap = await getDoc(paymentTermDocRef);

      if (paymentTermDocSnap.exists()) {
        const paymentTermData = paymentTermDocSnap.data();
        const paymentTermName = paymentTermData.name || "";
        // Extract plan type from name (e.g., "P1 - Single Instalment" → "P1")
        paymentPlanString = extractPaymentPlanType(paymentTermName);
        console.log(
          "📋 Payment term name:",
          paymentTermName,
          "→ Plan type:",
          paymentPlanString,
        );
      } else {
        console.log(
          "⚠️ Payment term document not found, using paymentPlanId as-is",
        );
      }
    } catch (err) {
      console.log(
        "⚠️ Error fetching payment term, using paymentPlanId as-is:",
        err,
      );
    }

    // Convert "full_payment" to "Full Payment" for calculation functions
    if (paymentPlanString === "full_payment") {
      paymentPlanString = "Full Payment";
    }

    // Prepare input for payment plan calculation
    const updateInput: PaymentPlanUpdateInput = {
      paymentPlan: paymentPlanString,
      reservationDate: bookingData.reservationDate || bookingData.createdAt,
      tourDate: bookingData.tourDate,
      paymentCondition: bookingData.paymentCondition || "",
      originalTourCost: bookingData.originalTourCost || 0,
      discountedTourCost: bookingData.discountedTourCost || null,
      reservationFee: bookingData.reservationFee || 250,
      isMainBooker: bookingData.isMainBooking !== false,
      creditAmount: bookingData.manualCredit || 0,
      reminderDaysBefore: 7, // 7 days before due date
    };

    // Calculate all payment plan fields
    const paymentUpdate = calculatePaymentPlanUpdate(updateInput);

    console.log("📅 Payment plan calculated:", {
      bookingId: bookingDocumentId,
      paymentPlan: paymentUpdate.paymentPlan,
      fullPaymentDueDate: paymentUpdate.fullPaymentDueDate,
      p1DueDate: paymentUpdate.p1DueDate,
      p2DueDate: paymentUpdate.p2DueDate,
    });

    // Update the booking document
    await updateDoc(bookingDocRef, {
      ...paymentUpdate,
      paidTerms: 0,
      enablePaymentReminder: true,
      selectedPlanAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...(!bookingData.paymentMethod && { paymentMethod: "Revolut" }),
    });

    console.log(`✅ Booking ${bookingDocumentId} updated with payment plan`);

    // Create notification for payment plan selection (don't block if it fails)
    try {
      const { createNotification } =
        await import("@/utils/notification-service");

      const travelerName =
        `${bookingData.firstName || ""} ${bookingData.lastName || ""}`.trim();
      const tourPackageName = bookingData.tourPackageName || "Tour";
      const paymentPlanLabel =
        paymentPlanDetails?.label ||
        paymentUpdate.paymentPlan ||
        "Payment Plan";

      await createNotification({
        type: "payment_plan_selected",
        title: "Payment Plan Selected",
        body: `${travelerName} selected ${paymentPlanLabel} for ${tourPackageName}`,
        data: {
          bookingId: bookingData.bookingId,
          bookingDocumentId: bookingDocumentId,
          travelerName,
          tourPackageName,
          paymentPlan: paymentPlanLabel,
        },
      });

      console.log("✅ Notification created for payment plan selection");
    } catch (notificationError) {
      console.error("❌ Failed to create notification:", notificationError);
      // Don't block the response - continue anyway
    }

    return NextResponse.json({
      success: true,
      bookingDocumentId: bookingDocumentId,
      paymentPlan: paymentUpdate.paymentPlan,
      message: "Payment plan selected successfully",
    });
  } catch (err: any) {
    console.error("❌ Select Plan Error:", err.message);
    console.error("Error details:", err);

    return NextResponse.json(
      {
        error: err.message ?? "Failed to select payment plan",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 },
    );
  }
}

// Add OPTIONS handler for CORS
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
