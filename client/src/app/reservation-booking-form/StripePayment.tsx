"use client";

import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useTheme } from "next-themes";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface PaymentFormProps {
  clientSecret: string;
  paymentDocId: string | null;
  onSuccess: (paymentIntentId?: string, paymentDocId?: string) => void;
  onError: (error: string) => void;
}

function PaymentForm({
  clientSecret,
  paymentDocId,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [declineCode, setDeclineCode] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe || !clientSecret) return;

    // Check payment status on mount (in case of page refresh)
    (async () => {
      try {
        const result = await stripe.retrievePaymentIntent(clientSecret);
        const { paymentIntent } = result as any;
        console.debug("Stripe retrievePaymentIntent:", paymentIntent);
        if (!paymentIntent) return;

        if (paymentIntent.status === "succeeded") {
          const amountReceived = (paymentIntent as any).amount_received ?? 0;
          if (amountReceived > 0) {
            setMessage("Payment succeeded!");
            onSuccess(paymentIntent.id, paymentDocId || undefined);
          } else {
            // succeeded but no recorded amount - show a neutral message
            console.warn(
              "PaymentIntent succeeded but amount_received is 0",
              paymentIntent
            );
            setMessage(
              "Payment completed (pending verification). Please wait..."
            );
          }
          return;
        }

        if (paymentIntent.status === "processing") {
          setMessage("Your payment is processing.");
          return;
        }

        if (paymentIntent.status === "requires_payment_method") {
          if (paymentIntent.last_payment_error) {
            setPaymentFailed(true);
            setDeclineCode(
              paymentIntent.last_payment_error.decline_code || null
            );
          }
        }
      } catch (err) {
        console.warn("retrievePaymentIntent error:", err);
      }
    })();
  }, [stripe, clientSecret, onSuccess]);

  const getErrorMessage = (error: any) => {
    const code = error.decline_code || error.code;

    switch (code) {
      case "card_declined":
      case "generic_decline":
        return "Your card was declined. Please try a different payment method.";
      case "insufficient_funds":
        return "Insufficient funds. Please try a different card.";
      case "fraudulent":
        return "This transaction has been flagged as potentially fraudulent. Please contact your bank or try a different payment method.";
      case "lost_card":
      case "stolen_card":
        return "This card has been reported as lost or stolen. Please use a different payment method.";
      case "expired_card":
        return "Your card has expired. Please use a different card.";
      case "incorrect_cvc":
        return "Incorrect security code. Please check and try again.";
      case "processing_error":
        return "A processing error occurred. Please try again.";
      case "incorrect_number":
        return "Incorrect card number. Please check and try again.";
      default:
        return (
          error.message ??
          "Payment failed. Please try again with a different payment method."
        );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);
    setPaymentFailed(false);
    setDeclineCode(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      const errorMsg = getErrorMessage(error);
      setMessage(errorMsg);
      setPaymentFailed(true);
      setDeclineCode(error.decline_code || error.code || null);
      onError(errorMsg);
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      setMessage("Payment succeeded!");
      setPaymentFailed(false);
      onSuccess(paymentIntent.id, paymentDocId || undefined);
      setIsProcessing(false);
    } else if (
      paymentIntent &&
      paymentIntent.status === "requires_payment_method"
    ) {
      const errorMsg = "Payment failed. Please try a different payment method.";
      setMessage(errorMsg);
      setPaymentFailed(true);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        onLoadError={(error) => {
          console.error("Payment Element load error:", error);
          setMessage(
            "Unable to load payment form. Please refresh the page and try again."
          );
          onError("Payment form failed to load");
        }}
      />

      {message && (
        <div
          className={`text-sm p-3 rounded ${
            message.includes("succeeded")
              ? "bg-spring-green/10 text-spring-green border border-spring-green/30"
              : "bg-destructive/10 text-destructive border border-destructive/30"
          }`}
        >
          <div className="flex items-start gap-2">
            {!message.includes("succeeded") && (
              <svg
                className="h-5 w-5 flex-shrink-0 mt-0.5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <div className="flex-1">
              <p className="font-medium">{message}</p>
              {paymentFailed && declineCode === "fraudulent" && (
                <p className="text-xs mt-1 opacity-90">
                  For your security, this transaction has been blocked. Please
                  contact your bank for more information or use a different
                  payment method.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className={`w-full px-6 py-3 rounded-md font-medium transition ${
          !stripe || isProcessing
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-crimson-red text-white hover:brightness-95"
        }`}
      >
        {isProcessing
          ? "Processing..."
          : paymentFailed
          ? "Try again"
          : "Pay now"}
      </button>
    </form>
  );
}

interface StripePaymentProps {
  tourPackageId: string;
  tourPackageName: string;
  email: string;
  amountGBP: number;
  bookingId: string;
  paymentDocId?: string | null;
  onSuccess: (paymentIntentId?: string, paymentDocId?: string) => void;
}

export default function StripePayment({
  tourPackageId,
  tourPackageName,
  email,
  amountGBP,
  bookingId,
  paymentDocId: paymentDocIdProp,
  onSuccess,
}: StripePaymentProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentDocId, setPaymentDocId] = useState<string | null>(
    paymentDocIdProp ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (paymentDocIdProp) setPaymentDocId(paymentDocIdProp);
  }, [paymentDocIdProp]);

  const initializePayment = () => {
    setLoading(true);
    setError(null);

    // Generate a unique session key based on email and tour package (not bookingId which is still PENDING)
    const sessionKey = paymentDocId
      ? `stripe_payment_${email}_${tourPackageId}_${paymentDocId}`
      : `stripe_payment_${email}_${tourPackageId}`;

    // Check if we already have a payment session for this booking
    const existingSession = sessionStorage.getItem(sessionKey);
    if (existingSession) {
      try {
        const { clientSecret: savedSecret, paymentDocId: savedDocId } =
          JSON.parse(existingSession);
        console.log("♻️ Reusing existing payment session for", email);
        setClientSecret(savedSecret);
        setPaymentDocId(savedDocId);
        setLoading(false);
        return;
      } catch (e) {
        console.warn("Failed to parse existing session, creating new one");
        sessionStorage.removeItem(sessionKey);
      }
    }

    console.log("🆕 Creating new payment session for", email);
    fetch("/api/stripe-payments/init-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        tourPackage: tourPackageId,
        tourPackageName,
        amountGBP,
        paymentDocId,
        // Deliberately omit bookingId; it may change after payment and should not re-init
        meta: {
          source: "reservation-form",
          retryAttempt: retryCount,
        },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setLoading(false);
        } else {
          setClientSecret(data.clientSecret);
          setPaymentDocId(data.paymentDocId); // Store the Firestore document ID

          // Save to session storage to prevent duplicate payments on refresh
          sessionStorage.setItem(
            sessionKey,
            JSON.stringify({
              clientSecret: data.clientSecret,
              paymentDocId: data.paymentDocId,
            })
          );

          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    // Check if Stripe is configured
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setError(
        "Stripe is not configured. Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env.local file."
      );
      setLoading(false);
      return;
    }

    initializePayment();
  }, [tourPackageId, email, amountGBP, paymentDocId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !clientSecret) {
    return (
      <div className="space-y-3">
        <div className="bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md">
          <div className="flex items-start gap-2">
            <svg
              className="h-5 w-5 flex-shrink-0 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <p className="font-medium">Payment initialization failed</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setRetryCount(retryCount + 1);
            initializePayment();
          }}
          className="w-full px-6 py-3 rounded-md font-medium bg-crimson-red text-white hover:brightness-95 transition"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="bg-muted/10 text-muted-foreground border border-muted/30 p-4 rounded-md">
        <p>Unable to initialize payment. Please try again.</p>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="bg-destructive/10 text-destructive border border-destructive/30 p-4 rounded-md">
        <p className="font-medium">Stripe configuration error</p>
        <p className="text-sm mt-1">Please contact support.</p>
      </div>
    );
  }

  // Determine if dark mode is active
  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");

  const options = {
    clientSecret,
    appearance: {
      theme: (isDark ? "night" : "stripe") as "night" | "stripe",
      variables: {
        colorPrimary: "#FF385C",
        colorBackground: isDark ? "#2a2a2a" : "#ffffff",
        colorText: isDark ? "#f5f5f5" : "#1a1a1a",
        colorDanger: "#df1b41",
        fontFamily: "system-ui, sans-serif",
        borderRadius: "6px",
        colorTextSecondary: isDark ? "#b3b3b3" : "#6b7280",
        colorTextPlaceholder: isDark ? "#737373" : "#9ca3af",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        clientSecret={clientSecret}
        paymentDocId={paymentDocId}
        onSuccess={onSuccess}
        onError={(err) => setError(err)}
      />
    </Elements>
  );
}
