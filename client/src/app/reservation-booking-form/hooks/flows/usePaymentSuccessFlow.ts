import { useCallback } from "react";
import type { Firestore } from "firebase/firestore";
import { runPaymentSuccessAction } from "../../actions/paymentSuccessAction";

type UsePaymentSuccessFlowOptions = {
  db: Firestore;
  email: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  nationality: string;
  bookingType: string;
  groupSize: number;
  tourPackage: string;
  tourDate: string;
  selectedPackageName: string;
  selectedPackageDeposit: number;
  completedSteps: number[];
  setCompletedSteps: (
    update: number[] | ((prev: number[]) => number[]),
  ) => void;
  setPaymentConfirmed: (value: boolean) => void;
  setBookingId: (value: string) => void;
};

export const usePaymentSuccessFlow = ({
  db,
  email,
  firstName,
  lastName,
  birthdate,
  nationality,
  bookingType,
  groupSize,
  tourPackage,
  tourDate,
  selectedPackageName,
  selectedPackageDeposit,
  completedSteps,
  setCompletedSteps,
  setPaymentConfirmed,
  setBookingId,
}: UsePaymentSuccessFlowOptions) => {
  const handlePaymentSuccess = useCallback(
    async (paymentIntentId?: string, paymentDocId?: string) => {
      await runPaymentSuccessAction({
        db,
        paymentIntentId,
        paymentDocId,
        email,
        firstName,
        lastName,
        birthdate,
        nationality,
        bookingType,
        groupSize,
        tourPackage,
        tourDate,
        selectedPackageName,
        selectedPackageDeposit,
        completedSteps,
        setCompletedSteps,
        setPaymentConfirmed,
        setBookingId,
        onError: (error) => {
          console.error("âŒ Error in payment success handler:", error);
          alert(
            "Payment processing encountered an error. Please refresh the page and verify your payment status.",
          );
        },
      });
    },
    [
      db,
      email,
      firstName,
      lastName,
      birthdate,
      nationality,
      bookingType,
      groupSize,
      tourPackage,
      tourDate,
      selectedPackageName,
      selectedPackageDeposit,
      completedSteps,
      setCompletedSteps,
      setPaymentConfirmed,
      setBookingId,
    ],
  );

  return {
    handlePaymentSuccess,
  };
};

