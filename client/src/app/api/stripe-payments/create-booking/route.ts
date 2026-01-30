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
import crypto from "crypto";

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
 * Get next available row number (fills gaps if they exist)
 * For example: if rows 1, 3, 4 exist, returns 2 (fills the gap)
 * If rows 1, 2, 3 exist, returns 4 (next sequential)
 */
async function getTotalBookingsCount(): Promise<number> {
  try {
    const bookingsRef = collection(db, "bookings");
    const snapshot = await getDocs(bookingsRef);

    // Collect all existing row numbers
    const existingRows = new Set<number>();
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.row && typeof data.row === "number") {
        existingRows.add(data.row);
      }
    });

    // If no bookings exist, start with row 1
    if (existingRows.size === 0) return 0; // Will become row 1 with +1

    // Find the first gap in the sequence
    let nextRow = 1;
    while (existingRows.has(nextRow)) {
      nextRow++;
    }

    // Return nextRow - 1 because createBookingData adds +1
    return nextRow - 1;
  } catch (error) {
    console.error("Error getting next row number:", error);
    return 0;
  }
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

    // Check if booking already exists for this payment (check for non-empty documentId)
    if (
      paymentData.booking?.documentId &&
      paymentData.booking.documentId !== "" &&
      paymentData.booking.documentId !== "PENDING"
    ) {
      console.log("✅ Booking already exists:", paymentData.booking.documentId);
      return NextResponse.json({
        success: true,
        bookingDocumentId: paymentData.booking.documentId,
        bookingId: paymentData.booking.id,
        message: "Booking already exists",
        alreadyExists: true,
      });
    }

    // Verify this is a reservation fee payment
    if (paymentData.payment?.type !== "reservationFee") {
      return NextResponse.json(
        { error: "Invalid payment type. Expected reservationFee." },
        { status: 400 }
      );
    }

    // Verify payment status
    if (
      paymentData.payment?.status !== "reserve_paid" &&
      paymentData.payment?.status !== "succeeded"
    ) {
      return NextResponse.json(
        {
          error: `Payment not confirmed. Current status: ${paymentData.payment?.status}`,
        },
        { status: 400 }
      );
    }

    console.log("🎯 Processing reservation fee payment - creating booking");

    // Fetch tour package data
    const tourPackage = await getTourPackageData(paymentData.tour?.packageId);
    const tourCode = (tourPackage as any)?.tourCode || "XXX";
    const originalTourCost = paymentData.payment?.originalPrice ?? (tourPackage as any)?.pricing?.original ?? 0;
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

    // Parse tour date properly
    const tourDateParsed = toDate(paymentData.tour?.date);
    console.log("📅 Tour date from payment data:", paymentData.tour?.date);
    console.log("📅 Parsed tour date:", tourDateParsed);

    // Calculate return date using proper function
    const calculatedReturnDate = calculateReturnDate(
      paymentData.tour?.date,
      tourDuration
    );
    console.log("📅 Calculated return date:", calculatedReturnDate);

    // Create booking input
    const bookingInput: BookingCreationInput = {
      email: paymentData.customer?.email || "",
      firstName: paymentData.customer?.firstName || "",
      lastName: paymentData.customer?.lastName || "",
      bookingType: paymentData.booking?.type || "Single Booking",
      tourPackageName:
        paymentData.tour?.packageName || (tourPackage as any)?.name || "",
      tourCode,
      tourDate: tourDateParsed || paymentData.tour?.date || "",
      returnDate: paymentData.tour?.returnDate || calculatedReturnDate || "",
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
    }

    // Convert dates to Firestore Timestamps for storage
    const tourDateTimestamp = tourDateParsed
      ? Timestamp.fromDate(tourDateParsed)
      : null;
    const reservationDateTimestamp = Timestamp.now();

    // Generate access token for the booking
    const access_token = generateAccessToken();
    console.log("🔐 Generated access token for booking");

    // Add to bookings collection with proper Timestamps
    const bookingsRef = collection(db, "bookings");
    const newBookingRef = await addDoc(bookingsRef, {
      ...bookingData,
      access_token,
      // Override dates - tourDate and reservationDate as Timestamps, returnDate as string
      tourDate: tourDateTimestamp,
      returnDate: calculatedReturnDate, // Keep as string "yyyy-mm-dd"
      reservationDate: reservationDateTimestamp,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Booking created with document ID:", newBookingRef.id);

    // Update stripePayments document with booking reference (nested structure)
    try {
      console.log("📝 Updating stripePayments document:", paymentDocId);
      console.log("📝 Setting booking.documentId to:", newBookingRef.id);
      console.log("📝 Setting booking.id to:", bookingData.bookingId);

      await updateDoc(paymentDocRef, {
        "booking.documentId": newBookingRef.id,
        "booking.id": bookingData.bookingId,
        "timestamps.updatedAt": serverTimestamp(),
      });

      console.log("✅ Stripe payment record updated with booking reference");

      // Verify the update by reading the document
      const verifyDoc = await getDoc(paymentDocRef);
      const verifyData = verifyDoc.data();
      console.log(
        "✅ Verified booking.documentId:",
        verifyData?.booking?.documentId
      );
      console.log("✅ Verified booking.id:", verifyData?.booking?.id);
    } catch (updateError: any) {
      console.error("❌ Error updating stripePayments document:", updateError);
      throw new Error(
        `Failed to update payment document: ${updateError.message}`
      );
    }

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
