import { BookingSheetColumn } from "@/types/booking-sheet-column";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export const reservationEmailSentDateColumn: BookingSheetColumn = {
  id: "reservationEmailSentDate",
  data: {
    id: "reservationEmailSentDate",
    columnName: "Reservation Email Sent Date",
    dataType: "string",
    parentTab: "Reservation Email",
    includeInForms: false,
    color: "yellow",
    width: 252,
  },
};

// Column Function Implementation

/**
 * Fetch the details from an email by its URL or messageId.
 *
 * @param draftUrlOrMessageId The Gmail draft URL or messageId (e.g., https://mail.google.com/mail/u/0/#drafts?compose=abc123xyz or abc123xyz)
 * @param field The field to extract from the email details (e.g., "subject", "from", "to", "date", "snippet", "htmlContent", "textContent")
 * @returns The requested field value if found, "" if missing, "ERROR" if not found
 */
export default async function getSentDateReservation(
  draftUrlOrMessageId: string,
  field: string
): Promise<string> {
  if (!draftUrlOrMessageId || draftUrlOrMessageId.trim() === "") return "";
  if (!field || field.trim() === "") return "";

  try {
    // Call the cloud function to get the email details from Gmail
    const getEmailDetailsCallable = httpsCallable(functions, "getEmailDetails");

    const result = await getEmailDetailsCallable({
      messageIdOrUrl: draftUrlOrMessageId,
    });

    // The cloud function returns email details with various fields
    if (result.data && typeof result.data === "object") {
      const data = result.data as Record<string, any>;

      // Get the requested field value
      const fieldValue = data[field];

      // Return the value, or empty string if null/undefined
      if (fieldValue === null || fieldValue === undefined) return "";
      return String(fieldValue);
    }

    return "ERROR";
  } catch (err) {
    console.error("Failed to fetch email details from Gmail:", err);
    return "ERROR";
  }
}
