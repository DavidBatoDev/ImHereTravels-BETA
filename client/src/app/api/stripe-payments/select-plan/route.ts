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
    const { paymentDocId, paymentPlans, paymentPlanDetails } = await req.json();

    // Validate required fields
    if (!paymentDocId) {
      return NextResponse.json(
        { error: "Missing required field: paymentDocId" },
        { status: 400 },
      );
    }

    if (
      !paymentPlans ||
      !Array.isArray(paymentPlans) ||
      paymentPlans.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid required field: paymentPlans (must be non-empty array)",
        },
        { status: 400 },
      );
    }

    console.log("📝 Processing payment plan selection:", {
      paymentDocId,
      paymentPlans,
      numberOfPlans: paymentPlans.length,
    });

    // Fetch the stripePayments document
    const paymentDocRef = doc(db, "stripePayments", paymentDocId);
    const paymentDocSnap = await getDoc(paymentDocRef);

    if (!paymentDocSnap.exists()) {
      return NextResponse.json(
        { error: "Payment document not found" },
        { status: 404 },
      );
    }

    const paymentData = paymentDocSnap.data();

    // Get all booking document IDs (should be an array for group bookings)
    const bookingDocumentIds =
      paymentData.bookingDocumentIds ||
      (paymentData.booking?.documentId
        ? [paymentData.booking.documentId]
        : []) ||
      (paymentData.bookingDocumentId ? [paymentData.bookingDocumentId] : []);

    if (!bookingDocumentIds || bookingDocumentIds.length === 0) {
      console.error("❌ Payment data:", JSON.stringify(paymentData, null, 2));
      return NextResponse.json(
        {
          error:
            "No bookings associated with this payment. Please complete Step 2 first.",
        },
        { status: 400 },
      );
    }

    // Validate that we have the same number of payment plans as bookings
    if (paymentPlans.length !== bookingDocumentIds.length) {
      return NextResponse.json(
        {
          error: `Payment plan count mismatch: ${paymentPlans.length} plans provided but ${bookingDocumentIds.length} bookings exist`,
        },
        { status: 400 },
      );
    }

    console.log(
      `📊 Processing ${bookingDocumentIds.length} bookings with their payment plans`,
    );

    // Process each booking with its corresponding payment plan
    const updateResults: Array<{
      bookingDocumentId: string;
      paymentPlan: string;
    }> = [];
    for (let i = 0; i < bookingDocumentIds.length; i++) {
      const bookingDocumentId = bookingDocumentIds[i];
      const personPlan = paymentPlans[i];

      console.log(
        `\n--- Processing booking ${i + 1}/${bookingDocumentIds.length} ---`,
      );
      console.log(`Booking ID: ${bookingDocumentId}`);
      console.log(`Payment plan:`, personPlan);

      // Fetch the booking document
      const bookingDocRef = doc(db, "bookings", bookingDocumentId);
      const bookingDocSnap = await getDoc(bookingDocRef);

      if (!bookingDocSnap.exists()) {
        console.error(`❌ Booking ${bookingDocumentId} not found`);
        continue; // Skip this booking but continue with others
      }

      const bookingData = bookingDocSnap.data();

      // Get the selected payment plan ID from the person's plan
      const selectedPaymentPlan = personPlan.plan;

      // Fetch the payment term document to get the name
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
            paymentPlanString,
          );
        } else {
          console.log(
            "⚠️ Payment term document not found, using selectedPaymentPlan as-is",
          );
        }
      } catch (err) {
        console.log(
          "⚠️ Error fetching payment term, using selectedPaymentPlan as-is:",
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
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ Booking ${bookingDocumentId} updated with payment plan`);

      updateResults.push({
        bookingDocumentId,
        paymentPlan: paymentUpdate.paymentPlan,
      });
    }

    // Update the stripePayments document with nested structure
    await updateDoc(paymentDocRef, {
      "payment.status": "terms_selected",
      "payment.paymentPlans": paymentPlans, // Store the array of plans
      "payment.paymentPlanDetails": paymentPlanDetails || null,
      "timestamps.confirmedAt": serverTimestamp(),
      "timestamps.updatedAt": serverTimestamp(),
    });

    console.log("✅ Stripe payment record updated to terms_selected");
    console.log(`✅ Successfully processed ${updateResults.length} bookings`);

    return NextResponse.json({
      success: true,
      bookingDocumentIds: bookingDocumentIds,
      bookingDocumentId: bookingDocumentIds[0], // For backward compatibility
      updatedBookings: updateResults,
      message: "Payment plans selected successfully for all bookings",
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
