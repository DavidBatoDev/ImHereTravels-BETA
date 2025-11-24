import { BookingSheetColumn } from "@/types/booking-sheet-column";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export const sentEmailLinkColumn: BookingSheetColumn = {
  id: "sentEmailLink",
  data: {
    id: "sentEmailLink",
    columnName: "Sent Email Link",
    dataType: "string",
    parentTab: "Reservation Email",
    order: 31,
    includeInForms: false,
    color: "yellow",
    width: 483.3333740234375,
  },
};

// Column Function Implementation
/**
 * Safely send an email draft once using Gmail draft URL.
 *
 * @param draftUrl The Gmail draft URL (e.g., https://mail.google.com/mail/u/0/#drafts?compose=abc123xyz)
 * @param sendEmail Boolean flag, if false -> return ""
 * @returns "" if skipped, messageId if sent, "ERROR" if failure
 */
export default async function sendEmailDraftOnce(
  draftUrl: string,
  sendEmail: boolean
): Promise<string> {
  if (!sendEmail) return "";
  if (!draftUrl || draftUrl.trim() === "") return "ERROR";

  try {
    // Call Cloud Function to send the draft by URL
    const callSend = httpsCallable(functions, "sendReservationEmail");
    const result: any = await callSend({ draftUrl });

    if (result?.data?.success && typeof result.data.messageId === "string") {
      return result.data.sentUrl;
    }

    return "ERROR";
  } catch (err) {
    console.error("sendEmailDraftOnce error:", err);
    return "ERROR";
  }
}
