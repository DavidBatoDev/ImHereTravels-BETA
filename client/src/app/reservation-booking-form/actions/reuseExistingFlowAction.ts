import { getCountries } from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import type { ReservationSideEffects } from "../types/sideEffects";
import { deriveBookingRestoreState } from "../utils/reuseHydration";
import { deriveCustomerRestoreState } from "../utils/customerHydration";
import { scheduleGuestsMountHeightSync } from "../utils/guestUiState";
import {
  getPaymentStatus,
  getReuseExistingFlow,
  getStripePaymentSessionStorageKey,
} from "../utils/paymentLookup";
import {
  reusePendingPaymentAction,
  reuseReservePaidAction,
  reuseTermsSelectedAction,
} from "./reuseExistingPaymentAction";

type ReuseExistingFlowActionInput = {
  rec: any;
  effects: ReservationSideEffects;
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
  setSelectedPaymentPlan: (value: any) => void;
  setCompletedSteps: (value: number[]) => void;
  setStep: (value: number) => void;
  replaceWithPaymentId: (docId: string | null) => void;
};

export const runReuseExistingFlowAction = async ({
  rec,
  effects,
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
}: ReuseExistingFlowActionInput): Promise<void> => {
  const status = getPaymentStatus(rec);
  const reuseFlow = getReuseExistingFlow(status);

  if (reuseFlow === "reserve-paid") {
    const reservePaidResult = await reuseReservePaidAction({
      effects,
      pathname,
      rec,
      sessionStorageKey: getStripePaymentSessionStorageKey({
        fallbackEmail: email,
        fallbackTourPackage: tourPackage,
        payment: rec,
      }),
    });

    if (reservePaidResult.outcome === "verification-failed-reload") {
      return;
    }

    setShowEmailModal(false);
    setPaymentDocId(rec.id);

    if (reservePaidResult.paymentPlanLabel) {
      setFetchedPaymentPlanLabel(reservePaidResult.paymentPlanLabel);
    }

    if (reservePaidResult.bookingDocId) {
      setBookingId(reservePaidResult.bookingDocId);
    }

    setPaymentConfirmed(true);

    if (reservePaidResult.outcome === "confirmed-with-plan") {
      setBookingConfirmed(true);
      setSelectedPaymentPlan(reservePaidResult.selectedPaymentPlan as any);
    }

    const nextCompletedSteps = [...completedSteps, 1, 2];
    if (reservePaidResult.outcome === "confirmed-with-plan") {
      nextCompletedSteps.push(3);
    }
    setCompletedSteps(Array.from(new Set(nextCompletedSteps)));
    setStep(3);
    return;
  }

  if (reuseFlow === "reserve-pending") {
    try {
      setIsCreatingPayment(true);

      const restoredCustomer = deriveCustomerRestoreState({
        record: rec,
        countries: getCountries(),
        getCallingCode: (country) =>
          safeGetCountryCallingCodeFn(country as Country),
        onUnmatchedPhone: "ignore",
      });
      if (restoredCustomer.email) setEmail(restoredCustomer.email);
      if (restoredCustomer.firstName) setFirstName(restoredCustomer.firstName);
      if (restoredCustomer.lastName) setLastName(restoredCustomer.lastName);
      if (restoredCustomer.birthdate) setBirthdate(restoredCustomer.birthdate);
      if (restoredCustomer.nationality)
        setNationality(restoredCustomer.nationality);
      if (restoredCustomer.whatsAppCountry)
        setWhatsAppCountry(restoredCustomer.whatsAppCountry as Country);
      if (restoredCustomer.whatsAppNumber)
        setWhatsAppNumber(restoredCustomer.whatsAppNumber);

      const restoredBookingState = deriveBookingRestoreState(rec);

      if (rec.booking?.type) setBookingType(restoredBookingState.bookingType);
      if (rec.booking?.groupSize) setGroupSize(restoredBookingState.groupSize);

      if (restoredBookingState.shouldMountGuests) {
        scheduleGuestsMountHeightSync({
          setGuestsMounted,
          getContentHeight: getGuestsContentHeight,
          setGuestsHeight,
        });
      }

      setAdditionalGuests(restoredBookingState.additionalGuests);

      if (rec.tour?.packageId) setTourPackage(rec.tour.packageId);
      if (rec.tour?.date) setTourDate(rec.tour.date);

      const reusePendingResult = await reusePendingPaymentAction({
        effects,
        pathname,
        rec,
        initPaymentPayload: {
          email: rec.customer?.email || email,
          tourPackage: rec.tour?.packageId || tourPackage,
          tourPackageName: rec.tour?.packageName || selectedPackageName,
          amountGBP: rec.payment?.amount || depositAmount,
        },
        sessionStorageKey: getStripePaymentSessionStorageKey({
          fallbackEmail: email,
          fallbackTourPackage: tourPackage,
          payment: rec,
        }),
      });

      if (!reusePendingResult.succeeded) {
        return;
      }

      setShowEmailModal(false);
      setPaymentDocId(rec.id);
      if (!completedSteps.includes(1)) {
        setCompletedSteps([...completedSteps, 1]);
      }
      setStep(2);
    } finally {
      setIsCreatingPayment(false);
    }
    return;
  }

  if (reuseFlow === "terms-selected") {
    const termsSelectedResult = await reuseTermsSelectedAction({
      effects,
      pathname,
      rec,
      sessionStorageKey: getStripePaymentSessionStorageKey({
        fallbackEmail: email,
        fallbackTourPackage: tourPackage,
        payment: rec,
      }),
    });

    setShowEmailModal(false);
    setPaymentDocId(rec.id);
    if (termsSelectedResult.paymentPlanLabel) {
      setFetchedPaymentPlanLabel(termsSelectedResult.paymentPlanLabel);
    }
    if (termsSelectedResult.bookingDocId) {
      setBookingId(termsSelectedResult.bookingDocId);
    }
    if (termsSelectedResult.outcome === "confirmed-with-plan") {
      setSelectedPaymentPlan(termsSelectedResult.selectedPaymentPlan as any);
    }

    setPaymentConfirmed(true);
    setBookingConfirmed(true);
    setCompletedSteps(Array.from(new Set([...completedSteps, 1, 2, 3])));
    setStep(3);
    return;
  }

  setShowEmailModal(false);
  setPaymentDocId(rec.id);
  try {
    effects.storage.setItem(
      getStripePaymentSessionStorageKey({
        fallbackEmail: email,
        fallbackTourPackage: tourPackage,
        payment: rec,
      }),
      rec.id,
    );
  } catch {}
  try {
    replaceWithPaymentId(rec.id);
  } catch (err) {
    effects.notification.warn("Failed to set paymentid query param:", err);
  }
  if (!completedSteps.includes(1)) {
    setCompletedSteps([...completedSteps, 1]);
  }
  setStep(2);
};
