// /api/stripe-payments/init-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase"; // adjust if you already have your firebase import
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: null,
});

export async function POST(req: NextRequest) {
  try {
    const { email, tourPackage, amountGBP, bookingId, meta } = await req.json();

    if (!amountGBP || amountGBP <= 0)
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    // Convert GBP → pence (Stripe expects smallest currency unit)
    const amountPence = Math.round(amountGBP * 100);

    // 1️⃣ Create a PaymentIntent
    const intent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      metadata: {
        ...meta,
        email,
        tourPackage,
        bookingId,
        type: "reservationFee",
      },
    });

    // 2️⃣ Store in Firestore (future reference & webhook verification)
    const paymentsRef = collection(db, "stripePayments");
    await addDoc(paymentsRef, {
      bookingId,
      email,
      tourPackage,
      amountGBP,
      currency: "GBP",
      stripeIntentId: intent.id,
      status: "pending",
      type: "reservationFee",
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (err: any) {
    console.error("Stripe Init Payment Error:", err.message);
    return new NextResponse(err.message ?? "Stripe error", { status: 400 });
  }
}
