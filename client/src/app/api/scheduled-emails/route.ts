import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const status = searchParams.get("status");
    const emailType = searchParams.get("emailType");
    const bookingId = searchParams.get("bookingId");
    const limitParam = parseInt(searchParams.get("limit") || "50");

    console.log("Scheduled emails API called with params:", {
      status,
      emailType,
      bookingId,
      limit: limitParam,
    });

    // Build Firestore query
    let firestoreQuery = query(
      collection(db, "scheduledEmails"),
      orderBy("scheduledFor", "desc"),
      limit(limitParam)
    );

    // Apply filters
    if (status) {
      firestoreQuery = query(
        collection(db, "scheduledEmails"),
        where("status", "==", status),
        orderBy("scheduledFor", "desc"),
        limit(limitParam)
      );
    }

    if (emailType) {
      firestoreQuery = query(
        collection(db, "scheduledEmails"),
        where("emailType", "==", emailType),
        orderBy("scheduledFor", "desc"),
        limit(limitParam)
      );
    }

    if (bookingId) {
      firestoreQuery = query(
        collection(db, "scheduledEmails"),
        where("bookingId", "==", bookingId),
        orderBy("scheduledFor", "desc"),
        limit(limitParam)
      );
    }

    const snapshot = await getDocs(firestoreQuery);
    const scheduledEmails = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(
      `Successfully fetched ${scheduledEmails.length} scheduled emails`
    );

    return NextResponse.json({
      success: true,
      data: {
        scheduledEmails,
        count: scheduledEmails.length,
      },
    });
  } catch (error) {
    console.error("Error in scheduled emails API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch scheduled emails",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      to,
      subject,
      htmlContent,
      bcc = [],
      cc = [],
      from,
      replyTo,
      scheduledFor,
      emailType,
      bookingId,
      templateId,
      templateVariables,
      maxAttempts = 3,
    } = body;

    console.log("Schedule email API called with data:", body);

    // Validate required fields
    if (!to || !subject || !htmlContent || !scheduledFor) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: to, subject, htmlContent, scheduledFor",
        },
        { status: 400 }
      );
    }

    // Parse and validate scheduled time
    let scheduledTime: Date;
    try {
      scheduledTime = new Date(scheduledFor);
      if (isNaN(scheduledTime.getTime())) {
        throw new Error("Invalid date format");
      }

      if (scheduledTime <= new Date()) {
        return NextResponse.json(
          {
            success: false,
            error: "Scheduled time must be in the future",
          },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid scheduledFor date format. Use ISO string format.",
        },
        { status: 400 }
      );
    }

    const now = Timestamp.now();
    const scheduledTimestamp = Timestamp.fromDate(scheduledTime);

    // Prepare email data
    const scheduledEmailData = {
      to,
      subject,
      htmlContent,
      bcc: Array.isArray(bcc) ? bcc : [],
      cc: Array.isArray(cc) ? cc : [],
      from: from || "Bella | ImHereTravels <bella@imheretravels.com>",
      replyTo,
      scheduledFor: scheduledTimestamp,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      attempts: 0,
      maxAttempts,
      emailType,
      bookingId,
      templateId,
      templateVariables,
    };

    // Save to Firestore
    const docRef = await addDoc(
      collection(db, "scheduledEmails"),
      scheduledEmailData
    );

    console.log("Email scheduled successfully:", docRef.id);

    return NextResponse.json({
      success: true,
      data: {
        scheduledEmailId: docRef.id,
        scheduledFor: scheduledTime.toISOString(),
        status: "pending",
      },
    });
  } catch (error) {
    console.error("Error in schedule email API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to schedule email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
