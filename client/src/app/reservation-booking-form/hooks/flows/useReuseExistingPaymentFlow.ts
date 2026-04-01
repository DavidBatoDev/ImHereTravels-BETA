import { useCallback } from "react";
import type { Country } from "react-phone-number-input";
import { runReuseExistingFlowAction } from "../../actions/reuseExistingFlowAction";
import type { ReservationSideEffects } from "../../types/sideEffects";

type UseReuseExistingPaymentFlowOptions = {
  sideEffects: ReservationSideEffects;
  pathname: string;
  email: string;
  tourPackage: string;
  selectedPackageName: string;
  depositAmount: number;
  completedSteps: number[];
  safeGetCountryCallingCodeFn: (countryCode: string) => string;
  setEmail: (value: string) => void;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setBirthdate: (value: string) => void;
  setNationality: (value: string) => void;
  setWhatsAppCountry: (value: Country) => void;
  setWhatsAppNumber: (value: string) => void;
  setBookingType: (value: string) => void;
  setGroupSize: (value: number) => void;
  setAdditionalGuests: (value: string[]) => void;
  setGuestsMounted: (value: boolean) => void;
  setGuestsHeight: (value: string) => void;
  getGuestsContentHeight: () => number;
  setTourPackage: (value: string) => void;
  setTourDate: (value: string) => void;
  setIsCreatingPayment: (value: boolean) => void;
  setShowEmailModal: (value: boolean) => void;
  setPaymentDocId: (value: string | null) => void;
  setFetchedPaymentPlanLabel: (value: string) => void;
  setBookingId: (value: string) => void;
  setPaymentConfirmed: (value: boolean) => void;
  setBookingConfirmed: (value: boolean) => void;
  setSelectedPaymentPlan: (value: string) => void;
  setCompletedSteps: (value: number[]) => void;
  setStep: (value: number) => void;
  replaceWithPaymentId: (docId: string | null) => void;
};

export const useReuseExistingPaymentFlow = ({
  sideEffects,
  pathname,
  email,
  tourPackage,
  selectedPackageName,
  depositAmount,
  completedSteps,
  safeGetCountryCallingCodeFn,
  setEmail,
  setFirstName,
  setLastName,
  setBirthdate,
  setNationality,
  setWhatsAppCountry,
  setWhatsAppNumber,
  setBookingType,
  setGroupSize,
  setAdditionalGuests,
  setGuestsMounted,
  setGuestsHeight,
  getGuestsContentHeight,
  setTourPackage,
  setTourDate,
  setIsCreatingPayment,
  setShowEmailModal,
  setPaymentDocId,
  setFetchedPaymentPlanLabel,
  setBookingId,
  setPaymentConfirmed,
  setBookingConfirmed,
  setSelectedPaymentPlan,
  setCompletedSteps,
  setStep,
  replaceWithPaymentId,
}: UseReuseExistingPaymentFlowOptions) => {
  const handleReuseExisting = useCallback(
    async (rec: any) => {
      await runReuseExistingFlowAction({
        rec,
        effects: sideEffects,
        pathname,
        email,
        tourPackage,
        selectedPackageName,
        depositAmount,
        completedSteps,
        safeGetCountryCallingCodeFn,
        setEmail,
        setFirstName,
        setLastName,
        setBirthdate,
        setNationality,
        setWhatsAppCountry,
        setWhatsAppNumber,
        setBookingType,
        setGroupSize,
        setAdditionalGuests,
        setGuestsMounted,
        setGuestsHeight,
        getGuestsContentHeight,
        setTourPackage,
        setTourDate,
        setIsCreatingPayment,
        setShowEmailModal,
        setPaymentDocId,
        setFetchedPaymentPlanLabel,
        setBookingId,
        setPaymentConfirmed,
        setBookingConfirmed,
        setSelectedPaymentPlan,
        setCompletedSteps,
        setStep,
        replaceWithPaymentId,
      });
    },
    [
      sideEffects,
      pathname,
      email,
      tourPackage,
      selectedPackageName,
      depositAmount,
      completedSteps,
      safeGetCountryCallingCodeFn,
      setEmail,
      setFirstName,
      setLastName,
      setBirthdate,
      setNationality,
      setWhatsAppCountry,
      setWhatsAppNumber,
      setBookingType,
      setGroupSize,
      setAdditionalGuests,
      setGuestsMounted,
      setGuestsHeight,
      getGuestsContentHeight,
      setTourPackage,
      setTourDate,
      setIsCreatingPayment,
      setShowEmailModal,
      setPaymentDocId,
      setFetchedPaymentPlanLabel,
      setBookingId,
      setPaymentConfirmed,
      setBookingConfirmed,
      setSelectedPaymentPlan,
      setCompletedSteps,
      setStep,
      replaceWithPaymentId,
    ],
  );

  return {
    handleReuseExisting,
  };
};

