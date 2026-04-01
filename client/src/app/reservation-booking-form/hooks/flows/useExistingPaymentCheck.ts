import { useCallback } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type Firestore,
} from "firebase/firestore";
import { runExistingPaymentsFlowAction } from "../../actions/checkExistingPaymentsAction";

type UseExistingPaymentCheckOptions = {
  db: Firestore;
  email: string;
  selectedPackageName: string;
  tourDate: string;
  replaceWithPaymentId: (paymentDocId: string | null) => void;
  serverTimestampValue: unknown;
  formSlice: {
    validate: () => boolean;
    isCreatingPayment: boolean;
    getReservationDraftPayload: () => Record<string, unknown>;
    createPlaceholder: () => Promise<string | null>;
  };
  flowSlice: {
    paymentDocId: string | null;
    completedSteps: number[];
    setCompletedSteps: (steps: number[]) => void;
    setStep: (step: number) => void;
  };
  uiSlice: {
    setIsCreatingPayment: (value: boolean) => void;
    setModalLoading: (value: boolean) => void;
    setFoundStripePayments: (records: any[]) => void;
    setShowEmailModal: (value: boolean) => void;
  };
};

export const useExistingPaymentCheck = ({
  db,
  email,
  selectedPackageName,
  tourDate,
  replaceWithPaymentId,
  serverTimestampValue,
  formSlice,
  flowSlice,
  uiSlice,
}: UseExistingPaymentCheckOptions) => {
  const {
    validate,
    isCreatingPayment,
    getReservationDraftPayload,
    createPlaceholder,
  } = formSlice;
  const { paymentDocId, completedSteps, setCompletedSteps, setStep } =
    flowSlice;
  const {
    setIsCreatingPayment,
    setModalLoading,
    setFoundStripePayments,
    setShowEmailModal,
  } = uiSlice;

  const checkExistingPaymentsAndMaybeProceed = useCallback(async () => {
    await runExistingPaymentsFlowAction({
      validate,
      isCreatingPayment,
      paymentDocId,
      updateExistingPaymentDoc: async (existingPaymentDocId) => {
        try {
          const { updateDoc, doc } = await import("firebase/firestore");
          await updateDoc(doc(db, "stripePayments", existingPaymentDocId), {
            ...getReservationDraftPayload(),
            "timestamps.updatedAt": serverTimestampValue,
          });
          return true;
        } catch (err) {
          console.error("Error updating payment document:", err);
          alert("Unable to update payment record. Please try again.");
          return false;
        }
      },
      createPlaceholder,
      completedSteps,
      setCompletedSteps,
      setStep,
      setIsCreatingPayment,
      setModalLoading,
      setFoundStripePayments,
      setShowEmailModal,
      replaceWithPaymentId,
      checkInput: {
        fetchPayments: async () => {
          const paymentsRef = collection(db, "stripePayments");
          const q = query(
            paymentsRef,
            where("customer.email", "==", email),
            orderBy("timestamps.createdAt", "desc"),
            limit(10),
          );
          const snap = await getDocs(q);
          return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
        },
        fetchBookingHasPaymentPlan: async (bookingDocId) => {
          const { doc, getDoc } = await import("firebase/firestore");
          const bookingDoc = await getDoc(doc(db, "bookings", bookingDocId));
          if (!bookingDoc.exists()) {
            return false;
          }
          const bookingData = bookingDoc.data();
          return !!bookingData?.paymentPlan;
        },
        selectedPackageName,
        tourDate,
        onBookingLookupError: (error) => {
          console.error("Error checking booking for payment plan:", error);
        },
      },
      onCheckError: (error) => {
        console.error("Error checking existing payments:", error);
      },
      onFallbackPlaceholderError: (error) => {
        console.debug("Failed to set paymentid query param (fallback):", error);
      },
    });
  }, [
    validate,
    isCreatingPayment,
    paymentDocId,
    db,
    getReservationDraftPayload,
    serverTimestampValue,
    createPlaceholder,
    completedSteps,
    setCompletedSteps,
    setStep,
    setIsCreatingPayment,
    setModalLoading,
    setFoundStripePayments,
    setShowEmailModal,
    replaceWithPaymentId,
    email,
    selectedPackageName,
    tourDate,
  ]);

  return {
    checkExistingPaymentsAndMaybeProceed,
  };
};

