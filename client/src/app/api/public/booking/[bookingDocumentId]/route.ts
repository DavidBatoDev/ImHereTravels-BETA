import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingDocumentId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const { bookingDocumentId } = await params;

    console.log("Fetching booking:", bookingDocumentId, "Email:", email);

    // Validate bookingDocumentId
    if (!bookingDocumentId) {
      return NextResponse.json(
        { success: false, error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Fetch booking document
    const bookingRef = doc(db, "bookings", bookingDocumentId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      console.log("Booking not found:", bookingDocumentId);
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    const bookingData = {
      id: bookingSnap.id,
      ...bookingSnap.data(),
    };

    console.log("Booking found:", bookingData.bookingId);

    // Email verification for security
    if (email) {
      const bookingEmail = bookingData.emailAddress?.toLowerCase();
      const providedEmail = email.toLowerCase();

      console.log(
        "Verifying email - Booking:",
        bookingEmail,
        "Provided:",
        providedEmail
      );

      if (bookingEmail !== providedEmail) {
        console.log("Email mismatch");
        return NextResponse.json(
          { success: false, error: "Email does not match booking records" },
          { status: 403 }
        );
      }
    }

    // Fetch pre-departure pack if exists
    let preDeparturePack = null;
    try {
      const confirmedBookingsQuery = query(
        collection(db, "confirmedBookings"),
        where("bookingDocumentId", "==", bookingDocumentId)
      );
      const confirmedBookingsSnap = await getDocs(confirmedBookingsQuery);

      if (!confirmedBookingsSnap.empty) {
        const confirmedBooking = confirmedBookingsSnap.docs[0].data();

        if (confirmedBooking.preDeparturePackId) {
          const packRef = doc(
            db,
            "fileObjects",
            confirmedBooking.preDeparturePackId
          );
          const packSnap = await getDoc(packRef);

          if (packSnap.exists()) {
            const packData = packSnap.data();
            preDeparturePack = {
              id: packSnap.id,
              fileName: packData.fileName,
              originalName: packData.originalName,
              fileDownloadURL: packData.fileDownloadURL,
              contentType: packData.contentType,
              size: packData.size,
              uploadedAt: packData.uploadedAt,
            };
          }
        }
      }
    } catch (error) {
      console.error("Error fetching pre-departure pack:", error);
      // Continue without pack if there's an error
    }

    console.log("Returning booking data, has pack:", !!preDeparturePack);

    // Filter data for public access (exclude sensitive information)
    const publicData = {
      // Identifiers
      bookingId: bookingData.bookingId,
      bookingCode: bookingData.bookingCode,
      tourCode: bookingData.tourCode,

      // Personal Info (limited)
      fullName: bookingData.fullName,
      firstName: bookingData.firstName,
      travellerInitials: bookingData.travellerInitials,

      // Tour Details
      tourPackageName: bookingData.tourPackageName,
      tourDate: bookingData.tourDate,
      returnDate: bookingData.returnDate,
      tourDuration: bookingData.tourDuration,
      formattedDate: bookingData.formattedDate,
      reservationDate: bookingData.reservationDate,

      // Pricing
      originalTourCost: bookingData.originalTourCost,
      discountedTourCost: bookingData.discountedTourCost,
      reservationFee: bookingData.reservationFee,
      paid: bookingData.paid,
      remainingBalance: bookingData.remainingBalance,
      paymentProgress: bookingData.paymentProgress,

      // Payment Plan
      paymentPlan: bookingData.paymentPlan,
      bookingStatus: bookingData.bookingStatus,

      // Payment Terms
      fullPaymentDueDate: bookingData.fullPaymentDueDate,
      fullPaymentAmount: bookingData.fullPaymentAmount,
      fullPaymentDatePaid: bookingData.fullPaymentDatePaid,
      p1DueDate: bookingData.p1DueDate,
      p1Amount: bookingData.p1Amount,
      p1DatePaid: bookingData.p1DatePaid,
      p2DueDate: bookingData.p2DueDate,
      p2Amount: bookingData.p2Amount,
      p2DatePaid: bookingData.p2DatePaid,
      p3DueDate: bookingData.p3DueDate,
      p3Amount: bookingData.p3Amount,
      p3DatePaid: bookingData.p3DatePaid,
      p4DueDate: bookingData.p4DueDate,
      p4Amount: bookingData.p4Amount,
      p4DatePaid: bookingData.p4DatePaid,

      // Email Links (for viewing confirmation)
      sentEmailLink: bookingData.sentEmailLink,

      // Discount Info
      eventName: bookingData.eventName,
      discountRate: bookingData.discountRate,

      // Group Booking Info
      bookingType: bookingData.bookingType,
      isMainBooker: bookingData.isMainBooker,

      // Payment Reminders
      enablePaymentReminder: bookingData.enablePaymentReminder,

      // Pre-Departure Pack
      preDeparturePack,
    };

    return NextResponse.json({ success: true, data: publicData });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch booking details" },
      { status: 500 }
    );
  }
}
