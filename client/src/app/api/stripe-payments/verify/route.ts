// /api/stripe-payments/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { stripeIntentId } = await req.json();

    if (!stripeIntentId) {
      return NextResponse.json({ error: "Missing stripeIntentId" }, { status: 400 });
    }

    // Query Firestore for this payment intent
    const paymentsRef = collection(db, "stripePayments");
    const q = query(paymentsRef, where("stripeIntentId", "==", stripeIntentId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({ verified: false, status: "not_found" });
    }

    const paymentData = snapshot.docs[0].data();
    const isVerified = paymentData.status === "succeeded";

    return NextResponse.json({
      verified: isVerified,
      status: paymentData.status,
      paidAt: paymentData.paidAt || null,
    });
  } catch (err: any) {
    console.error("Verify payment error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
