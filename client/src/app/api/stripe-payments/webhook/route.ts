// /api/stripe-payments/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase";
import crypto from "crypto";
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
  isActive: boolean,
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

/**
 * Generate a secure, unguessable access token using crypto.randomBytes
 * Uses 32 bytes of cryptographically secure random data encoded as URL-safe base64
 * This provides 256 bits of entropy, making it practically impossible to guess
 *
 * @returns {string} A secure access token (43 characters, URL-safe)
 */
function generateAccessToken(): string {
  return crypto
    .randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
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
  tourPackageName: string,
): Promise<number> {
  try {
    const bookingsRef = collection(db, "bookings");
    const q = query(
      bookingsRef,
      where("tourPackageName", "==", tourPackageName),
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
        where("payment.stripeIntentId", "==", paymentIntent.id),
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
            "🎯 Processing reservation fee payment - creating booking",
          );

          // Fetch tour package data
          const tourPackage = await getTourPackageData(
            paymentData.tour?.packageId,
          );
          const tourCode = (tourPackage as any)?.tourCode || "XXX";
          const originalTourCost = (tourPackage as any)?.pricing?.original || 0;
          const discountedTourCost =
            (tourPackage as any)?.pricing?.discounted || null;
          const tourDuration = (tourPackage as any)?.duration || null;

          // Get existing bookings count for unique counter (per tour package)
          const existingCountForTourPackage =
            await getExistingBookingsCountForTourPackage(
              paymentData.tour?.packageName || (tourPackage as any)?.name || "",
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
            paymentMethod: "Revolut",
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
              true, // isMainBooker is always true at this point
            );

            // Both fields should have the same value (full member ID)
            bookingData.groupIdGroupIdGenerator = generatedGroupMemberId;
            bookingData.groupId = generatedGroupMemberId;

            console.log("📝 Creating booking with ID:", bookingData.bookingId);
            console.log("📝 isMainBooker:", bookingData.isMainBooker);
            console.log(
              "📝 groupIdGroupIdGenerator:",
              bookingData.groupIdGroupIdGenerator,
            );
            console.log("📝 groupId:", bookingData.groupId);
          } else {
            console.log("📝 Creating booking with ID:", bookingData.bookingId);
          } // Add to bookings collection
          const bookingsRef = collection(db, "bookings");
          const newBookingRef = await addDoc(bookingsRef, {
            ...bookingData,
            access_token: generateAccessToken(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            priceSnapshotDate: serverTimestamp(),
            tourPackagePricingVersion:
              (tourPackage as any)?.currentVersion || 1,
            priceSource: "snapshot",
            lockPricing: true,
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
            "✅ Stripe payment record updated with booking reference",
          );

          // Create notification for reservation payment
          try {
            const { createReservationPaymentNotification } =
              await import("@/utils/notification-service");
            await createReservationPaymentNotification({
              bookingId: bookingData.bookingId,
              bookingDocumentId: newBookingRef.id,
              travelerName: `${paymentData.customer?.firstName || ""} ${paymentData.customer?.lastName || ""}`,
              tourPackageName:
                paymentData.tour?.packageName ||
                (tourPackage as any)?.name ||
                "",
              amount: paymentData.payment?.amount || 250,
              currency: "EUR",
            });
            console.log("✅ Notification created successfully");
          } catch (notificationError) {
            console.error(
              "❌ Failed to create notification:",
              notificationError,
            );
            // Don't block the webhook - continue processing
          }

          // Send guest invitations for Duo/Group bookings
          const additionalGuests = paymentData.booking?.additionalGuests || [];
          if (isGroupBooking && additionalGuests.length > 0) {
            console.log(
              "📧 Triggering guest invitations for",
              additionalGuests.length,
              "guests...",
            );
            try {
              // Call the Cloud Function via HTTP
              const functionUrl =
                process.env.NEXT_PUBLIC_ENV === "production"
                  ? `https://asia-southeast1-${process.env.FIREBASE_PROJECT_ID}.cloudfunctions.net/sendGuestInvitationEmails`
                  : `https://asia-southeast1-imheretravels-dev.cloudfunctions.net/sendGuestInvitationEmails`;

              const response = await fetch(functionUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  data: {
                    paymentDocId: paymentDoc.id,
                  },
                }),
              });

              if (response.ok) {
                console.log("✅ Guest invitations sent successfully");
              } else {
                const errorText = await response.text();
                console.error(
                  "❌ Failed to send guest invitations:",
                  errorText,
                );
              }
            } catch (inviteError) {
              console.error(
                "❌ Failed to send guest invitations:",
                inviteError,
              );
              // Don't block the webhook - admin can resend later
            }
          }
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
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const {
        payment_token,
        installment_id,
        booking_document_id,
        stripe_payment_doc_id,
      } = session.metadata || {};

      console.log(`💳 Checkout session completed: ${session.id}`);
      console.log(`📦 Metadata:`, {
        payment_token: payment_token?.substring(0, 10),
        installment_id,
        booking_document_id,
      });

      if (
        !payment_token ||
        !installment_id ||
        !booking_document_id ||
        !stripe_payment_doc_id
      ) {
        console.log("⚠️ Missing metadata for installment payment, skipping...");
        return NextResponse.json({ received: true });
      }

      try {
        // 1. Validate payment_token
        const stripePaymentDoc = await getDoc(
          doc(db, "stripePayments", stripe_payment_doc_id),
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

        // Verify this is actually an installment payment
        if (paymentData.payment?.type !== "installment") {
          console.log(
            `⚠️ Payment doc type is '${paymentData.payment?.type}', expected 'installment'. Skipping installment processing.`,
          );
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

        const priceSnapshotUpdates: Record<string, any> = {};
        if (!booking.priceSnapshotDate) {
          priceSnapshotUpdates.priceSnapshotDate = serverTimestamp();
        }
        if (!booking.priceSource) {
          priceSnapshotUpdates.priceSource = "snapshot";
        }
        if (booking.lockPricing === undefined) {
          priceSnapshotUpdates.lockPricing = true;
        }

        // 4. Recalculate everything from scratch to prevent double-counting
        const totalCost =
          booking.discountedTourCost || booking.originalTourCost || 0;

        // Start with reservation fee
        let calculatedPaid = booking.reservationFee || 0;

        let installmentsPaidCount = 0;
        let totalInstallments = 0;
        let newBookingStatus = "";

        // Handle FULL PAYMENT separately
        if (installment_id === "full_payment") {
          const isCurrentPayment = installment_id === "full_payment";
          const isAlreadyPaid =
            booking.fullPaymentDatePaid ||
            booking.paymentTokens?.full_payment?.status === "success";

          if (isCurrentPayment || isAlreadyPaid) {
            const amount = booking.fullPaymentAmount || 0;
            calculatedPaid += amount;
          }

          const newRemainingBalance = totalCost - calculatedPaid;
          const newPaymentProgress =
            isCurrentPayment || isAlreadyPaid ? 100 : 0;

          // For full payment, status should be "Booking Confirmed" or "Waiting for Full Payment"
          if (newRemainingBalance <= 0.01) {
            // Allow small floating point differences
            newBookingStatus = "Booking Confirmed";
          } else {
            newBookingStatus = "Waiting for Full Payment";
          }

          // Calculate paid terms (full payment only; reservation fee excluded)
          const paidTerms =
            isCurrentPayment || isAlreadyPaid
              ? booking.fullPaymentAmount || 0
              : 0;

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

          const lastPaidDate = new Date();
          const formatDate = (d: Date): string =>
            d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

          const bookingStatusWithDate =
            newRemainingBalance <= 0.01
              ? `Booking Confirmed — ${formatDate(lastPaidDate)}`
              : newBookingStatus;

          // 6. Update booking with SUCCESS status and recalculated totals
          await updateDoc(bookingRef, {
            // Update nested paymentTokens object
            [`paymentTokens.${installment_id}.status`]: "success",
            [`paymentTokens.${installment_id}.paidAt`]: paidTimestamp,
            [`paymentTokens.${installment_id}.token`]: null, // Invalidate token

            // Update flat field for backward compatibility
            [datePaidField]: paidTimestamp,

            // Update totals with recalculated values
            paid: calculatedPaid,
            paidTerms: paidTerms,
            remainingBalance: newRemainingBalance,
            paymentProgress: `${newPaymentProgress}%`,
            bookingStatus: bookingStatusWithDate,
          });

          console.log(
            `✅ Full payment paid successfully for booking ${booking_document_id}`,
          );
          console.log(
            `💰 New totals: Paid ${calculatedPaid}, PaidTerms ${paidTerms}, Remaining ${newRemainingBalance}, Progress ${newPaymentProgress}%`,
          );

          return NextResponse.json({ received: true });
        }

        // Handle INSTALLMENT PAYMENTS (P1, P2, P3, P4)
        const installments = ["p1", "p2", "p3", "p4"];
        totalInstallments = installments.filter(
          (id: string) => booking[`${id}Amount`] > 0,
        ).length;

        installments.forEach((id: string) => {
          const isCurrentPayment = id === installment_id;
          const isAlreadyPaid =
            booking[`${id}DatePaid`] ||
            booking.paymentTokens?.[id]?.status === "success";

          if (isCurrentPayment || isAlreadyPaid) {
            const amount = booking[`${id}Amount`] || 0;
            calculatedPaid += amount;
            installmentsPaidCount++;
          }
        });

        const newRemainingBalance = totalCost - calculatedPaid;
        const paidFlags = {
          p1: Boolean(
            booking.p1DatePaid ||
            booking.paymentTokens?.p1?.status === "success" ||
            installment_id === "p1",
          ),
          p2: Boolean(
            booking.p2DatePaid ||
            booking.paymentTokens?.p2?.status === "success" ||
            installment_id === "p2",
          ),
          p3: Boolean(
            booking.p3DatePaid ||
            booking.paymentTokens?.p3?.status === "success" ||
            installment_id === "p3",
          ),
          p4: Boolean(
            booking.p4DatePaid ||
            booking.paymentTokens?.p4?.status === "success" ||
            installment_id === "p4",
          ),
        };

        const plan = (booking.paymentPlan || "").trim();
        const planTerms = plan.match(/P(\d)/)
          ? parseInt(plan.match(/P(\d)/)![1], 10)
          : 0;

        const newPaymentProgress =
          plan === "P1"
            ? paidFlags.p1
              ? 100
              : 0
            : plan === "P2"
              ? Math.round(
                  ((Number(paidFlags.p1) + Number(paidFlags.p2)) / 2) * 100,
                )
              : plan === "P3"
                ? Math.round(
                    ((Number(paidFlags.p1) +
                      Number(paidFlags.p2) +
                      Number(paidFlags.p3)) /
                      3) *
                      100,
                  )
                : plan === "P4"
                  ? Math.round(
                      ((Number(paidFlags.p1) +
                        Number(paidFlags.p2) +
                        Number(paidFlags.p3) +
                        Number(paidFlags.p4)) /
                        4) *
                        100,
                    )
                  : 0;

        // Determine new booking status string for installments
        if (newRemainingBalance <= 0.01) {
          // Allow small floating point differences
          newBookingStatus = "Booking Confirmed";
        } else {
          newBookingStatus = `Installment ${installmentsPaidCount}/${totalInstallments}`;
        }

        // Calculate paid terms (sum of all paid installments; exclude reservation fee)
        let paidTerms = 0;
        installments.forEach((id) => {
          const isPaid =
            booking[`${id}DatePaid`] ||
            booking.paymentTokens?.[id]?.status === "success" ||
            id === installment_id;
          if (isPaid) {
            paidTerms += booking[`${id}Amount`] || 0;
          }
        });

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
        const lastPaidDate = new Date();
        const formatDate = (d: Date): string =>
          d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

        const bookingStatusWithDate =
          newRemainingBalance <= 0.01
            ? `Booking Confirmed — ${formatDate(lastPaidDate)}`
            : planTerms > 0
              ? `Installment ${installmentsPaidCount}/${totalInstallments} — last paid ${formatDate(lastPaidDate)}`
              : newBookingStatus;

        // 6. Update booking with SUCCESS status and recalculated totals
        await updateDoc(bookingRef, {
          // Update nested paymentTokens object
          [`paymentTokens.${installment_id}.status`]: "success",
          [`paymentTokens.${installment_id}.paidAt`]: paidTimestamp,
          [`paymentTokens.${installment_id}.token`]: null, // Invalidate token

          // Update flat field for backward compatibility
          [datePaidField]: paidTimestamp,
          [`${installment_id}ScheduledReminderDate`]: "",

          // Update totals with recalculated values
          paid: calculatedPaid,
          paidTerms: paidTerms,
          remainingBalance: newRemainingBalance,
          paymentProgress: `${newPaymentProgress}%`,
          bookingStatus: bookingStatusWithDate,
          ...priceSnapshotUpdates,
        });

        console.log(
          `✅ Installment ${installment_id} paid successfully for booking ${booking_document_id}`,
        );
        console.log(
          `💰 New totals: Paid ${calculatedPaid}, PaidTerms ${paidTerms}, Remaining ${newRemainingBalance}, Progress ${newPaymentProgress}%`,
        );
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
        where("payment.stripeIntentId", "==", paymentIntent.id),
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
