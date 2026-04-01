import { useEffect } from "react";

type UseReservationPaymentIntentSyncOptions = {
  bookingType: string;
  groupSize: number;
  depositAmount: number;
  paymentDocId: string | null;
  selectedPackage: { name?: string } | undefined;
  numberOfPeople: number;
  step: number;
};

export const useReservationPaymentIntentSync = ({
  bookingType,
  groupSize,
  depositAmount,
  paymentDocId,
  selectedPackage,
  numberOfPeople,
  step,
}: UseReservationPaymentIntentSyncOptions) => {
  useEffect(() => {
    const updatePaymentIntent = async () => {
      if (!paymentDocId || !selectedPackage || step !== 1) return;

      try {
        console.log("🔄 Updating payment intent due to booking changes:", {
          bookingType,
          numberOfPeople,
          depositAmount,
        });

        const response = await fetch("/api/stripe-payments/update-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentDocId,
            amountGBP: depositAmount,
            bookingType,
            numberOfGuests: numberOfPeople,
            tourPackageName: selectedPackage.name,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.cannotUpdate) {
            console.log(
              "ℹ️ Payment intent cannot be updated (already in terminal state)",
            );
          } else {
            console.error("Failed to update payment intent:", data.error);
          }
        } else {
          console.log("✅ Payment intent updated successfully");
        }
      } catch (error) {
        console.error("Error updating payment intent:", error);
      }
    };

    updatePaymentIntent();
  }, [
    bookingType,
    groupSize,
    depositAmount,
    paymentDocId,
    selectedPackage,
    step,
    numberOfPeople,
  ]);
};
