import { BookingSheetColumn } from "@/types/booking-sheet-column";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export const subjectLineCancellationColumn: BookingSheetColumn = {
  id: "subjectLineCancellation",
  data: {
    id: "subjectLineCancellation",
    columnName: "Subject Line (Cancellation)",
    dataType: "function",
    function: "getEmailSentDateFunction",
    parentTab: "Cancellation",
    order: 81,
    includeInForms: false,
    color: "yellow",
    width: 200,
    arguments: [
      {
        name: "draftUrl",
        type: "string",
        columnReference: "Cancellation Email Draft Link",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

// Column Function Implementation
/**
 * Fetch the subject from an email draft by its URL.
 * Convenience wrapper for just the subject.
 *
 * @param draftUrl The Gmail draft URL or messageId (e.g., https://mail.google.com/mail/u/0/#drafts?compose=abc123xyz)
 * @returns Subject string if found, "" if missing, "ERROR" if not found
 */
export default async function getEmailSentDate(
  draftUrl: string
): Promise<string> {
  if (!draftUrl || draftUrl.trim() === "") return "";

  try {
    const getDraftSubject = httpsCallable(functions, "getDraftSubject");

    const result = await getDraftSubject({ draftUrl });

    if (
      result.data &&
      typeof result.data === "object" &&
      "subject" in result.data
    ) {
      const data = result.data as { subject: string };
      return data.subject || "";
    }

    return "ERROR";
  } catch (err) {
    console.error("Failed to fetch email draft date from Gmail:", err);
    return "ERROR";
  }
}
