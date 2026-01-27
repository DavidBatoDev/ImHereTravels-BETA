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

/**
 * Generate Group/Duo Booking Member ID (standalone version, no allRows needed).
 *
 * @param bookingType  "Duo Booking" | "Group Booking"
 * @param tourName     Tour package name
 * @param firstName    Traveller's first name
 * @param lastName     Traveller's last name
 * @param email        Traveller's email
 * @param isActive     Equivalent of U column (if false => "")
 * @returns string ID or ""
 */
function generateGroupMemberIdFunction(
  bookingType: string,
  tourName: string,
  firstName: string,
  lastName: string,
  email: string,
  isActive: boolean
): string {
  // Only Duo or Group bookings apply
  if (!(bookingType === "Duo Booking" || bookingType === "Group Booking")) {
    return "";
  }

  // Only generate ID if isActive is explicitly true
  if (isActive !== true) return "";

  const initials =
    (firstName?.[0] ?? "").toUpperCase() + (lastName?.[0] ?? "").toUpperCase();
  const idPrefix = bookingType === "Duo Booking" ? "DB" : "GB";

  // Hash based on email + traveller identity
  const identity = `${bookingType}|${tourName}|${firstName}|${lastName}|${email}`;
  let hashNum = 0;
  for (let i = 0; i < identity.length; i++) {
    hashNum += identity.charCodeAt(i) * (i + 1);
  }
  const hashTag = String(Math.abs(hashNum) % 10000).padStart(4, "0");

  // Fake member number: derive from hash as a stable 001–999
  const memberNumber = String((Math.abs(hashNum) % 999) + 1).padStart(3, "0");

  return `${idPrefix}-${initials}-${hashTag}-${memberNumber}`;
}

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
        where("payment.stripeIntentId", "==", paymentIntent.id)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const paymentDoc = snapshot.docs[0];
        const paymentData = paymentDoc.data();

        // Check if this is a reservation fee payment (Step 2)
        if (
          paymentData.payment?.type === "reservationFee" &&
          paymentData.payment?.status !== "reserve_paid"
        ) {
          console.log(
            "🎯 Processing reservation fee payment - creating booking"
          );

          // Fetch tour package data
          const tourPackage = await getTourPackageData(
            paymentData.tour?.packageId
          );
          const tourCode = (tourPackage as any)?.tourCode || "XXX";
          const originalTourCost = (tourPackage as any)?.pricing?.original || 0;
          const discountedTourCost =
            (tourPackage as any)?.pricing?.discounted || null;
          const tourDuration = (tourPackage as any)?.duration || null;

          // Get existing bookings count for unique counter (per tour package)
          const existingCountForTourPackage =
            await getExistingBookingsCountForTourPackage(
              paymentData.tour?.packageName || (tourPackage as any)?.name || ""
            );

          // Get total bookings count for global row number
          const totalBookingsCount = await getTotalBookingsCount();

          // Determine if this is a group booking and generate group ID
          const isGroupBooking =
            paymentData.booking?.type === "Duo Booking" ||
            paymentData.booking?.type === "Group Booking";
          const groupId = isGroupBooking
            ? paymentData.booking?.groupCode || generateGroupId()
            : "";

          // Create booking input
          const bookingInput: BookingCreationInput = {
            email: paymentData.customer?.email || "",
            firstName: paymentData.customer?.firstName || "",
            lastName: paymentData.customer?.lastName || "",
            bookingType: paymentData.booking?.type || "Single Booking",
            tourPackageName:
              paymentData.tour?.packageName || (tourPackage as any)?.name || "",
            tourCode,
            tourDate: paymentData.tour?.date || "",
            returnDate: paymentData.tour?.returnDate || "",
            tourDuration,
            reservationFee: paymentData.payment?.amount || 250,
            paidAmount: paymentData.payment?.amount || 250,
            originalTourCost,
            discountedTourCost,
            paymentMethod: "Stripe",
            groupId,
            isMainBooking: true,
            existingBookingsCount: existingCountForTourPackage,
            totalBookingsCount: totalBookingsCount,
          };

          // Create the booking data
          const bookingData = await createBookingData(bookingInput);

          // Only set isMainBooker and generate group IDs for Duo/Group bookings
          if (isGroupBooking) {
            // Set isMainBooker to true (main booker is the one making the reservation)
            bookingData.isMainBooker = true;

            // Generate groupIdGroupIdGenerator and groupId for Duo/Group bookings
            const generatedGroupMemberId = generateGroupMemberIdFunction(
              paymentData.booking?.type || "Single Booking",
              paymentData.tour?.packageName || (tourPackage as any)?.name || "",
              paymentData.customer?.firstName || "",
              paymentData.customer?.lastName || "",
              paymentData.customer?.email || "",
              true // isMainBooker is always true at this point
            );

            // Both fields should have the same value (full member ID)
            bookingData.groupIdGroupIdGenerator = generatedGroupMemberId;
            bookingData.groupId = generatedGroupMemberId;

            console.log("📝 Creating booking with ID:", bookingData.bookingId);
            console.log("📝 isMainBooker:", bookingData.isMainBooker);
            console.log(
              "📝 groupIdGroupIdGenerator:",
              bookingData.groupIdGroupIdGenerator
            );
            console.log("📝 groupId:", bookingData.groupId);
          } else {
            console.log("📝 Creating booking with ID:", bookingData.bookingId);
          } // Add to bookings collection
          const bookingsRef = collection(db, "bookings");
          const newBookingRef = await addDoc(bookingsRef, {
            ...bookingData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          console.log("✅ Booking created with document ID:", newBookingRef.id);

          // Update stripePayments document with booking reference and status
          await updateDoc(doc(db, "stripePayments", paymentDoc.id), {
            "payment.status": "reserve_paid",
            "booking.documentId": newBookingRef.id,
            "booking.id": bookingData.bookingId,
            "timestamps.paidAt": new Date().toISOString(),
            "timestamps.updatedAt": serverTimestamp(),
          });

          console.log(
            "✅ Stripe payment record updated with booking reference"
          );
        } else {
          // For other payment types or already processed, just update status
          await updateDoc(doc(db, "stripePayments", paymentDoc.id), {
            "payment.status": "succeeded",
            "timestamps.paidAt": new Date().toISOString(),
          });
          console.log("✅ Firestore payment record updated to succeeded");
        }
      }
    }

    // Handle Stripe Checkout session completion (for installment payments)
    if(event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const {
        payment_token,
        installment_id,
        booking_document_id,
        stripe_payment_doc_id,
      } = session.metadata || {};

      console.log(`💳 Checkout session completed: ${session.id}`);
      console.log(`📦 Metadata:`, { payment_token: payment_token?.substring(0, 10), installment_id, booking_document_id });

      if (!payment_token || !installment_id || !booking_document_id || !stripe_payment_doc_id) {
        console.log("⚠️ Missing metadata for installment payment, skipping...");
        return NextResponse.json({ received: true });
      }

      try {
        // 1. Validate payment_token
        const stripePaymentDoc = await getDoc(
          doc(db, "stripePayments", stripe_payment_doc_id)
        );

        if (!stripePaymentDoc.exists()) {
          console.error("❌ Invalid payment document");
          return NextResponse.json({ received: true });
        }

        const paymentData = stripePaymentDoc.data();

        // Security: Verify payment_token matches
        if (paymentData.payment_token !== payment_token) {
          console.error("❌ Payment token mismatch - potential fraud");
          await updateDoc(doc(db, "bookings", booking_document_id), {
            [`paymentTokens.${installment_id}.status`]: "failed",
            [`paymentTokens.${installment_id}.errorMessage`]:
              "Security validation failed",
          });
          return NextResponse.json({ received: true });
        }

        // Check token hasn't expired
        if (paymentData.payment_token_expires_at?.toMillis() < Date.now()) {
          console.error("❌ Payment token expired");
          await updateDoc(doc(db, "bookings", booking_document_id), {
            [`paymentTokens.${installment_id}.status`]: "expired",
            [`paymentTokens.${installment_id}.errorMessage`]:
              "Payment token expired",
          });
          return NextResponse.json({ received: true });
        }

        // 2. Update stripePayments document
        await updateDoc(doc(db, "stripePayments", stripe_payment_doc_id), {
          "payment.status": "installment_paid",
          "timestamps.updatedAt": serverTimestamp(),
          "timestamps.paidAt": serverTimestamp(),
        });

        // 3. Get booking data
        const bookingRef = doc(db, "bookings", booking_document_id);
        const bookingSnap = await getDoc(bookingRef);
        
        if (!bookingSnap.exists()) {
          console.error("❌ Booking not found");
          return NextResponse.json({ received: true });
        }
        
        const booking = bookingSnap.data();

        // 4. Calculate new payment totals
        const newPaid = (booking.paid || 0) + (paymentData.payment?.amount || 0);
        const totalCost = booking.discountedTourCost || booking.originalTourCost || 0;
        const newRemainingBalance = totalCost - newPaid;
        const newPaymentProgress = totalCost > 0 ? Math.round((newPaid / totalCost) * 100) : 0;

        // 5. Map installment_id to flat field names
        const datePaidFieldMap: Record<string, string> = {
          full_payment: "fullPaymentDatePaid",
          p1: "p1DatePaid",
          p2: "p2DatePaid",
          p3: "p3DatePaid",
          p4: "p4DatePaid",
        };

        const datePaidField = datePaidFieldMap[installment_id];
        const paidTimestamp = serverTimestamp();

        // 6. Update booking with SUCCESS status
        await updateDoc(bookingRef, {
          // Update nested paymentTokens object
          [`paymentTokens.${installment_id}.status`]: "success",
          [`paymentTokens.${installment_id}.paidAt`]: paidTimestamp,
          [`paymentTokens.${installment_id}.token`]: null, // Invalidate token

          // Update flat field for backward compatibility
          [datePaidField]: paidTimestamp,

          // Update totals
          paid: newPaid,
          remainingBalance: newRemainingBalance,
          paymentProgress: newPaymentProgress,
        });

        console.log(
          `✅ Installment ${installment_id} paid successfully for booking ${booking_document_id}`
        );
        console.log(`💰 New totals: Paid €${newPaid}, Remaining €${newRemainingBalance}, Progress ${newPaymentProgress}%`);
      } catch (error: any) {
        console.error("❌ Webhook processing error:", error);

        // Mark payment as failed
        try {
          await updateDoc(doc(db, "bookings", booking_document_id), {
            [`paymentTokens.${installment_id}.status`]: "failed",
            [`paymentTokens.${installment_id}.errorMessage`]: error.message,
          });
        } catch (updateError) {
          console.error("❌ Failed to update error status:", updateError);
        }
      }
    }

    // Handle failed checkout sessions (for installment payments)
    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { installment_id, booking_document_id } = session.metadata || {};

      if (installment_id && booking_document_id) {
        console.log(`❌ Payment failed for installment ${installment_id}`);
        
        await updateDoc(doc(db, "bookings", booking_document_id), {
          [`paymentTokens.${installment_id}.status`]: "failed",
          [`paymentTokens.${installment_id}.errorMessage`]: "Payment failed",
        });
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log("❌ PaymentIntent failed:", paymentIntent.id);

      const paymentsRef = collection(db, "stripePayments");
      const q = query(
        paymentsRef,
        where("payment.stripeIntentId", "==", paymentIntent.id)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const paymentDoc = snapshot.docs[0];
        await updateDoc(doc(db, "stripePayments", paymentDoc.id), {
          "payment.status": "failed",
          "timestamps.failedAt": new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
