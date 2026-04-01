import { useMemo } from "react";

type UseReservationStepPresentationOptions = {
  step: number;
  selectedPackage: unknown;
  bookingType: string;
  depositAmount: number;
  baseReservationFee: number;
  numberOfPeople: number;
  availablePaymentTerm: {
    isInvalid: boolean;
    isLastMinute: boolean;
  };
  tourDate: string;
  availablePaymentPlansCount: number;
};

export const useReservationStepPresentation = ({
  step,
  selectedPackage,
  bookingType,
  depositAmount,
  baseReservationFee,
  numberOfPeople,
  availablePaymentTerm,
  tourDate,
  availablePaymentPlansCount,
}: UseReservationStepPresentationOptions) => {
  const progressWidth = useMemo(
    () => (step === 1 ? "w-1/3" : step === 2 ? "w-2/3" : "w-full"),
    [step],
  );

  const stepDescription = useMemo(() => {
    switch (step) {
      case 1:
        return "Fill in your personal details and select your tour name";
      case 2:
        return selectedPackage
          ? bookingType === "Duo Booking" || bookingType === "Group Booking"
            ? `Pay £${depositAmount.toFixed(2)} reservation fee (£${baseReservationFee.toFixed(2)} × ${numberOfPeople} ${numberOfPeople === 1 ? "person" : "people"}) to secure your spots`
            : `Pay £${depositAmount.toFixed(2)} reservation fee to secure your spot`
          : "Pay a small reservation fee to secure your spot";
      case 3:
        if (availablePaymentTerm.isInvalid) {
          return "Tour date too close - immediate payment required";
        }
        if (availablePaymentTerm.isLastMinute) {
          return "Full payment required within 48 hours";
        }
        const daysDiff = tourDate
          ? Math.ceil(
              (new Date(tourDate).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 0;
        return `Pick from ${availablePaymentPlansCount} payment plan${
          availablePaymentPlansCount !== 1 ? "s" : ""
        } based on your tour date (${daysDiff} days away)`;
      default:
        return "";
    }
  }, [
    step,
    selectedPackage,
    bookingType,
    depositAmount,
    baseReservationFee,
    numberOfPeople,
    availablePaymentTerm,
    tourDate,
    availablePaymentPlansCount,
  ]);

  return {
    progressWidth,
    stepDescription,
  };
};
