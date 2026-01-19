import { withOrder } from "../column-orders";
import { cancellationEmailDraftLinkColumn as _cancellationEmailDraftLinkColumn } from "./cancellation-email-draft-link";
import { cancellationEmailSentDateColumn as _cancellationEmailSentDateColumn } from "./cancellation-email-sent-date";
import { cancellationRequestDateColumn as _cancellationRequestDateColumn } from "./cancellation-request-date";
import { eligibleRefundColumn as _eligibleRefundColumn } from "./eligible-refund";
import { generateCancellationEmailDraftColumn as _generateCancellationEmailDraftColumn } from "./generate-cancellation-email-draft";
import { includeBccCancellationColumn as _includeBccCancellationColumn } from "./include-bcc-cancellation";
import { nonRefundableAmountColumn as _nonRefundableAmountColumn } from "./non-refundable-amount";
import { reasonForCancellationColumn as _reasonForCancellationColumn } from "./reason-for-cancellation";
import { refundableAmountColumn as _refundableAmountColumn } from "./refundable-amount";
import { sendCancellationEmailColumn as _sendCancellationEmailColumn } from "./send-cancellation-email";
import { sentCancellationEmailLinkColumn as _sentCancellationEmailLinkColumn } from "./sent-cancellation-email-link";
import { subjectLineCancellationColumn as _subjectLineCancellationColumn } from "./subject-line-cancellation";

// Export columns with orders injected from global column-orders.ts
export const cancellationEmailDraftLinkColumn = withOrder(
  _cancellationEmailDraftLinkColumn
);
export const cancellationEmailSentDateColumn = withOrder(
  _cancellationEmailSentDateColumn
);
export const cancellationRequestDateColumn = withOrder(
  _cancellationRequestDateColumn
);
export const eligibleRefundColumn = withOrder(_eligibleRefundColumn);
export const generateCancellationEmailDraftColumn = withOrder(
  _generateCancellationEmailDraftColumn
);
export const includeBccCancellationColumn = withOrder(
  _includeBccCancellationColumn
);
export const nonRefundableAmountColumn = withOrder(_nonRefundableAmountColumn);
export const reasonForCancellationColumn = withOrder(
  _reasonForCancellationColumn
);
export const refundableAmountColumn = withOrder(_refundableAmountColumn);
export const sendCancellationEmailColumn = withOrder(
  _sendCancellationEmailColumn
);
export const sentCancellationEmailLinkColumn = withOrder(
  _sentCancellationEmailLinkColumn
);
export const subjectLineCancellationColumn = withOrder(
  _subjectLineCancellationColumn
);
