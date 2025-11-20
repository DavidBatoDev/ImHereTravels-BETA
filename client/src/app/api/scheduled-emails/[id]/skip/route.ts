import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scheduledEmailId = params.id;

    if (!scheduledEmailId) {
      return NextResponse.json(
        { success: false, error: "Scheduled email ID is required" },
        { status: 400 }
      );
    }

    // Get the scheduled email
    const scheduledEmailRef = doc(db, "scheduledEmails", scheduledEmailId);
    const scheduledEmailDoc = await getDoc(scheduledEmailRef);

    if (!scheduledEmailDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Scheduled email not found" },
        { status: 404 }
      );
    }

    const emailData = scheduledEmailDoc.data();

    // Check if email can be skipped (not already sent or cancelled)
    if (emailData?.status === "sent") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot skip an email that has already been sent",
        },
        { status: 400 }
      );
    }

    if (emailData?.status === "cancelled") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot skip an email that has been cancelled",
        },
        { status: 400 }
      );
    }

    if (emailData?.status === "skipped") {
      return NextResponse.json(
        { success: false, error: "Email is already skipped" },
        { status: 400 }
      );
    }

    // Update the status to skipped
    await updateDoc(scheduledEmailRef, {
      status: "skipped",
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      message: "Scheduled email skipped successfully",
      data: {
        id: scheduledEmailId,
        status: "skipped",
      },
    });
  } catch (error) {
    console.error("Error skipping scheduled email:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
