import { BookingSheetColumn } from "@/types/booking-sheet-column";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export const subjectLineReservationColumn: BookingSheetColumn = {
  id: "subjectLineReservation",
  data: {
    id: "subjectLineReservation",
    columnName: "Subject Line (Reservation)",
    dataType: "function",
    function: "getEmailDraftSubjectFunction",
    parentTab: "Reservation Email",
    order: 29,
    includeInForms: false,
    color: "yellow",
    width: 547.9895629882812,
    arguments: [
      {
        name: "draftLinkId",
        type: "string",
        columnReference: "Email Draft Link",
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
 *
 * @param draftUrl The Gmail draft URL (e.g., https://mail.google.com/mail/u/0/#drafts?compose=abc123xyz)
 * @returns Subject string if found, "" if missing, "ERROR" if not found
 */
export default async function getEmailDraftSubject(
  draftUrl: string
): Promise<string> {
  if (!draftUrl || draftUrl.trim() === "") return "";

  try {
    // Call the cloud function to get the draft subject from Gmail
    const getDraftSubject = httpsCallable(functions, "getDraftSubject");

    const result = await getDraftSubject({ draftUrl });

    // The cloud function returns { success: true, subject: string, messageId: string, draftUrl: string }
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
    console.error("Failed to fetch email draft subject from Gmail:", err);
    return "ERROR";
  }
}
