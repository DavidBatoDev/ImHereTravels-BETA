import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

/**
 * DELETE /api/scheduled-emails/payment-reminders/[bookingId]
 * Delete all payment reminder scheduled emails for a booking
 * and update the booking to disable payment reminders
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const bookingId = params.bookingId;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "Booking ID is required" },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting payment reminders for booking: ${bookingId}`);

    // Query for all scheduled payment reminder emails for this booking
    const scheduledEmailsRef = collection(db, "scheduledEmails");
    const q = query(
      scheduledEmailsRef,
      where("bookingId", "==", bookingId),
      where("emailType", "==", "payment-reminder")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log(`No scheduled emails found for booking ${bookingId}`);
    } else {
      console.log(
        `Found ${snapshot.docs.length} scheduled emails to delete for booking ${bookingId}`
      );

      // Delete all scheduled emails in a batch
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`✅ Deleted ${snapshot.docs.length} scheduled emails`);
    }

    // Update the booking to disable payment reminders and clear scheduled email links
    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, {
      enablePaymentReminder: false,
      p1ScheduledEmailLink: "",
      p2ScheduledEmailLink: "",
      p3ScheduledEmailLink: "",
      p4ScheduledEmailLink: "",
      updatedAt: new Date(),
    });

    console.log(`✅ Updated booking ${bookingId} to disable payment reminders`);

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: snapshot.docs.length,
        bookingId,
      },
    });
  } catch (error) {
    console.error("Error deleting payment reminders:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete payment reminders",
      },
      { status: 500 }
    );
  }
}
