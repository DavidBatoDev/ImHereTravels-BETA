"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import StripePayment from "./components/StripePayment";
import TourSelectionModal from "./components/TourSelectionModal";
import Step2ReservationSummaryCard from "./components/Step2ReservationSummaryCard";
import Step2PaymentStatePanel from "./components/Step2PaymentStatePanel";
import Step2PaymentHeader from "./components/Step2PaymentHeader";
import Step3ReservationConfirmedBanner from "./components/Step3ReservationConfirmedBanner";
import Step3PaymentPlanSelectorCard from "./components/Step3PaymentPlanSelectorCard";
import StepFooterActionsSection from "./components/StepFooterActionsSection";
import Step1PersonalReservationSection from "./components/Step1PersonalReservationSection";
import {
  calculateDaysBetween,
  isTourAllDatesTooSoon,
} from "./utils/bookingFlow";
import {
  canDiscardExistingPayment,
  getExistingPaymentDisplayState,
  getExistingPaymentModalTitle,
  getExistingPaymentPrimaryActionLabel,
  getPaymentStatus,
  isPaidOrConfirmedStatus,
  shouldShowPendingReservationMessage,
} from "./utils/paymentLookup";
import {
  getCountryData,
  safeGetCountryCallingCode,
} from "./utils/countryPhoneData";
import { buildReservationDraftPayload } from "./utils/reservationDraftPayload";
import { createDefaultReservationSideEffects } from "./side-effects/defaultSideEffects";
import {
  useConfirmBookingFlow,
  useDiscardExistingPaymentFlow,
  useExistingPaymentCheck,
  usePaymentSuccessFlow,
  useReservationCatalogState,
  useReservationCatalogSubscriptions,
  useReservationCustomerState,
  useReservationFlowState,
  useReservationGuestPersistence,
  useReservationGuestUiController,
  useReservationPaymentIntentSync,
  useReservationPaymentPlanning,
  useReservationPaymentVerification,
  useReservationStepPresentation,
  useReservationTourSelectionState,
  useReservationUiEffects,
  useReservationUiState,
  useReservationUrlSync,
  useReservationValidation,
  useStepFooterActionsProps,
  useStep1SectionProps,
  useReuseExistingPaymentFlow,
  useSessionRestore,
} from "./hooks";
import { getNationalityOptions } from "./utils/nationalityUtils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "react-phone-number-input";

const Page = () => {
  const DEBUG = true;
  const {
    email,
    setEmail,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    errors,
    setErrors,
    birthdate,
    setBirthdate,
    nationality,
    setNationality,
    whatsAppNumber,
    setWhatsAppNumber,
    whatsAppCountry,
    setWhatsAppCountry,
    bookingType,
    setBookingType,
    groupSize,
    setGroupSize,
    tourPackage,
    setTourPackage,
    tourDate,
    setTourDate,
    additionalGuests,
    setAdditionalGuests,
    activeGuestTab,
    setActiveGuestTab,
    guestDetails,
    setGuestDetails,
  } = useReservationCustomerState();

  const {
    tourPackages,
    setTourPackages,
    tourDates,
    setTourDates,
    isLoadingPackages,
    setIsLoadingPackages,
    paymentTerms,
    setPaymentTerms,
    selectedPaymentPlan,
    setSelectedPaymentPlan,
    fetchedPaymentPlanLabel,
    setFetchedPaymentPlanLabel,
    paymentPlans,
    setPaymentPlans,
    activePaymentTab,
    setActivePaymentTab,
  } = useReservationCatalogState();

  const {
    sessionLoading,
    setSessionLoading,
    isCreatingPayment,
    setIsCreatingPayment,
    step2Processing,
    setStep2Processing,
    showTourModal,
    setShowTourModal,
    highlightsExpanded,
    setHighlightsExpanded,
    carouselIndex,
    setCarouselIndex,
    isCarouselPaused,
    setIsCarouselPaused,
    dateMounted,
    setDateMounted,
    dateVisible,
    setDateVisible,
    guestsWrapRef,
    guestsContentRef,
    guestsMounted,
    setGuestsMounted,
    setGuestsHeight,
    clearing,
    setClearing,
    howItWorksExpanded,
    setHowItWorksExpanded,
    sessionRestoredRef,
    ANIM_DURATION,
  } = useReservationUiState();

  // ---- multi-step flow state ----
  const {
    step,
    setStep,
    completedSteps,
    setCompletedSteps,
    paymentConfirmed,
    setPaymentConfirmedState,
    bookingId,
    setBookingId,
    bookingConfirmed,
    setBookingConfirmed,
    confirmingBooking,
    setConfirmingBooking,
    paymentDocId,
    setPaymentDocId,
    showEmailModal,
    setShowEmailModal,
    modalLoading,
    setModalLoading,
    foundStripePayments,
    setFoundStripePayments,
  } = useReservationFlowState();

  // Flow setter alias used across composed hooks.
  const setPaymentConfirmed = setPaymentConfirmedState;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sideEffects = createDefaultReservationSideEffects({ db, router });

  
  // Get reservation fee from selected package (not the full deposit)
  const selectedPackage = tourPackages.find((p) => p.id === tourPackage);

  // Custom pricing logic
  const selectedDateDetail = selectedPackage?.travelDateDetails?.find(
    (d) => d.date === tourDate,
  );
  const customDeposit = selectedDateDetail?.customDeposit;
  const hasCustomDeposit = selectedDateDetail?.hasCustomDeposit === true;

  const baseReservationFee = hasCustomDeposit
    ? (customDeposit ?? (selectedPackage as any)?.deposit ?? 250)
    : ((selectedPackage as any)?.deposit ?? 250);

  // Calculate total reservation fee based on booking type
  const numberOfPeople =
    bookingType === "Group Booking"
      ? groupSize
      : bookingType === "Duo Booking"
        ? 2
        : 1;
  const depositAmount = baseReservationFee * numberOfPeople;

  const { replaceWithPaymentId } = useReservationUrlSync({
    debug: DEBUG,
    router,
    searchParams,
    step,
    selectedPackageSlug: selectedPackage?.slug,
    isLoadingPackages,
    paymentDocId,
    tourPackages,
    tourPackage,
    tourDate,
    setTourPackage,
    setTourDate,
    isTourAllDatesTooSoon,
  });

  const getReservationDraftPayload = () =>
    buildReservationDraftPayload({
      email,
      firstName,
      lastName,
      birthdate,
      nationality,
      whatsAppNumber,
      whatsAppCountry,
      bookingType,
      groupSize,
      guestDetails,
      tourPackage,
      tourPackageName: selectedPackage?.name || "",
      tourDate,
      depositAmount,
      customOriginal: selectedDateDetail?.customOriginal,
      safeGetCountryCallingCodeFn: safeGetCountryCallingCode,
    });

  // Create a new placeholder stripePayments doc and set session state
  const createPlaceholder = async () => {
    try {
      const paymentsRef = collection(db, "stripePayments");
      const newDoc = await addDoc(paymentsRef, {
        ...getReservationDraftPayload(),
        timestamps: {
          createdAt: serverTimestamp(),
        },
      });

      // write the id into the document for convenience
      await setDoc(
        doc(db, "stripePayments", newDoc.id),
        {
          id: newDoc.id,
        },
        { merge: true },
      );
      setPaymentDocId(newDoc.id);
      try {
        sessionStorage.setItem(
          `stripe_payment_doc_${email}_${tourPackage}`,
          newDoc.id,
        );
      } catch {}
      return newDoc.id;
    } catch (err) {
      console.error("Error creating payment placeholder:", err);
      alert("Unable to create payment record. Please try again.");
      return null;
    }
  };

  
  const { handleReuseExisting } = useReuseExistingPaymentFlow({
    sideEffects,
    pathname: pathname || "",
    email,
    tourPackage,
    selectedPackageName: selectedPackage?.name || "",
    depositAmount,
    completedSteps,
    safeGetCountryCallingCodeFn: safeGetCountryCallingCode,
    setEmail,
    setFirstName,
    setLastName,
    setBirthdate,
    setNationality,
    setWhatsAppCountry: (value) => setWhatsAppCountry(value),
    setWhatsAppNumber,
    setBookingType,
    setGroupSize,
    setAdditionalGuests,
    setGuestsMounted,
    setGuestsHeight,
    getGuestsContentHeight: () => guestsContentRef.current?.scrollHeight ?? 0,
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

  const { handleDiscardExisting } = useDiscardExistingPaymentFlow({
    sideEffects,
    foundStripePayments,
    createPlaceholder,
    email,
    tourPackage,
    selectedPackageName: selectedPackage?.name || "",
    depositAmount,
    completedSteps,
    setFoundStripePayments,
    setCompletedSteps,
    setShowEmailModal,
    setStep,
    setIsCreatingPayment,
  });

  useReservationPaymentIntentSync({
    bookingType,
    groupSize,
    depositAmount,
    paymentDocId,
    selectedPackage,
    numberOfPeople,
    step,
  });

  // Auto-rotate carousel effect
  useEffect(() => {
    if (!highlightsExpanded || !selectedPackage?.highlights || isCarouselPaused)
      return;

    const highlightsWithImages = selectedPackage.highlights.filter(
      (h) => typeof h === "object" && h.image,
    );

    if (highlightsWithImages.length <= 1) return;

    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % highlightsWithImages.length);
    }, 3000); // Change image every 3 second

    return () => clearInterval(interval);
  }, [highlightsExpanded, selectedPackage?.highlights, isCarouselPaused]);

  // Reset carousel when popup opens/closes
  useEffect(() => {
    if (!highlightsExpanded) {
      setCarouselIndex(0);
      setIsCarouselPaused(false);
    }
  }, [highlightsExpanded]);

  
  useReservationCatalogSubscriptions({
    db,
    debug: DEBUG,
    setTourPackages,
    setIsLoadingPackages,
    setPaymentTerms,
  });

  useReservationTourSelectionState({
    db,
    email,
    tourPackage,
    tourPackages,
    isLoadingPackages,
    paymentDocId,
    tourDate,
    setPaymentDocId,
    replaceWithPaymentId,
    setTourPackage,
    setTourDates,
    setTourDate,
  });

  const {
    availablePaymentTerm,
    selectedTourPrice,
    availablePaymentPlans,
    selectedPaymentPlanLabel,
    allPlansSelected,
    handleSelectPaymentPlanForActiveTraveler,
  } = useReservationPaymentPlanning({
    tourDate,
    selectedPackage,
    selectedDateDetail,
    numberOfPeople,
    depositAmount,
    paymentTerms,
    fetchedPaymentPlanLabel,
    selectedPaymentPlan,
    paymentPlans,
    activePaymentTab,
    setPaymentPlans,
  });

  const { progressWidth, stepDescription } = useReservationStepPresentation({
    step,
    selectedPackage,
    bookingType,
    depositAmount,
    baseReservationFee,
    numberOfPeople,
    availablePaymentTerm,
    tourDate,
    availablePaymentPlansCount: availablePaymentPlans.length,
  });

  const { validate, isFieldValid, isStep1ContinueDisabled } =
    useReservationValidation({
      email,
      firstName,
      lastName,
      birthdate,
      nationality,
      whatsAppNumber,
      whatsAppCountry,
      bookingType,
      groupSize,
      tourPackage,
      tourDate,
      guestDetails,
      isCreatingPayment,
      setErrors,
      setActiveGuestTab,
      safeGetCountryCallingCodeFn: safeGetCountryCallingCode,
      isValidPhoneNumberFn: isValidPhoneNumber,
    });

  // shared field classes with enhanced styling
  const fieldBase =
    "mt-1 block w-full px-4 py-3 rounded-lg bg-input text-foreground placeholder:text-muted-foreground/60 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:bg-muted/40 disabled:cursor-not-allowed disabled:text-muted-foreground";
  const fieldBorder = (err?: boolean) =>
    `border-2 ${err ? "border-destructive" : "border-border"}`;
  const fieldFocus =
    "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md hover:border-primary/50 disabled:focus:outline-none disabled:focus:ring-0 disabled:hover:border-primary/50 disabled:hover:shadow-sm";
  const fieldWithIcon = "pl-11";

  // Get all nationalities from world-countries library
  const nationalityOptions = getNationalityOptions();

  const bookingTypeOptions = [
    { label: "Single Booking", value: "Single Booking" },
    { label: "Duo Booking", value: "Duo Booking" },
    { label: "Group Booking", value: "Group Booking" },
  ];

  const tourDateOptions = (tourDates ?? []).map((d: string) => {
    const daysBetween = calculateDaysBetween(d);
    const isInvalid = daysBetween < 2;

    const dateObj = new Date(d);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return {
      label: formattedDate,
      value: d,
      disabled: isInvalid,
      description: isInvalid
        ? "Too soon! Please choose a date at least 2 days from today"
        : undefined,
    };
  });

  const { handlePaymentSuccess } = usePaymentSuccessFlow({
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
    selectedPackageName: selectedPackage?.name || "",
    selectedPackageDeposit: (selectedPackage as any)?.deposit || 0,
    completedSteps,
    setCompletedSteps,
    setPaymentConfirmed,
    setBookingId,
  });

  useSessionRestore({
    db,
    searchParams,
    debug: DEBUG,
    replaceWithPaymentId,
    safeGetCountryCallingCode,
    customerSlice: {
      setEmail,
      setFirstName,
      setLastName,
      setBirthdate,
      setNationality,
      setWhatsAppCountry: (value) => setWhatsAppCountry(value),
      setWhatsAppNumber,
    },
    bookingSlice: {
      setBookingType,
      setGroupSize,
      setAdditionalGuests,
      setTourPackage,
      setTourDate,
      setFetchedPaymentPlanLabel,
      setSelectedPaymentPlan,
    },
    uiSlice: {
      setSessionLoading,
      setGuestsMounted,
      setGuestsHeight,
      guestsContentRef,
    },
    flowSlice: {
      setPaymentDocId,
      setPaymentConfirmed,
      setBookingConfirmed,
      setBookingId,
      setStep,
      setCompletedSteps,
    },
  });

  
  useReservationUiEffects({
    tourPackage,
    showTourModal,
    setDateMounted,
    setDateVisible,
    setTourDate,
    setErrors,
  });

  useReservationPaymentVerification({
    paymentConfirmed,
    step,
    setPaymentConfirmed,
    setCompletedSteps,
  });

  const {
    animateHeight,
    handleBookingTypeChange,
    handleGroupSizeChange,
    handleGuestDetailsUpdate,
  } = useReservationGuestUiController({
    bookingType,
    setBookingType,
    groupSize,
    setGroupSize,
    additionalGuests,
    setAdditionalGuests,
    guestDetails,
    setGuestDetails,
    activeGuestTab,
    setActiveGuestTab,
    guestsMounted,
    setGuestsMounted,
    guestsWrapRef,
    guestsContentRef,
    setGuestsHeight,
    ANIM_DURATION,
  });

  const step1SectionProps = useStep1SectionProps({
    step,
    paymentConfirmed,
    clearing,
    isLoadingPackages,
    selectedPackage,
    highlightsExpanded,
    carouselIndex,
    dateVisible,
    dateMounted,
    tourPackage,
    tourDate,
    errors,
    bookingType,
    groupSize,
    activeGuestTab,
    guestDetails,
    email,
    birthdate,
    firstName,
    lastName,
    nationality,
    whatsAppCountry,
    whatsAppNumber,
    tourDateOptions,
    bookingTypeOptions,
    nationalityOptions,
    fieldBase,
    fieldWithIcon,
    fieldFocus,
    fieldBorder,
    isFieldValid,
    setShowTourModal,
    setHighlightsExpanded,
    setIsCarouselPaused,
    setCarouselIndex,
    setTourDate,
    handleBookingTypeChange,
    handleGroupSizeChange,
    setActiveGuestTab,
    setEmail,
    setBirthdate,
    setFirstName,
    setLastName,
    setNationality,
    setWhatsAppCountry,
    setWhatsAppNumber,
    setErrors,
    handleGuestDetailsUpdate,
    getCountryData,
    safeGetCountryCallingCode,
  });

  useReservationGuestPersistence({
    db,
    bookingType,
    additionalGuests,
    email,
    tourPackage,
    sessionRestoredRef,
    setAdditionalGuests,
    paymentDocId,
    guestDetails,
    setGuestDetails,
    setGroupSize,
    paymentPlans,
    setPaymentPlans,
    step,
    selectedDateDetail,
    selectedPackage,
    depositAmount,
    safeGetCountryCallingCode,
  });

  const { checkExistingPaymentsAndMaybeProceed } = useExistingPaymentCheck({
    db,
    email,
    selectedPackageName: selectedPackage?.name || "",
    tourDate,
    replaceWithPaymentId,
    serverTimestampValue: serverTimestamp(),
    formSlice: {
      validate,
      isCreatingPayment,
      getReservationDraftPayload,
      createPlaceholder,
    },
    flowSlice: {
      paymentDocId,
      completedSteps,
      setCompletedSteps,
      setStep,
    },
    uiSlice: {
      setIsCreatingPayment,
      setModalLoading,
      setFoundStripePayments,
      setShowEmailModal,
    },
  });
  const { handleConfirmBooking } = useConfirmBookingFlow({
    db,
    isLastMinute: availablePaymentTerm.isLastMinute,
    allPlansSelected,
    numberOfPeople,
    paymentPlans,
    availablePaymentPlans,
    bookingId,
    paymentDocId,
    email,
    tourPackage,
    setConfirmingBooking,
    setFetchedPaymentPlanLabel,
    setBookingConfirmed,
  });

  const stepFooterActionsProps = useStepFooterActionsProps({
    step,
    bookingConfirmed,
    paymentConfirmed,
    confirmingBooking,
    completedSteps,
    setCompletedSteps,
    setStep,
    setClearing,
    guestsWrapRef,
    animateHeight,
    setGuestsHeight,
    setGuestsMounted,
    setDateVisible,
    setEmail,
    setFirstName,
    setLastName,
    setBirthdate,
    setNationality,
    setBookingType,
    setTourPackage,
    setTourDate,
    setAdditionalGuests,
    setGroupSize,
    setErrors,
    ANIM_DURATION,
    checkExistingPaymentsAndMaybeProceed,
    isCreatingPayment,
    isStep1ContinueDisabled,
    email,
    birthdate,
    firstName,
    lastName,
    whatsAppNumber,
    whatsAppCountry,
    nationality,
    bookingType,
    tourPackage,
    tourDate,
    groupSize,
    guestDetails,
    safeGetCountryCallingCodeFn: safeGetCountryCallingCode,
    isValidPhoneNumberFn: isValidPhoneNumber,
    handleConfirmBooking,
    availablePaymentTerm,
    allPlansSelected,
    bookingId: bookingId || "PENDING",
    selectedPackage,
    selectedDateDetail,
    depositAmount,
    numberOfPeople,
    selectedPaymentPlanLabel,
  });

  return (
    <div
      className={`min-h-screen bg-background relative theme-transition`}
      style={{
        overflow: showTourModal ? "hidden" : "auto",
      }}
    >
      {/* Theme Toggle Button */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Email-check modal shown when existing stripePayments are found for this email */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {getExistingPaymentModalTitle(foundStripePayments)}
            </DialogTitle>
          </DialogHeader>

          {modalLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-sm text-muted-foreground">
                Checking for existing reservations...
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status-based messaging */}
              {foundStripePayments.length > 0 &&
                getPaymentStatus(foundStripePayments[0]) === "reserve_paid" &&
                !foundStripePayments[0]?._hasPaymentPlan && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg
                        className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="flex-1">
                        <h5 className="font-semibold text-blue-900 dark:text-blue-100">
                          Payment Complete - Select Your Payment Plan
                        </h5>
                        <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                          You've already paid the reservation fee. Please
                          complete your booking by selecting a payment plan.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {foundStripePayments.length > 0 &&
                shouldShowPendingReservationMessage(foundStripePayments) && (
                  <p className="text-sm text-muted-foreground">
                    We found {foundStripePayments.length} pending reservation
                    {foundStripePayments.length !== 1 ? "s" : ""} for this tour.
                    You can continue with an existing reservation or start
                    fresh.
                  </p>
                )}

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {foundStripePayments.map((rec) => {
                  const status = getPaymentStatus(rec);
                  const isPaidReservation = isPaidOrConfirmedStatus(status);
                  const displayState = getExistingPaymentDisplayState(rec);
                  const tourName =
                    rec?.tour?.packageName ||
                    rec?.tourPackageName ||
                    "Unknown Tour";
                  const tourDate =
                    rec?.tour?.date || rec?.tourDate || "No date set";
                  const amount = rec?.payment?.amount || rec?.amountGBP || 0;
                  const paymentType = rec?.payment?.type || "reservationFee";
                  const installmentTerm = rec?.payment?.installmentTerm;
                  const createdAt = rec?.timestamps?.createdAt;
                  let createdDate = "Unknown date";
                  if (createdAt && typeof createdAt.toDate === "function") {
                    createdDate = createdAt.toDate().toLocaleDateString();
                  }

                  // Determine payment type label
                  let paymentLabel = "Reservation Fee";
                  if (paymentType === "installment") {
                    if (installmentTerm === "full_payment") {
                      paymentLabel = "Full Payment";
                    } else if (installmentTerm) {
                      paymentLabel = `${installmentTerm.toUpperCase()} Installment`;
                    } else {
                      paymentLabel = "Installment";
                    }
                  }

                  return (
                    <div
                      key={rec.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{tourName}</h4>
                          <p className="text-sm text-muted-foreground">
                            Tour Date: {tourDate}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created: {createdDate}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full shrink-0 ${
                            displayState === "confirmed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : displayState === "awaiting-plan"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                          }`}
                        >
                          {displayState === "confirmed"
                            ? "Confirmed"
                            : displayState === "awaiting-plan"
                              ? "Awaiting Plan"
                              : "Pending Payment"}
                        </span>
                      </div>

                      <p className="text-sm">
                        {paymentLabel}: £{amount.toFixed(2)}
                      </p>

                      <div className="flex gap-2">
                        {isPaidReservation ? (
                          <button
                            onClick={() => handleReuseExisting(rec)}
                            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition font-medium"
                          >
                            {getExistingPaymentPrimaryActionLabel(rec)}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleReuseExisting(rec)}
                              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition"
                              disabled={isCreatingPayment}
                            >
                              {isCreatingPayment
                                ? "Processing..."
                                : getExistingPaymentPrimaryActionLabel(rec)}
                            </button>
                            {canDiscardExistingPayment(status) && (
                              <button
                                onClick={() =>
                                  handleDiscardExisting(rec.id, status)
                                }
                                className="flex-1 px-4 py-2 border border-destructive text-destructive rounded-md hover:bg-destructive/10 transition"
                                disabled={isCreatingPayment}
                              >
                                Discard This
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add "Create New Reservation" button for different tours */}
              <div className="pt-4 border-t">
                <button
                  onClick={async () => {
                    setShowEmailModal(false);
                    setIsCreatingPayment(true);
                    const id = await createPlaceholder();
                    if (!completedSteps.includes(1)) {
                      setCompletedSteps([...completedSteps, 1]);
                    }
                    if (id) {
                      try {
                        replaceWithPaymentId(id);
                      } catch (err) {
                        console.debug(
                          "Failed to set paymentid query param:",
                          err,
                        );
                      }
                    }
                    setStep(2);
                    setIsCreatingPayment(false);
                  }}
                  className="w-full px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10 transition"
                  disabled={isCreatingPayment}
                >
                  {isCreatingPayment
                    ? "Creating..."
                    : "Create New Reservation Instead"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div
        className="relative z-10 w-full min-h-screen text-card-foreground px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10"
        aria-labelledby="reservation-form-title"
      >
        {sessionLoading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
              {/* <p className="mt-3 text-sm text-foreground/90">Restoring your reservation…</p> */}
            </div>
          </div>
        )}
        {/* assistive live region to announce tour date visibility changes */}
        <div aria-live="polite" className="sr-only">
          {dateVisible ? "Tour date shown" : "Tour date hidden"}
        </div>

        {/* Max-width container for better readability on larger screens */}
        <div className="max-w-4xl mx-auto">
          {/* ImHereTravels Logo - Top Left */}
          <div className="mb-8">
            <img
              src="/logos/Digital_Horizontal_Red.svg"
              alt="ImHereTravels Logo"
              className="h-10 sm:h-12 md:h-14 w-auto object-contain"
            />
          </div>

          {/* Progress tracker placeholder for Steps 1-3 (static; wire later) */}
          <div className="mb-2">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h2
                  id="reservation-form-title"
                  className="text-2xl sm:text-3xl font-hk-grotesk font-bold text-foreground mb-2"
                >
                  Reserve your tour spot
                </h2>
                <p className="text-sm sm:text-base text-foreground/80 mb-1 leading-relaxed font-medium">
                  Choose your tour name and date, pay the down payment, then
                  complete your payment plan to secure your spot.
                </p>
                <p className="text-xs text-foreground/70 flex items-center gap-1.5 font-medium">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Takes about 3-5 minutes
                </p>
              </div>
            </div>

            <div className="relative w-full bg-muted/30 backdrop-blur-sm rounded-full h-3 overflow-hidden shadow-inner border border-border/50">
              <div
                className={`h-full bg-gradient-to-r from-primary via-crimson-red to-spring-green rounded-full transition-all duration-500 ease-out shadow-lg relative ${progressWidth}`}
              >
                <div className="absolute inset-0 bg-white/10 dark:bg-white/5 animate-pulse rounded-full"></div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  // Only clear payment confirmation if no paymentid in URL
                  if (typeof window !== "undefined") {
                    const params = new URLSearchParams(window.location.search);
                    const pid = params.get("paymentid");
                    if (!pid) {
                      setPaymentConfirmed(false);
                    }
                  }
                }}
                className="flex items-center gap-1.5 sm:gap-2 transition-all duration-200 hover:opacity-80 cursor-pointer group"
              >
                <div
                  className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                    step === 1
                      ? "bg-gradient-to-br from-primary to-crimson-red text-primary-foreground shadow-lg scale-110 ring-2 ring-primary/30"
                      : completedSteps.includes(1)
                        ? "bg-green-500/20 text-green-600 dark:text-green-400 shadow-md group-hover:scale-105 ring-2 ring-green-500/30"
                        : "bg-muted text-foreground group-hover:scale-105"
                  }`}
                >
                  {completedSteps.includes(1) && step !== 1 ? (
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    "1"
                  )}
                </div>
                <div
                  className={`hidden sm:block font-semibold ${
                    step === 1 ? "text-foreground" : "text-foreground/70"
                  }`}
                >
                  Personal & Booking
                </div>
                <div
                  className={`sm:hidden font-semibold ${
                    step === 1 ? "text-foreground" : "text-foreground/70"
                  }`}
                >
                  Personal
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  // If step 1 is complete and we're not already on step 2, allow navigation
                  if (
                    completedSteps.includes(1) &&
                    !completedSteps.includes(2)
                  ) {
                    // New booking - trigger the existing reservation check
                    checkExistingPaymentsAndMaybeProceed();
                  } else if (completedSteps.includes(2) && step !== 2) {
                    // Already have a payment - allow direct navigation
                    setStep(2);
                  }
                }}
                disabled={!completedSteps.includes(1)}
                className={`flex items-center gap-1.5 sm:gap-2 transition-all duration-200 group ${
                  !completedSteps.includes(1)
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:opacity-80 cursor-pointer"
                }`}
              >
                <div
                  className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                    step === 2
                      ? "bg-gradient-to-br from-primary to-crimson-red text-primary-foreground shadow-lg scale-110 ring-2 ring-primary/30"
                      : completedSteps.includes(2)
                        ? "bg-white text-green-600 shadow-md group-hover:scale-105 ring-2 ring-green-500/30"
                        : step === 1
                          ? "bg-muted/50 text-muted-foreground"
                          : "bg-muted text-foreground group-hover:scale-105"
                  }`}
                >
                  {completedSteps.includes(2) && step !== 2 ? (
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    "2"
                  )}
                </div>
                <div
                  className={`font-semibold ${
                    step === 2 ? "text-foreground" : "text-foreground/70"
                  }`}
                >
                  Payment
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (paymentConfirmed) setStep(3);
                }}
                disabled={!paymentConfirmed}
                className={`flex items-center gap-1.5 sm:gap-2 transition-all duration-200 group ${
                  !paymentConfirmed
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:opacity-80 cursor-pointer"
                }`}
              >
                <div
                  className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                    step === 3
                      ? "bg-gradient-to-br from-[#EF3340] to-[#FF8200] text-white shadow-lg scale-110 ring-2 ring-[#EF3340]/30"
                      : !paymentConfirmed
                        ? "bg-[#1C1F2A]/10 dark:bg-muted/50 text-[#1C1F2A]/40 dark:text-muted-foreground"
                        : "bg-[#1C1F2A]/15 dark:bg-muted text-[#1C1F2A] dark:text-foreground group-hover:scale-105"
                  }`}
                >
                  3
                </div>
                <div
                  className={`hidden sm:block font-semibold ${
                    step === 3 ? "text-foreground" : "text-foreground/70"
                  }`}
                >
                  Payment plan
                </div>
                <div
                  className={`sm:hidden font-semibold ${
                    step === 3 ? "text-foreground" : "text-foreground/70"
                  }`}
                >
                  Plan
                </div>
              </button>
            </div>

            {/* How it works Card */}
            <div className="mt-6 rounded-2xl bg-card border border-sunglow-yellow/20 dark:border-crimson-red/30 shadow-lg dark:shadow-xl overflow-hidden transition-all duration-300 hover:border-crimson-red hover:shadow-crimson-red/20 hover:shadow-xl">
              <button
                onClick={() => setHowItWorksExpanded(!howItWorksExpanded)}
                className="w-full p-6 flex items-center gap-4 hover:bg-muted/50 dark:hover:bg-white/5 transition-colors duration-200"
              >
                <div className="p-3 rounded-xl bg-crimson-red/10 flex-shrink-0 shadow-sm">
                  <svg
                    className="w-5 h-5 text-crimson-red"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-bold text-foreground text-lg">
                    How it works
                  </h4>
                  <AnimatePresence mode="wait">
                    {!howItWorksExpanded && (
                      <motion.p
                        key="subtitle"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-sm text-foreground/70 font-medium mt-0.5"
                      >
                        {stepDescription}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <motion.svg
                  animate={{ rotate: howItWorksExpanded ? 180 : 0 }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                  className="w-5 h-5 text-foreground/70 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </motion.svg>
              </button>

              {/* Collapsible content */}
              <AnimatePresence initial={false}>
                {howItWorksExpanded && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    <motion.div
                      initial={{ y: -20 }}
                      animate={{ y: 0 }}
                      exit={{ y: -20 }}
                      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      className="px-6 pb-6 pt-2"
                    >
                      <ul className="text-sm text-foreground/90 space-y-2.5">
                        {[
                          "Fill in your personal details and select your tour name",
                          "Pay a small reservation fee to secure your spot",
                          "Pick a payment plan from a list of available options for your tour date",
                        ].map((text, idx) => (
                          <motion.li
                            key={idx}
                            initial={{ x: -20, opacity: 0, scale: 0.95 }}
                            animate={{ x: 0, opacity: 1, scale: 1 }}
                            exit={{ x: -20, opacity: 0, scale: 0.95 }}
                            transition={{
                              duration: 0.4,
                              delay: idx * 0.1,
                              ease: [0.4, 0, 0.2, 1],
                            }}
                            className="flex items-center gap-3"
                          >
                            <motion.span
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: -180 }}
                              transition={{
                                duration: 0.5,
                                delay: idx * 0.1 + 0.1,
                                ease: [0.68, -0.55, 0.265, 1.55],
                              }}
                              className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-crimson-red to-crimson-red/90 text-white text-xs font-bold flex items-center justify-center shadow-sm"
                            >
                              {idx + 1}
                            </motion.span>
                            <span className="text-foreground/90">{text}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-6">
            <Step1PersonalReservationSection {...step1SectionProps} />

            {/* STEP 2 - PAYMENT */}
            {step === 2 && (
              <div className="rounded-2xl bg-card p-6 sm:p-8 border border-sunglow-yellow/20 dark:border-crimson-red/30 shadow-lg dark:shadow-xl transition-all duration-300 hover:border-crimson-red hover:shadow-crimson-red/20 hover:shadow-xl">
                <Step2PaymentHeader />

                <Step2PaymentStatePanel
                  tourPackage={tourPackage}
                  paymentConfirmed={paymentConfirmed}
                  step2Processing={step2Processing}
                >
                  <Step2ReservationSummaryCard
                    bookingType={bookingType}
                    tourPackage={tourPackage}
                    tourPackages={tourPackages}
                    numberOfPeople={numberOfPeople}
                    baseReservationFee={baseReservationFee}
                    depositAmount={depositAmount}
                  />

                  <StripePayment
                    tourPackageId={tourPackage}
                    tourPackageName={selectedPackage?.name || ""}
                    email={email}
                    amountGBP={depositAmount}
                    bookingId={bookingId || "PENDING"}
                    paymentDocId={paymentDocId}
                    bookingType={bookingType}
                    numberOfGuests={numberOfPeople}
                    onSuccess={(pid, docId) => {
                      handlePaymentSuccess(pid, docId);
                    }}
                    onError={() => {}}
                    onProcessingChange={(p) => setStep2Processing(p)}
                  />
                </Step2PaymentStatePanel>
              </div>
            )}
            {/* STEP 3 - PAYMENT PLAN */}
            {(step as number) === 3 && (
              <div className="rounded-lg bg-card/80 backdrop-blur-md p-4 sm:p-6 border border-border shadow-xl space-y-6">
                <Step3ReservationConfirmedBanner bookingId={bookingId} />

                <Step3PaymentPlanSelectorCard
                  activePaymentTab={activePaymentTab}
                  onActivePaymentTabChange={setActivePaymentTab}
                  paymentPlans={paymentPlans}
                  guestDetails={guestDetails}
                  selectedTourPrice={selectedTourPrice}
                  depositAmount={depositAmount}
                  numberOfPeople={numberOfPeople}
                  availablePaymentTerm={availablePaymentTerm}
                  availablePaymentPlans={availablePaymentPlans}
                  onSelectPaymentPlanForActiveTraveler={
                    handleSelectPaymentPlanForActiveTraveler
                  }
                />
              </div>
            )}

            {/* Step footer actions */}
            <StepFooterActionsSection {...stepFooterActionsProps} />
            
          </div>
        </div>
      </div>

      {/* Tour Selection Modal */}
      <TourSelectionModal
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
        tourPackages={tourPackages}
        isLoadingPackages={isLoadingPackages}
        selectedTourId={tourPackage}
        onSelectTour={setTourPackage}
        isTourAllDatesTooSoon={isTourAllDatesTooSoon}
      />
    </div>
  );
};

export default function ReservationBookingFormPage() {
  return (
    <>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }
      >
        <Page />
      </Suspense>
    </>
  );
}















