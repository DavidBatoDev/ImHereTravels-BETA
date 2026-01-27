import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import Stripe from "stripe";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

type InstallmentId = "full_payment" | "p1" | "p2" | "p3" | "p4";

interface InstallmentFieldMap {
  dueDate: string;
  amount: string;
  datePaid: string;
}

const INSTALLMENT_FIELD_MAP: Record<InstallmentId, InstallmentFieldMap> = {
  full_payment: {
    dueDate: "fullPaymentDueDate",
    amount: "fullPaymentAmount",
    datePaid: "fullPaymentDatePaid",
  },
  p1: { dueDate: "p1DueDate", amount: "p1Amount", datePaid: "p1DatePaid" },
  p2: { dueDate: "p2DueDate", amount: "p2Amount", datePaid: "p2DatePaid" },
  p3: { dueDate: "p3DueDate", amount: "p3Amount", datePaid: "p3DatePaid" },
  p4: { dueDate: "p4DueDate", amount: "p4Amount", datePaid: "p4DatePaid" },
};

export async function POST(req: NextRequest) {
  try {
    const { access_token, installment_id } = await req.json();

    // Validate inputs
    if (!access_token || !installment_id) {
      return NextResponse.json(
        { error: "Missing access_token or installment_id" },
        { status: 400 }
      );
    }

    if (!INSTALLMENT_FIELD_MAP[installment_id as InstallmentId]) {
      return NextResponse.json(
        { error: "Invalid installment_id" },
        { status: 400 }
      );
    }

    console.log(
      `🔍 Creating checkout for installment: ${installment_id}, access_token: ${access_token.substring(0, 10)}...`
    );

    // 1. Validate access_token and get booking
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("access_token", "==", access_token),
      limit(1)
    );
    const bookingsSnap = await getDocs(bookingsQuery);

    if (bookingsSnap.empty) {
      console.log("❌ Invalid access token");
      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 403 }
      );
    }

    const bookingDoc = bookingsSnap.docs[0];
    const booking = { id: bookingDoc.id, ...bookingDoc.data() } as any;

    console.log(`✅ Found booking: ${booking.bookingId}`);
    console.log(`📧 Customer data:`, {
      customer: booking.customer,
      customerEmail: booking.customerEmail,
      email: booking.email,
    });

    // 2. Get installment details from flat fields
    const fields = INSTALLMENT_FIELD_MAP[installment_id as InstallmentId];
    const dueDate = booking[fields.dueDate];
    const amount = booking[fields.amount];
    const datePaid = booking[fields.datePaid];

    // 3. Validate installment exists
    if (!dueDate || !amount) {
      console.log(`❌ Installment ${installment_id} not found in booking`);
      return NextResponse.json(
        { error: "Installment not found for this booking" },
        { status: 404 }
      );
    }

    console.log(
      `📅 Installment details: Due ${dueDate}, Amount: €${amount}`
    );

    // 4. Check if already paid (check both sources)
    const tokenStatus = booking.paymentTokens?.[installment_id]?.status;
    if (datePaid || tokenStatus === "success") {
      console.log(`❌ Installment ${installment_id} already paid`);
      return NextResponse.json(
        { error: "Installment already paid" },
        { status: 400 }
      );
    }

    // 5. Check if payment is currently processing
    if (tokenStatus === "processing") {
      console.log(
        `⏳ Payment for ${installment_id} is currently being processed`
      );
      return NextResponse.json(
        {
          error: "Payment is currently being processed. Please wait.",
        },
        { status: 409 }
      );
    }

    // 6. Generate payment_token (short-lived, one-time)
    const payment_token = crypto.randomBytes(32).toString("base64url");
    const payment_token_expires_at = Timestamp.fromMillis(
      Date.now() + 24 * 60 * 60 * 1000
    ); // 24 hours

    console.log(
      `🔐 Generated payment token: ${payment_token.substring(0, 10)}...`
    );

    // 7. Create stripePayments document
    const stripePaymentDoc = await addDoc(collection(db, "stripePayments"), {
      bookingDocumentId: booking.id,
      payment_token: payment_token,
      payment_token_expires_at: payment_token_expires_at,
      payment: {
        type: "installment",
        installmentTerm: installment_id,
        amount: amount,
        currency: "GBP",
        status: "installment_pending",
      },
      timestamps: {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    });

    console.log(
      `📝 Created stripePayments document: ${stripePaymentDoc.id}`
    );

    // 8. Update booking.paymentTokens with nested object
    await updateDoc(doc(db, "bookings", booking.id), {
      [`paymentTokens.${installment_id}`]: {
        token: payment_token,
        expiresAt: payment_token_expires_at,
        stripePaymentDocId: stripePaymentDoc.id,
        status: "pending",
        lastAttemptAt: serverTimestamp(),
      },
    });

    console.log(`✅ Updated booking with payment token`);

    // 9. Create Stripe Checkout Session
    const installmentDisplayName =
      installment_id === "full_payment"
        ? "Full Payment"
        : installment_id.toUpperCase();

    // Use environment variable for base URL (works in both dev and production)
    const baseUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3000";

    console.log(`🌐 Using base URL: ${baseUrl}`);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "revolut_pay"],
      customer_email: booking.emailAddress || undefined,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `${booking.tourPackageName} - ${installmentDisplayName}`,
              description: `Booking ID: ${booking.bookingId}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/booking-status/${access_token}?payment_success=true&installment=${installment_id}`,
      cancel_url: `${baseUrl}/booking-status/${access_token}?payment_cancelled=true&installment=${installment_id}`,
      metadata: {
        payment_token: payment_token,
        installment_id: installment_id,
        booking_document_id: booking.id,
        stripe_payment_doc_id: stripePaymentDoc.id,
      },
    });

    console.log(`💳 Created Stripe Checkout session: ${session.id}`);

    // 10. Update stripePayments with checkout session ID
    await updateDoc(doc(db, "stripePayments", stripePaymentDoc.id), {
      "payment.checkoutSessionId": session.id,
    });

    // 11. Mark as processing
    await updateDoc(doc(db, "bookings", booking.id), {
      [`paymentTokens.${installment_id}.status`]: "processing",
    });

    console.log(`✅ Payment session ready. Redirecting to Stripe...`);

    return NextResponse.json({
      success: true,
      checkout_url: session.url,
    });
  } catch (error: any) {
    console.error("❌ Create checkout error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to create checkout session",
      },
      { status: 500 }
    );
  }
}
