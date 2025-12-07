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
