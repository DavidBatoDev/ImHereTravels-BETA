// /api/stripe-payments/init-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase"; // adjust if you already have your firebase import
import {
  collection,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
  getDoc,
  limit,
} from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const {
      email,
      tourPackage,
      tourPackageName,
      amountGBP,
      /* bookingId (ignored to avoid re-init triggers) */ bookingId,
      meta,
      paymentDocId,
    } = await req.json();

    if (!amountGBP || amountGBP <= 0)
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    // Convert GBP → pence (Stripe expects smallest currency unit)
    const amountPence = Math.round(amountGBP * 100);

    // 0️⃣ If a paymentDocId was supplied (placeholder created earlier), try to
    // reuse any existing intent attached to that doc. Otherwise, try to reuse
    // a pending intent for same email + package (avoid duplicates)
    const paymentsRef = collection(db, "stripePayments");
    let existingIntentToReuse: any = null;
    // If a paymentDocId was provided, prefer to check it first
    if (paymentDocId) {
      try {
        const providedDocSnap = await getDoc(
          doc(db, "stripePayments", paymentDocId as string)
        );
        if (providedDocSnap.exists()) {
          const data = providedDocSnap.data() as any;
          if (data?.stripeIntentId) {
            try {
              const existingIntent = await stripe.paymentIntents.retrieve(
                data.stripeIntentId
              );
              if (existingIntent && existingIntent.status !== "succeeded") {
                return NextResponse.json({
                  clientSecret: existingIntent.client_secret,
                  paymentDocId,
                  reused: true,
                });
              }
            } catch {
              // fallthrough
            }
          }
        }
      } catch (err) {
        console.warn("Could not read provided paymentDocId", err);
      }
    }

    // Otherwise, try to reuse an existing pending intent for same email + package
    const existingQ = query(
      paymentsRef,
      where("email", "==", email),
      where("tourPackageId", "==", tourPackage),
      where("type", "==", "reservationFee"),
      // Prior format used "pending"; new format uses "reserve_pending". Reuse either.
      where("status", "in", ["pending", "reserve_pending"]),
      limit(1)
    );

    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      const docSnap = existingSnap.docs[0];
      const data = docSnap.data() as any;
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(
          data.stripeIntentId
        );
        if (existingIntent && existingIntent.status !== "succeeded") {
          return NextResponse.json({
            clientSecret: existingIntent.client_secret,
            paymentDocId: docSnap.id,
            reused: true,
          });
        }
      } catch {
        // fallthrough to create a new intent
      }
    }

    // 1️⃣ Create a PaymentIntent with descriptive info (idempotent per email+package)
    const intent = await stripe.paymentIntents.create(
      {
        amount: amountPence,
        currency: "gbp",
        automatic_payment_methods: { enabled: true },
        description: `Reservation fee for ${tourPackageName || tourPackage}`,
        metadata: {
          ...meta,
          email,
          tourPackageId: tourPackage,
          tourPackageName: tourPackageName || tourPackage,
          bookingId: bookingId || "PENDING",
          type: "reservationFee",
        },
      },
      {
        idempotencyKey: `reservationFee:${email}:${tourPackage}`,
      }
    );

    // 2️⃣ Store/attach in Firestore (future reference & webhook verification)
    if (paymentDocId) {
      // Attach the intent to the existing placeholder document
      const paymentDocRef = doc(db, "stripePayments", paymentDocId as string);
      await setDoc(
        paymentDocRef,
        {
          stripeIntentId: intent.id,
          clientSecret: intent.client_secret,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return NextResponse.json({
        clientSecret: intent.client_secret,
        paymentDocId,
      });
    } else {
      // Create a new Firestore document and return its id
      const newDocRef = await addDoc(paymentsRef, {
        bookingId: bookingId || "PENDING",
        email,
        tourPackageId: tourPackage,
        tourPackageName: tourPackageName || tourPackage,
        amountGBP,
        currency: "GBP",
        stripeIntentId: intent.id,
        status: "reserve_pending",
        type: "reservationFee",
        createdAt: serverTimestamp(),
      });

      // write back the id field on the document
      await setDoc(
        doc(db, "stripePayments", newDocRef.id),
        { id: newDocRef.id },
        { merge: true }
      );

      return NextResponse.json({
        clientSecret: intent.client_secret,
        paymentDocId: newDocRef.id,
      });
    }
  } catch (err: any) {
    console.error("Stripe Init Payment Error:", err.message);
    return new NextResponse(err.message ?? "Stripe error", { status: 400 });
  }
}
