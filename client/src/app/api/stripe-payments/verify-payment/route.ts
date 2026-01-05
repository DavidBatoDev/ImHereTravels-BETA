// /api/stripe-payments/verify-payment/route.ts
// Verifies a payment intent status with Stripe
// Used to ensure payment actually succeeded before showing confirmation

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentIntentId = searchParams.get("paymentIntentId");

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "Missing paymentIntentId parameter" },
        { status: 400 }
      );
    }

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return NextResponse.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      created: paymentIntent.created,
      paymentMethod: paymentIntent.payment_method,
    });
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      {
        error: "Failed to verify payment",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
