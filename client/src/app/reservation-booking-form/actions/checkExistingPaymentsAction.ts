import {
  decideExistingPaymentNextStep,
  isReservationFeePayment,
  getBookingDocumentIdFromPayment,
  shouldCheckBookingForPaymentPlan,
  type ExistingPaymentDecision,
  type StripePaymentLike,
} from "../utils/paymentLookup";

type CheckExistingPaymentsActionInput = {
  fetchPayments: () => Promise<StripePaymentLike[]>;
  fetchBookingHasPaymentPlan: (bookingDocId: string) => Promise<boolean>;
  selectedPackageName: string;
  tourDate: string;
  onBookingLookupError?: (error: unknown) => void;
};

export const checkExistingPaymentsAction = async ({
  fetchPayments,
  fetchBookingHasPaymentPlan,
  selectedPackageName,
  tourDate,
  onBookingLookupError,
}: CheckExistingPaymentsActionInput): Promise<ExistingPaymentDecision> => {
  const records = (await fetchPayments()).filter((payment) =>
    isReservationFeePayment(payment),
  );

  for (const payment of records) {
    if (!shouldCheckBookingForPaymentPlan(payment)) {
      continue;
    }

    const bookingDocId = getBookingDocumentIdFromPayment(payment);
    if (!bookingDocId) {
      continue;
    }

    try {
      payment._hasPaymentPlan = await fetchBookingHasPaymentPlan(bookingDocId);
    } catch (error) {
      onBookingLookupError?.(error);
    }
  }

  return decideExistingPaymentNextStep({
    records,
    selectedPackageName,
    tourDate,
  });
};

type RunExistingPaymentsFlowInput = {
  validate: () => boolean;
  isCreatingPayment: boolean;
  paymentDocId: string | null;
  updateExistingPaymentDoc: (paymentDocId: string) => Promise<boolean>;
  createPlaceholder: () => Promise<string | null>;
  completedSteps: number[];
  setCompletedSteps: (steps: number[]) => void;
  setStep: (step: number) => void;
  setIsCreatingPayment: (value: boolean) => void;
  setModalLoading: (value: boolean) => void;
  setFoundStripePayments: (records: StripePaymentLike[]) => void;
  setShowEmailModal: (value: boolean) => void;
  replaceWithPaymentId: (paymentDocId: string | null) => void;
  checkInput: CheckExistingPaymentsActionInput;
  onCheckError?: (error: unknown) => void;
  onFallbackPlaceholderError?: (error: unknown) => void;
};

export const runExistingPaymentsFlowAction = async ({
  validate,
  isCreatingPayment,
  paymentDocId,
  updateExistingPaymentDoc,
  createPlaceholder,
  completedSteps,
  setCompletedSteps,
  setStep,
  setIsCreatingPayment,
  setModalLoading,
  setFoundStripePayments,
  setShowEmailModal,
  replaceWithPaymentId,
  checkInput,
  onCheckError,
  onFallbackPlaceholderError,
}: RunExistingPaymentsFlowInput): Promise<void> => {
  if (!validate()) {
    return;
  }

  if (isCreatingPayment) {
    return;
  }

  setIsCreatingPayment(true);

  if (paymentDocId) {
    const updated = await updateExistingPaymentDoc(paymentDocId);
    if (!updated) {
      setIsCreatingPayment(false);
      return;
    }

    if (!completedSteps.includes(1)) {
      setCompletedSteps([...completedSteps, 1]);
    }

    setStep(2);

    try {
      replaceWithPaymentId(paymentDocId);
    } catch {}

    setIsCreatingPayment(false);
    return;
  }

  setModalLoading(true);

  try {
    const lookupDecision = await checkExistingPaymentsAction(checkInput);

    if (lookupDecision.type === "create-placeholder") {
      const id = await createPlaceholder();
      if (!completedSteps.includes(1)) {
        setCompletedSteps([...completedSteps, 1]);
      }

      if (id) {
        try {
          replaceWithPaymentId(id);
        } catch {}
      }

      setStep(2);
    } else {
      setFoundStripePayments(lookupDecision.records as StripePaymentLike[]);
      setShowEmailModal(true);
      setIsCreatingPayment(false);
    }
  } catch (error) {
    onCheckError?.(error);

    try {
      const fallbackId = await createPlaceholder();
      if (!completedSteps.includes(1)) {
        setCompletedSteps([...completedSteps, 1]);
      }

      if (fallbackId) {
        try {
          replaceWithPaymentId(fallbackId);
        } catch (replaceError) {
          onFallbackPlaceholderError?.(replaceError);
        }
      }

      setStep(2);
    } catch (fallbackError) {
      onFallbackPlaceholderError?.(fallbackError);
    }
  } finally {
    setModalLoading(false);
    setIsCreatingPayment(false);
  }
};
