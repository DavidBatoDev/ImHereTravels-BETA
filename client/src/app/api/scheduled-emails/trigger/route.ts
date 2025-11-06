import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import GmailApiService from "@/lib/gmail/gmail-api-service";

export async function POST(request: NextRequest) {
  try {
    console.log("Manual trigger for scheduled email processing");

    const now = Timestamp.now();

    // Query for pending emails that should be sent now
    const firestoreQuery = query(
      collection(db, "scheduledEmails"),
      where("status", "==", "pending"),
      where("scheduledFor", "<=", now),
      limit(50) // Process max 50 emails per trigger
    );

    const snapshot = await getDocs(firestoreQuery);

    if (snapshot.empty) {
      console.log("No scheduled emails to process");
      return NextResponse.json({
        success: true,
        message: "No scheduled emails to process",
        processed: 0,
      });
    }

    console.log(`Found ${snapshot.docs.length} emails to process`);

    // Initialize Gmail API service
    const gmailService = new GmailApiService();

    // Process each scheduled email
    const results = await Promise.allSettled(
      snapshot.docs.map(async (docSnapshot) => {
        const emailData = docSnapshot.data();
        const emailId = docSnapshot.id;

        try {
          // Send the email
          const result = await gmailService.sendEmail({
            to: emailData.to,
            subject: emailData.subject,
            htmlContent: emailData.htmlContent,
            bcc: emailData.bcc,
            cc: emailData.cc,
            from: emailData.from,
            replyTo: emailData.replyTo,
          });

          // Update document with success status
          await updateDoc(doc(db, "scheduledEmails", emailId), {
            status: "sent",
            sentAt: Timestamp.now(),
            messageId: result.messageId,
            updatedAt: Timestamp.now(),
          });

          console.log(`Successfully sent scheduled email: ${emailId}`);
          return { success: true, emailId };
        } catch (error) {
          console.error(`Error sending scheduled email ${emailId}:`, error);

          // Update attempts and potentially mark as failed
          const currentAttempts = (emailData.attempts || 0) + 1;
          const maxAttempts = emailData.maxAttempts || 3;

          const updateData: any = {
            attempts: currentAttempts,
            updatedAt: Timestamp.now(),
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
          };

          if (currentAttempts >= maxAttempts) {
            updateData.status = "failed";
            console.log(
              `Email ${emailId} marked as failed after ${currentAttempts} attempts`
            );
          } else {
            console.log(
              `Email ${emailId} failed, attempt ${currentAttempts}/${maxAttempts}`
            );
          }

          await updateDoc(doc(db, "scheduledEmails", emailId), updateData);

          return {
            success: false,
            emailId,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    // Count successful and failed sends
    const successful = results.filter(
      (result) => result.status === "fulfilled" && result.value.success
    ).length;
    const failed = results.length - successful;

    console.log(
      `Scheduled email processing completed: ${successful} sent, ${failed} failed`
    );

    return NextResponse.json({
      success: true,
      message: "Scheduled email processing completed",
      processed: results.length,
      successful,
      failed,
    });
  } catch (error) {
    console.error("Error in trigger scheduled email processing:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to trigger scheduled email processing",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
