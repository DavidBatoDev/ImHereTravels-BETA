// /api/stripe-payments/create-booking/route.ts
// This API creates a booking document after successful Step 2 payment.
// Called by the frontend after Stripe payment confirmation.
// This is an alternative to webhook-based booking creation for local development
// or as a fallback when webhooks fail.

import { NextRequest, NextResponse } from "next/server";
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
  Timestamp,
} from "firebase/firestore";
import {
  createBookingData,
  generateGroupId,
  type BookingCreationInput,
} from "@/lib/booking-calculations";

/**
 * Convert various date formats to Date object
 * Handles Firestore Timestamps, ISO strings, dd/mm/yyyy, yyyy-mm-dd
 */
function toDate(input: unknown): Date | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "string" && input.trim() === "") return null;

  try {
    // Firestore Timestamp with toDate method
    if (
      typeof input === "object" &&
      input !== null &&
      "toDate" in (input as any) &&
      typeof (input as any).toDate === "function"
    ) {
      return (input as any).toDate();
    }
    // Firestore Timestamp-like object with seconds
    if (
      typeof input === "object" &&
      input !== null &&
      "seconds" in (input as any) &&
      typeof (input as any).seconds === "number"
    ) {
      const s = (input as any).seconds as number;
      const ns =
        typeof (input as any).nanoseconds === "number"
          ? (input as any).nanoseconds
          : 0;
      return new Date(s * 1000 + Math.floor(ns / 1e6));
    }
    if (input instanceof Date) return input;
    if (typeof input === "number") return new Date(input);
    if (typeof input === "string") {
      const raw = input.trim();
      // dd/mm/yyyy format - use UTC noon to avoid timezone issues
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const [dd, mm, yyyy] = raw.split("/").map(Number);
        return new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
      }
      // yyyy-mm-dd format - use UTC noon to avoid timezone issues
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [yyyy, mm, dd] = raw.split("-").map(Number);
        return new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
      }
      return new Date(raw);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Calculate return date from tour start date and duration
 * Same logic as tourEndDateFromStartAndDurationFunction
 */
function calculateReturnDate(
  tourDate: unknown,
  durationDays: string | number | null | undefined
): string {
  const start = toDate(tourDate);
  if (!start || isNaN(start.getTime())) return "";

  // Extract number from string like "13 Days", "8D", or just number
  let days: number;
  if (typeof durationDays === "number") {
    days = durationDays;
  } else if (typeof durationDays === "string") {
    const match = durationDays.match(/\d+/);
    days = match ? parseInt(match[0], 10) : NaN;
  } else {
    return "";
  }

  if (!days || isNaN(days)) return "";

  // Add (days - 1) to get return date (duration includes first day)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  end.setDate(end.getDate() + days - 1);

  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, "0");
  const d = String(end.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
 * Get count of existing bookings for the same tour package
 */
async function getExistingBookingsCount(
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
    console.error("Error counting bookings:", error);
    return 0;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { paymentDocId } = await req.json();

    if (!paymentDocId) {
      return NextResponse.json(
        { error: "Missing required field: paymentDocId" },
        { status: 400 }
      );
    }

    console.log("📝 Creating booking for payment document:", paymentDocId);

    // Fetch the stripePayments document
    const paymentDocRef = doc(db, "stripePayments", paymentDocId);
    const paymentDocSnap = await getDoc(paymentDocRef);

    if (!paymentDocSnap.exists()) {
      return NextResponse.json(
        { error: "Payment document not found" },
        { status: 404 }
      );
    }

    const paymentData = paymentDocSnap.data();

    // Check if booking already exists for this payment
    if (paymentData.bookingDocumentId) {
      console.log("✅ Booking already exists:", paymentData.bookingDocumentId);
      return NextResponse.json({
        success: true,
        bookingDocumentId: paymentData.bookingDocumentId,
        bookingId: paymentData.bookingId,
        message: "Booking already exists",
        alreadyExists: true,
      });
    }

    // Verify this is a reservation fee payment
    if (paymentData.type !== "reservationFee") {
      return NextResponse.json(
        { error: "Invalid payment type. Expected reservationFee." },
        { status: 400 }
      );
    }

    // Verify payment status
    if (
      paymentData.status !== "reserve_paid" &&
      paymentData.status !== "succeeded"
    ) {
      return NextResponse.json(
        {
          error: `Payment not confirmed. Current status: ${paymentData.status}`,
        },
        { status: 400 }
      );
    }

    console.log("🎯 Processing reservation fee payment - creating booking");

    // Fetch tour package data
    const tourPackage = await getTourPackageData(paymentData.tourPackageId);
    const tourCode = (tourPackage as any)?.tourCode || "XXX";
    const originalTourCost = (tourPackage as any)?.pricing?.original || 0;
    const discountedTourCost =
      (tourPackage as any)?.pricing?.discounted || null;
    const tourDuration = (tourPackage as any)?.duration || null;

    // Get existing bookings count for unique counter
    const existingCount = await getExistingBookingsCount(
      paymentData.tourPackageName || (tourPackage as any)?.name || ""
    );

    // Determine if this is a group booking and generate group ID
    const isGroupBooking =
      paymentData.bookingType === "Duo Booking" ||
      paymentData.bookingType === "Group Booking";
    const groupId = isGroupBooking
      ? paymentData.groupCode || generateGroupId()
      : "";

    // Parse tour date properly
    const tourDateParsed = toDate(paymentData.tourDate);
    console.log("📅 Tour date from payment data:", paymentData.tourDate);
    console.log("📅 Parsed tour date:", tourDateParsed);

    // Calculate return date using proper function
    const calculatedReturnDate = calculateReturnDate(
      paymentData.tourDate,
      tourDuration
    );
    console.log("📅 Calculated return date:", calculatedReturnDate);

    // Create booking input
    const bookingInput: BookingCreationInput = {
      email: paymentData.email || "",
      firstName: paymentData.firstName || "",
      lastName: paymentData.lastName || "",
      bookingType: paymentData.bookingType || "Single Booking",
      tourPackageName:
        paymentData.tourPackageName || (tourPackage as any)?.name || "",
      tourCode,
      tourDate: tourDateParsed || paymentData.tourDate || "",
      returnDate: paymentData.returnDate || calculatedReturnDate || "",
      tourDuration,
      reservationFee: paymentData.amountGBP || 250,
      paidAmount: paymentData.amountGBP || 250,
      originalTourCost,
      discountedTourCost,
      paymentMethod: "Stripe",
      groupId,
      isMainBooking: true,
      existingBookingsCount: existingCount,
    };

    // Create the booking data
    const bookingData = await createBookingData(bookingInput);

    console.log("📝 Creating booking with ID:", bookingData.bookingId);

    // Convert dates to Firestore Timestamps for storage
    const tourDateTimestamp = tourDateParsed
      ? Timestamp.fromDate(tourDateParsed)
      : null;
    const reservationDateTimestamp = Timestamp.now();

    // Add to bookings collection with proper Timestamps
    const bookingsRef = collection(db, "bookings");
    const newBookingRef = await addDoc(bookingsRef, {
      ...bookingData,
      // Override dates - tourDate and reservationDate as Timestamps, returnDate as string
      tourDate: tourDateTimestamp,
      returnDate: calculatedReturnDate, // Keep as string "yyyy-mm-dd"
      reservationDate: reservationDateTimestamp,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Booking created with document ID:", newBookingRef.id);

    // Update stripePayments document with booking reference
    await updateDoc(paymentDocRef, {
      bookingDocumentId: newBookingRef.id,
      bookingId: bookingData.bookingId,
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Stripe payment record updated with booking reference");

    return NextResponse.json({
      success: true,
      bookingDocumentId: newBookingRef.id,
      bookingId: bookingData.bookingId,
      message: "Booking created successfully",
    });
  } catch (err: any) {
    console.error("❌ Create Booking Error:", err.message);
    console.error("Error details:", err);

    return NextResponse.json(
      {
        error: err.message ?? "Failed to create booking",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
