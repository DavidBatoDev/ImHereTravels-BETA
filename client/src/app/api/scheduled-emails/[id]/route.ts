import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scheduledEmailId } = await params;
    const body = await request.json();
    const { to, cc, bcc, subject, htmlContent } = body;

    if (!scheduledEmailId) {
      return NextResponse.json(
        {
          success: false,
          error: "Scheduled email ID is required",
        },
        { status: 400 }
      );
    }

    console.log("Update scheduled email API called for:", scheduledEmailId);

    // Get the scheduled email document
    const emailDocRef = doc(db, "scheduledEmails", scheduledEmailId);
    const emailDoc = await getDoc(emailDocRef);

    if (!emailDoc.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: "Scheduled email not found",
        },
        { status: 404 }
      );
    }

    const emailData = emailDoc.data();

    // Check if email is already sent
    if (emailData.status === "sent") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot update email that has already been sent",
        },
        { status: 400 }
      );
    }

    if (emailData.status === "cancelled") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot update cancelled email",
        },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: Timestamp.now(),
    };

    if (to !== undefined) updates.to = to;
    if (cc !== undefined) updates.cc = cc;
    if (bcc !== undefined) updates.bcc = bcc;
    if (subject !== undefined) updates.subject = subject;
    if (htmlContent !== undefined) updates.htmlContent = htmlContent;

    // Update document
    await updateDoc(emailDocRef, updates);

    console.log("Email updated successfully:", scheduledEmailId);

    return NextResponse.json({
      success: true,
      data: {
        scheduledEmailId,
        updates,
      },
    });
  } catch (error) {
    console.error("Error in update scheduled email API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update scheduled email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scheduledEmailId } = await params;

    if (!scheduledEmailId) {
      return NextResponse.json(
        {
          success: false,
          error: "Scheduled email ID is required",
        },
        { status: 400 }
      );
    }

    console.log("Cancel scheduled email API called for:", scheduledEmailId);

    // Get the scheduled email document
    const emailDocRef = doc(db, "scheduledEmails", scheduledEmailId);
    const emailDoc = await getDoc(emailDocRef);

    if (!emailDoc.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: "Scheduled email not found",
        },
        { status: 404 }
      );
    }

    const emailData = emailDoc.data();

    // Check if email is already sent or cancelled
    if (emailData.status === "sent") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot cancel email that has already been sent",
        },
        { status: 400 }
      );
    }

    if (emailData.status === "cancelled") {
      return NextResponse.json(
        {
          success: false,
          error: "Email is already cancelled",
        },
        { status: 400 }
      );
    }

    // Update document to cancelled status
    await updateDoc(emailDocRef, {
      status: "cancelled",
      updatedAt: Timestamp.now(),
    });

    console.log("Email cancelled successfully:", scheduledEmailId);

    return NextResponse.json({
      success: true,
      data: {
        scheduledEmailId,
        status: "cancelled",
      },
    });
  } catch (error) {
    console.error("Error in cancel scheduled email API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to cancel scheduled email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scheduledEmailId } = await params;
    const body = await request.json();
    const { newScheduledFor } = body;

    if (!scheduledEmailId) {
      return NextResponse.json(
        {
          success: false,
          error: "Scheduled email ID is required",
        },
        { status: 400 }
      );
    }

    if (!newScheduledFor) {
      return NextResponse.json(
        {
          success: false,
          error: "New scheduled time is required",
        },
        { status: 400 }
      );
    }

    console.log("Reschedule email API called for:", scheduledEmailId);

    // Parse and validate new scheduled time
    let newScheduledTime: Date;
    try {
      newScheduledTime = new Date(newScheduledFor);
      if (isNaN(newScheduledTime.getTime())) {
        throw new Error("Invalid date format");
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid newScheduledFor date format. Use ISO string format.",
        },
        { status: 400 }
      );
    }

    // Get the scheduled email document
    const emailDocRef = doc(db, "scheduledEmails", scheduledEmailId);
    const emailDoc = await getDoc(emailDocRef);

    if (!emailDoc.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: "Scheduled email not found",
        },
        { status: 404 }
      );
    }

    const emailData = emailDoc.data();

    // Check if email is already sent
    if (emailData.status === "sent") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot reschedule email that has already been sent",
        },
        { status: 400 }
      );
    }

    if (emailData.status === "cancelled") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot reschedule cancelled email",
        },
        { status: 400 }
      );
    }

    // Update document with new scheduled time
    await updateDoc(emailDocRef, {
      scheduledFor: Timestamp.fromDate(newScheduledTime),
      status: "pending", // Reset to pending in case it was failed
      updatedAt: Timestamp.now(),
    });

    console.log("Email rescheduled successfully:", scheduledEmailId);

    return NextResponse.json({
      success: true,
      data: {
        scheduledEmailId,
        newScheduledFor: newScheduledTime.toISOString(),
        status: "pending",
      },
    });
  } catch (error) {
    console.error("Error in reschedule email API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to reschedule email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
