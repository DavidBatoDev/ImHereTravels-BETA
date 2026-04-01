export type PersonPaymentPlan = {
  plan: string;
  tourCostShare: number;
  reservationFeeShare: number;
};

export type FullPaymentPlan = {
  plan: "full_payment";
};

export type PaymentPlanToSend = PersonPaymentPlan | FullPaymentPlan;

export type PaymentPlanOption = {
  id?: string;
  type?: string;
  label?: string;
};

export const areAllPaymentPlansSelected = (
  paymentPlans: PersonPaymentPlan[],
  numberOfPeople: number,
): boolean => {
  return (
    paymentPlans.length === numberOfPeople &&
    paymentPlans.every((plan) => Boolean(plan?.plan))
  );
};

export const getSelectedPaymentPlansCount = (
  paymentPlans: PersonPaymentPlan[],
): number => {
  return paymentPlans.filter((plan) => Boolean(plan?.plan)).length;
};

export const buildFullPaymentPlans = (
  numberOfPeople: number,
): FullPaymentPlan[] => {
  return Array.from({ length: numberOfPeople }, () => ({
    plan: "full_payment" as const,
  }));
};

export const getPaymentPlansToSend = ({
  isLastMinute,
  numberOfPeople,
  paymentPlans,
}: {
  isLastMinute: boolean;
  numberOfPeople: number;
  paymentPlans: PersonPaymentPlan[];
}): PaymentPlanToSend[] => {
  return isLastMinute ? buildFullPaymentPlans(numberOfPeople) : paymentPlans;
};

export const getTravelerPaymentPlan = (
  paymentPlansToSend: PaymentPlanToSend[],
  travelerIndex: number,
): PaymentPlanToSend | undefined => {
  return paymentPlansToSend[travelerIndex] ?? paymentPlansToSend[0];
};

export const getPaymentPlanId = (
  plan: PaymentPlanToSend | undefined,
): string => {
  return plan?.plan || "full_payment";
};

export const findSelectedPlanDetails = (
  selectedPlanId: string | undefined,
  availablePaymentPlans: PaymentPlanOption[],
): PaymentPlanOption | null => {
  if (!selectedPlanId) {
    return null;
  }

  return (
    availablePaymentPlans.find(
      (plan) => plan.id === selectedPlanId || plan.type === selectedPlanId,
    ) || null
  );
};

export const resolveBookingDocumentIds = (paymentDocData: {
  bookingDocumentIds?: string[];
  booking?: { documentId?: string };
}): string[] => {
  if (paymentDocData.bookingDocumentIds?.length) {
    return paymentDocData.bookingDocumentIds;
  }

  if (paymentDocData.booking?.documentId) {
    return [paymentDocData.booking.documentId];
  }

  return [];
};

export const upsertPaymentPlanAtIndex = (
  paymentPlans: PersonPaymentPlan[],
  tabIndex: number,
  nextPlan: PersonPaymentPlan,
): PersonPaymentPlan[] => {
  const updated = [...paymentPlans];

  while (updated.length <= tabIndex) {
    updated.push({
      plan: "",
      tourCostShare: nextPlan.tourCostShare,
      reservationFeeShare: nextPlan.reservationFeeShare,
    });
  }

  updated[tabIndex] = nextPlan;
  return updated;
};
