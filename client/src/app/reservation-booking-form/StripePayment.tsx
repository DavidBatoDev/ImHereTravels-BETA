// StripePayment.tsx - Updated version
"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  onSuccess?: (paymentIntentId?: string, paymentDocId?: string) => void;
  onPaymentSuccess?: (paymentDocId: string) => void;
  onError: (error: string) => void;
  onProcessingChange?: (processing: boolean) => void;
  isGuestBooking?: boolean;
}

function PaymentForm({
  clientSecret,
  paymentDocId,
  onSuccess,
  onPaymentSuccess,
  onError,
  onProcessingChange,
  isGuestBooking = false,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [declineCode, setDeclineCode] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalStatus, setModalStatus] = useState<
    "processing" | "success" | "error" | "3ds" | "verifying"
  >("processing");
  const [modalMessage, setModalMessage] = useState("");
  const [modalDetail, setModalDetail] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!stripe || !clientSecret) return;

    // Check payment status on mount (in case of page refresh)
    // NOTE: We only check status for display purposes, not to trigger callbacks
    (async () => {
      try {
        const result = await stripe.retrievePaymentIntent(clientSecret);
        const { paymentIntent } = result as any;
        console.debug("Stripe retrievePaymentIntent:", paymentIntent);
        if (!paymentIntent) return;

        // Only show status messages, don't trigger success callbacks on refresh
        if (paymentIntent.status === "succeeded") {
          // Payment already completed - don't show anything, form should be hidden by parent
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

        // For any other status, clear stale UI state
        setMessage(null);
        setPaymentFailed(false);
        setDeclineCode(null);
      } catch (err) {
        console.warn("retrievePaymentIntent error:", err);
      }
    })();
  }, [stripe, clientSecret]);

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
    onProcessingChange?.(true);
    setMessage(null);
    setPaymentFailed(false);
    setDeclineCode(null);

    // Show modal with processing state
    setShowModal(true);
    setModalStatus("processing");
    setModalMessage("Processing your payment...");
    setModalDetail("Please wait while we securely process your transaction.");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      const errorMsg = getErrorMessage(error);
      setMessage(errorMsg);
      setPaymentFailed(true);
      setDeclineCode(error.decline_code || error.code || null);

      // Update modal with error state
      setModalStatus("error");
      setModalMessage("Payment failed");
      setModalDetail(errorMsg);

      // Auto-close modal after 4 seconds for errors
      setTimeout(() => {
        setShowModal(false);
        onError(errorMsg);
      }, 4000);

      setIsProcessing(false);
      onProcessingChange?.(false);
    } else if (paymentIntent) {
      // Handle all possible payment intent statuses
      switch (paymentIntent.status) {
        case "succeeded":
          setMessage("Payment succeeded!");
          setPaymentFailed(false);

          // Update modal with success state
          setModalStatus("success");
          setModalMessage("Payment successful!");
          setModalDetail(
            "Your reservation fee has been processed. Securing your spot..."
          );

          // Keep modal open briefly before calling success
          setTimeout(() => {
            if (isGuestBooking && onPaymentSuccess && paymentDocId) {
              onPaymentSuccess(paymentDocId);
            } else if (onSuccess) {
              onSuccess(paymentIntent.id, paymentDocId || undefined);
            }
            setIsProcessing(false);
            onProcessingChange?.(false);
            setShowModal(false);
          }, 2000);
          break;

        case "processing":
          // Payment is being processed asynchronously - keep user waiting
          const processingMsg =
            "Your payment is being processed. This may take a few moments...";
          setMessage(processingMsg);
          setPaymentFailed(false);

          // Update modal with verifying state
          setModalStatus("verifying");
          setModalMessage("Payment received");
          setModalDetail(
            "We're verifying your payment with your bank. This may take a few moments..."
          );

          // Don't call onError for processing state - it's not an error
          // Keep processing indicator active
          break;

        case "requires_payment_method":
          const requiresPaymentMsg =
            "Payment failed. Please try a different payment method.";
          setMessage(requiresPaymentMsg);
          setPaymentFailed(true);

          // Update modal with error state
          setModalStatus("error");
          setModalMessage("Payment declined");
          setModalDetail(requiresPaymentMsg);

          // Auto-close modal after 4 seconds
          setTimeout(() => {
            setShowModal(false);
            setMessage(null);
            onError(requiresPaymentMsg);
          }, 4000);

          setIsProcessing(false);
          onProcessingChange?.(false);
          break;

        case "requires_action":
          // Additional authentication needed (e.g., 3D Secure)
          const requiresActionMsg =
            "Additional verification required. Please complete the authentication.";
          setMessage(requiresActionMsg);
          setPaymentFailed(false);

          // Update modal with 3DS state
          setModalStatus("3ds");
          setModalMessage("Additional verification needed");
          setModalDetail(
            "Please complete the authentication in the popup window to proceed."
          );

          // Don't call onError - this is a pending state that needs user action
          setIsProcessing(false);
          onProcessingChange?.(false);
          break;

        case "requires_confirmation":
        case "requires_capture":
        case "canceled":
        case "incomplete":
        default:
          const defaultMsg = `Payment incomplete (status: ${paymentIntent.status}). Please try again.`;
          setMessage(defaultMsg);
          setPaymentFailed(true);

          // Update modal with error state
          setModalStatus("error");
          setModalMessage("Payment incomplete");
          setModalDetail(defaultMsg);

          // Auto-close modal after 4 seconds
          setTimeout(() => {
            setShowModal(false);
            setMessage(null);
            onError(defaultMsg);
          }, 4000);

          setIsProcessing(false);
          onProcessingChange?.(false);
          break;
      }
    } else {
      // No error and no paymentIntent - something went wrong
      const unknownMsg =
        "Payment status unknown. Please verify your payment before continuing.";
      setMessage(unknownMsg);
      setPaymentFailed(true);

      // Update modal with error state
      setModalStatus("error");
      setModalMessage("Unknown error");
      setModalDetail(unknownMsg);

      // Auto-close modal after 4 seconds
      setTimeout(() => {
        setShowModal(false);
        setMessage(null);
        onError(unknownMsg);
      }, 4000);

      setIsProcessing(false);
      onProcessingChange?.(false);
    }
  };

  // Modal icon and color based on status
  const getModalIcon = () => {
    switch (modalStatus) {
      case "success":
        return (
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-500 mx-auto mb-4 animate-scale-in">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-500 mx-auto mb-4 animate-shake">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        );
      case "3ds":
        return (
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-500 mx-auto mb-4">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        );
      case "verifying":
        return (
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-yellow-500 mx-auto mb-4">
            <svg
              className="h-8 w-8 text-white animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
      case "processing":
      default:
        return (
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary mx-auto mb-4">
            <svg
              className="h-8 w-8 text-white animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        );
    }
  };

  return (
    <>
      {/* Payment Modal - Rendered via Portal to ensure proper positioning */}
      {showModal &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 animate-fade-in">
            <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-8 border border-border animate-slide-up">
              {getModalIcon()}
              <h3 className="text-2xl font-bold text-center text-foreground mb-2">
                {modalMessage}
              </h3>
              <p className="text-center text-muted-foreground mb-6">
                {modalDetail}
              </p>

              {modalStatus === "processing" && (
                <div className="flex items-center justify-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="h-2 w-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="h-2 w-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: "500ms" }}
                  ></div>
                </div>
              )}

              {(modalStatus === "error" || modalStatus === "3ds") && (
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full mt-4 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>,
          document.body
        )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement
          options={{
            layout: "tabs" as const,
          }}
          onLoadError={(error) => {
            console.error("Payment Element load error:", error);
            setMessage(
              "Unable to load payment form. Please refresh the page and try again."
            );
            onError("Payment form failed to load");
          }}
        />

        {message &&
          !showModal &&
          (!paymentFailed || modalStatus === "success") && (
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
                      For your security, this transaction has been blocked.
                      Please contact your bank for more information or use a
                      different payment method.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

        <button
          type="submit"
          disabled={
            !stripe ||
            isProcessing ||
            message ===
              "Payment completed (pending verification). Please wait..."
          }
          className={`w-full px-6 py-3 rounded-md font-medium transition ${
            !stripe ||
            isProcessing ||
            message ===
              "Payment completed (pending verification). Please wait..."
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
    </>
  );
}

interface StripePaymentProps {
  tourPackageId?: string;
  tourPackageName?: string;
  email?: string;
  amountGBP?: number;
  bookingId?: string;
  paymentDocId?: string | null;
  onSuccess?: (paymentIntentId?: string, paymentDocId?: string) => void;
  onPaymentSuccess?: (paymentDocId: string) => void;
  onPaymentDocIdCreated?: (paymentDocId: string) => void;
  onBack?: () => void;
  onError?: (message: string) => void;
  onProcessingChange?: (processing: boolean) => void;

  // Guest booking specific props
  isGuestBooking?: boolean;
  parentBookingId?: string;
  guestEmail?: string;
  guestData?: {
    firstName: string;
    lastName: string;
    birthdate: string;
    nationality: string;
    phoneNumber: string;
    dietaryRestrictions?: string;
  };
}

export default function StripePayment({
  tourPackageId,
  tourPackageName,
  email,
  amountGBP,
  bookingId,
  paymentDocId: paymentDocIdProp,
  onSuccess,
  onPaymentSuccess,
  onError,
  onPaymentDocIdCreated,
  onBack,
  onProcessingChange,
  isGuestBooking = false,
  parentBookingId,
  guestEmail,
  guestData,
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
  const initializingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (paymentDocIdProp) setPaymentDocId(paymentDocIdProp);
  }, [paymentDocIdProp]);

  // Generate a consistent session key
  const getSessionKey = () => {
    if (isGuestBooking && parentBookingId && guestEmail) {
      return `stripe_payment_guest_${parentBookingId}_${guestEmail}`;
    }
    if (paymentDocId) {
      return `stripe_payment_${email}_${tourPackageId}_${paymentDocId}`;
    }
    return `stripe_payment_${email}_${tourPackageId}`;
  };

  const initializePayment = async () => {
    // Prevent concurrent initialization (React Strict Mode runs effects twice)
    if (initializingRef.current) {
      console.log("⏭️ Payment initialization already in progress, skipping...");
      return;
    }

    initializingRef.current = true;
    setLoading(true);
    setError(null);

    const sessionKey = getSessionKey();

    // Check if we already have a valid payment session
    const existingSession = sessionStorage.getItem(sessionKey);
    if (existingSession) {
      try {
        const { clientSecret: savedSecret, paymentDocId: savedDocId } =
          JSON.parse(existingSession);

        // Verify the client secret is still valid and not in terminal state
        if (savedSecret && savedSecret.startsWith("pi_")) {
          console.log("🔍 Checking existing payment session status for", email);

          // Extract payment intent ID from client secret
          const paymentIntentId = savedSecret.split("_secret_")[0];

          try {
            // Verify the payment intent status
            const verifyRes = await fetch(
              `/api/stripe-payments/verify-payment?paymentIntentId=${paymentIntentId}`,
              { method: "GET" }
            );

            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              console.log("🔍 Payment intent status:", verifyData.status);

              // Only reuse if payment intent is in a non-terminal state
              if (
                verifyData.status === "requires_payment_method" ||
                verifyData.status === "requires_confirmation" ||
                verifyData.status === "requires_action"
              ) {
                console.log("♻️ Reusing existing payment session for", email);
                setClientSecret(savedSecret);
                setPaymentDocId(savedDocId);
                setLoading(false);
                initializingRef.current = false;
                return;
              } else {
                console.log(
                  "❌ Payment intent in terminal state:",
                  verifyData.status,
                  "- creating new session"
                );
                sessionStorage.removeItem(sessionKey);
              }
            } else {
              console.warn(
                "Failed to verify payment intent, creating new session"
              );
              sessionStorage.removeItem(sessionKey);
            }
          } catch (verifyErr) {
            console.warn(
              "Error verifying payment intent, creating new session:",
              verifyErr
            );
            sessionStorage.removeItem(sessionKey);
          }
        } else {
          console.warn("Invalid client secret in session storage");
          sessionStorage.removeItem(sessionKey);
        }
      } catch (e) {
        console.warn("Failed to parse existing session, creating new one");
        sessionStorage.removeItem(sessionKey);
      }
    }

    console.log(
      "🆕 Creating new payment session for",
      isGuestBooking ? guestEmail : email
    );

    // Prepare request body based on booking type
    const requestBody = isGuestBooking
      ? {
          email: guestEmail,
          tourPackage: tourPackageId,
          tourPackageName,
          amountGBP,
          paymentDocId,
          isGuestBooking: true,
          parentBookingId,
          guestData,
          meta: {
            source: "guest-reservation-form",
            retryAttempt: retryCount,
          },
        }
      : {
          email,
          tourPackage: tourPackageId,
          tourPackageName,
          amountGBP,
          paymentDocId,
          meta: {
            source: "reservation-form",
            retryAttempt: retryCount,
          },
        };

    fetch("/api/stripe-payments/init-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${res.status}`
          );
        }
        return res.json();
      })
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        } else {
          setClientSecret(data.clientSecret);
          setPaymentDocId(data.paymentDocId);

          // Notify parent component of the created payment doc ID
          if (onPaymentDocIdCreated && data.paymentDocId) {
            onPaymentDocIdCreated(data.paymentDocId);
          }

          // Save to session storage with consistent key
          sessionStorage.setItem(
            getSessionKey(),
            JSON.stringify({
              clientSecret: data.clientSecret,
              paymentDocId: data.paymentDocId,
            })
          );

          setError(null);
          setLoading(false);
          initializingRef.current = false;
        }
      })
      .catch((err) => {
        console.error("Payment initialization error:", err);
        setError(err.message);
        setLoading(false);
        initializingRef.current = false;
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

    // Only initialize if we have required data
    if (!email || !tourPackageId || !amountGBP || amountGBP <= 0) {
      console.warn("Payment initialization validation failed:", {
        email: email || "MISSING",
        tourPackageId: tourPackageId || "MISSING",
        amountGBP: amountGBP || "MISSING",
      });
      setError("Missing required payment information");
      setLoading(false);
      return;
    }

    initializePayment();
  }, [tourPackageId, email, amountGBP, paymentDocId]);

  // Clean up session storage on unmount if payment is completed
  useEffect(() => {
    return () => {
      // Only clean up if we're moving away from payment step
      if (clientSecret) {
        const sessionKey = getSessionKey();
        try {
          sessionStorage.removeItem(sessionKey);
        } catch (e) {
          console.warn("Failed to clean up session storage:", e);
        }
      }
    };
  }, [clientSecret]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-sm text-muted-foreground">
          Loading payment form...
        </span>
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
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes scale-in {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-slide-up { animation: slide-up 0.4s ease-out; }
        .animate-scale-in { animation: scale-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `,
        }}
      />
      <Elements stripe={stripePromise} options={options}>
        <PaymentForm
          clientSecret={clientSecret}
          paymentDocId={paymentDocId}
          onSuccess={onSuccess}
          onPaymentSuccess={onPaymentSuccess}
          onError={(err) => {
            setError(err);
            onError?.(err);
          }}
          onProcessingChange={onProcessingChange}
          isGuestBooking={isGuestBooking}
        />
      </Elements>
    </>
  );
}
