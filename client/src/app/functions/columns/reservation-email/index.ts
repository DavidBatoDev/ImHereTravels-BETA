import { withOrder } from "../column-orders";
import { emailDraftLinkColumn as _emailDraftLinkColumn } from "./email-draft-link";
import { generateEmailDraftColumn as _generateEmailDraftColumn } from "./generate-email-draft";
import { includeBccReservationColumn as _includeBccReservationColumn } from "./include-bcc-reservation";
import { reservationEmailSentDateColumn as _reservationEmailSentDateColumn } from "./reservation-email-sent-date";
import { sendEmailColumn as _sendEmailColumn } from "./send-email";
import { sentEmailLinkColumn as _sentEmailLinkColumn } from "./sent-email-link";
import { subjectLineReservationColumn as _subjectLineReservationColumn } from "./subject-line-reservation";

// Export columns with orders injected from global column-orders.ts
export const emailDraftLinkColumn = withOrder(_emailDraftLinkColumn);
export const generateEmailDraftColumn = withOrder(_generateEmailDraftColumn);
export const includeBccReservationColumn = withOrder(_includeBccReservationColumn);
export const reservationEmailSentDateColumn = withOrder(_reservationEmailSentDateColumn);
export const sendEmailColumn = withOrder(_sendEmailColumn);
export const sentEmailLinkColumn = withOrder(_sentEmailLinkColumn);
export const subjectLineReservationColumn = withOrder(_subjectLineReservationColumn);
