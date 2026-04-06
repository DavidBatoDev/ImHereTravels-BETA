import type { Firestore } from "firebase/firestore";
import {
  findSelectedPlanDetails,
  getPaymentPlanId,
  getPaymentPlansToSend,
  getTravelerPaymentPlan,
  resolveBookingDocumentIds,
  type PaymentPlanOption,
  type PersonPaymentPlan,
} from "../utils/step3PaymentPlan";
import {
  buildStripePaymentDocSessionKey,
  buildStripePaymentSessionKey,
} from "../utils/sessionRestore";

type ConfirmBookingActionInput = {
  db: Firestore;
  paymentConfirmed: boolean;
  isLastMinute: boolean;
  allPlansSelected: boolean;
  numberOfPeople: number;
  paymentPlans: PersonPaymentPlan[];
  availablePaymentPlans: PaymentPlanOption[];
  bookingId: string;
  paymentDocId: string | null;
  email: string;
  tourPackage: string;
  setConfirmingBooking: (value: boolean) => void;
  setFetchedPaymentPlanLabel: (value: string) => void;
  setBookingConfirmed: (value: boolean) => void;
  onAlert: (message: string) => void;
  onError: (error: unknown) => void;
};

export const runConfirmBookingAction = async ({
  db,
  paymentConfirmed,
  isLastMinute,
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
  onAlert,
  onError,
}: ConfirmBookingActionInput): Promise<void> => {
  try {
    setConfirmingBooking(true);

    if (!paymentConfirmed) {
      onAlert("Please complete Step 2 payment before selecting a payment plan.");
      return;
    }

    if (!isLastMinute && !allPlansSelected) {
      onAlert("Please select a payment plan for all travelers to continue");
      return;
    }

    const paymentPlansToSend = getPaymentPlansToSend({
      isLastMinute,
      numberOfPeople,
      paymentPlans,
    });

    const firstPlan = paymentPlans[0];
    const selectedPlan = findSelectedPlanDetails(
      firstPlan?.plan,
      availablePaymentPlans,
    );

    const {
      collection,
      query,
      where,
      getDocs,
      doc: firestoreDoc,
      getDoc,
    } = await import("firebase/firestore");

    const paymentsRef = collection(db, "stripePayments");
    let q: any;

    if (bookingId) {
      q = query(paymentsRef, where("booking.id", "==", bookingId));
    } else if (!paymentDocId) {
      throw new Error(
        "No booking or payment document found. Please complete payment first.",
      );
    }

    const querySnapshot = bookingId
      ? await getDocs(q)
      : { empty: false, docs: [] as any[] };

    if (querySnapshot.empty && !paymentDocId) {
      throw new Error(
        "Payment document not found. Please complete payment first.",
      );
    }

    const paymentDocIdToUse =
      paymentDocId ||
      (querySnapshot.docs.length > 0 ? querySnapshot.docs[0].id : null);

    if (!paymentDocIdToUse) {
      throw new Error("Payment document ID not found");
    }

    const paymentDocSnap = await getDoc(
      firestoreDoc(db, "stripePayments", paymentDocIdToUse),
    );
    if (!paymentDocSnap.exists()) {
      throw new Error("Payment document not found in Firestore");
    }

    const paymentDocData = paymentDocSnap.data();
    const bookingDocumentIds = resolveBookingDocumentIds(paymentDocData);

    if (bookingDocumentIds.length === 0) {
      throw new Error(
        "Booking has not been created yet. Please wait a moment and try again.",
      );
    }

    let firstSuccessfulResult: any = null;
    for (let i = 0; i < bookingDocumentIds.length; i++) {
      const bookingDocumentId = bookingDocumentIds[i];
      const personPlan = getTravelerPaymentPlan(paymentPlansToSend, i);
      const paymentPlanId = getPaymentPlanId(personPlan);

      const response = await fetch("/api/stripe-payments/select-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingDocumentId,
          paymentPlanId,
          paymentPlanDetails: selectedPlan || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        onAlert(
          result.error || "Error confirming your booking. Please try again.",
        );
        return;
      }

      if (!firstSuccessfulResult) firstSuccessfulResult = result;
    }

    if (selectedPlan?.label) {
      setFetchedPaymentPlanLabel(selectedPlan.label);
    }

    try {
      const result = firstSuccessfulResult;
      const mainBookingDocumentId =
        result?.bookingDocumentId || bookingDocumentIds[0];
      await fetch("/api/send-booking-status-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingDocumentId: mainBookingDocumentId,
          email,
        }),
      });
    } catch {
      // Preserve behavior: email failure does not block confirmation.
    }

    try {
      const docSessionKey = buildStripePaymentDocSessionKey(email, tourPackage);
      sessionStorage.removeItem(docSessionKey);
      const sessionKey = buildStripePaymentSessionKey(email, tourPackage);
      sessionStorage.removeItem(sessionKey);
    } catch {
      // Ignore cleanup failures.
    }

    setBookingConfirmed(true);
  } catch (error) {
    onError(error);
    onAlert(
      "An error occurred while confirming your booking. Please try again.",
    );
  } finally {
    setConfirmingBooking(false);
  }
};
