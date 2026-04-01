export type StripePaymentLike = {
  id?: string;
  status?: string;
  _hasPaymentPlan?: boolean;
  payment?: {
    status?: string;
    type?: string;
  };
  booking?: {
    id?: string;
    documentId?: string;
  };
  tour?: {
    packageName?: string;
    date?: string;
  };
};

export type ExistingPaymentDecision =
  | { type: "create-placeholder" }
  | {
      type: "show-modal";
      records: StripePaymentLike[];
      exactMatchFound: boolean;
    };

export const getPaymentStatus = (payment: StripePaymentLike): string => {
  return payment?.payment?.status || payment?.status || "";
};

export const isPaidOrConfirmedStatus = (status: string): boolean => {
  return status === "reserve_paid" || status === "terms_selected";
};

export const isPendingReservationStatus = (status: string): boolean => {
  return status === "reserve_pending" || status === "pending";
};

export const canDiscardExistingPayment = (status: string): boolean => {
  return !isPaidOrConfirmedStatus(status);
};

export const isReservationFeePayment = (
  payment: StripePaymentLike,
): boolean => {
  const paymentType = payment?.payment?.type;
  return paymentType === "reservationFee" || !paymentType;
};

export const getBookingDocumentIdFromPayment = (
  payment: StripePaymentLike,
): string | null => {
  const bookingDocId = payment?.booking?.documentId || payment?.booking?.id;
  if (!bookingDocId || bookingDocId === "PENDING") {
    return null;
  }

  return bookingDocId;
};

export const shouldCheckBookingForPaymentPlan = (
  payment: StripePaymentLike,
): boolean => {
  return (
    getPaymentStatus(payment) === "reserve_paid" &&
    Boolean(getBookingDocumentIdFromPayment(payment))
  );
};

export type ExistingPaymentDisplayState =
  | "confirmed"
  | "awaiting-plan"
  | "pending";

export type ReuseExistingFlow =
  | "reserve-paid"
  | "reserve-pending"
  | "terms-selected"
  | "fallback";

export const getExistingPaymentDisplayState = (
  payment: StripePaymentLike,
): ExistingPaymentDisplayState => {
  const status = getPaymentStatus(payment);

  if (status === "reserve_paid") {
    return payment?._hasPaymentPlan ? "confirmed" : "awaiting-plan";
  }

  if (status === "terms_selected") {
    return "confirmed";
  }

  return "pending";
};

export const getExistingPaymentPrimaryActionLabel = (
  payment: StripePaymentLike,
): string => {
  const displayState = getExistingPaymentDisplayState(payment);
  if (displayState === "confirmed") {
    return "View Booking";
  }
  if (displayState === "awaiting-plan") {
    return "Complete Payment Plan";
  }
  return "Use This";
};

export const getExistingPaymentModalTitle = (
  records: StripePaymentLike[],
): string => {
  const firstStatus = getPaymentStatus(records[0] || {});
  return firstStatus === "reserve_paid"
    ? "Complete Your Booking"
    : "Existing Reservation Found";
};

export const shouldShowPendingReservationMessage = (
  records: StripePaymentLike[],
): boolean => {
  const firstStatus = getPaymentStatus(records[0] || {});
  return isPendingReservationStatus(firstStatus);
};

export const getReuseExistingFlow = (status: string): ReuseExistingFlow => {
  if (status === "reserve_paid") {
    return "reserve-paid";
  }

  if (isPendingReservationStatus(status)) {
    return "reserve-pending";
  }

  if (status === "terms_selected") {
    return "terms-selected";
  }

  return "fallback";
};

export const getPreferredBookingDocumentId = (
  payment: StripePaymentLike & { bookingId?: string },
): string | null => {
  if (payment?.bookingId) {
    return payment.bookingId;
  }

  return getBookingDocumentIdFromPayment(payment);
};

export const getStripePaymentSessionStorageKey = ({
  fallbackEmail,
  fallbackTourPackage,
  payment,
}: {
  fallbackEmail: string;
  fallbackTourPackage: string;
  payment: {
    customer?: { email?: string };
    tour?: { packageId?: string };
  };
}): string => {
  const email = payment?.customer?.email || fallbackEmail;
  const tourPackage = payment?.tour?.packageId || fallbackTourPackage;
  return `stripe_payment_doc_${email}_${tourPackage}`;
};

export const decideExistingPaymentNextStep = ({
  records,
  selectedPackageName,
  tourDate,
}: {
  records: StripePaymentLike[];
  selectedPackageName: string;
  tourDate: string;
}): ExistingPaymentDecision => {
  if (!records.length) {
    return { type: "create-placeholder" };
  }

  const exactMatch = records.find(
    (record) =>
      record?.tour?.packageName === selectedPackageName &&
      record?.tour?.date === tourDate,
  );

  if (exactMatch) {
    return {
      type: "show-modal",
      records: [exactMatch],
      exactMatchFound: true,
    };
  }

  return {
    type: "show-modal",
    records,
    exactMatchFound: false,
  };
};
