// /api/stripe-payments/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: null as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("⚠️ Webhook signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle the event
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      console.log("✅ PaymentIntent succeeded:", paymentIntent.id);

      // Update Firestore payment record
      const paymentsRef = collection(db, "stripePayments");
      const q = query(paymentsRef, where("stripeIntentId", "==", paymentIntent.id));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const paymentDoc = snapshot.docs[0];
        await updateDoc(doc(db, "stripePayments", paymentDoc.id), {
          status: "succeeded",
          paidAt: new Date().toISOString(),
        });
        console.log("✅ Firestore payment record updated to succeeded");
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log("❌ PaymentIntent failed:", paymentIntent.id);

      const paymentsRef = collection(db, "stripePayments");
      const q = query(paymentsRef, where("stripeIntentId", "==", paymentIntent.id));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const paymentDoc = snapshot.docs[0];
        await updateDoc(doc(db, "stripePayments", paymentDoc.id), {
          status: "failed",
          failedAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
