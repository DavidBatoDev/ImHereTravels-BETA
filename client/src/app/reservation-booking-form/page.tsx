"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  setDoc,
  doc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import StripePayment from "./StripePayment";
import BirthdatePicker from "./BirthdatePicker";
import Select from "./Select";
import TourSelectionModal from "./TourSelectionModal";
import { getNationalityOptions, getNationalityCountryCode } from "./nationalities";
import ReactCountryFlag from "react-country-flag";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import BookingConfirmationDocument from "./BookingConfirmationDocument";
import jsPDF from "jspdf";
import Receipt from "./Receipt";
import { generateBookingConfirmationPDF } from "./generatePdf";
import "react-phone-number-input/style.css";
import PhoneInput, {
  isValidPhoneNumber,
  getCountries,
  getCountryCallingCode,
} from "react-phone-number-input";
import en from "react-phone-number-input/locale/en";
import type { Country } from "react-phone-number-input";

// Safe wrapper for getCountryCallingCode with fallback
const safeGetCountryCallingCode = (countryCode: string): string => {
  try {
    return getCountryCallingCode(countryCode as Country);
  } catch (error) {
    console.warn(`Unknown country code for phone: ${countryCode}`);
    return "1"; // Default to US/Canada code
  }
};

// Country data with Alpha-3 codes and phone number max lengths
const countryData: Record<
  string,
  { alpha3: string; flag: string; maxLength: number }
> = {
  US: { alpha3: "USA", flag: "\uD83C\uDDFA\uD83C\uDDF8", maxLength: 10 },
  GB: { alpha3: "GBR", flag: "\uD83C\uDDEC\uD83C\uDDE7", maxLength: 10 },
  PH: { alpha3: "PHL", flag: "\uD83C\uDDF5\uD83C\uDDED", maxLength: 10 },
  JP: { alpha3: "JPN", flag: "\uD83C\uDDEF\uD83C\uDDF5", maxLength: 10 },
  CN: { alpha3: "CHN", flag: "\uD83C\uDDE8\uD83C\uDDF3", maxLength: 11 },
  IN: { alpha3: "IND", flag: "\uD83C\uDDEE\uD83C\uDDF3", maxLength: 10 },
  AU: { alpha3: "AUS", flag: "\uD83C\uDDE6\uD83C\uDDFA", maxLength: 9 },
  CA: { alpha3: "CAN", flag: "\uD83C\uDDE8\uD83C\uDDE6", maxLength: 10 },
  DE: { alpha3: "DEU", flag: "\uD83C\uDDE9\uD83C\uDDEA", maxLength: 11 },
  FR: { alpha3: "FRA", flag: "\uD83C\uDDEB\uD83C\uDDF7", maxLength: 9 },
  IT: { alpha3: "ITA", flag: "\uD83C\uDDEE\uD83C\uDDF9", maxLength: 10 },
  ES: { alpha3: "ESP", flag: "\uD83C\uDDEA\uD83C\uDDF8", maxLength: 9 },
  BR: { alpha3: "BRA", flag: "\uD83C\uDDE7\uD83C\uDDF7", maxLength: 11 },
  MX: { alpha3: "MEX", flag: "\uD83C\uDDF2\uD83C\uDDFD", maxLength: 10 },
  KR: { alpha3: "KOR", flag: "\uD83C\uDDF0\uD83C\uDDF7", maxLength: 10 },
  SG: { alpha3: "SGP", flag: "\uD83C\uDDF8\uD83C\uDDEC", maxLength: 8 },
  MY: { alpha3: "MYS", flag: "\uD83C\uDDF2\uD83C\uDDFE", maxLength: 10 },
  TH: { alpha3: "THA", flag: "\uD83C\uDDF9\uD83C\uDDED", maxLength: 9 },
  VN: { alpha3: "VNM", flag: "\uD83C\uDDFB\uD83C\uDDF3", maxLength: 10 },
  ID: { alpha3: "IDN", flag: "\uD83C\uDDEE\uD83C\uDDE9", maxLength: 11 },
  NZ: { alpha3: "NZL", flag: "\uD83C\uDDF3\uD83C\uDDFF", maxLength: 9 },
  AE: { alpha3: "ARE", flag: "\uD83C\uDDE6\uD83C\uDDEA", maxLength: 9 },
  SA: { alpha3: "SAU", flag: "\uD83C\uDDF8\uD83C\uDDE6", maxLength: 9 },
  ZA: { alpha3: "ZAF", flag: "\uD83C\uDDFF\uD83C\uDDE6", maxLength: 9 },
  RU: { alpha3: "RUS", flag: "\uD83C\uDDF7\uD83C\uDDFA", maxLength: 10 },
  TR: { alpha3: "TUR", flag: "\uD83C\uDDF9\uD83C\uDDF7", maxLength: 10 },
  NL: { alpha3: "NLD", flag: "\uD83C\uDDF3\uD83C\uDDF1", maxLength: 9 },
  SE: { alpha3: "SWE", flag: "\uD83C\uDDF8\uD83C\uDDEA", maxLength: 9 },
  CH: { alpha3: "CHE", flag: "\uD83C\uDDE8\uD83C\uDDED", maxLength: 9 },
  PL: { alpha3: "POL", flag: "\uD83C\uDDF5\uD83C\uDDF1", maxLength: 9 },
  BE: { alpha3: "BEL", flag: "\uD83C\uDDE7\uD83C\uDDEA", maxLength: 9 },
  AT: { alpha3: "AUT", flag: "\uD83C\uDDE6\uD83C\uDDF9", maxLength: 10 },
  NO: { alpha3: "NOR", flag: "\uD83C\uDDF3\uD83C\uDDF4", maxLength: 8 },
  DK: { alpha3: "DNK", flag: "\uD83C\uDDE9\uD83C\uDDF0", maxLength: 8 },
  FI: { alpha3: "FIN", flag: "\uD83C\uDDEB\uD83C\uDDEE", maxLength: 9 },
  IE: { alpha3: "IRL", flag: "\uD83C\uDDEE\uD83C\uDDEA", maxLength: 9 },
  PT: { alpha3: "PRT", flag: "\uD83C\uDDF5\uD83C\uDDF9", maxLength: 9 },
  GR: { alpha3: "GRC", flag: "\uD83C\uDDEC\uD83C\uDDF7", maxLength: 10 },
  CZ: { alpha3: "CZE", flag: "\uD83C\uDDE8\uD83C\uDDFF", maxLength: 9 },
  HU: { alpha3: "HUN", flag: "\uD83C\uDDED\uD83C\uDDFA", maxLength: 9 },
  RO: { alpha3: "ROU", flag: "\uD83C\uDDF7\uD83C\uDDF4", maxLength: 9 },
  IL: { alpha3: "ISR", flag: "\uD83C\uDDEE\uD83C\uDDF1", maxLength: 9 },
  EG: { alpha3: "EGY", flag: "\uD83C\uDDEA\uD83C\uDDEC", maxLength: 10 },
  AR: { alpha3: "ARG", flag: "\uD83C\uDDE6\uD83C\uDDF7", maxLength: 10 },
  CL: { alpha3: "CHL", flag: "\uD83C\uDDE8\uD83C\uDDF1", maxLength: 9 },
  CO: { alpha3: "COL", flag: "\uD83C\uDDE8\uD83C\uDDF4", maxLength: 10 },
  PE: { alpha3: "PER", flag: "\uD83C\uDDF5\uD83C\uDDEA", maxLength: 9 },
  HK: { alpha3: "HKG", flag: "\uD83C\uDDED\uD83C\uDDF0", maxLength: 8 },
  TW: { alpha3: "TWN", flag: "\uD83C\uDDF9\uD83C\uDDFC", maxLength: 9 },
  PK: { alpha3: "PAK", flag: "\uD83C\uDDF5\uD83C\uDDF0", maxLength: 10 },
  BD: { alpha3: "BGD", flag: "\uD83C\uDDE7\uD83C\uDDE9", maxLength: 10 },
  NG: { alpha3: "NGA", flag: "\uD83C\uDDF3\uD83C\uDDEC", maxLength: 10 },
  KE: { alpha3: "KEN", flag: "\uD83C\uDDF0\uD83C\uDDEA", maxLength: 9 },
  UA: { alpha3: "UKR", flag: "\uD83C\uDDFA\uD83C\uDDE6", maxLength: 9 },
};

// Helper to get country data
const getCountryData = (countryCode: string) => {
  return (
    countryData[countryCode] || {
      alpha3: countryCode.toUpperCase(),
      flag: countryCode
        .toUpperCase()
        .split("")
        .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
        .join(""),
      maxLength: 15, // default max length
    }
  );
};

const Page = () => {
  const DEBUG = true;
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [submitted, setSubmitted] = useState(false);
  // Section 1 specific state
  const [birthdate, setBirthdate] = useState<string>("");
  const [nationality, setNationality] = useState("");
  const [whatsAppNumber, setWhatsAppNumber] = useState("");
  const [whatsAppCountry, setWhatsAppCountry] = useState("GB");
  const [bookingType, setBookingType] = useState("Single Booking");
  const [groupSize, setGroupSize] = useState<number>(3);
  const [tourPackage, setTourPackage] = useState(""); // will store package id
  const [tourDate, setTourDate] = useState("");
  const [additionalGuests, setAdditionalGuests] = useState<string[]>([]); // Keep for backward compatibility
  
  // New state for guest personal details
  const [activeGuestTab, setActiveGuestTab] = useState(1); // Track which guest form is active
  const [guestDetails, setGuestDetails] = useState<Array<{
    email: string;
    firstName: string;
    lastName: string;
    birthdate: string;
    nationality: string;
    whatsAppNumber: string;
    whatsAppCountry: string;
  }>>([]);

  // dynamic tour packages and dates loaded from Firestore
  // Auto-update WhatsApp country code when nationality changes
  useEffect(() => {
    if (nationality) {
      const countryCode = getNationalityCountryCode(nationality);
      if (countryCode) {
        setWhatsAppCountry(countryCode);
      }
    }
  }, [nationality]);

  const [tourPackages, setTourPackages] = useState<
    Array<{
      id: string;
      slug?: string;
      name: string;
      travelDates: string[];
      status?: "active" | "inactive";
      stripePaymentLink?: string;
      deposit?: number; // reservation fee from pricing.deposit
      price: number; // total tour price
      coverImage?: string; // tour cover image URL
      duration?: string; // e.g., "5 days, 4 nights"
      highlights?: (string | { text: string; image?: string })[]; // tour highlights (string or object with optional image)
      destinations?: string[]; // list of destinations
      media?: {
        coverImage?: string;
        gallery?: string[];
      };
      description?: string;
      region?: string;
      country?: string;
      rating?: number;
      travelDateDetails?: Array<{
        date: string;
        customDeposit?: number;
        customOriginal?: number;
      }>;
    }>
  >([]);
  const [tourDates, setTourDates] = useState<string[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [tourImageLoading, setTourImageLoading] = useState(false);
  const [tourImageError, setTourImageError] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [step2Processing, setStep2Processing] = useState(false);
  const [step2StatusMsg, setStep2StatusMsg] = useState<string | null>(null);
  const [step2StatusType, setStep2StatusType] = useState<
    "success" | "error" | null
  >(null);

  // Tour selection modal state
  const [showTourModal, setShowTourModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [filteredTours, setFilteredTours] = useState<typeof tourPackages>([]);
  const [popularityData, setPopularityData] = useState<Record<string, number>>(
    {}
  );
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState(0);
  const [highlightsExpanded, setHighlightsExpanded] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  // Payment terms from Firestore
  const [paymentTerms, setPaymentTerms] = useState<
    Array<{
      id: string;
      name: string;
      description: string;
      paymentPlanType: string;
      monthsRequired?: number;
      monthlyPercentages?: number[];
      color: string;
    }>
  >([]);

  // Selected payment plan
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<string>("");

  // animation state for tour date mount/visibility
  const [dateMounted, setDateMounted] = useState(false);
  const [dateVisible, setDateVisible] = useState(false);
  // animation state for additional guests area (measured height)
  const guestsWrapRef = React.useRef<HTMLDivElement | null>(null);
  const guestsContentRef = React.useRef<HTMLDivElement | null>(null);
  const [guestsMounted, setGuestsMounted] = useState(false);
  const [guestsHeight, setGuestsHeight] = useState("0px");
  // clear all "Personal & Booking" inputs together with one animation
  const [clearing, setClearing] = useState(false);
  const [howItWorksExpanded, setHowItWorksExpanded] = useState(true);
  // animation timing (ms) used for transitions so entrance/exit durations match
  const ANIM_DURATION = 300;
  // Track if we've restored guests from sessionStorage to prevent race conditions
  const sessionRestoredRef = useRef(false);

  // ---- multi-step flow state ----
  const [step, setStep] = useState<1 | 2 | 3 | number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [paymentConfirmed, setPaymentConfirmedState] = useState(false);

  // Wrapper to log when paymentConfirmed changes
  const setPaymentConfirmed = (value: boolean) => {
    console.log("🔍 DEBUG: setPaymentConfirmed called with:", value);
    console.trace("🔍 DEBUG: Call stack:");
    setPaymentConfirmedState(value);
  };

  const [bookingId, setBookingId] = useState<string>("");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmingBooking, setConfirmingBooking] = useState(false);
  const [paymentDocId, setPaymentDocId] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [foundStripePayments, setFoundStripePayments] = useState<Array<any>>(
    []
  );

  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper to reliably set the `?paymentid=` query param.
  // Uses Next.js router.replace then immediately forces a synchronous
  // fallback via history.replaceState to avoid races where effects
  // running later (e.g. tour-sync) clobber the URL before router.replace
  // takes effect.
  const replaceWithPaymentId = (docId: string | null) => {
    if (!docId) return;
    try {
      const newUrl = `${window.location.pathname}?paymentid=${docId}`;
      try {
        router.replace(newUrl);
      } catch (e) {
        if (DEBUG)
          console.debug("replaceWithPaymentId: router.replace failed", "", e);
      }

      // synchronous fallback to ensure the URL reflects the active payment id
      try {
        const state = window.history.state || null;
        window.history.replaceState(state, "", newUrl);
      } catch (e) {
        if (DEBUG)
          console.debug(
            "replaceWithPaymentId: history.replaceState failed",
            "",
            e
          );
      }

      if (DEBUG)
        console.debug("replaceWithPaymentId: applied", { docId, newUrl });
    } catch (err) {
      if (DEBUG) console.debug("replaceWithPaymentId error", err);
    }
  };

  // Dynamic step descriptions
  const getStepDescription = () => {
    switch (step) {
      case 1:
        return "Fill in your personal details and select your tour name";
      case 2:
        return selectedPackage
          ? bookingType === "Duo Booking" || bookingType === "Group Booking"
            ? `Pay £${depositAmount.toFixed(2)} reservation fee (£${baseReservationFee.toFixed(2)} × ${numberOfPeople} ${numberOfPeople === 1 ? 'person' : 'people'}) to secure your spots`
            : `Pay £${depositAmount.toFixed(2)} reservation fee to secure your spot`
          : "Pay a small reservation fee to secure your spot";
      case 3:
        if (availablePaymentTerm.isInvalid) {
          return "Tour date too close - immediate payment required";
        } else if (availablePaymentTerm.isLastMinute) {
          return "Full payment required within 48 hours";
        } else {
          const daysDiff = tourDate
            ? Math.ceil(
                (new Date(tourDate).getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0;
          const planCount = getAvailablePaymentPlans().length;
          return `Pick from ${planCount} payment plan${
            planCount !== 1 ? "s" : ""
          } based on your tour date (${daysDiff} days away)`;
        }
      default:
        return "";
    }
  };

  // Create a new placeholder stripePayments doc and set session state
  const createPlaceholder = async () => {
    try {
      const paymentsRef = collection(db, "stripePayments");
      const newDoc = await addDoc(paymentsRef, {
        customer: {
          email,
          firstName,
          lastName,
          birthdate,
          nationality,
          whatsAppNumber: whatsAppNumber
            ? `+${safeGetCountryCallingCode(
                whatsAppCountry
              )}${whatsAppNumber}`
            : "",
        },
        booking: {
          type: bookingType,
          groupSize:
            bookingType === "Group Booking"
              ? groupSize
              : bookingType === "Duo Booking"
              ? 2
              : 1,
          additionalGuests:
            bookingType === "Duo Booking" || bookingType === "Group Booking"
              ? additionalGuests
              : [],
          guestDetails:
            bookingType === "Duo Booking" || bookingType === "Group Booking"
              ? guestDetails.map(guest => ({
                  email: guest.email,
                  firstName: guest.firstName,
                  lastName: guest.lastName,
                  birthdate: guest.birthdate,
                  nationality: guest.nationality,
                  whatsAppNumber: guest.whatsAppNumber
                    ? `+${safeGetCountryCallingCode(
                        guest.whatsAppCountry
                      )}${guest.whatsAppNumber}`
                    : "",
                }))
              : [],
          id: "PENDING",
          documentId: "",
        },
        tour: {
          packageId: tourPackage,
          packageName: selectedPackage?.name || "",
          date: tourDate,
        },
        payment: {
          amount: depositAmount,
          currency: "GBP",
          status: "reserve_pending",
          type: "reservationFee",
          originalPrice: selectedDateDetail?.customOriginal ?? undefined, // Store custom original price if exists
        },
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
        { merge: true }
      );
      setPaymentDocId(newDoc.id);
      try {
        sessionStorage.setItem(
          `stripe_payment_doc_${email}_${tourPackage}`,
          newDoc.id
        );
      } catch {}
      return newDoc.id;
    } catch (err) {
      console.error("Error creating payment placeholder:", err);
      alert("Unable to create payment record. Please try again.");
      return null;
    }
  };

  // Query existing stripePayments for this email and show modal if any
  const checkExistingPaymentsAndMaybeProceed = async () => {
    console.log("🚀 checkExistingPaymentsAndMaybeProceed called");
    if (!validate()) {
      console.log("❌ Validation failed");
      return;
    }
    console.log("✅ Validation passed");
    if (isCreatingPayment) {
      console.log("⏳ Already creating payment, exiting");
      return;
    }
    console.log("🔄 Setting isCreatingPayment to true");
    setIsCreatingPayment(true);

    // If we already have a paymentDocId, update it with current form data before proceeding
    if (paymentDocId) {
      try {
        const { updateDoc, doc } = await import("firebase/firestore");
        await updateDoc(doc(db, "stripePayments", paymentDocId), {
          customer: {
            email,
            firstName,
            lastName,
            birthdate,
            nationality,
            whatsAppNumber: whatsAppNumber
              ? `+${safeGetCountryCallingCode(
                  whatsAppCountry
                )}${whatsAppNumber}`
              : "",
          },
          booking: {
            type: bookingType,
            groupSize:
              bookingType === "Group Booking"
                ? groupSize
                : bookingType === "Duo Booking"
                ? 2
                : 1,
            additionalGuests:
              bookingType === "Duo Booking" || bookingType === "Group Booking"
                ? additionalGuests
                : [],
            guestDetails:
              bookingType === "Duo Booking" || bookingType === "Group Booking"
                ? guestDetails.map(guest => ({
                    email: guest.email,
                    firstName: guest.firstName,
                    lastName: guest.lastName,
                    birthdate: guest.birthdate,
                    nationality: guest.nationality,
                    whatsAppNumber: guest.whatsAppNumber
                      ? `+${safeGetCountryCallingCode(
                          guest.whatsAppCountry
                        )}${guest.whatsAppNumber}`
                      : "",
                  }))
                : [],
            id: "PENDING",
            documentId: "",
          },
          tour: {
            packageId: tourPackage,
            packageName: selectedPackage?.name || "",
            date: tourDate,
          },
          payment: {
            amount: depositAmount,
            currency: "GBP",
            status: "reserve_pending",
            type: "reservationFee",
            originalPrice: selectedDateDetail?.customOriginal ?? undefined, // Store custom original price if exists
          },
          "timestamps.updatedAt": serverTimestamp(),
        });
        console.log("✅ Updated existing payment document:", paymentDocId);
      } catch (err) {
        console.error("Error updating payment document:", err);
        alert("Unable to update payment record. Please try again.");
        setIsCreatingPayment(false);
        return;
      }
      if (!completedSteps.includes(1)) {
        setCompletedSteps([...completedSteps, 1]);
      }
      setStep(2);
      try {
        replaceWithPaymentId(paymentDocId);
      } catch (err) {
        console.debug("Failed to set paymentid query param:", err);
      }
      setIsCreatingPayment(false);
      return;
    }

    setModalLoading(true);
    try {
      const paymentsRef = collection(db, "stripePayments");
      const q = query(
        paymentsRef,
        where("customer.email", "==", email),
        orderBy("timestamps.createdAt", "desc"),
        limit(5)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

      // Check for payment plans in reserve_paid documents
      const { doc, getDoc } = await import("firebase/firestore");
      for (const payment of docs) {
        if (
          payment?.payment?.status === "reserve_paid" ||
          payment?.status === "reserve_paid"
        ) {
          const bookingDocId =
            payment.booking?.documentId || payment.booking?.id;
          if (
            bookingDocId &&
            bookingDocId !== "PENDING" &&
            bookingDocId !== ""
          ) {
            try {
              const bookingDoc = await getDoc(
                doc(db, "bookings", bookingDocId)
              );
              if (bookingDoc.exists()) {
                const bookingData = bookingDoc.data();
                payment._hasPaymentPlan = !!bookingData?.paymentPlan;
              }
            } catch (err) {
              console.error("Error checking booking for payment plan:", err);
            }
          }
        }
      }

      if (!docs || docs.length === 0) {
        // no existing records — create a new placeholder
        const id = await createPlaceholder();
        if (!completedSteps.includes(1)) {
          setCompletedSteps([...completedSteps, 1]);
        }
        // update URL to reference this payment doc and remove any `tour` param
        if (id) {
          try {
            replaceWithPaymentId(id);
          } catch (err) {
            console.debug("Failed to set paymentid query param:", err);
          }
        }
        setStep(2);
      } else {
        // Check if any payment matches current tour AND date exactly
        const exactMatch = docs.find(
          (d) =>
            d?.tour?.packageName === (selectedPackage?.name || "") &&
            d?.tour?.date === tourDate
        );

        if (exactMatch) {
          // Same tour and same date - show modal to let user decide
          console.log("📋 Found exact match (same tour + date), showing modal");
          setFoundStripePayments([exactMatch]);
          setShowEmailModal(true);
          setIsCreatingPayment(false);
        } else {
          // Different tour or different date - show modal with all payments
          console.log(
            "📋 Found existing payments for different tour/date, showing modal"
          );
          setFoundStripePayments(docs);
          setShowEmailModal(true);
          setIsCreatingPayment(false);
        }
      }
    } catch (err) {
      console.error("Error checking existing payments:", err);
      // fall back to creating a placeholder
      const fallbackId = await createPlaceholder();
      if (!completedSteps.includes(1)) {
        setCompletedSteps([...completedSteps, 1]);
      }
      if (fallbackId) {
        try {
          replaceWithPaymentId(fallbackId);
        } catch (e) {
          console.debug("Failed to set paymentid query param (fallback):", e);
        }
      }
      setStep(2);
    } finally {
      setModalLoading(false);
      setIsCreatingPayment(false);
    }
  };

  const handleReuseExisting = async (rec: any) => {
    const status = rec?.payment?.status || rec?.status;

    // For reserve_paid: verify payment with Stripe before proceeding
    if (status === "reserve_paid") {
      const stripeIntentId = rec?.payment?.stripeIntentId;

      // Verify payment status with Stripe if we have a payment intent ID
      if (stripeIntentId) {
        try {
          console.log("🔍 Verifying payment status with Stripe...");
          const response = await fetch(
            `/api/stripe-payments/verify-payment?paymentIntentId=${stripeIntentId}`
          );
          const result = await response.json();

          if (!response.ok || result.status !== "succeeded") {
            console.error("❌ Payment verification failed:", result);
            // Payment didn't actually succeed - update status and treat as pending
            const { doc, updateDoc } = await import("firebase/firestore");
            await updateDoc(doc(db, "stripePayments", rec.id), {
              "payment.status": "reserve_pending",
            });
            alert(
              "Payment verification failed. The payment was not completed successfully. Please try again."
            );
            // Treat as pending and reload
            window.location.reload();
            return;
          }
          console.log("✅ Payment verified successfully");
        } catch (err) {
          console.error("Error verifying payment:", err);
          // If verification fails, proceed cautiously but log the issue
        }
      }

      // Check if booking exists and has a payment plan
      const bookingDocId = rec.booking?.documentId || rec.booking?.id;
      let hasPaymentPlan = false;

      if (bookingDocId && bookingDocId !== "PENDING" && bookingDocId !== "") {
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const bookingDoc = await getDoc(doc(db, "bookings", bookingDocId));

          if (bookingDoc.exists()) {
            const bookingData = bookingDoc.data();
            hasPaymentPlan = !!bookingData?.paymentPlan;

            if (hasPaymentPlan) {
              console.log(
                "✅ reserve_paid has payment plan, treating as confirmed"
              );
              // Treat as terms_selected - show confirmation page
              setShowEmailModal(false);
              setPaymentDocId(rec.id);
              setBookingId(bookingDocId);
              setPaymentConfirmed(true);
              setBookingConfirmed(true);
              setSelectedPaymentPlan(bookingData.paymentPlan);

              try {
                sessionStorage.setItem(
                  `stripe_payment_doc_${email}_${tourPackage}`,
                  rec.id
                );
              } catch {}

              try {
                replaceWithPaymentId(rec.id);
              } catch (err) {
                console.debug("Failed to set paymentid query param:", err);
              }

              if (!completedSteps.includes(1)) {
                setCompletedSteps([...completedSteps, 1]);
              }
              if (!completedSteps.includes(2)) {
                setCompletedSteps([...completedSteps, 2]);
              }
              if (!completedSteps.includes(3)) {
                setCompletedSteps([...completedSteps, 3]);
              }
              setStep(3);
              return;
            }
          }
        } catch (err) {
          console.error("Error checking booking for payment plan:", err);
          // Continue with normal reserve_paid flow
        }
      }

      // No payment plan yet - proceed to step 3 to select plan
      setShowEmailModal(false);
      setPaymentDocId(rec.id);
      try {
        sessionStorage.setItem(
          `stripe_payment_doc_${email}_${tourPackage}`,
          rec.id
        );
      } catch {}
      try {
        replaceWithPaymentId(rec.id);
      } catch (err) {
        console.debug(
          "Failed to set paymentid query param for reserve_paid:",
          err
        );
      }
      // Extract booking info
      if (rec.bookingId) setBookingId(rec.bookingId);
      if (rec.booking?.id && rec.booking.id !== "PENDING")
        setBookingId(rec.booking.id);
      setPaymentConfirmed(true);
      if (!completedSteps.includes(1)) {
        setCompletedSteps([...completedSteps, 1]);
      }
      if (!completedSteps.includes(2)) {
        setCompletedSteps([...completedSteps, 2]);
      }
      setStep(3);
      return;
    }

    // For reserve_pending: load existing booking data and fetch fresh PaymentIntent
    if (status === "reserve_pending" || status === "pending") {
      try {
        setIsCreatingPayment(true);
        
        // Load existing booking data into form fields
        console.log("📋 Loading existing booking data into form:", rec);
        
        // Customer data
        if (rec.customer?.email) setEmail(rec.customer.email);
        if (rec.customer?.firstName) setFirstName(rec.customer.firstName);
        if (rec.customer?.lastName) setLastName(rec.customer.lastName);
        if (rec.customer?.birthdate) setBirthdate(rec.customer.birthdate);
        if (rec.customer?.nationality) setNationality(rec.customer.nationality);
        
        // Parse WhatsApp number
        if (rec.customer?.whatsAppNumber) {
          const whatsAppStr = rec.customer.whatsAppNumber;
          // Try to extract country code and number
          // Format is typically "+44123456789"
          if (whatsAppStr.startsWith("+")) {
            // Find which country code matches
            const countries = getCountries();
            let foundCountry: Country | null = null;
            let foundNumber = "";
            
            for (const country of countries) {
              try {
                const countryCode = safeGetCountryCallingCode(country);
                if (whatsAppStr.startsWith(`+${countryCode}`)) {
                  foundCountry = country;
                  foundNumber = whatsAppStr.substring(`+${countryCode}`.length);
                  break;
                }
              } catch {}
            }
            
            if (foundCountry) {
              setWhatsAppCountry(foundCountry);
              setWhatsAppNumber(foundNumber);
            }
          }
        }
        
        // Booking data - set booking type and group size first
        const loadedBookingType = rec.booking?.type || "Single Booking";
        const loadedGroupSize = rec.booking?.groupSize || 3;
        
        if (rec.booking?.type) setBookingType(loadedBookingType);
        if (rec.booking?.groupSize) setGroupSize(loadedGroupSize);
        
        // Set guestsMounted to true for Duo/Group bookings
        if (loadedBookingType === "Duo Booking" || loadedBookingType === "Group Booking") {
          setGuestsMounted(true);
          // Schedule height calculation after state updates
          setTimeout(() => {
            const contentHeight = guestsContentRef.current?.scrollHeight ?? 0;
            if (contentHeight > 0) {
              setGuestsHeight(`${contentHeight}px`);
            }
          }, 0);
        }
        
        // Handle additional guests based on booking type
        if (rec.booking?.additionalGuests && Array.isArray(rec.booking.additionalGuests)) {
          if (loadedBookingType === "Duo Booking") {
            // For Duo Booking, keep 1 additional guest (fill with empty if needed)
            const guest = rec.booking.additionalGuests[0] || "";
            setAdditionalGuests([guest]);
          } else if (loadedBookingType === "Group Booking") {
            // For Group Booking, preserve existing guests up to groupSize - 1
            const maxGuests = Math.max(0, loadedGroupSize - 1);
            const existingGuests = rec.booking.additionalGuests.slice(0, maxGuests);
            // Pad with empty strings if needed to match expected count
            while (existingGuests.length < maxGuests) {
              existingGuests.push("");
            }
            setAdditionalGuests(existingGuests);
          } else {
            // Single Booking - no additional guests
            setAdditionalGuests([]);
          }
        } else if (loadedBookingType === "Duo Booking") {
          // Initialize with one empty guest for Duo if not present
          setAdditionalGuests([""]);
        } else if (loadedBookingType === "Group Booking") {
          // Initialize with empty guests based on group size
          const guestCount = Math.max(0, loadedGroupSize - 1);
          setAdditionalGuests(Array(guestCount).fill(""));
        } else {
          // Single Booking
          setAdditionalGuests([]);
        }
        
        // Tour data
        if (rec.tour?.packageId) setTourPackage(rec.tour.packageId);
        if (rec.tour?.date) setTourDate(rec.tour.date);

        // Fetch fresh PaymentIntent via init-payment API
        const response = await fetch("/api/stripe-payments/init-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: rec.customer?.email || email,
            tourPackage: rec.tour?.packageId || tourPackage,
            tourPackageName: rec.tour?.packageName || selectedPackage?.name || "",
            amountGBP: rec.payment?.amount || depositAmount,
            paymentDocId: rec.id,
            meta: {
              source: "reservation-form-reuse",
              reuseAttempt: Date.now(),
            },
          }),
        });

        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || "Failed to initialize payment");
        }

        console.log(
          "✅ Fetched fresh PaymentIntent for existing document:",
          rec.id
        );
        setShowEmailModal(false);
        setPaymentDocId(rec.id);
        try {
          sessionStorage.setItem(
            `stripe_payment_doc_${rec.customer?.email || email}_${rec.tour?.packageId || tourPackage}`,
            rec.id
          );
        } catch {}
        try {
          replaceWithPaymentId(rec.id);
        } catch (err) {
          console.debug("Failed to set paymentid query param:", err);
        }
        if (!completedSteps.includes(1)) {
          setCompletedSteps([...completedSteps, 1]);
        }
        setStep(2);
      } catch (err) {
        console.error("Error reusing existing payment:", err);
        alert("Unable to reuse existing payment. Please try again.");
      } finally {
        setIsCreatingPayment(false);
      }
      return;
    }

    // For terms_selected: treat like reserve_paid with payment plan - show confirmation
    if (status === "terms_selected") {
      console.log("✅ terms_selected status, treating as fully confirmed");
      setShowEmailModal(false);
      setPaymentDocId(rec.id);

      // Extract booking info
      const bookingDocId = rec.booking?.documentId || rec.booking?.id;
      if (bookingDocId && bookingDocId !== "PENDING" && bookingDocId !== "") {
        setBookingId(bookingDocId);

        // Try to fetch payment plan from booking
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const bookingDoc = await getDoc(doc(db, "bookings", bookingDocId));

          if (bookingDoc.exists()) {
            const bookingData = bookingDoc.data();
            if (bookingData?.paymentPlan) {
              setSelectedPaymentPlan(bookingData.paymentPlan);
            }
          }
        } catch (err) {
          console.error("Error fetching booking payment plan:", err);
        }
      }

      setPaymentConfirmed(true);
      setBookingConfirmed(true);

      try {
        sessionStorage.setItem(
          `stripe_payment_doc_${email}_${tourPackage}`,
          rec.id
        );
      } catch {}

      try {
        replaceWithPaymentId(rec.id);
      } catch (err) {
        console.debug("Failed to set paymentid query param:", err);
      }

      if (!completedSteps.includes(1)) {
        setCompletedSteps([...completedSteps, 1]);
      }
      if (!completedSteps.includes(2)) {
        setCompletedSteps([...completedSteps, 2]);
      }
      if (!completedSteps.includes(3)) {
        setCompletedSteps([...completedSteps, 3]);
      }
      setStep(3);
      return;
    }

    // For other statuses: fallback behavior
    setShowEmailModal(false);
    setPaymentDocId(rec.id);
    try {
      sessionStorage.setItem(
        `stripe_payment_doc_${email}_${tourPackage}`,
        rec.id
      );
    } catch {}
    try {
      replaceWithPaymentId(rec.id);
    } catch (err) {
      console.debug("Failed to set paymentid query param:", err);
    }
    if (!completedSteps.includes(1)) {
      setCompletedSteps([...completedSteps, 1]);
    }
    setStep(2);
  };

  const handleDiscardExisting = async (recId: string, status?: string) => {
    // Prevent discarding paid or confirmed reservations
    const paymentStatus = status || "";
    if (
      paymentStatus === "reserve_paid" ||
      paymentStatus === "terms_selected"
    ) {
      alert(
        "Cannot discard a reservation that is already paid or confirmed. If you need help, contact support."
      );
      return;
    }

    try {
      setIsCreatingPayment(true);
      await deleteDoc(doc(db, "stripePayments", recId));
      setFoundStripePayments((prev) => prev.filter((d) => d.id !== recId));

      // Check if there are more records in the modal
      const remainingDocs = foundStripePayments.filter((d) => d.id !== recId);
      if (remainingDocs.length === 0) {
        // No more existing records, create fresh placeholder with new PaymentIntent
        const id = await createPlaceholder();
        if (!completedSteps.includes(1)) {
          setCompletedSteps([...completedSteps, 1]);
        }

        if (id) {
          // Immediately fetch fresh PaymentIntent
          try {
            const response = await fetch("/api/stripe-payments/init-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                tourPackage,
                tourPackageName: selectedPackage?.name || "",
                amountGBP: depositAmount,
                paymentDocId: id,
                meta: {
                  source: "reservation-form-new",
                  createdAt: Date.now(),
                },
              }),
            });

            const data = await response.json();
            if (!response.ok || data.error) {
              throw new Error(data.error || "Failed to initialize payment");
            }

            console.log("✅ Created fresh PaymentIntent for new document:", id);
          } catch (err) {
            console.error("Error initializing new payment:", err);
            // Continue anyway, the payment component will handle it
          }
        }

        setShowEmailModal(false);
        setStep(2);
      }
      // If there are still more records, keep modal open
    } catch (err) {
      console.error("Failed to discard existing stripePayment:", err);
      alert("Unable to discard reservation. Please try again.");
    } finally {
      setIsCreatingPayment(false);
    }
  };

  // Generate booking ID after payment
  const generateBookingId = async () => {
    // Use tour date instead of reservation date
    const tourDateObj = new Date(tourDate);
    const year = tourDateObj.getFullYear();
    const month = String(tourDateObj.getMonth() + 1).padStart(2, "0");
    const day = String(tourDateObj.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;

    // Determine booking type prefix
    let prefix = "SB"; // Default: Single Booking
    if (bookingType === "Duo Booking") {
      prefix = "DB";
    } else if (bookingType === "Group Booking") {
      prefix = "GB";
    }

    // Get tour package abbreviation from name
    const packageName = selectedPackage?.name || "";
    const cleanName = packageName.replace(/\([^)]*\)/g, "").trim();
    const words = cleanName.split(" ").filter((w) => w.length > 0);
    const packageAbbrev =
      words
        .map((w) => w.charAt(0).toUpperCase())
        .join("")
        .slice(0, 3) || "XXX";

    // Get initials from full name (first letter of first name + first letter of last name)
    const firstInitial = firstName.charAt(0).toUpperCase() || "X";
    const lastInitial = lastName.charAt(0).toUpperCase() || "X";
    const initials = `${firstInitial}${lastInitial}`;

    // Generate code suffix based on booking type (separated from initials by a dash)
    let codeSuffix = "";

    if (bookingType === "Single Booking") {
      // For single bookings: use count from bookings collection
      try {
        const { collection, query, where, getDocs } = await import(
          "firebase/firestore"
        );
        const bookingsRef = collection(db, "bookings");
        const q = query(bookingsRef, where("tourPackageId", "==", tourPackage));
        const querySnapshot = await getDocs(q);
        const bookingCount = querySnapshot.size + 1;
        codeSuffix = String(bookingCount).padStart(3, "0");
      } catch (error) {
        console.error("Error counting bookings:", error);
        // Fallback to random number if query fails
        const randomNum = Math.floor(Math.random() * 900) + 100;
        codeSuffix = String(randomNum);
      }
    } else {
      // For duo/group bookings: use random 4-digit code (same for all guests in the group)
      const randomCode = Math.floor(Math.random() * 9000) + 1000;
      codeSuffix = String(randomCode);
    }

    return `${prefix}-${packageAbbrev}-${dateStr}-${initials}-${codeSuffix}`;
  };

  // computed helpers
  const canEditStep1 = !paymentConfirmed;
  const progressWidth = step === 1 ? "w-1/3" : step === 2 ? "w-2/3" : "w-full";

  // Get reservation fee from selected package (not the full deposit)
  const selectedPackage = tourPackages.find((p) => p.id === tourPackage);
  
  // Custom pricing logic
  const selectedDateDetail = selectedPackage?.travelDateDetails?.find(d => d.date === tourDate);
  const customDeposit = selectedDateDetail?.customDeposit;
  
  const baseReservationFee = customDeposit ?? (selectedPackage as any)?.reservationFee ?? 250;
  
  // Calculate total reservation fee based on booking type
  const numberOfPeople = bookingType === "Group Booking" 
    ? groupSize 
    : bookingType === "Duo Booking" 
    ? 2 
    : 1;
  const depositAmount = baseReservationFee * numberOfPeople;

  // Update payment intent when booking type or group size changes (after payment doc is created)
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
            console.log("ℹ️ Payment intent cannot be updated (already in terminal state)");
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
  }, [bookingType, groupSize, depositAmount, paymentDocId, selectedPackage, step]);

  // Set `tour` query param when entering Payment (step 2)
  useEffect(() => {
    try {
      if (step === 2 && selectedPackage?.slug) {
        const params = new URLSearchParams(window.location.search);
        params.set("tour", String(selectedPackage.slug));
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        router.replace(newUrl);
      }
    } catch (err) {
      console.debug("Failed to set tour query param:", err);
    }
  }, [step, selectedPackage?.slug, router]);

  // Reset image loading state when tour package changes
  useEffect(() => {
    if (selectedPackage) {
      setTourImageLoading(true);
      setTourImageError(false);
      console.log("Selected Package:", {
        name: selectedPackage.name,
        coverImage: selectedPackage.coverImage,
        hasImage: !!selectedPackage.coverImage,
      });
    }
  }, [selectedPackage?.id]);

  // Auto-rotate carousel effect
  useEffect(() => {
    if (!highlightsExpanded || !selectedPackage?.highlights || isCarouselPaused)
      return;

    const highlightsWithImages = selectedPackage.highlights.filter(
      (h) => typeof h === "object" && h.image
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

  // When packages finish loading, preselect a package if `tour` query param exists
  useEffect(() => {
    try {
      if (!isLoadingPackages) {
        // prefer the Next.js searchParams API, but fall back to window.location
        let tourSlug = searchParams?.get("tour");
        if (!tourSlug) {
          try {
            const raw = new URLSearchParams(window.location.search).get("tour");
            if (raw) tourSlug = raw;
          } catch {}
        }

        if (tourSlug && !tourPackage) {
          const normalized = String(tourSlug).toLowerCase();
          const match = tourPackages.find((p) => {
            const s = p.slug ? String(p.slug).toLowerCase() : "";
            return s === normalized;
          });
          if (match && !isTourAllDatesTooSoon(match)) {
            setTourPackage(match.id);

            // Auto-scroll to tour date section when tour is loaded from URL
            setTimeout(() => {
              const tourDateSection = document.querySelector(
                '[aria-label="Tour Date"]'
              );
              if (tourDateSection) {
                tourDateSection.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }
            }, 800);
          }
        }
      }
    } catch (err) {
      console.debug("Failed to read tour query param:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingPackages, tourPackages]);

  // Sync `tour` query param when the selected tour (tourPackage) changes
  useEffect(() => {
    try {
      // don't sync while packages are still loading — avoid removing incoming query param
      if (isLoadingPackages) return;
      // if a payment doc is active, prefer the paymentid URL and do not set tour
      if (paymentDocId) return;

      if (DEBUG) {
        try {
          const curParams = new URLSearchParams(window.location.search);
          console.debug(
            "tour-sync effect: current params",
            Object.fromEntries(curParams.entries())
          );
        } catch {}
      }

      // if URL already contains a paymentid param, don't touch it
      try {
        const curParams = new URLSearchParams(window.location.search);
        if (curParams.has("paymentid")) return;
      } catch {}

      // find the slug for the selected package
      const slug = tourPackages.find((p) => p.id === tourPackage)?.slug;
      const params = new URLSearchParams(window.location.search);
      if (slug) {
        params.set("tour", String(slug));
      } else {
        params.delete("tour");
      }
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      router.replace(newUrl);
    } catch (err) {
      console.debug("Failed to sync tour query param on selection:", err);
    }
  }, [tourPackage, tourPackages, router, isLoadingPackages, paymentDocId]);

  // Calculate days between reservation date (today) and tour date
  const calculateDaysBetween = (tourDateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tour = new Date(tourDateStr);
    tour.setHours(0, 0, 0, 0);
    const diffTime = tour.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isTourAllDatesTooSoon = (pkg?: { travelDates?: string[] }): boolean => {
    if (!pkg) return false;
    const validDates = (pkg.travelDates ?? []).filter(Boolean);
    return (
      validDates.length > 0 &&
      validDates.every((date) => calculateDaysBetween(date) < 2)
    );
  };

  // Determine available payment term based on days between
  const getAvailablePaymentTerm = (): {
    term: string;
    isLastMinute: boolean;
    isInvalid: boolean;
  } => {
    if (!tourDate) return { term: "", isLastMinute: false, isInvalid: false };

    const daysBetween = calculateDaysBetween(tourDate);

    if (daysBetween < 2) {
      return { term: "invalid", isLastMinute: false, isInvalid: true };
    } else if (daysBetween >= 2 && daysBetween < 30) {
      return { term: "full_payment", isLastMinute: true, isInvalid: false };
    } else {
      const today = new Date();
      const tourDateObj = new Date(tourDate);
      const fullPaymentDue = new Date(tourDateObj);
      fullPaymentDue.setDate(fullPaymentDue.getDate() - 30);

      const yearDiff = fullPaymentDue.getFullYear() - today.getFullYear();
      const monthDiff = fullPaymentDue.getMonth() - today.getMonth();
      const monthCount = Math.max(0, yearDiff * 12 + monthDiff);

      if (monthCount >= 4) {
        return { term: "P4", isLastMinute: false, isInvalid: false };
      } else if (monthCount === 3) {
        return { term: "P3", isLastMinute: false, isInvalid: false };
      } else if (monthCount === 2) {
        return { term: "P2", isLastMinute: false, isInvalid: false };
      } else if (monthCount === 1) {
        return { term: "P1", isLastMinute: false, isInvalid: false };
      } else {
        return { term: "full_payment", isLastMinute: true, isInvalid: false };
      }
    }
  };

  const availablePaymentTerm = getAvailablePaymentTerm();

  // Generate payment schedule for a given plan
  const generatePaymentSchedule = (
    planType: string,
    monthsRequired: number
  ): Array<{ date: string; amount: number }> => {
    if (!tourDate || !selectedPackage) return [];

    const totalTourPrice = ((selectedDateDetail?.customOriginal ?? selectedPackage?.price) || 0) * numberOfPeople;
    const remainingBalance = totalTourPrice - depositAmount;
    const monthlyAmount = remainingBalance / monthsRequired;
    const schedule: Array<{ date: string; amount: number }> = [];

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }

    for (let i = 0; i < monthsRequired; i++) {
      let paymentMonth = nextMonth + i;
      let paymentYear = nextYear;

      while (paymentMonth > 11) {
        paymentMonth -= 12;
        paymentYear++;
      }

      const dateStr = `${paymentYear}-${String(paymentMonth + 1).padStart(
        2,
        "0"
      )}-02`;

      schedule.push({
        date: dateStr,
        amount:
          i === monthsRequired - 1
            ? remainingBalance - monthlyAmount * (monthsRequired - 1)
            : monthlyAmount,
      });
    }

    return schedule;
  };

  // Helper function to get friendly descriptions
  const getFriendlyDescription = (monthsRequired: number) => {
    switch (monthsRequired) {
      case 1:
        return "Ready to pay in full? Pick me.";
      case 2:
        return "Want to split it into two payments? This is it!";
      case 3:
        return "If you like, you can make three equal payments, too!";
      case 4:
        return "Since you're booking early, take advantage of 4 easy payments. No extra charges!";
      default:
        return "";
    }
  };

  // Helper function to fix spelling in term names
  const fixTermName = (name: string) => {
    return name
      .replace(/Instalment/g, "Installment")
      .replace(/instalments/g, "installments");
  };

  // Get available payment plan options based on the calculated term
  const getAvailablePaymentPlans = () => {
    const { term } = getAvailablePaymentTerm();
    const remainingBalance =
      ((selectedDateDetail?.customOriginal ?? selectedPackage?.price) || 0) * numberOfPeople -
      depositAmount;
    if (!availablePaymentTerm.term || availablePaymentTerm.isInvalid) return [];
    if (availablePaymentTerm.isLastMinute)
      return [
        {
          type: "full_payment",
          label: "Full Payment Required Within 48hrs",
          description: "Complete payment of remaining balance within 2 days",
          color: "#f59e0b",
        },
      ];

    const termMap: { [key: string]: number } = { P1: 1, P2: 2, P3: 3, P4: 4 };
    const maxMonths = termMap[availablePaymentTerm.term] || 0;

    return paymentTerms
      .filter((term) => term.monthsRequired && term.monthsRequired <= maxMonths)
      .map((term) => ({
        id: term.id,
        type: term.paymentPlanType,
        label: fixTermName(term.name),
        description: getFriendlyDescription(term.monthsRequired!),
        monthsRequired: term.monthsRequired!,
        color: term.color,
        schedule: generatePaymentSchedule(
          term.paymentPlanType,
          term.monthsRequired!
        ),
      }));
  };

  // helper: animate the guests container height using the Web Animations API (with a fallback)
  const animateHeight = (from: number, to: number) => {
    return new Promise<void>((resolve) => {
      const wrap = guestsWrapRef.current;
      if (!wrap) {
        setGuestsHeight(`${to}px`);
        resolve();
        return;
      }

      try {
        wrap.style.height = `${from}px`;
        const anim = wrap.animate(
          [{ height: `${from}px` }, { height: `${to}px` }],
          { duration: ANIM_DURATION, easing: "cubic-bezier(.2,.8,.2,1)" }
        );
        anim.onfinish = () => {
          wrap.style.height = `${to}px`;
          setGuestsHeight(`${to}px`);
          resolve();
        };
      } catch {
        setGuestsHeight(`${to}px`);
        resolve();
      }
    });
  };

  // Animate any content change inside the guests block (size, Duo->Group, etc.)
  const animateGuestsContentChange = async (applyState: () => void) => {
    const startH = guestsWrapRef.current?.getBoundingClientRect().height ?? 0;
    applyState();
    await new Promise((r) => requestAnimationFrame(r));
    const targetH = guestsContentRef.current?.scrollHeight ?? 0;
    await animateHeight(startH, targetH);
  };

  // shared field classes with enhanced styling
  const fieldBase =
    "mt-1 block w-full px-4 py-3 rounded-lg bg-input text-foreground placeholder:text-muted-foreground/60 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:bg-muted/40 disabled:cursor-not-allowed disabled:text-muted-foreground";
  const fieldBorder = (err?: boolean) =>
    `border-2 ${err ? "border-destructive" : "border-border"}`;
  const fieldFocus =
    "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md hover:border-primary/50 disabled:focus:outline-none disabled:focus:ring-0 disabled:hover:border-primary/50 disabled:hover:shadow-sm";
  const fieldSuccess = "border-green-500 disabled:border-green-500";
  const fieldWithIcon = "pl-11";

  // Helper to check if field is valid
  const isFieldValid = (field: string, value: string) => {
    if (field === "email")
      return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (field === "firstName" || field === "lastName")
      return value.trim().length > 0;
    if (field === "birthdate") return value.length > 0;
    if (field === "nationality") return value.length > 0;
    return false;
  };

  const guestsVisible = guestsHeight;

  // Get all nationalities from world-countries library
  const nationalityOptions = getNationalityOptions();

  const bookingTypeOptions = [
    { label: "Single Booking", value: "Single Booking" },
    { label: "Duo Booking", value: "Duo Booking" },
    { label: "Group Booking", value: "Group Booking" },
  ];
  const tourPackageOptions = tourPackages.map((p) => {
    const allDatesTooSoon = isTourAllDatesTooSoon(p);
    const isDisabled = p.status === "inactive" || allDatesTooSoon;

    return {
      label: p.name,
      value: p.id,
      disabled: isDisabled,
      description: isDisabled
        ? p.status === "inactive"
          ? "Tour currently not available — please check back soon."
          : "All dates for this tour are too soon — please check back later."
        : undefined,
    };
  });

  const tourDateOptions = (tourDates ?? []).map((d: string) => {
    const daysBetween = calculateDaysBetween(d);
    const isInvalid = daysBetween < 2;

    // Format date as "mmm dd, yyyy" (e.g., "Mar 27, 2026")
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

  // Payment success handler
  const handlePaymentSuccess = async (
    paymentIntentId?: string,
    paymentDocId?: string
  ) => {
    try {
      console.log("🎉 Payment success! Intent ID:", paymentIntentId);
      console.log("📄 Payment Document ID:", paymentDocId);

      // Update Firestore with booking details
      const {
        doc,
        updateDoc,
        serverTimestamp,
        collection,
        query,
        where,
        getDocs,
      } = await import("firebase/firestore");

      // First, update the stripePayments document with customer details
      const updateData: any = {
        "customer.email": email,
        "customer.firstName": firstName,
        "customer.lastName": lastName,
        "customer.birthdate": birthdate,
        "customer.nationality": nationality,
        "booking.type": bookingType,
        "booking.groupSize":
          bookingType === "Group Booking"
            ? groupSize
            : bookingType === "Duo Booking"
            ? 2
            : 1,
        "booking.additionalGuests":
          bookingType === "Duo Booking" || bookingType === "Group Booking"
            ? additionalGuests
            : [],
        "tour.packageId": tourPackage,
        "tour.packageName": selectedPackage?.name || "",
        "tour.date": tourDate,
        "payment.status": "reserve_paid",
        "payment.stripeIntentId": paymentIntentId,
        "timestamps.updatedAt": serverTimestamp(),
      };

      console.log("📤 Update data:", updateData);

      // Update the stripePayments document
      let actualPaymentDocId = paymentDocId;
      if (paymentDocId) {
        console.log("📝 Updating payment document by ID:", paymentDocId);
        await updateDoc(doc(db, "stripePayments", paymentDocId), updateData);
        console.log("✅ Payment document updated!");
      } else {
        console.warn(
          "⚠️ No payment document ID provided, falling back to query by stripeIntentId"
        );

        const paymentsRef = collection(db, "stripePayments");
        const q = query(
          paymentsRef,
          where("payment.stripeIntentId", "==", paymentIntentId)
        );
        const querySnapshot = await getDocs(q);

        console.log("🔍 Found documents by query:", querySnapshot.size);

        if (!querySnapshot.empty) {
          const paymentDoc = querySnapshot.docs[0];
          actualPaymentDocId = paymentDoc.id;
          console.log("📝 Updating payment document:", paymentDoc.id);
          await updateDoc(doc(db, "stripePayments", paymentDoc.id), updateData);
          console.log("✅ Payment document updated via query!");
        } else {
          console.error(
            "❌ Payment document not found for paymentIntentId:",
            paymentIntentId
          );
        }
      }

      // Now call the create-booking API to create the actual booking document
      if (actualPaymentDocId) {
        console.log("📤 Creating booking via API...");
        const response = await fetch("/api/stripe-payments/create-booking", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentDocId: actualPaymentDocId,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          console.log("✅ Booking created successfully:", result);
          setBookingId(result.bookingId);

          // Create notification for Step 2 payment
          try {
            const { createReservationPaymentNotification } = await import(
              "@/utils/notification-service"
            );
            await createReservationPaymentNotification({
              bookingId: result.bookingId,
              bookingDocumentId: result.bookingDocumentId,
              travelerName: `${firstName} ${lastName}`,
              tourPackageName: selectedPackage?.name || "",
              amount: (selectedPackage as any)?.reservationFee || 0,
              currency: "EUR",
            });
          } catch (error) {
            console.error("Failed to create notification:", error);
            // Continue anyway - don't block user
          }

          // Send guest invitations if this is a Duo/Group booking
          if (
            (bookingType === "Duo Booking" ||
              bookingType === "Group Booking") &&
            additionalGuests.length > 0 &&
            actualPaymentDocId
          ) {
            console.log("📧 Sending guest invitations...");
            try {
              // Import Firebase Functions
              const { getFunctions, httpsCallable } = await import(
                "firebase/functions"
              );
              const { functions } = await import("@/lib/firebase");

              // Call the Cloud Function to send invitations
              const sendGuestInvitations = httpsCallable(
                functions,
                "sendGuestInvitationEmails"
              );
              const invitationResult = await sendGuestInvitations({
                paymentDocId: actualPaymentDocId,
              });

              console.log("✅ Guest invitations sent:", invitationResult.data);
            } catch (inviteError) {
              console.error(
                "❌ Failed to send guest invitations:",
                inviteError
              );
              // Don't block the flow - admin can resend later
            }
          }
        } else {
          console.error("❌ Failed to create booking:", result.error);
          // Still proceed - booking might be created by webhook later
        }
      }

      // Clean up session storage after successful payment
      try {
        const sessionKey = `stripe_payment_${email}_${tourPackage}`;
        // remove only the ephemeral client secret entry but keep the
        // payment document id so we can continue to payment-plan step
        sessionStorage.removeItem(sessionKey);
        
        // Also clean up additional guests sessionStorage after payment
        const guestsSessionKey = `additional_guests_${email}_${tourPackage}`;
        sessionStorage.removeItem(guestsSessionKey);
      } catch (e) {
        console.warn("Failed to clean up session storage:", e);
      }

      setPaymentConfirmed(true);
      if (!completedSteps.includes(1)) {
        setCompletedSteps((prev) => [...prev, 1]);
      }
      if (!completedSteps.includes(2)) {
        setCompletedSteps((prev) => [...prev, 2]);
      }
    } catch (error) {
      console.error("❌ Error in payment success handler:", error);
      // Do NOT set paymentConfirmed if there was an error - the payment status update failed
      alert(
        "Payment processing encountered an error. Please refresh the page and verify your payment status."
      );
    }
  };

  // Fetch tour packages live from Firestore
  useEffect(() => {
    const q = collection(db, "tourPackages");
    const unsub = onSnapshot(
      q,
      (snap) => {
        const pkgList = snap.docs.map((doc) => {
          const payload = doc.data() as any;

          // Normalize travelDates to yyyy-mm-dd
          const dates = (payload.travelDates ?? [])
            .map((t: any) => {
              const sd = t?.startDate;
              if (!sd) return null;

              let dateObj: Date | null = null;
              if (
                sd &&
                typeof sd === "object" &&
                "seconds" in sd &&
                typeof sd.seconds === "number"
              ) {
                dateObj = new Date(sd.seconds * 1000);
              } else if (
                sd &&
                typeof sd === "object" &&
                typeof sd.toDate === "function"
              ) {
                try {
                  dateObj = sd.toDate();
                } catch {
                  dateObj = null;
                }
              } else {
                dateObj = new Date(sd);
              }

              if (!dateObj || isNaN(dateObj.getTime())) return null;

              return dateObj.toISOString().slice(0, 10);
            })
            .filter(Boolean) as string[];

          if (dates.length === 0) {
            console.warn(
              `Tour package "${
                payload.name ?? payload.title ?? doc.id
              }" has no valid tour dates.`
            );
          }

          const name = payload.name ?? payload.title ?? "";
          const slugFromPayload = payload.slug || payload.slugified || null;
          const slugify = (s: string) =>
            s
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, "")
              .trim()
              .replace(/\s+/g, "-");

          // Get cover image from media.coverImage first, then fallback
          const coverImage =
            payload.media?.coverImage ||
            payload.coverImage ||
            payload.image ||
            null;

          // Get highlights from details.highlights (new structure) or root highlights (old structure)
          const highlights =
            payload.details?.highlights || payload.highlights || [];

          if (DEBUG && highlights.length > 0) {
            console.log("Tour highlights for", name, ":", highlights);
          }

          // Extract detailed travel date info including custom pricing
          const travelDateDetails = (payload.travelDates ?? []).map((t: any) => {
            const sd = t?.startDate;
            if (!sd) return null;

            let dateObj: Date | null = null;
            if (sd && typeof sd === "object" && "seconds" in sd && typeof sd.seconds === "number") {
              dateObj = new Date(sd.seconds * 1000);
            } else if (sd && typeof sd === "object" && typeof sd.toDate === "function") {
              try { dateObj = sd.toDate(); } catch { dateObj = null; }
            } else {
              dateObj = new Date(sd);
            }

            if (!dateObj || isNaN(dateObj.getTime())) return null;

            return {
              date: dateObj.toISOString().slice(0, 10),
              customDeposit: t.customDeposit,
              customOriginal: t.customOriginal
            };
          }).filter(Boolean);

          return {
            id: doc.id,
            name,
            slug: slugFromPayload || (name ? slugify(name) : doc.id),
            travelDates: dates,
            travelDateDetails: travelDateDetails,
            stripePaymentLink: payload.stripePaymentLink,
            status: payload.status || "active",
            deposit: payload.pricing?.deposit ?? 250,
            price: payload.pricing?.original ?? 2050,
            coverImage: coverImage,
            duration: payload.duration || null,
            highlights: highlights,
            destinations:
              payload.destinations || payload.details?.destinations || [],
            description: payload.description || payload.summary || "",
            region: payload.region || payload.country || "",
            country: payload.country || "",
            rating: payload.rating || 4.8,
            media: payload.media,
          };
        });

        if (DEBUG) {
          console.log("📦 Loaded tour packages:", pkgList.length);
          console.log("Sample cover image:", pkgList[0]?.coverImage);
        }

        setTourPackages(pkgList as any);
        setIsLoadingPackages(false);
      },
      (err) => {
        console.error("tourPackages snapshot error", err);
        setIsLoadingPackages(false);
      }
    );

    return () => unsub();
  }, []);

  // Fetch payment terms from Firestore
  useEffect(() => {
    const q = collection(db, "paymentTerms");
    const unsub = onSnapshot(
      q,
      (snap) => {
        const terms = snap.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              description: data.description,
              paymentPlanType: data.paymentPlanType,
              monthsRequired: data.monthsRequired,
              monthlyPercentages: data.monthlyPercentages,
              color: data.color,
            };
          })
          .sort((a, b) => {
            const order = [
              "p1_single_installment",
              "p2_two_installments",
              "p3_three_installments",
              "p4_four_installments",
            ];
            return (
              order.indexOf(a.paymentPlanType) -
              order.indexOf(b.paymentPlanType)
            );
          });
        setPaymentTerms(terms);
      },
      (err) => console.error("paymentTerms snapshot error", err)
    );

    return () => unsub();
  }, []);

  // update available tourDates when selected tourPackage changes
  useEffect(() => {
    // restore paymentDocId from sessionStorage if present (survives refresh)
    try {
      if (!paymentDocId && email && tourPackage) {
        const key = `stripe_payment_doc_${email}_${tourPackage}`;
        const id = sessionStorage.getItem(key);
        if (id) {
          (async () => {
            try {
              const { doc, getDoc } = await import("firebase/firestore");
              const snap = await getDoc(doc(db, "stripePayments", id));
              if (snap.exists()) {
                setPaymentDocId(id);
                try {
                  replaceWithPaymentId(id);
                } catch {}
              } else {
                // document no longer exists — remove the stale session key
                try {
                  sessionStorage.removeItem(key);
                } catch {}
              }
            } catch (err) {
              // if firestore check fails, fall back to setting the id conservatively
              console.warn(
                "Failed to validate payment doc, preserving session id:",
                err
              );
              setPaymentDocId(id);
            }
          })();
        }
      }
    } catch {}

    // Clean up any old session storage entries on component mount
    const cleanupOldSessions = () => {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (
          key &&
          (key.startsWith("stripe_payment_") ||
           key.startsWith("additional_guests_")) &&
          !key.includes(email) &&
          !key.includes(tourPackage)
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    };

    cleanupOldSessions();

    // If packages are still loading, don't attempt to validate/clear the selected package.
    // This prevents the session restore from being immediately clobbered while the
    // live `tourPackages` snapshot hasn't arrived yet.
    if (isLoadingPackages) return;

    if (!tourPackage) return;
    const pkg = tourPackages.find((p) => p.id === tourPackage);
    if (!pkg || pkg.status === "inactive") {
      setTourPackage("");
      setTourDates([]);
      setTourDate("");
      return;
    }

    setTourDates(pkg?.travelDates ?? []);
    // If the previously selected tourDate is not valid for this package, clear it.
    if (tourDate && !pkg.travelDates.includes(tourDate)) {
      setTourDate("");
    }
  }, [
    tourPackage,
    tourPackages,
    email,
    isLoadingPackages,
    paymentDocId,
    tourDate,
  ]);

  // On mount: if there's a stored stripe payment doc id, preload the form
  useEffect(() => {
    let mounted = true;

    setSessionLoading(true);

    const loadFromSession = async () => {
      try {
        // First, check if there's a paymentid in the URL query params
        const urlPaymentId = searchParams?.get("paymentid");

        if (urlPaymentId) {
          // When we have a URL paymentid, check if it's a terms_selected status
          // If so, load it directly without requiring sessionStorage
          try {
            const { doc, getDoc } = await import("firebase/firestore");
            const snap = await getDoc(doc(db, "stripePayments", urlPaymentId));

            if (snap.exists()) {
              const data = snap.data() as any;

              // Only auto-load from URL if status is terms_selected (booking completed)
              if (data.payment?.status === "terms_selected") {
                if (DEBUG)
                  console.debug("URL restore (terms_selected): loading doc", {
                    urlPaymentId,
                    data,
                  });

                if (!mounted) return;

                setPaymentDocId(urlPaymentId);

                // Populate form fields from stored doc
                if (data.customer?.email) setEmail(data.customer.email);
                if (data.customer?.firstName)
                  setFirstName(data.customer.firstName);
                if (data.customer?.lastName)
                  setLastName(data.customer.lastName);
                if (data.customer?.birthdate)
                  setBirthdate(data.customer.birthdate);
                if (data.customer?.nationality)
                  setNationality(data.customer.nationality);
                if (data.customer?.whatsAppNumber) {
                  // Parse the stored WhatsApp number to extract country and number
                  const fullNumber = data.customer.whatsAppNumber;
                  if (fullNumber && fullNumber.startsWith("+")) {
                    // Find matching country by calling code
                    let foundCountry = false;
                    for (const country of getCountries()) {
                      const callingCode = safeGetCountryCallingCode(country);
                      if (fullNumber.startsWith(`+${callingCode}`)) {
                        setWhatsAppCountry(country);
                        setWhatsAppNumber(
                          fullNumber.slice(callingCode.length + 1)
                        );
                        foundCountry = true;
                        break;
                      }
                    }
                    if (!foundCountry) {
                      // Fallback: just remove the + and set as-is
                      setWhatsAppNumber(fullNumber.replace(/^\+/, ""));
                    }
                  }
                }
                const loadedBookingType = data.booking?.type || "Single Booking";
                const loadedGroupSize = data.booking?.groupSize || 3;
                
                if (data.booking?.type) setBookingType(loadedBookingType);
                if (typeof data.booking?.groupSize === "number")
                  setGroupSize(loadedGroupSize);
                
                // Set guestsMounted to true for Duo/Group bookings
                if (loadedBookingType === "Duo Booking" || loadedBookingType === "Group Booking") {
                  setGuestsMounted(true);
                  // Schedule height calculation after state updates
                  setTimeout(() => {
                    const contentHeight = guestsContentRef.current?.scrollHeight ?? 0;
                    if (contentHeight > 0) {
                      setGuestsHeight(`${contentHeight}px`);
                    }
                  }, 0);
                }
                
                // Handle additional guests based on booking type
                if (Array.isArray(data.booking?.additionalGuests)) {
                  if (loadedBookingType === "Duo Booking") {
                    const guest = data.booking.additionalGuests[0] || "";
                    setAdditionalGuests([guest]);
                  } else if (loadedBookingType === "Group Booking") {
                    const maxGuests = Math.max(0, loadedGroupSize - 1);
                    const existingGuests = data.booking.additionalGuests.slice(0, maxGuests);
                    while (existingGuests.length < maxGuests) {
                      existingGuests.push("");
                    }
                    setAdditionalGuests(existingGuests);
                  } else {
                    setAdditionalGuests([]);
                  }
                } else if (loadedBookingType === "Duo Booking") {
                  setAdditionalGuests([""]);
                } else if (loadedBookingType === "Group Booking") {
                  const guestCount = Math.max(0, loadedGroupSize - 1);
                  setAdditionalGuests(Array(guestCount).fill(""));
                } else {
                  setAdditionalGuests([]);
                }
                if (data.tour?.packageId) setTourPackage(data.tour.packageId);
                if (data.tour?.date) setTourDate(data.tour.date);

                // Show booking confirmation
                setPaymentConfirmed(true);
                setBookingConfirmed(true);
                if (data.booking?.id) setBookingId(data.booking.id);
                if (data.payment?.selectedPaymentPlan)
                  setSelectedPaymentPlan(data.payment.selectedPaymentPlan);
                setStep(3);
                setCompletedSteps([1, 2, 3]);

                return; // Exit early, we're done
              }
            }
          } catch (err) {
            console.warn("Failed to load payment from URL:", err);
          }
        }

        // Otherwise, look for sessionStorage keys (existing behavior)
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (!key) continue;
          if (key.startsWith("stripe_payment_doc_")) {
            const docId = sessionStorage.getItem(key);
            if (DEBUG)
              console.debug("session restore: found key", { key, docId });
            if (!docId) continue;

            // fetch the stripePayments document
            try {
              const { doc, getDoc } = await import("firebase/firestore");
              const snap = await getDoc(doc(db, "stripePayments", docId));
              if (!snap.exists()) {
                // remove stale session key for missing document
                try {
                  sessionStorage.removeItem(key);
                } catch {}
                if (DEBUG)
                  console.debug("session restore: doc missing, removed key", {
                    key,
                    docId,
                  });
                continue;
              }
              const data = snap.data() as any;
              if (DEBUG)
                console.debug("session restore: loaded doc", { docId, data });

              if (!mounted) return;

              // Set paymentDocId early to avoid race with tour query param sync
              setPaymentDocId(docId);
              if (DEBUG)
                console.debug("session restore: setPaymentDocId", docId);
              try {
                replaceWithPaymentId(docId);
              } catch (err) {
                console.debug(
                  "Failed to set paymentid query param on session restore:",
                  err
                );
              }

              // Populate form fields from stored doc (nested structure)
              if (data.customer?.email) setEmail(data.customer.email);
              if (data.customer?.firstName)
                setFirstName(data.customer.firstName);
              if (data.customer?.lastName) setLastName(data.customer.lastName);
              if (data.customer?.birthdate)
                setBirthdate(data.customer.birthdate);
              if (data.customer?.nationality)
                setNationality(data.customer.nationality);
              if (data.customer?.whatsAppNumber) {
                // Parse the stored WhatsApp number to extract country and number
                const fullNumber = data.customer.whatsAppNumber;
                if (fullNumber && fullNumber.startsWith("+")) {
                  // Find matching country by calling code
                  let foundCountry = false;
                  for (const country of getCountries()) {
                    const callingCode = safeGetCountryCallingCode(country);
                    if (fullNumber.startsWith(`+${callingCode}`)) {
                      setWhatsAppCountry(country);
                      setWhatsAppNumber(
                        fullNumber.slice(callingCode.length + 1)
                      );
                      foundCountry = true;
                      break;
                    }
                  }
                  if (!foundCountry) {
                    // Fallback: just remove the + and set as-is
                    setWhatsAppNumber(fullNumber.replace(/^\+/, ""));
                  }
                }
              }
              const loadedBookingType = data.booking?.type || "Single Booking";
              const loadedGroupSize = data.booking?.groupSize || 3;
              
              if (data.booking?.type) setBookingType(loadedBookingType);
              if (typeof data.booking?.groupSize === "number")
                setGroupSize(loadedGroupSize);
              
              // Set guestsMounted to true for Duo/Group bookings
              if (loadedBookingType === "Duo Booking" || loadedBookingType === "Group Booking") {
                setGuestsMounted(true);
                // Schedule height calculation after state updates
                setTimeout(() => {
                  const contentHeight = guestsContentRef.current?.scrollHeight ?? 0;
                  if (contentHeight > 0) {
                    setGuestsHeight(`${contentHeight}px`);
                  }
                }, 0);
              }
              
              // Handle additional guests based on booking type
              if (Array.isArray(data.booking?.additionalGuests)) {
                if (loadedBookingType === "Duo Booking") {
                  const guest = data.booking.additionalGuests[0] || "";
                  setAdditionalGuests([guest]);
                } else if (loadedBookingType === "Group Booking") {
                  const maxGuests = Math.max(0, loadedGroupSize - 1);
                  const existingGuests = data.booking.additionalGuests.slice(0, maxGuests);
                  while (existingGuests.length < maxGuests) {
                    existingGuests.push("");
                  }
                  setAdditionalGuests(existingGuests);
                } else {
                  setAdditionalGuests([]);
                }
              } else if (loadedBookingType === "Duo Booking") {
                setAdditionalGuests([""]);
              } else if (loadedBookingType === "Group Booking") {
                const guestCount = Math.max(0, loadedGroupSize - 1);
                setAdditionalGuests(Array(guestCount).fill(""));
              } else {
                setAdditionalGuests([]);
              }
              if (data.tour?.packageId) setTourPackage(data.tour.packageId);
              if (data.tour?.date) setTourDate(data.tour.date);

              // Advance to the appropriate step based on status
              console.log(
                "🔍 DEBUG: Session restore - Payment status:",
                data.payment?.status
              );
              console.log(
                "🔍 DEBUG: Session restore - Payment intent ID:",
                data.payment?.stripeIntentId
              );
              console.log("🔍 DEBUG: Session restore - Document ID:", docId);

              if (data.payment?.status === "reserve_pending") {
                console.log(
                  "✅ DEBUG: Status is reserve_pending, staying on step 2"
                );
                // mark step 1 completed and go to payment step
                // update URL to reference this payment doc and remove any `tour` param
                try {
                  if (DEBUG)
                    console.debug(
                      "session restore: replacing URL with paymentid",
                      docId
                    );
                  replaceWithPaymentId(docId);
                  if (DEBUG)
                    console.debug(
                      "session restore: replaceWithPaymentId called for",
                      docId
                    );
                } catch (err) {
                  console.debug(
                    "Failed to set paymentid query param on session restore:",
                    err
                  );
                }
                setStep(2);
                setCompletedSteps((prev) => Array.from(new Set([...prev, 1])));
                console.log(
                  "✅ DEBUG: Set step to 2, paymentConfirmed should be false"
                );
              } else if (data.payment?.status === "reserve_paid") {
                console.log(
                  "⚠️ DEBUG: Status is reserve_paid, verifying payment..."
                );
                // Verify payment with Stripe before showing as confirmed
                const stripeIntentId = data.payment?.stripeIntentId;

                if (stripeIntentId) {
                  try {
                    console.log("🔍 Verifying payment on page load...");
                    const verifyResponse = await fetch(
                      `/api/stripe-payments/verify-payment?paymentIntentId=${stripeIntentId}`
                    );
                    const verifyResult = await verifyResponse.json();

                    if (
                      !verifyResponse.ok ||
                      verifyResult.status !== "succeeded"
                    ) {
                      console.error(
                        "❌ Payment verification failed on load:",
                        verifyResult
                      );
                      // Payment didn't actually succeed - update status to pending
                      const { doc: firestoreDoc, updateDoc } = await import(
                        "firebase/firestore"
                      );
                      await updateDoc(
                        firestoreDoc(db, "stripePayments", docId),
                        {
                          "payment.status": "reserve_pending",
                        }
                      );

                      // Go to payment step instead
                      try {
                        replaceWithPaymentId(docId);
                      } catch (err) {
                        console.debug(
                          "Failed to set paymentid query param:",
                          err
                        );
                      }
                      setStep(2);
                      setCompletedSteps((prev) =>
                        Array.from(new Set([...prev, 1]))
                      );
                      alert(
                        "Payment verification failed. The payment was not completed. Please try again."
                      );
                      return; // Exit early
                    }
                    console.log("✅ Payment verified successfully on load");
                  } catch (err) {
                    console.error("Error verifying payment on load:", err);
                    // If verification fails, proceed cautiously to payment step
                    try {
                      replaceWithPaymentId(docId);
                    } catch (err2) {
                      console.debug(
                        "Failed to set paymentid query param:",
                        err2
                      );
                    }
                    setStep(2);
                    setCompletedSteps((prev) =>
                      Array.from(new Set([...prev, 1]))
                    );
                    return;
                  }
                }

                // payment completed and verified — go to payment plan
                console.log(
                  "✅ DEBUG: Payment verified, setting paymentConfirmed to TRUE"
                );
                setPaymentConfirmed(true);
                try {
                  if (DEBUG)
                    console.debug(
                      "session restore (paid): replacing URL with paymentid",
                      docId
                    );
                  replaceWithPaymentId(docId);
                  if (DEBUG)
                    console.debug(
                      "session restore (paid): replaceWithPaymentId called for",
                      docId
                    );
                } catch (err) {
                  console.debug(
                    "Failed to set paymentid query param on session restore:",
                    err
                  );
                }
                setStep(3);
                // if bookingId present, set it so Confirm Booking can find the record
                if (data.booking?.id) setBookingId(data.booking.id);
                setCompletedSteps((prev) =>
                  Array.from(new Set([...prev, 1, 2]))
                );
              } else {
                console.log(
                  "⚠️ DEBUG: Unknown payment status:",
                  data.payment?.status,
                  "- going to step 2"
                );
                setStep(2);
                setCompletedSteps((prev) => Array.from(new Set([...prev, 1])));
              }

              // stop after first matching key
              return;
            } catch (err) {
              console.warn("Failed to load stripe payment doc:", err);
              continue;
            }
          }
        }
      } catch (e) {
        console.warn("Error while restoring session payment doc:", e);
      }
    };

    loadFromSession().finally(() => {
      if (mounted) setSessionLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Show/Hide Tour Date when a Tour Package is selected
  useEffect(() => {
    if (tourPackage) {
      setDateMounted(true);
      requestAnimationFrame(() => setDateVisible(true));
    } else {
      setDateVisible(false);
      const t = setTimeout(() => setDateMounted(false), 220);
      setTourDate("");
      setErrors((e) => ({ ...e, tourDate: "" }));
      return () => clearTimeout(t);
    }
  }, [tourPackage]);

  // Helper function to check if tour is available
  const isTourAvailable = (tour: (typeof tourPackages)[0]) => {
    // Check if tour status is Active
    if (tour.status !== "active") {
      return false;
    }

    // Check if all tour dates are too soon (within 2 days)
    if (tour.travelDates && tour.travelDates.length > 0) {
      const today = new Date();
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(today.getDate() + 2);

      const availableDates = tour.travelDates.filter((dateStr) => {
        const tourDate = new Date(dateStr);
        return tourDate > twoDaysFromNow;
      });

      // If no dates are available (all too soon)
      if (availableDates.length === 0) {
        return false;
      }
    }

    return true;
  };

  // Get availability message
  const getAvailabilityMessage = (tour: (typeof tourPackages)[0]) => {
    if (tour.status !== "active") {
      return "Currently Unavailable";
    }

    if (tour.travelDates && tour.travelDates.length > 0) {
      const today = new Date();
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(today.getDate() + 2);

      const availableDates = tour.travelDates.filter((dateStr) => {
        const tourDate = new Date(dateStr);
        return tourDate > twoDaysFromNow;
      });

      if (availableDates.length === 0) {
        return "All dates too soon - check back later";
      }
    }

    return null;
  };

  // Calculate tour popularity from bookings
  useEffect(() => {
    const calculatePopularity = async () => {
      try {
        const { collection, getDocs } = await import("firebase/firestore");
        const bookingsRef = collection(db, "bookings");
        const bookingsSnapshot = await getDocs(bookingsRef);

        const tourBookingCounts: Record<string, number> = {};

        bookingsSnapshot.docs.forEach((doc) => {
          const booking = doc.data();
          const tourName =
            booking.tourPackageName ||
            booking.tourName ||
            booking.tourPackage ||
            booking.tour;

          if (tourName) {
            tourBookingCounts[tourName] =
              (tourBookingCounts[tourName] || 0) + 1;
          }
        });

        if (DEBUG) {
          console.log("📊 Tour popularity data:", tourBookingCounts);
        }

        setPopularityData(tourBookingCounts);
      } catch (error) {
        console.error("Error calculating popularity:", error);
      }
    };

    if (!isLoadingPackages) {
      calculatePopularity();
    }
  }, [isLoadingPackages]);

  // Filter tours based on search and filters
  useEffect(() => {
    let filtered = tourPackages;

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(
        (tour) =>
          tour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tour.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tour.destinations?.some((d) =>
            d.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    // Apply category filter
    if (activeFilter === "popular") {
      // Sort by booking count (most popular first)
      filtered = [...filtered].sort((a, b) => {
        const aCount = popularityData[a.name] || 0;
        const bCount = popularityData[b.name] || 0;
        return bCount - aCount; // Descending order
      });
    } else if (activeFilter === "active") {
      // Filter only active tours
      filtered = filtered.filter((tour) => tour.status === "active");
    } else if (activeFilter !== "all") {
      // Apply region/country filter
      filtered = filtered.filter(
        (tour) =>
          tour.region?.toLowerCase() === activeFilter ||
          tour.country?.toLowerCase() === activeFilter
      );
    }

    // Sort alphabetically by default (except when showing popular)
    if (activeFilter !== "popular") {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredTours(filtered);
  }, [searchQuery, activeFilter, tourPackages, popularityData]);

  // Initialize selectedTourId when modal opens with pre-selected tour
  useEffect(() => {
    if (showTourModal && tourPackage) {
      setSelectedTourId(tourPackage);
    } else if (!showTourModal) {
      // Reset selected tour when modal closes if it wasn't confirmed
      if (selectedTourId !== tourPackage) {
        setSelectedTourId(null);
      }
    }
  }, [showTourModal, tourPackage, selectedTourId]);

  // Rotate highlights in the tour preview card every 5 seconds, reset on interaction
  useEffect(() => {
    if (
      selectedPackage &&
      selectedPackage.highlights &&
      selectedPackage.highlights.length > 1
    ) {
      const interval = setInterval(() => {
        setCurrentHighlightIndex(
          (prev) => (prev + 1) % (selectedPackage.highlights?.length || 1)
        );
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [selectedPackage]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (showTourModal) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
    } else {
      html.style.overflow = "auto";
      body.style.overflow = "auto";
    }

    return () => {
      html.style.overflow = "auto";
      body.style.overflow = "auto";
    };
  }, [showTourModal]);

  // Restore payment state when arriving with a paymentid in the URL
  useEffect(() => {
    if (typeof window === "undefined") return;

    const verifyPaymentFromURL = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const pid = params.get("paymentid");
        if (pid) {
          console.log(
            "🔍 DEBUG: Found paymentid in URL, verifying payment status:",
            pid
          );

          // Verify payment with Stripe before setting as confirmed
          try {
            const verifyRes = await fetch(
              `/api/stripe-payments/verify-payment?paymentIntentId=${pid}`,
              { method: "GET" }
            );

            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              console.log(
                "🔍 DEBUG: Stripe verification result for URL paymentid:",
                verifyData.status
              );

              if (verifyData.status === "succeeded") {
                console.log(
                  "✅ DEBUG: Payment verified from URL, setting paymentConfirmed to true"
                );
                // Mark payment as confirmed and ensure steps 1 and 2 are completed
                setPaymentConfirmed(true);
                setCompletedSteps((prev) => {
                  const next = new Set(prev);
                  next.add(1);
                  next.add(2);
                  return Array.from(next);
                });
              } else {
                console.log(
                  "❌ DEBUG: Payment not succeeded, status:",
                  verifyData.status
                );
              }
            } else {
              console.log("❌ DEBUG: Failed to verify payment from URL");
            }
          } catch (verifyErr) {
            console.error(
              "❌ DEBUG: Error verifying payment from URL:",
              verifyErr
            );
          }
        }
      } catch {}
    };

    verifyPaymentFromURL();
  }, []);

  // Additional guard: Keep steps 1 and 2 completed when paymentid is in URL
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const params = new URLSearchParams(window.location.search);
      const pid = params.get("paymentid");
      if (pid && paymentConfirmed) {
        // Ensure steps remain completed even after navigation
        setCompletedSteps((prev) => {
          const next = new Set(prev);
          next.add(1);
          next.add(2);
          return Array.from(next).sort();
        });
      }
    } catch {}
  }, [step, paymentConfirmed]);

  // animate additional guests area when bookingType changes (measured height)
  useEffect(() => {
    if (bookingType === "Duo Booking" || bookingType === "Group Booking") {
      setGuestsMounted(true);
      // Set the proper height for the content
      requestAnimationFrame(() => {
        const contentHeight = guestsContentRef.current?.scrollHeight ?? 0;
        if (contentHeight > 0) {
          setGuestsHeight(`${contentHeight}px`);
        }
      });
    } else {
      setGuestsHeight("0px");
      setTimeout(() => setGuestsMounted(false), ANIM_DURATION + 20);
    }
  }, [bookingType]);

  // Ensure guests section is visible when loading existing data with guests
  useEffect(() => {
    if ((bookingType === "Duo Booking" || bookingType === "Group Booking") && 
        additionalGuests.length > 0) {
      
      if (!guestsMounted) {
        setGuestsMounted(true);
      }
      
      // Calculate and set the height for the guests section
      // Use multiple retries to ensure DOM is ready
      const calculateHeight = () => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            const contentHeight = guestsContentRef.current?.scrollHeight ?? 0;
            console.log('📏 Calculating guest section height:', contentHeight, 'guestsMounted:', guestsMounted);
            if (contentHeight > 0) {
              setGuestsHeight(`${contentHeight}px`);
              console.log('✅ Guest section height updated to:', contentHeight);
            } else {
              // If height is still 0, try one more time after a longer delay
              setTimeout(() => {
                const retryHeight = guestsContentRef.current?.scrollHeight ?? 0;
                console.log('📏 Retry calculating height:', retryHeight);
                if (retryHeight > 0) {
                  setGuestsHeight(`${retryHeight}px`);
                  console.log('✅ Guest section height updated (retry) to:', retryHeight);
                }
              }, 150);
            }
          }, 100);
        });
      };
      
      calculateHeight();
    }
  }, [bookingType, additionalGuests, guestsMounted]);

  // Save additional guests to sessionStorage whenever they change
  useEffect(() => {
    if (
      (bookingType === "Duo Booking" || bookingType === "Group Booking") &&
      additionalGuests.length > 0
    ) {
      try {
        const sessionKey = `additional_guests_${email}_${tourPackage}`;
        sessionStorage.setItem(sessionKey, JSON.stringify(additionalGuests));
      } catch (err) {
        console.warn("Failed to save additional guests to sessionStorage:", err);
      }
    }
  }, [additionalGuests, email, tourPackage, bookingType]);

  // Restore additional guests from sessionStorage on mount or when session key changes
  useEffect(() => {
    if (!email || !tourPackage) return;
    if (bookingType !== "Duo Booking" && bookingType !== "Group Booking") return;
    if (sessionRestoredRef.current) return; // Prevent multiple restorations

    try {
      const sessionKey = `additional_guests_${email}_${tourPackage}`;
      const savedGuests = sessionStorage.getItem(sessionKey);
      
      if (savedGuests) {
        const parsedGuests = JSON.parse(savedGuests);
        if (Array.isArray(parsedGuests) && parsedGuests.length > 0) {
          console.log('🔄 Restoring additional guests from sessionStorage:', parsedGuests);
          
          // Mark that we've restored from session
          sessionRestoredRef.current = true;
          
          // Restore the guest emails - the other useEffect will handle visibility
          setAdditionalGuests(parsedGuests);
        }
      }
    } catch (err) {
      console.warn("Failed to restore additional guests from sessionStorage:", err);
    }
  }, [email, tourPackage, bookingType]);

  const handleAddGuest = () => {
    // For group booking, limit guests to groupSize - 1 (booker + others)
    if (bookingType === "Group Booking") {
      const maxGuests = Math.max(0, groupSize - 1);
      if (additionalGuests.length >= maxGuests) return;
      setAdditionalGuests([...additionalGuests, ""]);
      return;
    }
    // Duo booking only allows one additional guest
    if (bookingType === "Duo Booking") {
      if (additionalGuests.length >= 1) return;
      setAdditionalGuests([...additionalGuests.slice(0, 1), ""]);
      return;
    }
    return;
  };

  const handleBookingTypeChange = async (value: string) => {
    const animateToState = async (applyState: () => void) => {
      const wasMounted = guestsMounted;
      if (!wasMounted) {
        setGuestsMounted(true);
        setGuestsHeight("1px");
      }

      const startH = guestsWrapRef.current?.getBoundingClientRect().height ?? 0;
      applyState();
      await new Promise((r) => requestAnimationFrame(r));
      const targetH = guestsContentRef.current?.scrollHeight ?? 0;
      await animateHeight(startH, targetH);
    };

    // Group -> Duo
    if (bookingType === "Group Booking" && value === "Duo Booking") {
      await animateToState(() => {
        setAdditionalGuests([additionalGuests[0] ?? ""]);
        setGroupSize(2);
        setBookingType("Duo Booking");
        // Initialize 1 guest detail
        setGuestDetails([{
          email: guestDetails[0]?.email || "",
          firstName: guestDetails[0]?.firstName || "",
          lastName: guestDetails[0]?.lastName || "",
          birthdate: guestDetails[0]?.birthdate || "",
          nationality: guestDetails[0]?.nationality || "",
          whatsAppNumber: guestDetails[0]?.whatsAppNumber || "",
          whatsAppCountry: guestDetails[0]?.whatsAppCountry || "GB",
        }]);
        setActiveGuestTab(2);
      });
      return;
    }

    // Collapse to Single
    if (value === "Single Booking") {
      const startH = guestsWrapRef.current?.getBoundingClientRect().height ?? 0;
      await animateHeight(startH, 0);
      setGuestsHeight("0px");
      setAdditionalGuests([]);
      setGuestDetails([]);
      setGroupSize(3);
      setBookingType("Single Booking");
      setTimeout(() => setGuestsMounted(false), 20);
      return;
    }

    // Single/Duo -> Duo
    if (value === "Duo Booking") {
      await animateToState(() => {
        setGroupSize(2);
        setAdditionalGuests((prev) => [prev[0] ?? ""]);
        setBookingType("Duo Booking");
        // Initialize 1 guest detail
        setGuestDetails([{
          email: guestDetails[0]?.email || "",
          firstName: guestDetails[0]?.firstName || "",
          lastName: guestDetails[0]?.lastName || "",
          birthdate: guestDetails[0]?.birthdate || "",
          nationality: guestDetails[0]?.nationality || "",
          whatsAppNumber: guestDetails[0]?.whatsAppNumber || "",
          whatsAppCountry: guestDetails[0]?.whatsAppCountry || "GB",
        }]);
        setActiveGuestTab(2);
      });
      return;
    }

    // Any -> Group
    if (value === "Group Booking") {
      await animateToState(() => {
        setGroupSize((prev) => Math.max(3, prev));
        const slots = Math.max(1, Math.max(3, groupSize) - 1);
        setBookingType("Group Booking");
        setAdditionalGuests((prev) => {
          const copy = prev.slice(0, slots);
          while (copy.length < slots) copy.push("");
          return copy;
        });
        // Initialize guest details array
        const newGuestDetails: Array<{email: string; firstName: string; lastName: string; birthdate: string; nationality: string; whatsAppNumber: string; whatsAppCountry: string}> = [];
        for (let i = 0; i < slots; i++) {
          newGuestDetails.push({
            email: guestDetails[i]?.email || "",
            firstName: guestDetails[i]?.firstName || "",
            lastName: guestDetails[i]?.lastName || "",
            birthdate: guestDetails[i]?.birthdate || "",
            nationality: guestDetails[i]?.nationality || "",
            whatsAppNumber: guestDetails[i]?.whatsAppNumber || "",
            whatsAppCountry: guestDetails[i]?.whatsAppCountry || "GB",
          });
        }
        setGuestDetails(newGuestDetails);
        setActiveGuestTab(2);
      });
      return;
    }
  };

  const handleGroupSizeChange = async (val: number) => {
    if (bookingType !== "Group Booking") return;
    const clamped = Math.max(3, Math.min(20, val || 3));

    await animateGuestsContentChange(() => {
      setGroupSize(clamped);
      setAdditionalGuests((prev) => {
        const needed = clamped - 1;
        const copy = prev.slice(0, needed);
        while (copy.length < needed) copy.push("");
        return copy;
      });
      // Update guest details array
      setGuestDetails((prev) => {
        const needed = clamped - 1;
        const copy = prev.slice(0, needed);
        while (copy.length < needed) {
          copy.push({
            email: "",
            firstName: "",
            lastName: "",
            birthdate: "",
            nationality: "",
            whatsAppNumber: "",
            whatsAppCountry: "GB",
          });
        }
        return copy;
      });
    });
  };

  const handleGuestChange = (idx: number, value: string) => {
    const copy = [...additionalGuests];
    copy[idx] = value;
    setAdditionalGuests(copy);
  };

  const validate = () => {
    console.log("🔍 Starting validation...");
    const e: { [k: string]: string } = {};

    console.log("📧 Validating email:", email);
    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Enter a valid email";

    console.log("🎂 Validating birthdate:", birthdate);
    if (!birthdate) e.birthdate = "Birthdate is required";
    else {
      // Validate age is 18 or older
      const [year, month, day] = birthdate.split("-").map(Number);
      const birthDate = new Date(year, month - 1, day);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 18) e.birthdate = "Must be 18 years or older";
    }
    console.log("👤 Validating names:", { firstName, lastName });
    if (!firstName) e.firstName = "First name is required";
    if (!lastName) e.lastName = "Last name is required";
    
    console.log("🌍 Validating nationality:", nationality);
    if (!nationality) e.nationality = "Nationality is required";
    
    console.log("🎫 Validating booking details:", { bookingType, tourPackage, tourDate });
    if (!bookingType) e.bookingType = "Booking type is required";
    if (!tourPackage) e.tourPackage = "Tour name is required";
    if (tourPackage && !tourDate) e.tourDate = "Tour date is required";

    console.log("📱 Validating WhatsApp:", { whatsAppNumber, whatsAppCountry });
    if (!whatsAppNumber) {
      e.whatsAppNumber = "WhatsApp number is required";
      console.log("❌ WhatsApp number is empty");
    } else {
      const fullNumber = `+${safeGetCountryCallingCode(whatsAppCountry)}${whatsAppNumber}`;
      const isValid = isValidPhoneNumber(fullNumber);
      console.log("📱 WhatsApp validation:", { fullNumber, isValid });
      if (!isValid) {
        e.whatsAppNumber = "Invalid WhatsApp number";
        console.log("❌ WhatsApp number is invalid");
      }
    }

    // Duo/Group guests validation - check guestDetails array
    console.log("👥 Validating guest details:", {
      bookingType,
      guestDetailsLength: guestDetails.length,
      guestDetails
    });
    
    if (bookingType === "Duo Booking" || bookingType === "Group Booking") {
      const expectedLength = bookingType === "Duo Booking" ? 1 : groupSize - 1;
      console.log(`👥 Expected ${expectedLength} guests, found ${guestDetails.length}`);
      
      if (guestDetails.length === 0) {
        e.guests = "Guest details are required";
        console.log("❌ No guest details found");
      } else if (guestDetails.length !== expectedLength) {
        e.guests = `Expected ${expectedLength} guest(s), but found ${guestDetails.length}`;
        console.log(`❌ Wrong number of guests`);
      } else {
        // Validate each guest's details
        guestDetails.forEach((guest, idx) => {
          console.log(`👤 Validating guest ${idx + 1}:`, guest);
          
          if (!guest.email) {
            e[`guest-${idx}-email`] = `Guest ${idx + 1} email is required`;
            console.log(`❌ Guest ${idx + 1} email missing`);
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)) {
            e[`guest-${idx}-email`] = `Guest ${idx + 1} email is invalid`;
            console.log(`❌ Guest ${idx + 1} email invalid`);
          }
          
          if (!guest.firstName) {
            e[`guest-${idx}-firstName`] = `Guest ${idx + 1} first name is required`;
            console.log(`❌ Guest ${idx + 1} firstName missing`);
          }
          
          if (!guest.lastName) {
            e[`guest-${idx}-lastName`] = `Guest ${idx + 1} last name is required`;
            console.log(`❌ Guest ${idx + 1} lastName missing`);
          }
          
          if (!guest.birthdate) {
            e[`guest-${idx}-birthdate`] = `Guest ${idx + 1} birthdate is required`;
            console.log(`❌ Guest ${idx + 1} birthdate missing`);
          }
          
          if (!guest.nationality) {
            e[`guest-${idx}-nationality`] = `Guest ${idx + 1} nationality is required`;
            console.log(`❌ Guest ${idx + 1} nationality missing`);
          }
          
          if (!guest.whatsAppNumber) {
            e[`guest-${idx}-whatsAppNumber`] = `Guest ${idx + 1} WhatsApp is required`;
            console.log(`❌ Guest ${idx + 1} whatsAppNumber missing`);
          } else {
            const fullNumber = `+${safeGetCountryCallingCode(guest.whatsAppCountry)}${guest.whatsAppNumber}`;
            const isValid = isValidPhoneNumber(fullNumber);
            console.log(`📱 Guest ${idx + 1} WhatsApp validation:`, { fullNumber, isValid });
            if (!isValid) {
              e[`guest-${idx}-whatsAppNumber`] = `Guest ${idx + 1} WhatsApp is invalid`;
              console.log(`❌ Guest ${idx + 1} whatsAppNumber invalid`);
            }
          }
        });
      }
    }

    // Legacy additionalGuests validation (keeping for backward compatibility)
    if (
      (bookingType === "Duo Booking" || bookingType === "Group Booking") &&
      additionalGuests.length
    ) {
      additionalGuests.forEach((g, idx) => {
        if (!g.trim())
          e[`guest-${idx}`] = `Guest #${idx + 1} email is required`;
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g))
          e[`guest-${idx}`] = `Guest #${idx + 1} enter a valid email`;
      });
    }

    console.log("📋 Validation errors:", e);
    console.log("✅ Validation result:", Object.keys(e).length === 0 ? "PASSED" : "FAILED");

    // Auto-focus the first guest tab that has an error so the user can see missing fields
    const firstGuestErrorKey = Object.keys(e).find((key) =>
      key === "guests" || key.startsWith("guest-")
    );
    if (firstGuestErrorKey) {
      const match = firstGuestErrorKey.match(/^guest-(\d+)/);
      if (match) {
        const guestIdx = Number(match[1]);
        // guestIdx is zero-based; tabs are 1 (main) then 2... for guests
        setActiveGuestTab(guestIdx + 2);
        console.log("🔎 Focusing guest tab", guestIdx + 2, "due to validation error");
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (ev?: React.FormEvent) => {
    ev?.preventDefault();

    // Don't process form submission in Step 2 or 3 (payment/plan selection)
    if (step === 2 || step === 3) {
      return;
    }

    if (!validate()) return;
    console.log({ email, firstName, lastName });
    setSubmitted(true);
  };

  // Handle tour selection confirmation from modal
  const handleConfirmTourSelection = () => {
    const tour = tourPackages.find((t) => t.id === selectedTourId);
    if (!tour) return;

    if (isTourAllDatesTooSoon(tour)) {
      alert(
        "All available dates for this tour are too soon. Please choose another tour."
      );
      return;
    }

    setTourPackage(tour.id);
    setShowTourModal(false);
    setSearchQuery("");
    setActiveFilter("all");

    // Scroll to tour date or next section after selection with smoother animation
    setTimeout(() => {
      const tourDateSection = document.querySelector(
        '[aria-label="Tour Date"]'
      );
      if (tourDateSection) {
        tourDateSection.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 400);
  };

  const handleConfirmBooking = async () => {
    try {
      setConfirmingBooking(true);

      // Check if payment plan is selected (not required for full payment bookings)
      if (!availablePaymentTerm.isLastMinute && !selectedPaymentPlan) {
        alert("Please select a payment plan to continue");
        return;
      }

      // For full payment bookings, use "full_payment" as the payment plan
      const paymentPlanToSend = availablePaymentTerm.isLastMinute
        ? "full_payment"
        : selectedPaymentPlan;

      console.log(
        "🎯 Confirming booking with payment plan:",
        paymentPlanToSend
      );

      // Get the selected payment plan details
      const availablePlans = getAvailablePaymentPlans();
      const selectedPlan = availablePlans.find(
        (plan) =>
          plan.id === selectedPaymentPlan || plan.type === selectedPaymentPlan
      );

      // Find the payment document by bookingId or paymentDocId
      const { collection, query, where, getDocs } = await import(
        "firebase/firestore"
      );

      const paymentsRef = collection(db, "stripePayments");
      let q: any;

      // If bookingId exists, use it; otherwise try paymentDocId
      if (bookingId) {
        q = query(paymentsRef, where("booking.id", "==", bookingId));
      } else if (paymentDocId) {
        // If paymentDocId exists, we can use it directly below
        console.log("📝 Using paymentDocId directly:", paymentDocId);
      } else {
        throw new Error(
          "No booking or payment document found. Please complete payment first."
        );
      }

      const querySnapshot = bookingId
        ? await getDocs(q)
        : { empty: false, docs: [] };

      if (!querySnapshot.empty || paymentDocId) {
        const paymentDocIdToUse =
          paymentDocId ||
          (querySnapshot.docs.length > 0 ? querySnapshot.docs[0].id : null);

        if (!paymentDocIdToUse) {
          throw new Error("Payment document ID not found");
        }

        console.log(
          "📝 Updating booking with payment plan via API:",
          paymentDocIdToUse
        );

        // Call the select-plan API to update both stripePayments and bookings
        const response = await fetch("/api/stripe-payments/select-plan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentDocId: paymentDocIdToUse,
            selectedPaymentPlan: paymentPlanToSend,
            paymentPlanDetails: selectedPlan || null,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error("❌ Select plan API error:", result.error);
          alert(
            result.error || "Error confirming your booking. Please try again."
          );
          return;
        }

        console.log("✅ Booking confirmed successfully!", result);

        // Send booking status confirmation email with QR code
        try {
          console.log("📧 Sending booking status confirmation email...");
          const emailResponse = await fetch(
            "/api/send-booking-status-confirmation",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                bookingDocumentId: result.bookingDocumentId,
                email: email,
              }),
            }
          );

          const emailResult = await emailResponse.json();

          if (emailResponse.ok) {
            console.log(
              "✅ Booking status confirmation email sent!",
              emailResult
            );
          } else {
            console.warn(
              "⚠️ Failed to send booking status email:",
              emailResult.error
            );
            // Don't block the user flow if email fails
          }
        } catch (emailError) {
          console.warn("⚠️ Error sending booking status email:", emailError);
          // Don't block the user flow if email fails
        }

        // Clean up session storage now that the booking is fully confirmed
        try {
          const docSessionKey = `stripe_payment_doc_${email}_${tourPackage}`;
          sessionStorage.removeItem(docSessionKey);
          const sessionKey = `stripe_payment_${email}_${tourPackage}`;
          sessionStorage.removeItem(sessionKey);
        } catch (e) {
          console.warn(
            "Failed to remove session storage after confirmation:",
            e
          );
        }

        setBookingConfirmed(true);
      } else {
        throw new Error(
          "Payment document not found. Please complete payment first."
        );
      }
    } catch (error) {
      console.error("❌ Error confirming booking:", error);
      alert(
        "An error occurred while confirming your booking. Please try again."
      );
    } finally {
      setConfirmingBooking(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-background relative theme-transition`}
      style={{
        overflow: showTourModal ? "hidden" : "auto",
      }}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-crimson-red/5 via-sunglow-yellow/5 to-spring-green/5 dark:from-crimson-red/20 dark:via-creative-midnight/30 dark:to-spring-green/20 animate-gradient-shift bg-[length:200%_200%]" />
      </div>

      {/* Theme Toggle Button */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Email-check modal shown when existing stripePayments are found for this email */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {foundStripePayments.length > 0 &&
              (foundStripePayments[0]?.payment?.status === "reserve_paid" ||
                foundStripePayments[0]?.status === "reserve_paid")
                ? "Complete Your Booking"
                : "Existing Reservation Found"}
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
                (foundStripePayments[0]?.payment?.status === "reserve_paid" ||
                  foundStripePayments[0]?.status === "reserve_paid") &&
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
                (foundStripePayments[0]?.payment?.status ===
                  "reserve_pending" ||
                  foundStripePayments[0]?.status === "reserve_pending" ||
                  foundStripePayments[0]?.status === "pending") && (
                  <p className="text-sm text-muted-foreground">
                    We found {foundStripePayments.length} pending reservation
                    {foundStripePayments.length !== 1 ? "s" : ""} for this tour.
                    You can continue with an existing reservation or start
                    fresh.
                  </p>
                )}

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {foundStripePayments.map((rec) => {
                  const status = rec?.payment?.status || rec?.status;
                  const tourName =
                    rec?.tour?.packageName ||
                    rec?.tourPackageName ||
                    "Unknown Tour";
                  const tourDate =
                    rec?.tour?.date || rec?.tourDate || "No date set";
                  const amount = rec?.payment?.amount || rec?.amountGBP || 0;
                  const createdAt = rec?.timestamps?.createdAt;
                  let createdDate = "Unknown date";
                  if (createdAt && typeof createdAt.toDate === "function") {
                    createdDate = createdAt.toDate().toLocaleDateString();
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
                            status === "reserve_paid"
                              ? rec._hasPaymentPlan
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                              : status === "terms_selected"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                          }`}
                        >
                          {status === "reserve_paid"
                            ? rec._hasPaymentPlan
                              ? "Confirmed"
                              : "Awaiting Plan"
                            : status === "terms_selected"
                            ? "Confirmed"
                            : "Pending Payment"}
                        </span>
                      </div>

                      <p className="text-sm">
                        Reservation Fee: £{amount.toFixed(2)}
                      </p>

                      <div className="flex gap-2">
                        {status === "reserve_paid" ||
                        status === "terms_selected" ? (
                          <button
                            onClick={() => handleReuseExisting(rec)}
                            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition font-medium"
                          >
                            {rec._hasPaymentPlan || status === "terms_selected"
                              ? "View Booking"
                              : "Complete Payment Plan"}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleReuseExisting(rec)}
                              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition"
                              disabled={isCreatingPayment}
                            >
                              {isCreatingPayment ? "Processing..." : "Use This"}
                            </button>
                            {status !== "terms_selected" && (
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
                          err
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
                  if (completedSteps.includes(1) && !completedSteps.includes(2)) {
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
            <div className="mt-6 rounded-2xl bg-background dark:bg-card/80 dark:backdrop-blur-md border border-sunglow-yellow/20 dark:border-crimson-red/30 shadow-lg dark:shadow-xl overflow-hidden transition-all duration-300 hover:border-crimson-red hover:shadow-crimson-red/20 hover:shadow-xl">
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
                        {getStepDescription()}
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
            {/* STEP 1 - Personal & Reservation Details */}
            {step === 1 && (
              <div className="rounded-2xl bg-background dark:bg-card/80 dark:backdrop-blur-md p-6 sm:p-8 border border-sunglow-yellow/20 dark:border-crimson-red/30 shadow-lg dark:shadow-xl transition-all duration-300 hover:border-crimson-red hover:shadow-crimson-red/20 hover:shadow-xl">
                {/* Show locked message if payment confirmed */}
                {paymentConfirmed && (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-md mb-4">
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-5 w-5 text-amber-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M12 15v-3m0 0V9m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-sm font-medium text-foreground">
                        Booking details are locked after payment
                      </span>
                    </div>
                  </div>
                )}
                <div
                  className={`space-y-4 transition-all duration-300 ${
                    clearing ? "opacity-0" : "opacity-100"
                  }`}
                >
                  {/* Tour Selection Section - Moved to top */}
                  <div>
                    <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-border/50">
                      <div className="p-4 bg-crimson-red rounded-full rounded-br-none">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                          />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-foreground">
                        Tour Selection
                      </h3>
                    </div>

                    {/* Tour Name and Tour Date in same row */}
                    <div className="grid grid-cols-1 md:grid-cols-[70%_30%] gap-4 items-start mb-6">
                      {/* Tour name */}
                      <label
                        className={`block ${
                          !selectedPackage ? "md:col-span-2" : ""
                        }`}
                      >
                        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                          Tour name
                          <span className="text-destructive text-xs">*</span>
                        </span>
                        {isLoadingPackages ? (
                          <div className="mt-1 px-4 py-3 rounded-lg bg-input/50 border-2 border-border backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                              <span className="text-muted-foreground">
                                Loading tour names...
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="tour-selector-trigger mt-1 relative">
                            {selectedPackage ? (
                              <div className="relative">
                                <div
                                  className="selected-tour-mini-card flex items-center gap-4 p-3 border-2 border-border rounded-xl bg-card hover:border-primary/50 transition-all duration-300 cursor-pointer animate-slideInScale"
                                  onClick={() =>
                                    !paymentConfirmed && setShowTourModal(true)
                                  }
                                >
                                  <div className="mini-card-image w-16 h-14 rounded-lg overflow-hidden flex-shrink-0">
                                    {selectedPackage.coverImage ? (
                                      <img
                                        src={selectedPackage.coverImage}
                                        alt={selectedPackage.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                                        <svg
                                          className="w-6 h-6 text-muted-foreground"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                          />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mini-card-content flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-foreground truncate">
                                      {selectedPackage.name}
                                    </h4>
                                    {selectedPackage.duration && (
                                      <span className="mini-card-meta flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                        <svg
                                          className="w-3.5 h-3.5"
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
                                        {selectedPackage.duration}
                                      </span>
                                    )}
                                  </div>
                                  {!paymentConfirmed && (
                                    <button
                                      type="button"
                                      className="change-tour-btn px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:brightness-95 transition-all flex-shrink-0 hover:-translate-y-0.5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowTourModal(true);
                                      }}
                                    >
                                      Change
                                    </button>
                                  )}
                                </div>

                                {/* Tour Highlights Button - Top Right */}
                                {selectedPackage.highlights &&
                                  selectedPackage.highlights.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setHighlightsExpanded(
                                          !highlightsExpanded
                                        );
                                      }}
                                      className="absolute -top-2 -right-2 p-2 rounded-full bg-sunglow-yellow text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 z-10"
                                      title="View tour highlights"
                                    >
                                      <svg
                                        className="w-5 h-5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    </button>
                                  )}

                                {/* Tour Highlights Popup */}
                                <AnimatePresence>
                                  {highlightsExpanded &&
                                    selectedPackage.highlights &&
                                    selectedPackage.highlights.length > 0 && (
                                      <motion.div
                                        initial={{
                                          opacity: 0,
                                          scale: 0.8,
                                          y: -10,
                                        }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{
                                          opacity: 0,
                                          scale: 0.8,
                                          y: -10,
                                        }}
                                        transition={{
                                          duration: 0.3,
                                          ease: [0.4, 0, 0.2, 1],
                                        }}
                                        className="absolute top-12 right-0 w-96 max-h-[32rem] overflow-hidden bg-card border-2 border-sunglow-yellow/30 rounded-xl shadow-2xl z-20"
                                      >
                                        {/* Header */}
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                                          <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-sunglow-yellow/20">
                                              <svg
                                                className="w-4 h-4 text-sunglow-yellow"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                              >
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                              </svg>
                                            </div>
                                            <h3 className="text-sm font-semibold text-foreground">
                                              Tour Highlights
                                            </h3>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setHighlightsExpanded(false);
                                            }}
                                            className="p-1 hover:bg-muted rounded-md transition-colors"
                                          >
                                            <svg
                                              className="w-4 h-4 text-muted-foreground"
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
                                          </button>
                                        </div>

                                        {/* Image Carousel Section */}
                                        {(() => {
                                          const highlightsWithImages =
                                            selectedPackage.highlights.filter(
                                              (h) =>
                                                typeof h === "object" && h.image
                                            );

                                          if (highlightsWithImages.length > 0) {
                                            const currentImage =
                                              highlightsWithImages[
                                                carouselIndex
                                              ];
                                            return (
                                              <div
                                                className="relative h-48 bg-muted overflow-hidden group"
                                                onMouseEnter={() =>
                                                  setIsCarouselPaused(true)
                                                }
                                                onMouseLeave={() =>
                                                  setIsCarouselPaused(false)
                                                }
                                              >
                                                <AnimatePresence mode="wait">
                                                  <motion.img
                                                    key={carouselIndex}
                                                    src={
                                                      typeof currentImage ===
                                                      "object"
                                                        ? currentImage.image
                                                        : ""
                                                    }
                                                    alt={
                                                      typeof currentImage ===
                                                      "object"
                                                        ? currentImage.text
                                                        : ""
                                                    }
                                                    className="w-full h-full object-cover"
                                                    initial={{
                                                      opacity: 0,
                                                      scale: 1.1,
                                                    }}
                                                    animate={{
                                                      opacity: 1,
                                                      scale: 1,
                                                    }}
                                                    exit={{
                                                      opacity: 0,
                                                      scale: 0.95,
                                                    }}
                                                    transition={{
                                                      duration: 0.5,
                                                    }}
                                                  />
                                                </AnimatePresence>

                                                {/* Navigation Controls */}
                                                {highlightsWithImages.length >
                                                  1 && (
                                                  <>
                                                    {/* Previous Button */}
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCarouselIndex(
                                                          (prev) =>
                                                            prev === 0
                                                              ? highlightsWithImages.length -
                                                                1
                                                              : prev - 1
                                                        );
                                                      }}
                                                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                                    >
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
                                                          d="M15 19l-7-7 7-7"
                                                        />
                                                      </svg>
                                                    </button>

                                                    {/* Next Button */}
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCarouselIndex(
                                                          (prev) =>
                                                            (prev + 1) %
                                                            highlightsWithImages.length
                                                        );
                                                      }}
                                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                                    >
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
                                                          d="M9 5l7 7-7 7"
                                                        />
                                                      </svg>
                                                    </button>

                                                    {/* Indicators */}
                                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                                                      {highlightsWithImages.map(
                                                        (_, idx) => (
                                                          <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              setCarouselIndex(
                                                                idx
                                                              );
                                                            }}
                                                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                                                              idx ===
                                                              carouselIndex
                                                                ? "bg-foreground w-4"
                                                                : "bg-muted-foreground/50 hover:bg-muted-foreground/75"
                                                            }`}
                                                          />
                                                        )
                                                      )}
                                                    </div>
                                                  </>
                                                )}

                                                {/* Image Caption */}
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                                                  <p className="text-white text-xs font-medium">
                                                    {typeof currentImage ===
                                                    "object"
                                                      ? currentImage.text
                                                      : ""}
                                                  </p>
                                                </div>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}

                                        {/* Highlights List */}
                                        <div className="space-y-2 p-4 max-h-64 overflow-y-auto">
                                          {selectedPackage.highlights.map(
                                            (highlight, idx) => {
                                              const text =
                                                typeof highlight === "string"
                                                  ? highlight
                                                  : highlight.text;
                                              return (
                                                <motion.div
                                                  key={idx}
                                                  initial={{
                                                    x: -20,
                                                    opacity: 0,
                                                  }}
                                                  animate={{
                                                    x: 0,
                                                    opacity: 1,
                                                  }}
                                                  transition={{
                                                    duration: 0.3,
                                                    delay: idx * 0.05,
                                                  }}
                                                  className="flex items-start gap-2 p-2 rounded-lg"
                                                >
                                                  <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{
                                                      duration: 0.3,
                                                      delay: idx * 0.05 + 0.1,
                                                      ease: [
                                                        0.68, -0.55, 0.265,
                                                        1.55,
                                                      ],
                                                    }}
                                                    className="flex-shrink-0 mt-0.5"
                                                  >
                                                    <svg
                                                      className="w-4 h-4 text-green-500"
                                                      fill="currentColor"
                                                      viewBox="0 0 20 20"
                                                    >
                                                      <path
                                                        fillRule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                        clipRule="evenodd"
                                                      />
                                                    </svg>
                                                  </motion.div>
                                                  <p className="text-xs text-foreground/90 leading-relaxed">
                                                    {text}
                                                  </p>
                                                </motion.div>
                                              );
                                            }
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                </AnimatePresence>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="select-package-btn w-full p-4 border-2 border-dashed border-border rounded-xl bg-transparent text-muted-foreground font-medium flex items-center justify-center gap-2 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-300"
                                onClick={() => setShowTourModal(true)}
                                disabled={paymentConfirmed}
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4v16m8-8H4"
                                  />
                                </svg>
                                Select a package
                              </button>
                            )}
                          </div>
                        )}
                        {errors.tourPackage && (
                          <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {errors.tourPackage}
                          </p>
                        )}
                      </label>

                      {/* Tour date */}
                      <div
                        className="overflow-hidden transition-all duration-500 ease-in-out"
                        style={{
                          maxHeight: dateVisible ? 250 : 0,
                          opacity: dateVisible ? 1 : 0,
                        }}
                      >
                        {dateMounted && (
                          <label className="block">
                            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                              Tour date
                              <span className="text-destructive text-xs">
                                *
                              </span>
                            </span>
                            <div className="relative mt-1">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary z-10 pointer-events-none">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                              <Select
                                value={tourDate || null}
                                onChange={setTourDate}
                                options={tourDateOptions}
                                placeholder={
                                  tourDateOptions.length === 0
                                    ? "No dates"
                                    : "Select date"
                                }
                                ariaLabel="Tour Date"
                                className="[&_button]:h-[86px] [&_button]:pl-12 [&_button]:border-2 [&_button]:border-border [&_button]:rounded-xl [&_button]:bg-card [&_button]:hover:border-primary/50 [&_button]:transition-all [&_button]:duration-300"
                                disabled={!tourPackage || paymentConfirmed}
                              />
                            </div>
                            {errors?.tourDate && (
                              <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                {errors.tourDate}
                              </p>
                            )}
                            {tourPackage &&
                              tourDateOptions.length === 0 &&
                              !errors?.tourDate && (
                                <div className="mt-2 p-2 rounded-lg bg-amber-50/10 border border-amber-500/30">
                                  <p className="text-xs text-amber-600 flex items-start gap-2">
                                    <svg
                                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    <span>No available dates</span>
                                  </p>
                                </div>
                              )}
                          </label>
                        )}
                      </div>
                    </div>

                    </div>
                  </div>

                  {/* Personal & Reservation Details Section */}
                  <div className="pt-6 border-t-2 border-border/30">
                    <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-border/50">
                      <div className="p-4 bg-primary rounded-full rounded-br-none">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-foreground">
                        Personal & Reservation details
                      </h3>
                    </div>

                    {/* Booking Type Field - First field in Personal Details */}
                    <div className="mb-8 transition-all duration-500 ease-in-out animate-in fade-in slide-in-from-top-4">
                      <label className="block">
                        <span className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                          Booking type
                          <span className="text-destructive text-xs">*</span>
                        </span>
                        <Select
                          value={bookingType}
                          onChange={(v) => handleBookingTypeChange(v)}
                          options={bookingTypeOptions}
                          placeholder="Select booking type"
                          ariaLabel="Booking Type"
                          className="mt-1"
                          disabled={paymentConfirmed}
                          isValid={!!bookingType && !errors.bookingType}
                        />
                        {errors.bookingType && (
                          <p className="mt-2 text-xs text-destructive flex items-center gap-1 animate-in fade-in slide-in-from-top-2 duration-300">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors.bookingType}
                          </p>
                        )}
                      </label>

                      {/* Group Size Controls - Only show for Group Booking */}
                      {bookingType === "Group Booking" && (
                        <div className="mt-6 p-6 rounded-lg bg-gradient-to-r from-card/50 to-card/80 border border-border shadow-sm transition-all duration-500 ease-in-out animate-in fade-in slide-in-from-top-4">
                          <div className="flex items-center justify-between gap-4">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-3">
                              <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <span>Group size (including you)</span>
                            </label>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                aria-label="Decrease group size"
                                onClick={() => handleGroupSizeChange(groupSize - 1)}
                                className="h-11 w-11 rounded-full bg-gradient-to-br from-crimson-red to-crimson-red/80 text-white flex items-center justify-center hover:scale-110 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-crimson-red focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md transition-all duration-300 ease-out"
                                disabled={paymentConfirmed || groupSize <= 3}
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                                </svg>
                              </button>

                              <div className="px-7 py-3 min-w-[5.5rem] text-center rounded-lg bg-background border-2 border-primary/20 shadow-inner transition-all duration-300">
                                <span className="text-xl font-bold text-foreground tabular-nums">{groupSize}</span>
                              </div>

                              <button
                                type="button"
                                aria-label="Increase group size"
                                onClick={() => handleGroupSizeChange(groupSize + 1)}
                                className="h-11 w-11 rounded-full bg-gradient-to-br from-crimson-red to-crimson-red/80 text-white flex items-center justify-center hover:scale-110 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-crimson-red focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md transition-all duration-300 ease-out"
                                disabled={paymentConfirmed || groupSize >= 20}
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-2">
                            <svg className="w-4 h-4 text-muted-foreground/70 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span>You'll provide details for all <strong className="text-foreground">{groupSize} guests</strong> below</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Guest Tabs - Only show for Duo/Group Booking */}
                    {(bookingType === "Duo Booking" || bookingType === "Group Booking") && (
                      <div className="mb-8 transition-all duration-500 ease-in-out animate-in fade-in slide-in-from-top-4">
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {/* Main Booker Tab */}
                          <button
                            type="button"
                            onClick={() => setActiveGuestTab(1)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-300 ease-in-out ${
                              activeGuestTab === 1
                                ? "bg-crimson-red text-white shadow-md"
                                : "bg-card border border-border text-foreground hover:border-crimson-red/50"
                            }`}
                          >
                            You (Main Booker)
                          </button>
                          
                          {/* Guest Tabs */}
                          {Array.from({ length: bookingType === "Duo Booking" ? 1 : groupSize - 1 }).map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveGuestTab(idx + 2)}
                              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-300 ease-in-out ${
                                activeGuestTab === idx + 2
                                  ? "bg-crimson-red text-white shadow-md"
                                  : "bg-card border border-border text-foreground hover:border-crimson-red/50"
                              }`}
                            >
                              Guest {idx + 1}
                            </button>
                          ))}
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                          <svg
                            className="w-4 h-4 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>
                            Fill in details for each guest. All guests will be booked for <strong>{selectedPackage?.name || "the selected tour"}</strong> on <strong>{tourDate || "the selected date"}</strong>.
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Main Booker Form (always visible or when tab 1 is active) */}
                  <div className={`transition-all duration-500 ease-in-out ${(bookingType === "Duo Booking" || bookingType === "Group Booking") && activeGuestTab !== 1 ? "opacity-0 scale-95 pointer-events-none absolute" : "opacity-100 scale-100"}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <label className="block">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        Email address
                        <span className="text-destructive text-xs">*</span>
                      </span>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                            />
                          </svg>
                        </div>
                        <input
                          type="email"
                          name="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          className={`${fieldBase} ${fieldWithIcon} ${fieldBorder(
                            !!errors.email
                          )} ${
                            isFieldValid("email", email)
                              ? "border-green-500"
                              : ""
                          } ${fieldFocus}`}
                          aria-invalid={!!errors.email}
                          aria-describedby={
                            errors.email ? "email-error" : undefined
                          }
                          disabled={paymentConfirmed}
                        />
                        {isFieldValid("email", email) && !errors.email && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                            <svg
                              className="w-5 h-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      {errors.email && (
                        <p
                          id="email-error"
                          className="mt-1.5 text-xs text-destructive flex items-center gap-1"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {errors.email}
                        </p>
                      )}
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        Birthdate
                        <span className="text-destructive text-xs">*</span>
                      </span>
                      <div className="relative">
                        <BirthdatePicker
                          value={birthdate}
                          onChange={(iso) => setBirthdate(iso)}
                          minYear={1920}
                          maxYear={new Date().getFullYear()}
                          disabled={paymentConfirmed}
                          isValid={!!birthdate && !errors?.birthdate}
                        />
                      </div>
                      {errors?.birthdate && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.birthdate}
                        </p>
                      )}
                    </label>

                  {/* First name */}
                    <label className="block relative group">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        First name
                        <span className="text-destructive text-xs">*</span>
                      </span>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                        <input
                          type="text"
                          name="firstName"
                          autoComplete="given-name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g. Alex"
                          className={`${fieldBase} ${fieldWithIcon} ${fieldBorder(
                            !!errors.firstName
                          )} ${
                            isFieldValid("firstName", firstName)
                              ? "border-green-500"
                              : ""
                          } ${fieldFocus}`}
                          aria-invalid={!!errors.firstName}
                          aria-describedby={
                            errors.firstName ? "firstName-error" : undefined
                          }
                          disabled={paymentConfirmed}
                        />
                        {isFieldValid("firstName", firstName) &&
                          !errors.firstName && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                              <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}
                      </div>
                      {errors.firstName && (
                        <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {errors.firstName}
                        </p>
                      )}
                    </label>

                    {/* Last name */}
                    <label className="block relative group">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        Last name
                        <span className="text-destructive text-xs">*</span>
                      </span>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                        <input
                          type="text"
                          name="lastName"
                          autoComplete="family-name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="e.g. Johnson"
                          className={`${fieldBase} ${fieldWithIcon} ${fieldBorder(
                            !!errors.lastName
                          )} ${
                            isFieldValid("lastName", lastName)
                              ? "border-green-500"
                              : ""
                          } ${fieldFocus}`}
                          aria-invalid={!!errors.lastName}
                          aria-describedby={
                            errors.lastName ? "lastName-error" : undefined
                          }
                          disabled={paymentConfirmed}
                        />
                        {isFieldValid("lastName", lastName) &&
                          !errors.lastName && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                              <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}
                      </div>
                      {errors.lastName && (
                        <p
                          id="lastName-error"
                          className="mt-1.5 text-xs text-destructive flex items-center gap-1"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {errors.lastName}
                        </p>
                      )}
                    </label>

                  {/* Nationality */}
                    <label className="block">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        Nationality
                        <span className="text-destructive text-xs">*</span>
                      </span>
                      <Select
                        value={nationality || null}
                        onChange={setNationality}
                        options={nationalityOptions}
                        placeholder="Select nationality"
                        ariaLabel="Nationality"
                        className="mt-1"
                        disabled={paymentConfirmed}
                        isValid={!!nationality && !errors.nationality}
                        searchable={true}
                      />
                      {errors.nationality && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.nationality}
                        </p>
                      )}
                    </label>

                    <label className="block relative">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        WhatsApp number
                        <span className="text-destructive text-xs">*</span>
                      </span>
                      <div className="relative mt-1 flex items-stretch gap-2">
                        <Select
                          value={whatsAppCountry}
                          onChange={(code) => {
                            setWhatsAppCountry(code);
                            // Clear the number when country changes to avoid confusion
                            setWhatsAppNumber("");
                          }}
                          options={getCountries().map((country) => {
                            const data = getCountryData(country);
                            const callingCode = safeGetCountryCallingCode(country);
                            const countryName = en[country] || country;
                            return {
                              label: (
                                <span className="inline-flex items-center gap-2">
                                  <ReactCountryFlag
                                    countryCode={country}
                                    svg
                                    aria-label={countryName}
                                    style={{
                                      width: "1rem",
                                      height: "0.5rem",
                                      flexShrink: 1,
                                    }}
                                  />
                                  <span>
                                    {`${data.alpha3} (+${callingCode})`}
                                  </span>
                                </span>
                              ),
                              value: country,
                              searchValue:
                                `${data.flag} ${data.alpha3} ${countryName} ${country} ${callingCode}`.toLowerCase(),
                            };
                          })}
                          placeholder="Country"
                          ariaLabel="Country Code"
                          disabled={paymentConfirmed}
                          searchable
                          className={`w-[160px] flex-shrink-0 ${paymentConfirmed ? "disabled-hover" : ""}`}
                        />
                        <div className="flex-1 relative min-w-0">
                          <div
                            className={`flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 shadow-sm border-2 ${
                              paymentConfirmed
                                ? whatsAppNumber &&
                                  isValidPhoneNumber(
                                    `+${safeGetCountryCallingCode(
                                      whatsAppCountry
                                    )}${whatsAppNumber}`
                                  )
                                  ? "opacity-50 bg-muted/40 border-green-500 cursor-not-allowed"
                                  : "opacity-50 bg-muted/40 border-border cursor-not-allowed"
                                : errors.whatsAppNumber
                                ? "bg-input border-destructive"
                                : whatsAppNumber &&
                                  isValidPhoneNumber(
                                    `+${safeGetCountryCallingCode(
                                      whatsAppCountry
                                    )}${whatsAppNumber}`
                                  )
                                ? "bg-input border-green-500"
                                : "bg-input border-border"
                            } ${
                              !paymentConfirmed
                                ? "focus-within:outline-none focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 focus-within:shadow-md hover:border-primary/50"
                                : ""
                            }`}
                          >
                            <span className={`text-muted-foreground mr-2 select-none ${paymentConfirmed ? "opacity-50" : ""}`}>
                              +
                              {safeGetCountryCallingCode(whatsAppCountry)}
                            </span>
                            <input
                              type="tel"
                              value={whatsAppNumber}
                              onChange={(e) => {
                                const value = e.target.value.replace(
                                  /[^0-9]/g,
                                  ""
                                );
                                const maxLen =
                                  getCountryData(whatsAppCountry).maxLength;
                                const limitedValue = value.slice(0, maxLen);
                                setWhatsAppNumber(limitedValue);

                                // Real-time validation
                                const fullNumber = `+${safeGetCountryCallingCode(
                                  whatsAppCountry
                                )}${limitedValue}`;
                                setErrors((prev) => {
                                  const clone = { ...prev } as any;
                                  if (!limitedValue.trim()) {
                                    clone.whatsAppNumber =
                                      "WhatsApp number is required";
                                  } else if (
                                    limitedValue.length > 2 &&
                                    !isValidPhoneNumber(fullNumber)
                                  ) {
                                    clone.whatsAppNumber =
                                      "Enter a valid phone number";
                                  } else if (isValidPhoneNumber(fullNumber)) {
                                    delete clone.whatsAppNumber;
                                  }
                                  return clone;
                                });
                              }}
                              onBlur={() => {
                                const fullNumber = whatsAppNumber
                                  ? `+${safeGetCountryCallingCode(
                                      whatsAppCountry
                                    )}${whatsAppNumber}`
                                  : "";
                                setErrors((prev) => {
                                  const clone = { ...prev } as any;
                                  if (!whatsAppNumber) {
                                    clone.whatsAppNumber =
                                      "WhatsApp number is required";
                                  } else if (!isValidPhoneNumber(fullNumber)) {
                                    clone.whatsAppNumber =
                                      "Enter a valid phone number";
                                  } else {
                                    delete clone.whatsAppNumber;
                                  }
                                  return clone;
                                });
                              }}
                              disabled={paymentConfirmed}
                              placeholder="123 456 7890"
                              maxLength={
                                getCountryData(whatsAppCountry).maxLength
                              }
                              className={`flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60 ${paymentConfirmed ? "opacity-50 text-muted-foreground cursor-not-allowed" : ""}`}
                            />
                          </div>
                          {whatsAppNumber &&
                            isValidPhoneNumber(
                              `+${safeGetCountryCallingCode(
                                whatsAppCountry
                              )}${whatsAppNumber}`
                            ) &&
                            !errors.whatsAppNumber && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none">
                                <svg
                                  className="w-5 h-5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                        </div>
                      </div>
                      {!!errors.whatsAppNumber && (
                        <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {errors.whatsAppNumber}
                        </p>
                      )}
                    </label>
                  </div>
                </div>

              {/* Guest Forms - Only show for Duo/Group Booking */}
              {(bookingType === "Duo Booking" || bookingType === "Group Booking") && (
                <>
                  {guestDetails.map((guest, guestIndex) => (
                    <div
                      key={guestIndex}
                      className={`transition-all duration-500 ease-in-out ${activeGuestTab !== guestIndex + 2 ? "opacity-0 scale-95 pointer-events-none absolute" : "opacity-100 scale-100"}`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        {/* Guest Email */}
                        <label className="block">
                        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                          Email address
                          <span className="text-destructive text-xs">*</span>
                        </span>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                              />
                            </svg>
                          </div>
                          <input
                            type="email"
                            value={guest.email}
                            onChange={(e) => {
                              const newGuests = [...guestDetails];
                              newGuests[guestIndex].email = e.target.value;
                              setGuestDetails(newGuests);
                            }}
                            placeholder="guest.email@example.com"
                            className={`${fieldBase} ${fieldWithIcon} ${fieldBorder(
                              !!errors[`guest-${guestIndex}-email`]
                            )} ${
                              guest.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email) && !errors[`guest-${guestIndex}-email`]
                                ? "border-green-500"
                                : ""
                            } ${fieldFocus}`}
                            disabled={paymentConfirmed}
                          />
                          {guest.email &&
                            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email) &&
                            !errors[`guest-${guestIndex}-email`] && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                        </div>
                        {errors[`guest-${guestIndex}-email`] && (
                          <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {errors[`guest-${guestIndex}-email`]}
                          </p>
                        )}
                      </label>

                      {/* Guest Birthdate */}
                      <label className="block">
                        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                          Birthdate
                          <span className="text-destructive text-xs">*</span>
                        </span>
                        <BirthdatePicker
                          value={guest.birthdate}
                          onChange={(val) => {
                            const newGuests = [...guestDetails];
                            newGuests[guestIndex].birthdate = val;
                            setGuestDetails(newGuests);
                          }}
                          isValid={!!guest.birthdate && !errors[`guest-${guestIndex}-birthdate`]}
                          disabled={paymentConfirmed}
                        />
                        {errors[`guest-${guestIndex}-birthdate`] && (
                          <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {errors[`guest-${guestIndex}-birthdate`]}
                          </p>
                        )}
                      </label>

                      {/* Guest First Name */}
                      <label className="block">
                        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                          First name
                          <span className="text-destructive text-xs">*</span>
                        </span>
                        <input
                          type="text"
                          value={guest.firstName}
                          onChange={(e) => {
                            const newGuests = [...guestDetails];
                            newGuests[guestIndex].firstName = e.target.value;
                            setGuestDetails(newGuests);
                          }}
                          placeholder="John"
                          className={`${fieldBase} ${fieldBorder(
                            !!errors[`guest-${guestIndex}-firstName`]
                          )} ${
                            guest.firstName ? "border-green-500" : ""
                          } ${fieldFocus}`}
                          disabled={paymentConfirmed}
                        />
                        {errors[`guest-${guestIndex}-firstName`] && (
                          <p className="mt-1.5 text-xs text-destructive">
                            {errors[`guest-${guestIndex}-firstName`]}
                          </p>
                        )}
                      </label>

                      {/* Guest Last Name */}
                      <label className="block">
                        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                          Last name
                          <span className="text-destructive text-xs">*</span>
                        </span>
                        <input
                          type="text"
                          value={guest.lastName}
                          onChange={(e) => {
                            const newGuests = [...guestDetails];
                            newGuests[guestIndex].lastName = e.target.value;
                            setGuestDetails(newGuests);
                          }}
                          placeholder="Doe"
                          className={`${fieldBase} ${fieldBorder(
                            !!errors[`guest-${guestIndex}-lastName`]
                          )} ${
                            guest.lastName ? "border-green-500" : ""
                          } ${fieldFocus}`}
                          disabled={paymentConfirmed}
                        />
                        {errors[`guest-${guestIndex}-lastName`] && (
                          <p className="mt-1.5 text-xs text-destructive">
                            {errors[`guest-${guestIndex}-lastName`]}
                          </p>
                        )}
                      </label>

                      {/* Guest Nationality */}
                      <label className="block">
                        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                          Nationality
                          <span className="text-destructive text-xs">*</span>
                        </span>
                        <Select
                          value={guest.nationality}
                          onChange={(val) => {
                            const newGuests = [...guestDetails];
                            newGuests[guestIndex].nationality = val;
                            
                            // Sync WhatsApp country code with nationality
                            const countryCode = getNationalityCountryCode(val);
                            if (countryCode) {
                              newGuests[guestIndex].whatsAppCountry = countryCode;
                            }
                            
                            setGuestDetails(newGuests);
                          }}
                          options={getNationalityOptions()}
                          placeholder="Select nationality"
                          ariaLabel="Nationality"
                          className="mt-1"
                          disabled={paymentConfirmed}
                          isValid={!!guest.nationality}
                        />
                        {errors[`guest-${guestIndex}-nationality`] && (
                          <p className="mt-1 text-xs text-destructive">
                            {errors[`guest-${guestIndex}-nationality`]}
                          </p>
                        )}
                      </label>

                      {/* Guest WhatsApp Number */}
                      <label className="block relative">
                        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                          WhatsApp number
                          <span className="text-destructive text-xs">*</span>
                        </span>
                        <div className="relative mt-1 flex items-stretch gap-2">
                          <Select
                            value={guest.whatsAppCountry}
                            onChange={(code) => {
                              const newGuests = [...guestDetails];
                              newGuests[guestIndex].whatsAppCountry = code;
                              newGuests[guestIndex].whatsAppNumber = ""; // Clear the number when country changes
                              setGuestDetails(newGuests);
                            }}
                            options={getCountries().map((country) => {
                              const data = getCountryData(country);
                              const callingCode = safeGetCountryCallingCode(country);
                              const countryName = en[country] || country;
                              return {
                                label: (
                                  <span className="inline-flex items-center gap-2">
                                    <ReactCountryFlag
                                      countryCode={country}
                                      svg
                                      aria-label={countryName}
                                      style={{
                                        width: "1rem",
                                        height: "0.5rem",
                                        flexShrink: 1,
                                      }}
                                    />
                                    <span>
                                      {`${data.alpha3} (+${callingCode})`}
                                    </span>
                                  </span>
                                ),
                                value: country,
                                searchValue:
                                  `${data.flag} ${data.alpha3} ${countryName} ${country} ${callingCode}`.toLowerCase(),
                              };
                            })}
                            placeholder="Country"
                            ariaLabel="Country Code"
                            disabled={paymentConfirmed}
                            searchable
                            className={`w-[160px] flex-shrink-0 ${paymentConfirmed ? "disabled-hover" : ""}`}
                          />
                          <div className="flex-1 relative min-w-0">
                            <div
                              className={`flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 shadow-sm border-2 ${
                                paymentConfirmed
                                  ? guest.whatsAppNumber &&
                                    isValidPhoneNumber(
                                      `+${safeGetCountryCallingCode(
                                        guest.whatsAppCountry
                                      )}${guest.whatsAppNumber}`
                                    )
                                    ? "opacity-50 bg-muted/40 border-green-500 cursor-not-allowed"
                                    : "opacity-50 bg-muted/40 border-border cursor-not-allowed"
                                  : errors[`guest-${guestIndex}-whatsAppNumber`]
                                  ? "bg-input border-destructive"
                                  : guest.whatsAppNumber &&
                                    isValidPhoneNumber(
                                      `+${safeGetCountryCallingCode(
                                        guest.whatsAppCountry
                                      )}${guest.whatsAppNumber}`
                                    )
                                  ? "bg-input border-green-500"
                                  : "bg-input border-border"
                              } ${
                                !paymentConfirmed
                                  ? "focus-within:outline-none focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 focus-within:shadow-md hover:border-primary/50"
                                  : ""
                              }`}
                            >
                              <span className={`text-muted-foreground mr-2 select-none ${paymentConfirmed ? "opacity-50" : ""}`}>
                                +
                                {safeGetCountryCallingCode(guest.whatsAppCountry)}
                              </span>
                              <input
                                type="tel"
                                value={guest.whatsAppNumber}
                                onChange={(e) => {
                                  const value = e.target.value.replace(
                                    /[^0-9]/g,
                                    ""
                                  );
                                  const maxLen =
                                    getCountryData(guest.whatsAppCountry).maxLength;
                                  const limitedValue = value.slice(0, maxLen);
                                  
                                  const newGuests = [...guestDetails];
                                  newGuests[guestIndex].whatsAppNumber = limitedValue;
                                  setGuestDetails(newGuests);

                                  // Real-time validation
                                  const fullNumber = `+${safeGetCountryCallingCode(
                                    guest.whatsAppCountry
                                  )}${limitedValue}`;
                                  setErrors((prev) => {
                                    const clone = { ...prev } as any;
                                    if (!limitedValue.trim()) {
                                      clone[`guest-${guestIndex}-whatsAppNumber`] =
                                        "WhatsApp number is required";
                                    } else if (
                                      limitedValue.length > 2 &&
                                      !isValidPhoneNumber(fullNumber)
                                    ) {
                                      clone[`guest-${guestIndex}-whatsAppNumber`] =
                                        "Enter a valid phone number";
                                    } else if (isValidPhoneNumber(fullNumber)) {
                                      delete clone[`guest-${guestIndex}-whatsAppNumber`];
                                    }
                                    return clone;
                                  });
                                }}
                                onBlur={() => {
                                  const fullNumber = guest.whatsAppNumber
                                    ? `+${safeGetCountryCallingCode(
                                        guest.whatsAppCountry
                                      )}${guest.whatsAppNumber}`
                                    : "";
                                  setErrors((prev) => {
                                    const clone = { ...prev } as any;
                                    if (!guest.whatsAppNumber) {
                                      clone[`guest-${guestIndex}-whatsAppNumber`] =
                                        "WhatsApp number is required";
                                    } else if (!isValidPhoneNumber(fullNumber)) {
                                      clone[`guest-${guestIndex}-whatsAppNumber`] =
                                        "Enter a valid phone number";
                                    } else {
                                      delete clone[`guest-${guestIndex}-whatsAppNumber`];
                                    }
                                    return clone;
                                  });
                                }}
                                disabled={paymentConfirmed}
                                placeholder="123 456 7890"
                                maxLength={
                                  getCountryData(guest.whatsAppCountry).maxLength
                                }
                                className={`flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60 ${paymentConfirmed ? "opacity-50 text-muted-foreground cursor-not-allowed" : ""}`}
                              />
                            </div>
                            {guest.whatsAppNumber &&
                              isValidPhoneNumber(
                                `+${safeGetCountryCallingCode(
                                  guest.whatsAppCountry
                                )}${guest.whatsAppNumber}`
                              ) &&
                              !errors[`guest-${guestIndex}-whatsAppNumber`] && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none">
                                  <svg
                                    className="w-5 h-5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                              )}
                          </div>
                        </div>
                        {!!errors[`guest-${guestIndex}-whatsAppNumber`] && (
                          <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {errors[`guest-${guestIndex}-whatsAppNumber`]}
                          </p>
                        )}
                      </label>
                    </div>
                  </div>
                ))}
                </>
              )}
            </div>
          )}

            {/* STEP 2 - PAYMENT */}
            {step === 2 && (
              <div className="rounded-lg bg-card/80 backdrop-blur-md p-4 sm:p-6 border border-border shadow-xl space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b-2 border-border/50">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      Pay reservation fee
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Secure your spot with a deposit
                    </p>
                  </div>
                </div>

                {!tourPackage ? (
                  <p className="text-sm text-destructive">
                    Please go back and choose a tour name before proceeding to
                    payment.
                  </p>
                ) : paymentConfirmed ? (
                  <div className="bg-spring-green/10 border border-spring-green/30 p-4 rounded-md">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-spring-green text-white">
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          Payment confirmed!
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Your reservation fee has been successfully processed.
                          Click Continue to proceed to your payment plan.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Complete your secure payment below to reserve your spot.
                      Your payment will be verified automatically.
                    </p>

                    {/* Warning before payment */}
                    <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-md mb-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500 text-white flex-shrink-0">
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden
                          >
                            <path
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            Important notice
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Once payment is complete, you won't be able to
                            change your reservation details. If you need to make
                            changes after payment, you can request a refund
                            through the reservation confirmation email.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/10 border-2 border-border rounded-lg p-5 mb-4 shadow-sm">
                      <div className="flex justify-between items-center text-sm mt-2">
                        <span className="text-foreground/70 font-semibold">
                          Tour name:
                        </span>
                        <span className="font-bold text-foreground">
                          {tourPackages.find((p) => p.id === tourPackage)?.name}
                        </span>
                      </div>
                      {(bookingType === "Duo Booking" || bookingType === "Group Booking") && (
                        <div className="flex justify-between items-center text-sm mt-2">
                          <span className="text-foreground/70 font-semibold">
                            Number of people:
                          </span>
                          <span className="font-bold text-foreground">
                            {numberOfPeople}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-border/50">
                        <span className="text-foreground/70 font-semibold">
                          Reservation fee:
                        </span>
                        <span className="font-bold text-lg text-crimson-red">
                          {(bookingType === "Duo Booking" || bookingType === "Group Booking") ? (
                            <span className="flex items-center gap-2">
                              <span className="text-sm text-foreground/60 font-normal">
                                £{baseReservationFee.toFixed(2)} × {numberOfPeople} =
                              </span>
                              £{depositAmount.toFixed(2)}
                            </span>
                          ) : (
                            `£${depositAmount.toFixed(2)}`
                          )}
                        </span>
                      </div>
                    </div>

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
                        setStep2StatusType("success");
                        setStep2StatusMsg(
                          "Payment succeeded! Securing your reservation..."
                        );
                        handlePaymentSuccess(pid, docId);
                      }}
                      onError={(msg) => {
                        setStep2StatusType("error");
                        setStep2StatusMsg(
                          msg || "Payment failed. Please try again."
                        );
                      }}
                      onProcessingChange={(p) => setStep2Processing(p)}
                    />

                    {/* Step 2 status + processing prompt */}
                    {step2Processing && (
                      <div className="mt-4 flex items-center gap-3 p-3 rounded-md border border-border bg-muted/30">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                        <span className="text-sm text-muted-foreground">
                          Processing payment…
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* STEP 3 - PAYMENT PLAN */}
            {(step as number) === 3 && (
              <div className="rounded-lg bg-card/80 backdrop-blur-md p-4 sm:p-6 border border-border shadow-xl space-y-6">
                <div className="bg-gradient-to-r from-spring-green/10 to-green-500/10 border-2 border-spring-green/40 p-5 rounded-xl shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-spring-green to-green-500 text-white shadow-lg animate-bounce">
                      <svg
                        className="h-6 w-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="font-bold text-lg text-foreground">
                        🎉 Reservation confirmed!
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        <span>Reservation ID:</span>
                        <span className="font-mono font-semibold text-foreground bg-background/50 px-2 py-0.5 rounded">
                          {bookingId}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Choose Payment Plan Card */}
                <div className="rounded-2xl bg-white dark:bg-card/80 dark:backdrop-blur-md border border-sunglow-yellow/20 dark:border-crimson-red/30 shadow-lg dark:shadow-xl overflow-hidden transition-all duration-300 hover:border-crimson-red hover:shadow-crimson-red/20 hover:shadow-xl">
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-foreground mb-6">
                      Choose your payment plan
                    </h3>

                    {/* Tour Details Summary */}
                    {selectedPackage && (
                      <div className="bg-muted/10 border-2 border-border rounded-lg p-5 shadow-sm">
                        <div className="text-sm space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-foreground/70 font-semibold">
                              Tour name:
                            </span>
                            <span className="font-bold text-foreground">
                              {selectedPackage.name}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-foreground/70 font-semibold">
                              Tour date:
                            </span>
                            <span className="font-bold text-foreground">
                              {tourDate}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-foreground/70 font-semibold">
                              Days until tour:
                            </span>
                            <span className="font-bold text-foreground">
                              {calculateDaysBetween(tourDate)} days
                            </span>
                          </div>
                          <div className="border-t-2 border-border/50 my-3"></div>
                          <div className="flex justify-between items-center">
                            <span className="text-foreground/70 font-semibold">
                              Tour cost:
                            </span>
                            <span className="font-bold text-foreground text-base">
                              {(bookingType === "Duo Booking" || bookingType === "Group Booking") ? (
                                <span className="flex items-center gap-2">
                                  <span className="text-sm text-foreground/60 font-normal">
                                    £{((selectedDateDetail?.customOriginal ?? selectedPackage?.price) || 0).toFixed(2)} × {numberOfPeople} =
                                  </span>
                                  £{(((selectedDateDetail?.customOriginal ?? selectedPackage?.price) || 0) * numberOfPeople).toFixed(2)}
                                </span>
                              ) : (
                                `£${((selectedDateDetail?.customOriginal ?? selectedPackage?.price) || 0).toFixed(2)}`
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-foreground/70 font-semibold">
                              Reservation fee paid:
                            </span>
                            <span className="font-bold text-spring-green text-base">
                              -£{depositAmount.toFixed(2)}
                            </span>
                          </div>
                          <div className="border-t-2 border-border/50 my-3"></div>
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-foreground font-bold">
                              Remaining balance:
                            </span>
                            <span className="font-bold text-xl text-crimson-red">
                              £
                              {(((selectedDateDetail?.customOriginal ?? selectedPackage?.price) || 0) * numberOfPeople - depositAmount).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment Plan Options */}
                    {availablePaymentTerm.isLastMinute ? (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-md mt-4">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500 text-white flex-shrink-0">
                            <svg
                              className="h-5 w-5"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden
                            >
                              <path
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              Full Payment Required
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Your tour is coming up soon! Full payment of £
                              {selectedPackage
                                ? (
                                    (selectedPackage.price * numberOfPeople) - depositAmount
                                  ).toFixed(2)
                                : "0.00"}{" "}
                              is required within 48 hours to confirm your spot.
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground mt-6 mb-4">
                          Great news! You have up to{" "}
                          <span className="font-medium text-foreground">
                            {availablePaymentTerm.term}
                          </span>{" "}
                          flexible payment options. Pick what works best for
                          you:
                        </p>

                        <div className="space-y-3 mt-4">
                          {getAvailablePaymentPlans().map((plan) => (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => setSelectedPaymentPlan(plan.id)}
                              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                selectedPaymentPlan === plan.id
                                  ? "border-primary bg-primary/5 shadow-md"
                                  : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className="flex items-center justify-center h-10 w-10 rounded-full text-white font-semibold flex-shrink-0"
                                  style={{ backgroundColor: plan.color }}
                                >
                                  P{plan.monthsRequired}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="font-medium text-foreground">
                                      {plan.label}
                                    </div>
                                    {selectedPaymentPlan === plan.id && (
                                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground flex-shrink-0">
                                        <svg
                                          className="h-4 w-4"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          aria-hidden
                                        >
                                          <path
                                            d="M20 6L9 17l-5-5"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mb-3">
                                    {plan.description}
                                  </div>

                                  {/* Payment Schedule */}
                                  <div className="space-y-2 bg-muted/30 rounded-md p-3">
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                      Payment Schedule
                                    </div>
                                    {plan.schedule.map((payment, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between text-sm"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center text-xs font-medium">
                                            {idx + 1}
                                          </div>
                                          <span className="text-foreground">
                                            {new Date(
                                              payment.date + "T00:00:00Z"
                                            ).toLocaleDateString("en-US", {
                                              month: "short",
                                              day: "numeric",
                                              year: "numeric",
                                              timeZone: "UTC",
                                            })}
                                          </span>
                                        </div>
                                        <span className="font-medium text-foreground">
                                          £{payment.amount.toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step footer actions */}
            <div className="flex items-center justify-between mt-2">
              {step > 1 && !bookingConfirmed ? (
                <button
                  type="button"
                  onClick={() =>
                    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))
                  }
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
              ) : step === 1 && !paymentConfirmed ? (
                <button
                  type="button"
                  onClick={async () => {
                    setClearing(true);
                    const startH =
                      guestsWrapRef.current?.getBoundingClientRect().height ??
                      0;
                    await animateHeight(startH, 0);
                    setGuestsHeight("0px");
                    setGuestsMounted(false);
                    setDateVisible(false);
                    setTimeout(() => {
                      setEmail("");
                      setFirstName("");
                      setLastName("");
                      setBirthdate("");
                      setNationality("");
                      setBookingType("Single Booking");
                      setTourPackage("");
                      setTourDate("");
                      setAdditionalGuests([]);
                      setGroupSize(3);
                      setErrors({});
                      setSubmitted(false);
                      setTimeout(() => setClearing(false), 10);

                      // Smooth scroll to top after reset
                      setTimeout(() => {
                        window.scrollTo({
                          top: 0,
                          behavior: "smooth",
                        });
                      }, ANIM_DURATION + 100);
                    }, ANIM_DURATION + 20);
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Reset
                </button>
              ) : (
                <div></div>
              )}

              {step === 1 && !paymentConfirmed && (
                <button
                  type="button"
                  onClick={() => {
                    console.log("🔍 Continue to Payment clicked");
                    console.log("📊 Validation state:", {
                      isCreatingPayment,
                      email: !!email,
                      emailValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
                      birthdate: !!birthdate,
                      firstName: !!firstName,
                      lastName: !!lastName,
                      whatsAppNumber: !!whatsAppNumber,
                      whatsAppValid: whatsAppNumber ? isValidPhoneNumber(
                        `+${safeGetCountryCallingCode(whatsAppCountry)}${whatsAppNumber}`
                      ) : false,
                      nationality: !!nationality,
                      bookingType,
                      tourPackage: !!tourPackage,
                      tourDate: !!tourDate,
                      guestDetailsLength: guestDetails.length,
                      expectedGuestLength: bookingType === "Duo Booking" ? 1 : groupSize - 1,
                      guestDetailsValid: !guestDetails.some(
                        (guest) =>
                          !guest.email ||
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email) ||
                          !guest.birthdate ||
                          !guest.firstName ||
                          !guest.lastName ||
                          !guest.nationality ||
                          !guest.whatsAppNumber ||
                          !isValidPhoneNumber(
                            `+${safeGetCountryCallingCode(
                              guest.whatsAppCountry
                            )}${guest.whatsAppNumber}`
                          )
                      ),
                    });
                    checkExistingPaymentsAndMaybeProceed();
                  }}
                  disabled={
                    isCreatingPayment ||
                    !email ||
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
                    !birthdate ||
                    !firstName ||
                    !lastName ||
                    !whatsAppNumber ||
                    (whatsAppNumber &&
                      !isValidPhoneNumber(
                        `+${safeGetCountryCallingCode(
                          whatsAppCountry
                        )}${whatsAppNumber}`
                      )) ||
                    !nationality ||
                    !bookingType ||
                    !tourPackage ||
                    !tourDate ||
                    ((bookingType === "Duo Booking" ||
                      bookingType === "Group Booking") &&
                      (guestDetails.length === 0 ||
                        guestDetails.length !== (bookingType === "Duo Booking" ? 1 : groupSize - 1) ||
                        guestDetails.some(
                          (guest) =>
                            !guest.email ||
                            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email) ||
                            !guest.birthdate ||
                            !guest.firstName ||
                            !guest.lastName ||
                            !guest.nationality ||
                            !guest.whatsAppNumber ||
                            !isValidPhoneNumber(
                              `+${safeGetCountryCallingCode(
                                guest.whatsAppCountry
                              )}${guest.whatsAppNumber}`
                            )
                        )))
                  }
                  className="group inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-primary to-crimson-red text-primary-foreground rounded-lg shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
                >
                  Continue to Payment
                  <svg
                    className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  disabled={!paymentConfirmed}
                  onClick={() => {
                    // Mark step 2 as completed
                    if (!completedSteps.includes(2)) {
                      setCompletedSteps([...completedSteps, 2]);
                    }
                    // Clear the payment session when proceeding to next step to allow new bookings later
                    try {
                      const sessionKey = `stripe_payment_${email}_${tourPackage}`;
                      sessionStorage.removeItem(sessionKey);
                    } catch {}
                    setStep(3);
                  }}
                  className={`group inline-flex items-center gap-2 px-8 py-3.5 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 font-semibold ${
                    paymentConfirmed
                      ? "bg-gradient-to-r from-primary to-crimson-red text-primary-foreground hover:shadow-xl hover:scale-105 focus:ring-primary"
                      : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                  }`}
                >
                  Continue to Payment Plan
                  {paymentConfirmed && (
                    <svg
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  )}
                </button>
              )}

              {step === 3 && !bookingConfirmed && (
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  className={`group inline-flex items-center gap-2 px-8 py-3.5 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 font-semibold ${
                    availablePaymentTerm.isLastMinute || selectedPaymentPlan
                      ? "bg-gradient-to-r from-spring-green to-green-500 text-white hover:shadow-xl hover:scale-105 focus:ring-spring-green"
                      : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                  }`}
                  disabled={
                    (!availablePaymentTerm.isLastMinute &&
                      !selectedPaymentPlan) ||
                    confirmingBooking
                  }
                >
                  {confirmingBooking ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Confirming...
                    </>
                  ) : (
                    <>
                      Confirm Booking
                      <svg
                        className="w-5 h-5 group-hover:scale-110 transition-transform"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </>
                  )}
                </button>
              )}

              {step === 3 && bookingConfirmed && (
                <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
                  {/* Animated gradient background */}
                  <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-crimson-red/5 via-sunglow-yellow/5 to-spring-green/5 dark:from-crimson-red/20 dark:via-creative-midnight/30 dark:to-spring-green/20 animate-gradient-shift bg-[length:200%_200%]" />
                  </div>

                  {/* Offscreen: Document for PDF generation (must be renderable, not display:none) */}
                  <div
                    id="booking-confirmation-doc"
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "-99999px",
                      opacity: 0,
                      pointerEvents: "none",
                      width: "100%",
                    }}
                  >
                    <BookingConfirmationDocument
                      bookingId={bookingId}
                      tourName={selectedPackage?.name || "Tour"}
                      tourDate={tourDate}
                      email={email}
                      firstName={firstName}
                      lastName={lastName}
                      paymentPlan={
                        availablePaymentTerm.isLastMinute ||
                        selectedPaymentPlan === "full_payment"
                          ? "Full Payment"
                          : fixTermName(
                              paymentTerms.find(
                                (p) => p.id === selectedPaymentPlan
                              )?.name || "Selected"
                            )
                      }
                      reservationFee={depositAmount}
                      totalAmount={(selectedPackage?.price || 0) * numberOfPeople}
                      remainingBalance={
                        ((selectedDateDetail?.customOriginal ?? selectedPackage?.price) || 0) * numberOfPeople - depositAmount
                      }
                      paymentDate={new Date().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      currency="GBP"
                    />
                  </div>

                  <div className="relative z-10 flex justify-center py-8 px-4 print:hidden">
                    <div className="max-w-2xl w-full bg-card rounded-2xl shadow-xl p-8 border border-border">
                      <div className="bg-spring-green/10 border border-spring-green/30 p-6 rounded-lg mb-6 print:hidden print:mb-0 print:border-spring-green/10 print:bg-green-50">
                        <div className="flex items-start gap-3">
                          <svg
                            className="h-8 w-8 text-spring-green flex-shrink-0 mt-0.5"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <div className="flex-1">
                            <h2 className="text-2xl font-bold text-foreground mb-2">
                              Reservation Confirmed!
                            </h2>
                            <p className="text-muted-foreground">
                              You're all set for {selectedPackage?.name}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Print-only Reservation Details section */}
                      <div className="hidden print:block bg-gray-50 rounded-lg p-6 mb-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                          Reservation Details
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b border-gray-300">
                            <span className="text-sm text-gray-600">
                              Reservation ID
                            </span>
                            <span className="text-sm font-mono font-semibold text-gray-900">
                              {bookingId}
                            </span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-300">
                            <span className="text-sm text-gray-600">Tour</span>
                            <span className="text-sm font-medium text-gray-900">
                              {selectedPackage?.name}
                            </span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-300">
                            <span className="text-sm text-gray-600">
                              Tour Date
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {tourDate}
                            </span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-300">
                            <span className="text-sm text-gray-600">Email</span>
                            <span className="text-sm font-medium text-gray-900">
                              {email}
                            </span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-sm text-gray-600">
                              Payment Plan
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {selectedPaymentPlan === "full_payment"
                                ? "Full Payment"
                                : paymentTerms.find(
                                    (p) => p.id === selectedPaymentPlan
                                  )?.name || "Selected"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Reservation Details - Screen only */}
                      <div className="bg-muted/30 rounded-lg p-6 mb-6 print:hidden">
                        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
                          Reservation Details
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-sm text-muted-foreground">
                              Reservation ID
                            </span>
                            <span className="text-sm font-mono font-semibold text-foreground">
                              {bookingId}
                            </span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-sm text-muted-foreground">
                              Tour
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {selectedPackage?.name}
                            </span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-sm text-muted-foreground">
                              Tour Date
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {tourDate}
                            </span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-sm text-muted-foreground">
                              Email
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {email}
                            </span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-sm text-muted-foreground">
                              Payment Plan
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {selectedPaymentPlan === "full_payment"
                                ? "Full Payment"
                                : paymentTerms.find(
                                    (p) => p.id === selectedPaymentPlan
                                  )?.name || "Selected"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Divider - hidden on print, replaced with light mode version */}
                      <div className="my-8 border-t-2 border-border print:hidden"></div>

                      {/* Receipt - shown on screen and in print */}
                      <div className="mb-6 print:page-break-before">
                        <Receipt
                          bookingId={bookingId}
                          tourName={selectedPackage?.name || "Tour"}
                          reservationFee={depositAmount}
                          currency="GBP"
                          email={email}
                          totalAmount={((selectedDateDetail?.customOriginal ?? selectedPackage?.price) || 0) * numberOfPeople}
                          remainingBalance={
                            ((selectedDateDetail?.customOriginal ?? selectedPackage?.price) || 0) * numberOfPeople - depositAmount
                          }
                          travelDate={tourDate}
                          paymentDate={new Date().toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        />
                      </div>

                      {/* What's Next */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">
                          What's Next?
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-spring-green text-white flex-shrink-0 mt-0.5">
                              <svg
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <path
                                  d="M20 6L9 17l-5-5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                            <p className="text-sm text-muted-foreground flex-1">
                              Check your email at{" "}
                              <span className="font-semibold text-foreground">
                                {email}
                              </span>{" "}
                              for a confirmation message with your complete
                              reservation details and payment schedule.
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-spring-green text-white flex-shrink-0 mt-0.5">
                              <svg
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <path
                                  d="M20 6L9 17l-5-5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                            <p className="text-sm text-muted-foreground flex-1">
                              Follow the payment schedule outlined in your email
                              to complete your payments on time.
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-spring-green text-white flex-shrink-0 mt-0.5">
                              <svg
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <path
                                  d="M20 6L9 17l-5-5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                            <p className="text-sm text-muted-foreground flex-1">
                              Get ready for an unforgettable adventure with I'm
                              Here Travels!
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={async () => {
                          // Prefer human-friendly Reservation ID over Firestore docId
                          const fallbackDisplayId = "SB-IDD-20260327-JD002";
                          const isDocId = (id?: string) =>
                            !!id && /^[A-Za-z0-9]{20,}$/.test(id);
                          const confirmationId =
                            bookingId && !isDocId(bookingId)
                              ? bookingId
                              : fallbackDisplayId;
                          try {
                            // Build payment plan label (e.g., "P2 - Two Installment")
                            const selectedPlanTerm = paymentTerms.find(
                              (p) => p.id === selectedPaymentPlan
                            );
                            const paymentPlanLabel =
                              availablePaymentTerm.isLastMinute ||
                              selectedPaymentPlan === "full_payment"
                                ? "Full Payment"
                                : selectedPlanTerm
                                ? fixTermName(selectedPlanTerm.name)
                                : "Selected";
                            const pdf = await generateBookingConfirmationPDF(
                              confirmationId,
                              selectedPackage?.name || "Tour",
                              tourDate,
                              email,
                              firstName,
                              lastName,
                              paymentPlanLabel.replace(
                                /^P\d+_[A-Z_]+\s-\s/,
                                ""
                              ),
                              depositAmount,
                              (selectedPackage?.price || 0) * numberOfPeople,
                              ((selectedPackage?.price || 0) * numberOfPeople) - depositAmount,
                              new Date().toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }),
                              "GBP"
                            );
                            pdf.save(
                              `IHT_Reservation-Confirmation_${confirmationId}.pdf`
                            );
                          } catch (error) {
                            console.error("Error generating PDF:", error);
                            alert("Failed to generate PDF. Please try again.");
                          }
                        }}
                        className="mt-4 w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
                      >
                        Download Receipt
                      </button>

                      {/* Success note */}
                      <div
                        role="status"
                        aria-live="polite"
                        className="mt-6 rounded-md bg-spring-green/10 border border-spring-green/30 p-4 text-sm text-creative-midnight"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-spring-green text-white">
                            <svg
                              className="h-5 w-5"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden
                            >
                              <path
                                d="M20 6L9 17l-5-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium">You're on the list</div>
                            <div className="text-xs text-muted-foreground">
                              We'll send a confirmation to{" "}
                              <span className="font-medium">{email}</span> if provided.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
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

const styles = `
  .disabled-hover {
    pointer-events: none;
  }
  
  .disabled-hover:hover {
    border-color: inherit !important;
    background-color: inherit !important;
  }
`;

export default function ReservationBookingFormPage() {
  return (
    <>
      <style>{styles}</style>
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


