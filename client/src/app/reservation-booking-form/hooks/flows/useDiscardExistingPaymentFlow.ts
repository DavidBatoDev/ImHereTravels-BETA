import { useCallback } from "react";
import { discardExistingPaymentAction } from "../../actions/reuseExistingPaymentAction";
import type { ReservationSideEffects } from "../../types/sideEffects";

type UseDiscardExistingPaymentFlowOptions = {
  sideEffects: ReservationSideEffects;
  foundStripePayments: any[];
  createPlaceholder: () => Promise<string | null>;
  email: string;
  tourPackage: string;
  selectedPackageName: string;
  depositAmount: number;
  completedSteps: number[];
  setFoundStripePayments: (records: any[]) => void;
  setCompletedSteps: (steps: number[]) => void;
  setShowEmailModal: (value: boolean) => void;
  setStep: (value: number) => void;
  setIsCreatingPayment: (value: boolean) => void;
};

export const useDiscardExistingPaymentFlow = ({
  sideEffects,
  foundStripePayments,
  createPlaceholder,
  email,
  tourPackage,
  selectedPackageName,
  depositAmount,
  completedSteps,
  setFoundStripePayments,
  setCompletedSteps,
  setShowEmailModal,
  setStep,
  setIsCreatingPayment,
}: UseDiscardExistingPaymentFlowOptions) => {
  const handleDiscardExisting = useCallback(
    async (recId: string, status?: string) => {
      try {
        setIsCreatingPayment(true);
        const result = await discardExistingPaymentAction({
          effects: sideEffects,
          recId,
          paymentStatus: status,
          foundStripePayments,
          createPlaceholder,
          initPaymentPayload: {
            email,
            tourPackage,
            tourPackageName: selectedPackageName,
            amountGBP: depositAmount,
          },
        });

        setFoundStripePayments(result.updatedRecords);

        if (result.shouldAddStepOne && !completedSteps.includes(1)) {
          setCompletedSteps([...completedSteps, 1]);
        }

        if (result.shouldCloseModal) {
          setShowEmailModal(false);
        }

        if (result.nextStep === 2) {
          setStep(2);
        }
      } finally {
        setIsCreatingPayment(false);
      }
    },
    [
      sideEffects,
      foundStripePayments,
      createPlaceholder,
      email,
      tourPackage,
      selectedPackageName,
      depositAmount,
      completedSteps,
      setFoundStripePayments,
      setCompletedSteps,
      setShowEmailModal,
      setStep,
      setIsCreatingPayment,
    ],
  );

  return {
    handleDiscardExisting,
  };
};

