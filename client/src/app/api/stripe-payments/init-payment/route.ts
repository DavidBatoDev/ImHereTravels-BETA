// app/api/stripe-payments/init-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase";
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
      paymentDocId,
      meta,
    } = await req.json();

    // Validate required fields
    if (!email || !tourPackage) {
      return NextResponse.json(
        { error: "Missing required fields: email and tourPackage are required" },
        { status: 400 }
      );
    }

    if (!amountGBP || amountGBP <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Convert GBP → pence (Stripe expects smallest currency unit)
    const amountPence = Math.round(amountGBP * 100);

    // 1️⃣ If a paymentDocId was supplied, try to reuse any existing intent attached to that doc
    if (paymentDocId) {
      try {
        const providedDocSnap = await getDoc(
          doc(db, "stripePayments", paymentDocId)
        );
        if (providedDocSnap.exists()) {
          const data = providedDocSnap.data() as any;
          if (data?.stripeIntentId) {
            try {
              const existingIntent = await stripe.paymentIntents.retrieve(
                data.stripeIntentId
              );
              // Only reuse if the intent is still in a reusable state
              if (existingIntent && 
                  existingIntent.status !== "succeeded" && 
                  existingIntent.status !== "canceled") {
                console.log("♻️ Reusing existing payment intent for document:", paymentDocId);
                return NextResponse.json({
                  clientSecret: existingIntent.client_secret,
                  paymentDocId,
                  reused: true,
                });
              }
            } catch (err) {
              console.warn("Could not retrieve existing intent, creating new one:", err);
              // Continue to create new intent
            }
          }
        }
      } catch (err) {
        console.warn("Could not read provided paymentDocId, creating new intent:", err);
      }
    }

    // 2️⃣ Otherwise, try to reuse an existing pending intent for same email + package
    const paymentsRef = collection(db, "stripePayments");
    const existingQ = query(
      paymentsRef,
      where("email", "==", email),
      where("tourPackageId", "==", tourPackage),
      where("type", "==", "reservationFee"),
      where("status", "in", ["pending", "reserve_pending"]),
      limit(1)
    );

    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      const docSnap = existingSnap.docs[0];
      const data = docSnap.data() as any;
      if (data?.stripeIntentId) {
        try {
          const existingIntent = await stripe.paymentIntents.retrieve(
            data.stripeIntentId
          );
          if (existingIntent && 
              existingIntent.status !== "succeeded" && 
              existingIntent.status !== "canceled") {
            console.log("♻️ Reusing existing payment intent for email:", email);
            return NextResponse.json({
              clientSecret: existingIntent.client_secret,
              paymentDocId: docSnap.id,
              reused: true,
            });
          }
        } catch (err) {
          console.warn("Could not retrieve existing intent, creating new one:", err);
        }
      }
    }

    // 3️⃣ Create a new PaymentIntent with descriptive info
    const idempotencyKey = `reservation_${email}_${tourPackage}_${amountPence}_${Date.now()}`;

    console.log("🆕 Creating new payment intent for:", {
      email,
      tourPackage,
      amountGBP,
      amountPence,
      idempotencyKey,
    });

    const intent = await stripe.paymentIntents.create(
      {
        amount: amountPence,
        currency: "gbp",
        automatic_payment_methods: { 
          enabled: true,
        },
        description: `Reservation fee for ${tourPackageName || tourPackage}`,
        metadata: {
          ...meta,
          email,
          tourPackageId: tourPackage,
          tourPackageName: tourPackageName || tourPackage,
          type: "reservationFee",
          source: "reservation-form",
        },
      },
      {
        idempotencyKey,
      }
    );

    console.log("✅ Created new payment intent:", intent.id);

    // 4️⃣ Store/attach in Firestore
    if (paymentDocId) {
      // Attach the intent to the existing placeholder document
      const paymentDocRef = doc(db, "stripePayments", paymentDocId);
      await setDoc(
        paymentDocRef,
        {
          stripeIntentId: intent.id,
          clientSecret: intent.client_secret,
          amountGBP,
          currency: "GBP",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log("📝 Updated existing Firestore document:", paymentDocId);

      return NextResponse.json({
        clientSecret: intent.client_secret,
        paymentDocId,
      });
    } else {
      // Create a new Firestore document
      const newDocRef = await addDoc(paymentsRef, {
        bookingId: "PENDING",
        email,
        tourPackageId: tourPackage,
        tourPackageName: tourPackageName || tourPackage,
        amountGBP,
        currency: "GBP",
        stripeIntentId: intent.id,
        clientSecret: intent.client_secret,
        status: "reserve_pending",
        type: "reservationFee",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Write back the id field on the document
      await setDoc(
        doc(db, "stripePayments", newDocRef.id),
        { id: newDocRef.id },
        { merge: true }
      );

      console.log("📝 Created new Firestore document:", newDocRef.id);

      return NextResponse.json({
        clientSecret: intent.client_secret,
        paymentDocId: newDocRef.id,
      });
    }
  } catch (err: any) {
    console.error("❌ Stripe Init Payment Error:", err.message);
    console.error("Error details:", err);
    
    return NextResponse.json(
      { 
        error: err.message ?? "Stripe error",
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      }, 
      { status: 400 }
    );
  }
}

// Add OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}