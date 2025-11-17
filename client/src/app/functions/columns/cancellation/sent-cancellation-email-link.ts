import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const sentCancellationEmailLinkColumn: BookingSheetColumn = {
  id: 'sentCancellationEmailLink',
  data: {
    id: 'sentCancellationEmailLink',
    columnName: 'Sent Cancellation Email Link',
    dataType: 'function',
    function: 'sendCancellationEmailDraftOnceFunction',
    parentTab: 'Cancellation',
    order: 83,
    includeInForms: false,
    color: 'yellow',
    width: 200,
    arguments: [
      {
        name: 'draftUrl',
        type: 'string',
        columnReference: 'Cancellation Email Draft Link',
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'sendEmail',
        type: 'boolean',
        columnReference: 'Send Cancellation Email?',
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: '',
      },
    ],
  },
};

// Column Function Implementation

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
      return result.data.sentUrl;
    }

    return "ERROR";
  } catch (err) {
    console.error("sendCancellationEmailDraftOnce error:", err);
    return "ERROR";
  }
}
