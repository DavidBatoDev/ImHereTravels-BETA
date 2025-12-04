// /api/stripe-payments/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  createBookingData,
  generateGroupId,
  type BookingCreationInput,
} from "@/lib/booking-calculations";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: null as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Fetch tour package data by ID
 */
async function getTourPackageData(tourPackageId: string) {
  try {
    const tourPackageDoc = await getDoc(doc(db, "tourPackages", tourPackageId));
    if (tourPackageDoc.exists()) {
      return { id: tourPackageDoc.id, ...tourPackageDoc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching tour package:", error);
    return null;
  }
}

/**
 * Get count of existing bookings for the same tour package (for unique counter)
 */
async function getExistingBookingsCountForTourPackage(
  tourPackageName: string
): Promise<number> {
  try {
    const bookingsRef = collection(db, "bookings");
    const q = query(
      bookingsRef,
      where("tourPackageName", "==", tourPackageName)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("Error counting bookings for tour package:", error);
    return 0;
  }
}

/**
 * Get total count of all bookings (for global row number)
 */
async function getTotalBookingsCount(): Promise<number> {
  try {
    const bookingsRef = collection(db, "bookings");
    const snapshot = await getDocs(bookingsRef);
    return snapshot.size;
  } catch (error) {
    console.error("Error counting total bookings:", error);
    return 0;
  }
}

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
      const q = query(
        paymentsRef,
        where("stripeIntentId", "==", paymentIntent.id)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const paymentDoc = snapshot.docs[0];
        const paymentData = paymentDoc.data();

        // Check if this is a reservation fee payment (Step 2)
        if (
          paymentData.type === "reservationFee" &&
          paymentData.status !== "reserve_paid"
        ) {
          console.log(
            "🎯 Processing reservation fee payment - creating booking"
          );

          // Fetch tour package data
          const tourPackage = await getTourPackageData(
            paymentData.tourPackageId
          );
          const tourCode = (tourPackage as any)?.tourCode || "XXX";
          const originalTourCost = (tourPackage as any)?.pricing?.original || 0;
          const discountedTourCost =
            (tourPackage as any)?.pricing?.discounted || null;
          const tourDuration = (tourPackage as any)?.duration || null;

          // Get existing bookings count for unique counter (per tour package)
          const existingCountForTourPackage =
            await getExistingBookingsCountForTourPackage(
              paymentData.tourPackageName || (tourPackage as any)?.name || ""
            );

          // Get total bookings count for global row number
          const totalBookingsCount = await getTotalBookingsCount();

          // Determine if this is a group booking and generate group ID
          const isGroupBooking =
            paymentData.bookingType === "Duo Booking" ||
            paymentData.bookingType === "Group Booking";
          const groupId = isGroupBooking
            ? paymentData.groupCode || generateGroupId()
            : "";

          // Create booking input
          const bookingInput: BookingCreationInput = {
            email: paymentData.email || "",
            firstName: paymentData.firstName || "",
            lastName: paymentData.lastName || "",
            bookingType: paymentData.bookingType || "Single Booking",
            tourPackageName:
              paymentData.tourPackageName || (tourPackage as any)?.name || "",
            tourCode,
            tourDate: paymentData.tourDate || "",
            returnDate: paymentData.returnDate || "",
            tourDuration,
            reservationFee: paymentData.amountGBP || 250,
            paidAmount: paymentData.amountGBP || 250,
            originalTourCost,
            discountedTourCost,
            paymentMethod: "stripe",
            groupId,
            isMainBooking: true,
            existingBookingsCount: existingCountForTourPackage,
            totalBookingsCount: totalBookingsCount,
          };

          // Create the booking data
          const bookingData = await createBookingData(bookingInput);

          console.log("📝 Creating booking with ID:", bookingData.bookingId);

          // Add to bookings collection
          const bookingsRef = collection(db, "bookings");
          const newBookingRef = await addDoc(bookingsRef, {
            ...bookingData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          console.log("✅ Booking created with document ID:", newBookingRef.id);

          // Update stripePayments document with booking reference and status
          await updateDoc(doc(db, "stripePayments", paymentDoc.id), {
            status: "reserve_paid",
            bookingDocumentId: newBookingRef.id,
            bookingId: bookingData.bookingId,
            paidAt: new Date().toISOString(),
            updatedAt: serverTimestamp(),
          });

          console.log(
            "✅ Stripe payment record updated with booking reference"
          );
        } else {
          // For other payment types or already processed, just update status
          await updateDoc(doc(db, "stripePayments", paymentDoc.id), {
            status: "succeeded",
            paidAt: new Date().toISOString(),
          });
          console.log("✅ Firestore payment record updated to succeeded");
        }
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log("❌ PaymentIntent failed:", paymentIntent.id);

      const paymentsRef = collection(db, "stripePayments");
      const q = query(
        paymentsRef,
        where("stripeIntentId", "==", paymentIntent.id)
      );
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
