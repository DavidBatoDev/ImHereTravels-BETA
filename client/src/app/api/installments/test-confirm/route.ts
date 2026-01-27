import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

/**
 * TEST ENDPOINT - Manually trigger installment payment confirmation
 * Use this in development when Stripe webhooks don't reach localhost
 * 
 * POST /api/installments/test-confirm
 * Body: { checkout_session_id: "cs_test_..." } OR { stripe_payment_doc_id: "EVMHhG..." }
 */
export async function POST(req: NextRequest) {
  try {
    const { checkout_session_id, stripe_payment_doc_id } = await req.json();

    if (!checkout_session_id && !stripe_payment_doc_id) {
      return NextResponse.json(
        { error: "Missing checkout_session_id or stripe_payment_doc_id" },
        { status: 400 }
      );
    }

    console.log(`🧪 TEST: Manually confirming payment`);

    let paymentDoc;
    let paymentData;

    // Method 1: Find by stripePaymentDocId (direct)
    if (stripe_payment_doc_id) {
      console.log(`📝 Looking up by document ID: ${stripe_payment_doc_id}`);
      const docRef = doc(db, "stripePayments", stripe_payment_doc_id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return NextResponse.json(
          { error: "Payment document not found" },
          { status: 404 }
        );
      }
      
      paymentDoc = { id: docSnap.id };
      paymentData = docSnap.data();
    } 
    // Method 2: Find by checkoutSessionId (query)
    else if (checkout_session_id) {
      console.log(`📝 Looking up by checkout session: ${checkout_session_id}`);
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      
      const paymentsQuery = query(
        collection(db, "stripePayments"),
        where("payment.checkoutSessionId", "==", checkout_session_id)
      );
      const paymentsSnap = await getDocs(paymentsQuery);

      if (paymentsSnap.empty) {
        return NextResponse.json(
          { error: "Payment session not found" },
          { status: 404 }
        );
      }

      paymentDoc = { id: paymentsSnap.docs[0].id };
      paymentData = paymentsSnap.docs[0].data();
    }

    console.log(`📝 Found payment document:`, paymentDoc.id);
    console.log(`📦 Metadata:`, {
      installmentId: paymentData.payment?.installmentTerm,
      bookingId: paymentData.bookingDocumentId,
      amount: paymentData.payment?.amount,
    });

    // 2. Update stripePayments document
    await updateDoc(doc(db, "stripePayments", paymentDoc.id), {
      "payment.status": "installment_paid",
      "timestamps.updatedAt": serverTimestamp(),
      "timestamps.paidAt": serverTimestamp(),
    });

    console.log(`✅ Updated stripePayments to installment_paid`);

    // 3. Get booking data
    const bookingRef = doc(db, "bookings", paymentData.bookingDocumentId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookingSnap.data();
    const installmentId = paymentData.payment?.installmentTerm;

    // 4. Recalculate everything from scratch to prevent double-counting
    const totalCost = booking.discountedTourCost || booking.originalTourCost || 0;
    
    // Start with reservation fee
    let calculatedPaid = booking.reservationFee || 0;
    
    // Check all installments
    const installments = ["p1", "p2", "p3", "p4"];
    let installmentsPaidCount = 0;
    const totalInstallments = installments.filter(id => booking[`${id}Amount`] > 0).length;

    installments.forEach(id => {
      const isCurrentPayment = id === installmentId;
      const isAlreadyPaid = booking[`${id}DatePaid`] || 
                           booking.paymentTokens?.[id]?.status === "success";
      
      if (isCurrentPayment || isAlreadyPaid) {
        const amount = booking[`${id}Amount`] || 0;
        calculatedPaid += amount;
        installmentsPaidCount++;
      }
    });

    const newRemainingBalance = totalCost - calculatedPaid;
    const newPaymentProgress = totalCost > 0 ? Math.round((calculatedPaid / totalCost) * 100) : 0;
    
    // Determine new booking status string
    let newBookingStatus = booking.bookingStatus;
    if (newRemainingBalance <= 0) {
      newBookingStatus = "Paid in Full";
    } else {
      newBookingStatus = `Installment ${installmentsPaidCount}/${totalInstallments}`;
    }

    // 5. Map installment_id to flat field names
    const datePaidFieldMap: Record<string, string> = {
      full_payment: "fullPaymentDatePaid",
      p1: "p1DatePaid",
      p2: "p2DatePaid",
      p3: "p3DatePaid",
      p4: "p4DatePaid",
    };

    const datePaidField = datePaidFieldMap[installmentId];
    const paidTimestamp = serverTimestamp();

    // 6. Update booking with SUCCESS status and recalculated totals
    await updateDoc(bookingRef, {
      // Update nested paymentTokens object
      [`paymentTokens.${installmentId}.status`]: "success",
      [`paymentTokens.${installmentId}.paidAt`]: paidTimestamp,
      [`paymentTokens.${installmentId}.token`]: null, // Invalidate token

      // Update flat field for backward compatibility
      [datePaidField]: paidTimestamp,

      // Update totals with recalculated values
      paid: calculatedPaid,
      remainingBalance: newRemainingBalance,
      paymentProgress: newPaymentProgress,
      bookingStatus: newBookingStatus,
    });

    console.log(`✅ Installment ${installmentId} marked as paid`);
    console.log(`💰 New totals: Paid €${calculatedPaid}, Remaining €${newRemainingBalance}, Progress ${newPaymentProgress}%`);

    return NextResponse.json({
      success: true,
      message: "Payment confirmed successfully",
      data: {
        installmentId,
        bookingId: booking.bookingId,
        amountPaid: paymentData.payment?.amount,
        newPaid: calculatedPaid,
        newRemainingBalance,
        newPaymentProgress,
        bookingStatus: newBookingStatus,
      },
    });
  } catch (error: any) {
    console.error("❌ Test confirm error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to confirm payment" },
      { status: 500 }
    );
  }
}
