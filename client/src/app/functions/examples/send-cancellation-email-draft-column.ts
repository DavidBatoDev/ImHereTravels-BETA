import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

/**
 * Safely send a cancellation email draft once using Gmail draft URL.
 *
 * @param draftUrl The Gmail draft URL (e.g., https://mail.google.com/mail/u/0/#drafts?compose=abc123xyz)
 * @param sendEmail Boolean flag, if false -> return ""
 * @returns "" if skipped, messageId if sent, "ERROR" if failure
 */
export default async function sendCancellationEmailDraftOnce(
  draftUrl: string,
  sendEmail: boolean
): Promise<string> {
  if (!sendEmail) return "";
  if (!draftUrl || draftUrl.trim() === "") return "ERROR";

  try {
    // Call Cloud Function to send the draft by URL
    const callSend = httpsCallable(functions, "sendCancellationEmail");
    const result: any = await callSend({ draftUrl });

    if (result?.data?.success && typeof result.data.messageId === "string") {
      return result.data.messageId;
    }

    return "ERROR";
  } catch (err) {
    console.error("sendCancellationEmailDraftOnce error:", err);
    return "ERROR";
  }
}
