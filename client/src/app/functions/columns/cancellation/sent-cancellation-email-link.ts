import { BookingSheetColumn } from "@/types/booking-sheet-column";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { firebaseUtils } from "@/app/functions/firebase-utils";

export const sentCancellationEmailLinkColumn: BookingSheetColumn = {
  id: "sentCancellationEmailLink",
  data: {
    id: "sentCancellationEmailLink",
    columnName: "Sent Cancellation Email Link",
    dataType: "string",
    parentTab: "Cancellation",
    order: 84,
    includeInForms: false,
    color: "yellow",
    width: 200,
  },
};

// Column Function Implementation

/**
 * Safely send a cancellation email draft once using Gmail draft URL.
 * Updates the cancellationEmailDraftLink field with SENT: prefix after sending.
 *
 * @param draftUrl The Gmail draft URL (e.g., https://mail.google.com/mail/u/0/#drafts?compose=abc123xyz)
 * @param sendEmail Boolean flag, if false -> return ""
 * @param bookingId The booking ID from the "ID" column (document ID, not the bookingId field)
 * @returns "" if skipped, sentUrl if sent, "ERROR" if failure
 */
export default async function sendCancellationEmailDraftOnce(
  draftUrl: string,
  sendEmail: boolean,
  bookingId: string
): Promise<string> {
  console.log(`[SEND CANCELLATION EMAIL] Called with:`, {
    draftUrl,
    sendEmail,
    bookingId,
    hasDraftUrl: !!draftUrl && draftUrl.trim() !== "",
  });

  if (!sendEmail) {
    console.log(
      `[SEND CANCELLATION EMAIL] sendEmail is false, returning empty string`
    );
    return "";
  }

  if (!draftUrl || draftUrl.trim() === "") {
    console.log(`[SEND CANCELLATION EMAIL] No draft URL, returning ERROR`);
    return "ERROR";
  }

  // Check if already sent (has SENT: prefix)
  if (draftUrl.startsWith("SENT:")) {
    console.log("Cancellation email already sent, skipping");
    return draftUrl.substring(5); // Return the URL without SENT: prefix for this column
  }

  try {
    console.log(
      `[SEND CANCELLATION EMAIL] Calling sendCancellationEmail function with draftUrl:`,
      draftUrl
    );
    // Call Cloud Function to send the draft by URL
    const callSend = httpsCallable(functions, "sendCancellationEmail");
    const result: any = await callSend({ draftUrl });

    console.log(`[SEND CANCELLATION EMAIL] Result:`, result?.data);

    if (result?.data?.success && typeof result.data.messageId === "string") {
      const sentUrl = result.data.sentUrl;
      console.log(
        `[SEND CANCELLATION EMAIL] Successfully sent, sentUrl:`,
        sentUrl
      );

      // Return the sent URL for this column
      return sentUrl;
    }

    console.log(
      `[SEND CANCELLATION EMAIL] Result not successful, returning ERROR`
    );
    return "ERROR";
  } catch (err) {
    console.error("sendCancellationEmailDraftOnce error:", err);
    return "ERROR";
  }
}
