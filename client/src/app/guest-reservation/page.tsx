"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";
import BirthdatePicker from "../reservation-booking-form/BirthdatePicker";
import Select from "../reservation-booking-form/Select";
import StripePayment from "../reservation-booking-form/StripePayment";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  validateGuestInvitation,
  getDaysUntilExpiration,
  formatExpirationDate,
  type ParentBookingData,
  type GuestInvitation,
} from "@/lib/guest-booking-utils";

const GuestReservationPage = () => {
  // URL Parameters
  const searchParams = useSearchParams();
  const router = useRouter();
  const parentBookingId = searchParams.get("booking");
  const guestEmail = searchParams.get("email");

  // Validation State
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [parentBooking, setParentBooking] = useState<ParentBookingData | null>(
    null
  );
  const [invitation, setInvitation] = useState<GuestInvitation | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);

  // Form State - Step 1: Personal Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState<string>("");
  const [nationality, setNationality] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");

  // Form State - Multi-step
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [submitted, setSubmitted] = useState(false);

  // Payment State
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [paymentDocId, setPaymentDocId] = useState<string | null>(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Nationality options
  const nationalityOptions = [
    "Philippines",
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "India",
    "Germany",
    "France",
    "Spain",
    "Italy",
    "Japan",
    "China",
    "South Korea",
    "Singapore",
    "Malaysia",
    "Thailand",
    "Other",
  ].map((n) => ({ label: n, value: n }));

  // ============================================================================
  // VALIDATION ON MOUNT
  // ============================================================================

  useEffect(() => {
    async function validateInvitation() {
      if (!parentBookingId || !guestEmail) {
        setValidationError(
          "Invalid invitation link. Missing required parameters."
        );
        setIsValidating(false);
        return;
      }

      const result = await validateGuestInvitation(parentBookingId, guestEmail);

      if (!result.isValid) {
        setValidationError(result.error || "Invalid invitation");
        setIsValidating(false);
        return;
      }

      // Validation passed
      setParentBooking(result.parentBooking!);
      setInvitation(result.invitation!);
      setDaysRemaining(getDaysUntilExpiration(result.invitation!.expiresAt));

      // Fetch the main booker's booking document to get accurate pricing
      try {
        // First, fetch the payment document to get the booking document ID
        const { getDoc, doc } = await import("firebase/firestore");
        const paymentDocRef = doc(db, "stripePayments", parentBookingId);
        const paymentDocSnap = await getDoc(paymentDocRef);

        if (paymentDocSnap.exists()) {
          const paymentData = paymentDocSnap.data();
          const bookingDocId = paymentData?.booking?.documentId;

          console.log("📝 Payment document fetched:", {
            paymentDocId: parentBookingId,
            bookingDocId,
            paymentData: paymentData?.booking,
          });

          if (bookingDocId) {
            // Now fetch the actual booking document
            const bookingDocRef = doc(db, "bookings", bookingDocId);
            const bookingDocSnap = await getDoc(bookingDocRef);

            if (bookingDocSnap.exists()) {
              const bookingData = bookingDocSnap.data();
              // Use the reservationFee field instead of payment plan deposit
              const amount = bookingData?.reservationFee || 0;
              const paymentPlan = bookingData?.paymentPlan || "";
              const paymentMethod = bookingData?.paymentMethod || "";

              console.log("✅ Found booking via payment document reference:", {
                reservationFee: amount,
                paymentPlan,
                paymentMethod,
                bookingData,
              });

              setDepositAmount(amount);

              // Update parentBooking with payment plan info
              setParentBooking((prev) =>
                prev
                  ? {
                      ...prev,
                      paymentPlan,
                      paymentMethod,
                    }
                  : prev
              );

              setIsValidating(false);
              return;
            } else {
              console.warn("❌ Booking document not found:", bookingDocId);
            }
          } else {
            console.warn("❌ No booking.documentId in payment document");
          }
        } else {
          console.warn("❌ Payment document not found:", parentBookingId);
        }
      } catch (error) {
        console.warn("Error fetching payment/booking documents:", error);
      }

      // Fallback: try using parentBookingId as booking document ID directly
      try {
        console.log(
          "📝 Trying fallback: using parentBookingId as booking doc ID"
        );
        const { getDoc, doc } = await import("firebase/firestore");
        const bookingRef = doc(db, "bookings", parentBookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (bookingSnap.exists()) {
          const bookingData = bookingSnap.data();
          // Use the reservationFee field instead of payment plan deposit
          const amount = bookingData?.reservationFee || 0;
          const paymentPlan = bookingData?.paymentPlan || "";
          const paymentMethod = bookingData?.paymentMethod || "";

          console.log("✅ Fallback: Found booking via direct doc ID:", {
            reservationFee: amount,
            paymentPlan,
            paymentMethod,
            bookingData,
          });

          setDepositAmount(amount);

          // Update parentBooking with payment plan info
          setParentBooking((prev) =>
            prev
              ? {
                  ...prev,
                  paymentPlan,
                  paymentMethod,
                }
              : prev
          );
        } else {
          console.warn("❌ Fallback: No booking found via direct doc ID");
          setDepositAmount(0);
        }
      } catch (e) {
        console.warn("Error with fallback booking fetch:", e);
        setDepositAmount(0);
      }

      setIsValidating(false);
    }

    validateInvitation();
  }, [parentBookingId, guestEmail]);

  // ============================================================================
  // FORM VALIDATION
  // ============================================================================

  const validateStep1 = (): boolean => {
    const newErrors: { [k: string]: string } = {};

    // First Name
    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    // Last Name
    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    // Birthdate
    if (!birthdate) {
      newErrors.birthdate = "Birthdate is required";
    } else {
      const birthdateObj = new Date(birthdate);
      const today = new Date();
      const age = today.getFullYear() - birthdateObj.getFullYear();
      if (age < 18) {
        newErrors.birthdate = "You must be at least 18 years old";
      }
    }

    // Nationality
    if (!nationality) {
      newErrors.nationality = "Nationality is required";
    }

    // Phone Number
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================================
  // STEP NAVIGATION
  // ============================================================================

  const handleProceedToPayment = () => {
    setSubmitted(true);
    if (!validateStep1()) {
      return;
    }

    // Proceed to step 2 (payment)
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToDetails = () => {
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ============================================================================
  // PAYMENT SUCCESS HANDLER
  // ============================================================================

  const handlePaymentSuccess = async (docId: string) => {
    setPaymentDocId(docId);
    setPaymentConfirmed(true);
    setIsCreatingBooking(true);

    try {
      console.log("🎉 Guest payment succeeded! Creating booking...");

      // First, update the stripePayments document with guest details
      const { doc, updateDoc, serverTimestamp } = await import(
        "firebase/firestore"
      );

      const updateData: any = {
        "customer.email": guestEmail,
        "customer.firstName": firstName,
        "customer.lastName": lastName,
        "customer.birthdate": birthdate,
        "customer.nationality": nationality,
        "payment.status": "reserve_paid",
        "timestamps.updatedAt": serverTimestamp(),
      };

      console.log("📤 Updating guest payment document with:", updateData);

      await updateDoc(doc(db, "stripePayments", docId), updateData);
      console.log("✅ Guest payment document updated!");

      // Call the create-guest-booking API
      const response = await fetch(
        "/api/stripe-payments/create-guest-booking",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentDocId: docId,
            parentBookingId: parentBookingId!,
            guestEmail: guestEmail!,
            guestData: {
              email: guestEmail,
              firstName,
              lastName,
              birthdate,
              nationality,
              phoneNumber,
              dietaryRestrictions,
            },
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        console.log("✅ Guest booking created:", result);
        setBookingConfirmed(true);
      } else {
        console.error("❌ Failed to create guest booking:", result.error);
        alert(`Failed to create booking: ${result.error}`);
      }
    } catch (error) {
      console.error("❌ Error creating guest booking:", error);
      alert(
        "An error occurred while creating your booking. Please contact support."
      );
    } finally {
      setIsCreatingBooking(false);
    }
  };

  // ============================================================================
  // RENDER STATES
  // ============================================================================

  // Loading State
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Validating your invitation...
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (validationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invalid Invitation
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {validationError}
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Success State
  if (bookingConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Booking Confirmed! 🎉
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You're all set for {parentBooking?.tourName}
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              What's Next?
            </h3>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  Check your email ({guestEmail}) for your booking confirmation
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  You'll receive payment reminders according to your payment
                  plan
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  Contact us if you have any questions about your booking
                </span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Return to Home
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Print Confirmation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN FORM RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Complete Your Group Reservation
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You've been invited to join a group booking for{" "}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {parentBooking?.tourName}
            </span>
          </p>
        </div>

        {/* Expiration Warning */}
        {daysRemaining <= 3 && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  {daysRemaining === 0
                    ? "Invitation expires today!"
                    : `Invitation expires in ${daysRemaining} day${
                        daysRemaining > 1 ? "s" : ""
                      }`}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Complete your booking before{" "}
                  {invitation && formatExpirationDate(invitation.expiresAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  step === 1
                    ? "bg-blue-600 text-white"
                    : "bg-green-600 text-white"
                }`}
              >
                {step > 1 ? "✓" : "1"}
              </div>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                Personal Details
              </span>
            </div>
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  step === 2
                    ? "bg-blue-600 text-white"
                    : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                }`}
              >
                2
              </div>
              <span
                className={`ml-2 font-medium ${
                  step === 2
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-500"
                }`}
              >
                Payment
              </span>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Your Personal Details
              </h2>

              <div className="space-y-6">
                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={guestEmail || ""}
                    disabled
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This email is linked to your invitation
                  </p>
                </div>

                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      submitted && errors.firstName
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors`}
                    placeholder="Enter your first name"
                  />
                  {submitted && errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.firstName}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      submitted && errors.lastName
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors`}
                    placeholder="Enter your last name"
                  />
                  {submitted && errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.lastName}
                    </p>
                  )}
                </div>

                {/* Birthdate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Birthdate <span className="text-red-500">*</span>
                  </label>
                  <BirthdatePicker value={birthdate} onChange={setBirthdate} />
                  {submitted && errors.birthdate && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.birthdate}
                    </p>
                  )}
                </div>

                {/* Nationality */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nationality <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={nationality}
                    onChange={setNationality}
                    options={nationalityOptions}
                    placeholder="Select your nationality"
                  />
                  {submitted && errors.nationality && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.nationality}
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      submitted && errors.phoneNumber
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors`}
                    placeholder="+1 (555) 123-4567"
                  />
                  {submitted && errors.phoneNumber && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.phoneNumber}
                    </p>
                  )}
                </div>

                {/* Dietary Restrictions (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dietary Restrictions (Optional)
                  </label>
                  <textarea
                    value={dietaryRestrictions}
                    onChange={(e) => setDietaryRestrictions(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
                    placeholder="e.g., Vegetarian, Gluten-free, Allergies..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleProceedToPayment}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center space-x-2"
                >
                  <span>Proceed to Payment</span>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Complete Your Payment
              </h2>

              {/* Payment Summary */}
              <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Booking Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Tour:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {parentBooking?.tourName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Travel Date:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {parentBooking?.tourDate &&
                        new Date(
                          typeof parentBooking.tourDate === "string"
                            ? parentBooking.tourDate
                            : parentBooking.tourDate.toDate()
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Payment Plan:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {parentBooking?.paymentPlan
                        ? `${parentBooking.paymentPlan} - ${
                            parentBooking.paymentPlan === "P1"
                              ? "Full Payment"
                              : parentBooking.paymentPlan === "P2"
                              ? "2 Installments"
                              : parentBooking.paymentPlan === "P3"
                              ? "3 Installments"
                              : parentBooking.paymentPlan === "P4"
                              ? "4 Installments"
                              : "Standard"
                          }`
                        : "Not selected yet"}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">
                      Initial Deposit:
                    </span>
                    <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                      €{depositAmount?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </div>

                {!parentBooking?.paymentPlan ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <span className="inline-block mr-1">ℹ️</span>
                      The main booker hasn't selected a payment plan yet. You'll
                      follow the same payment plan once they complete their
                      booking.
                    </p>
                  </div>
                ) : (
                  parentBooking.paymentPlan !== "P1" && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <span className="inline-block mr-1">ℹ️</span>
                      You'll follow the same payment plan as the main booker.
                      Remaining payments will be due on the same schedule.
                    </p>
                  )
                )}
              </div>

              {/* Stripe Payment Component */}
              {isCreatingBooking ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Creating your booking...
                  </p>
                </div>
              ) : (
                <StripePayment
                  tourPackageId={parentBooking?.tourPackageId || ""}
                  tourPackageName={parentBooking?.tourName || ""}
                  email={guestEmail || ""}
                  amountGBP={depositAmount || 0}
                  onPaymentSuccess={handlePaymentSuccess}
                  onBack={handleBackToDetails}
                  isGuestBooking={true}
                  parentBookingId={parentBookingId!}
                  guestEmail={guestEmail!}
                  guestData={{
                    firstName,
                    lastName,
                    birthdate,
                    nationality,
                    phoneNumber,
                    dietaryRestrictions,
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <GuestReservationPage />
    </Suspense>
  );
}
