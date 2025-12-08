import { NextRequest, NextResponse } from "next/server";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingDocumentId, email } = body;

    if (!bookingDocumentId) {
      return NextResponse.json(
        { success: false, error: "bookingDocumentId is required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: "email is required" },
        { status: 400 }
      );
    }

    console.log("📧 Calling sendBookingStatusConfirmation function...");

    // Initialize Firebase Functions
    const functions = getFunctions(app, "asia-southeast1");
    const sendBookingStatusConfirmation = httpsCallable(
      functions,
      "sendBookingStatusConfirmation"
    );

    // Call the Firebase function
    const result = await sendBookingStatusConfirmation({
      bookingDocumentId,
      email,
    });

    const data = result.data as any;

    console.log("✅ Booking status confirmation sent:", data);

    return NextResponse.json({
      success: true,
      messageId: data.messageId,
      sentEmailLink: data.sentEmailLink,
      bookingStatusUrl: data.bookingStatusUrl,
    });
  } catch (error: any) {
    console.error("❌ Error sending booking status confirmation:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send booking status confirmation",
      },
      { status: 500 }
    );
  }
}
