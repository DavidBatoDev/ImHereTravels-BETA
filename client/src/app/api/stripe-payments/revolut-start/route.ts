import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId, returnUrl } = await req.json();

    if (!paymentIntentId || !returnUrl) {
      return NextResponse.json(
        { error: "Missing paymentIntentId or returnUrl" },
        { status: 400 }
      );
    }

    // Confirm the PaymentIntent specifically for Revolut Pay
    const confirmed = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method_data: { type: "revolut_pay" },
      return_url: returnUrl,
    });

    // Extract redirect URL (Stripe-hosted auth page)
    const redirectUrl = (confirmed.next_action as any)?.redirect_to_url?.url;

    if (!redirectUrl) {
      return NextResponse.json(
        {
          error: "No redirect URL returned by Stripe",
          status: confirmed.status,
          nextAction: confirmed.next_action,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ redirectUrl, status: confirmed.status });
  } catch (error: any) {
    console.error("revolut-start error:", error);
    return NextResponse.json(
      { error: "Failed to start Revolut Pay", details: error?.message },
      { status: 500 }
    );
  }
}
