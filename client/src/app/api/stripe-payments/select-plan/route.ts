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
    const { paymentDocId, selectedPaymentPlan, paymentPlanDetails } =
      await req.json();

    // Validate required fields
    if (!paymentDocId) {
      return NextResponse.json(
        { error: "Missing required field: paymentDocId" },
        { status: 400 }
      );
    }

    if (!selectedPaymentPlan) {
      return NextResponse.json(
        { error: "Missing required field: selectedPaymentPlan" },
        { status: 400 }
      );
    }

    console.log("📝 Processing payment plan selection:", {
      paymentDocId,
      selectedPaymentPlan,
    });

    // Fetch the stripePayments document
    const paymentDocRef = doc(db, "stripePayments", paymentDocId);
    const paymentDocSnap = await getDoc(paymentDocRef);

    if (!paymentDocSnap.exists()) {
      return NextResponse.json(
        { error: "Payment document not found" },
        { status: 404 }
      );
    }

    const paymentData = paymentDocSnap.data();

    // Check if booking document exists (check both nested and flat for backward compatibility)
    const bookingDocumentId =
      paymentData.booking?.documentId || paymentData.bookingDocumentId;
    if (!bookingDocumentId) {
      console.error("❌ Payment data:", JSON.stringify(paymentData, null, 2));
      return NextResponse.json(
        {
          error:
            "No booking associated with this payment. Please complete Step 2 first.",
        },
        { status: 400 }
      );
    }

    // Fetch the booking document
    const bookingDocRef = doc(db, "bookings", bookingDocumentId);
    const bookingDocSnap = await getDoc(bookingDocRef);

    if (!bookingDocSnap.exists()) {
      return NextResponse.json(
        { error: "Booking document not found" },
        { status: 404 }
      );
    }

    const bookingData = bookingDocSnap.data();

    console.log(
      "📊 Calculating payment plan update for booking:",
      bookingDocumentId
    );

    // Fetch the payment term document to get the name
    // selectedPaymentPlan is the document ID in paymentTerms collection
    let paymentPlanString = selectedPaymentPlan;

    try {
      const paymentTermDocRef = doc(db, "paymentTerms", selectedPaymentPlan);
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
          paymentPlanString
        );
      } else {
        console.log(
          "⚠️ Payment term document not found, using selectedPaymentPlan as-is"
        );
      }
    } catch (err) {
      console.log(
        "⚠️ Error fetching payment term, using selectedPaymentPlan as-is:",
        err
      );
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
      paymentPlan: paymentUpdate.paymentPlan,
      fullPaymentDueDate: paymentUpdate.fullPaymentDueDate,
      p1DueDate: paymentUpdate.p1DueDate,
      p2DueDate: paymentUpdate.p2DueDate,
      p3DueDate: paymentUpdate.p3DueDate,
      p4DueDate: paymentUpdate.p4DueDate,
    });

    // Update the booking document
    await updateDoc(bookingDocRef, {
      ...paymentUpdate,
      // Set paymentPlan to "Full Payment" if it's full_payment
      paymentPlan:
        paymentPlanString === "full_payment"
          ? "Full Payment"
          : paymentUpdate.paymentPlan,
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Booking updated with payment plan");

    // Update the stripePayments document with nested structure
    await updateDoc(paymentDocRef, {
      "payment.status": "terms_selected",
      "payment.selectedPaymentPlan": selectedPaymentPlan,
      "payment.paymentPlanDetails": paymentPlanDetails || null,
      "timestamps.confirmedAt": serverTimestamp(),
      "timestamps.updatedAt": serverTimestamp(),
    });

    console.log("✅ Stripe payment record updated to terms_selected");

    return NextResponse.json({
      success: true,
      bookingDocumentId,
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
      { status: 500 }
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
