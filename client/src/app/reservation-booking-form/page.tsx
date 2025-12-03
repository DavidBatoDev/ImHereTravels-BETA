// client/src/app/reservation-booking-form/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
  const [bookingType, setBookingType] = useState("Single Booking");
  const [groupSize, setGroupSize] = useState<number>(3);
  const [tourPackage, setTourPackage] = useState(""); // will store package id
  const [tourDate, setTourDate] = useState("");
  const [additionalGuests, setAdditionalGuests] = useState<string[]>([]);

  // dynamic tour packages and dates loaded from Firestore
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
    }>
  >([]);
  const [tourDates, setTourDates] = useState<string[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(true);

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
  // animation timing (ms) used for transitions so entrance/exit durations match
  const ANIM_DURATION = 300;

  // ---- multi-step flow state ----
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
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
          ? `Pay £${depositAmount.toFixed(
              2
            )} reservation fee to secure your spot`
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
        status: "reserve_pending",
        email,
        firstName,
        lastName,
        birthdate,
        nationality,
        bookingType,
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
        tourPackageId: tourPackage,
        tourPackageName: selectedPackage?.name || "",
        tourDate,
        amountGBP: depositAmount,
        currency: "GBP",
        type: "reservationFee",
        createdAt: serverTimestamp(),
      });

      // write the id into the document for convenience
      await setDoc(
        doc(db, "stripePayments", newDoc.id),
        { id: newDoc.id },
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
    if (!validate()) return;

    // If we already have a paymentDocId, just proceed
    if (paymentDocId) {
      if (!completedSteps.includes(1)) {
        setCompletedSteps([...completedSteps, 1]);
      }
      setStep(2);
      try {
        replaceWithPaymentId(paymentDocId);
      } catch (err) {
        console.debug("Failed to set paymentid query param:", err);
      }
      return;
    }

    setModalLoading(true);
    try {
      const paymentsRef = collection(db, "stripePayments");
      const q = query(
        paymentsRef,
        where("email", "==", email),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
        // show modal with options
        setFoundStripePayments(docs);
        setShowEmailModal(true);
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
    }
  };

  const handleReuseExisting = async (rec: any) => {
    setShowEmailModal(false);
    setPaymentDocId(rec.id);
    try {
      sessionStorage.setItem(
        `stripe_payment_doc_${email}_${tourPackage}`,
        rec.id
      );
    } catch {}
    // navigate to appropriate step based on status
    try {
      replaceWithPaymentId(rec.id);
    } catch (err) {
      console.debug(
        "Failed to set paymentid query param for reused record:",
        err
      );
    }
    if (rec.status === "reserve_paid" || rec.status === "terms_selected") {
      setPaymentConfirmed(true);
      setStep(3);
      if (rec.bookingId) setBookingId(rec.bookingId);
      // mark step1 completed
      if (!completedSteps.includes(1)) {
        setCompletedSteps([...completedSteps, 1]);
      }
    } else {
      // pending
      if (!completedSteps.includes(1)) {
        setCompletedSteps([...completedSteps, 1]);
      }
      setStep(2);
    }
  };

  const handleDiscardExisting = async (recId: string, status?: string) => {
    // Prevent discarding paid or confirmed reservations
    if (status === "reserve_paid" || status === "terms_selected") {
      alert(
        "Cannot discard a reservation that is already paid or confirmed. If you need help, contact support."
      );
      return;
    }

    try {
      await deleteDoc(doc(db, "stripePayments", recId));
      setFoundStripePayments((prev) => prev.filter((d) => d.id !== recId));
      // after discard, create a fresh placeholder
      const id = await createPlaceholder();
      if (!completedSteps.includes(1)) {
        setCompletedSteps([...completedSteps, 1]);
      }
      setShowEmailModal(false);
      setStep(2);
    } catch (err) {
      console.error("Failed to discard existing stripePayment:", err);
      alert("Unable to discard reservation. Please try again.");
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

  // Get deposit amount from selected package
  const selectedPackage = tourPackages.find((p) => p.id === tourPackage);
  const depositAmount = selectedPackage?.deposit ?? 250;

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
          if (match) {
            setTourPackage(match.id);
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
      return { term: "last_minute", isLastMinute: true, isInvalid: false };
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
        return { term: "last_minute", isLastMinute: true, isInvalid: false };
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

    const remainingBalance = selectedPackage.price - depositAmount;
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
    "mt-1 block w-full px-4 py-3 rounded-lg bg-input text-foreground placeholder:text-muted-foreground/60 transition-all duration-200 shadow-sm";
  const fieldBorder = (err?: boolean) =>
    `border-2 ${err ? "border-destructive" : "border-border"}`;
  const fieldFocus =
    "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md hover:border-primary/50";
  const fieldSuccess = "border-green-500/50 bg-green-50/5";
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

  const nationalities = [
    "Philippines",
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "India",
    "Other",
  ];

  const nationalityOptions = nationalities.map((n) => ({ label: n, value: n }));

  const bookingTypeOptions = [
    { label: "Single Booking", value: "Single Booking" },
    { label: "Duo Booking", value: "Duo Booking" },
    { label: "Group Booking", value: "Group Booking" },
  ];
  const tourPackageOptions = tourPackages.map((p) => ({
    label: p.name,
    value: p.id,
    disabled: p.status === "inactive",
    description:
      p.status === "inactive"
        ? "Tour currently not available — please check back soon."
        : undefined,
  }));

  const tourDateOptions = (tourDates ?? []).map((d: string) => {
    const daysBetween = calculateDaysBetween(d);
    const isInvalid = daysBetween < 2;

    return {
      label: d,
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
        email: email,
        firstName: firstName,
        lastName: lastName,
        birthdate: birthdate,
        nationality: nationality,
        bookingType: bookingType,
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
        tourPackageId: tourPackage,
        tourPackageName: selectedPackage?.name || "",
        tourDate: tourDate,
        status: "reserve_paid",
        stripeIntentId: paymentIntentId,
        updatedAt: serverTimestamp(),
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
          where("stripeIntentId", "==", paymentIntentId)
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
      // Still proceed with payment confirmation even if saving fails
      setPaymentConfirmed(true);
      if (!completedSteps.includes(1)) {
        setCompletedSteps((prev) => [...prev, 1]);
      }
      if (!completedSteps.includes(2)) {
        setCompletedSteps((prev) => [...prev, 2]);
      }
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
              }" has no valid travel dates.`
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

          return {
            id: doc.id,
            name,
            slug: slugFromPayload || (name ? slugify(name) : doc.id),
            travelDates: dates,
            stripePaymentLink: payload.stripePaymentLink,
            status: payload.status === "inactive" ? "inactive" : "active",
            deposit: payload.pricing?.deposit ?? 250,
            price: payload.pricing?.original ?? 2050,
          };
        });

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
          key.startsWith("stripe_payment_") &&
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
        // look for any key that starts with stripe_payment_doc_
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

              // Populate form fields from stored doc
              if (data.email) setEmail(data.email);
              if (data.firstName) setFirstName(data.firstName);
              if (data.lastName) setLastName(data.lastName);
              if (data.birthdate) setBirthdate(data.birthdate);
              if (data.nationality) setNationality(data.nationality);
              if (data.bookingType) setBookingType(data.bookingType);
              if (typeof data.groupSize === "number")
                setGroupSize(data.groupSize);
              if (Array.isArray(data.additionalGuests))
                setAdditionalGuests(data.additionalGuests);
              if (data.tourPackageId) setTourPackage(data.tourPackageId);
              if (data.tourDate) setTourDate(data.tourDate);

              // Advance to the appropriate step based on status
              if (data.status === "reserve_pending") {
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
              } else if (data.status === "reserve_paid") {
                // payment completed — go to payment plan
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
                if (data.bookingId) setBookingId(data.bookingId);
                setCompletedSteps((prev) =>
                  Array.from(new Set([...prev, 1, 2]))
                );
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

  // animate additional guests area when bookingType changes (measured height)
  useEffect(() => {
    if (bookingType === "Duo Booking" || bookingType === "Group Booking") {
      setGuestsMounted(true);
    } else {
      setGuestsHeight("0px");
      setTimeout(() => setGuestsMounted(false), ANIM_DURATION + 20);
    }
  }, [bookingType]);

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
      });
      return;
    }

    // Collapse to Single
    if (value === "Single Booking") {
      const startH = guestsWrapRef.current?.getBoundingClientRect().height ?? 0;
      await animateHeight(startH, 0);
      setGuestsHeight("0px");
      setAdditionalGuests([]);
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
    });
  };

  const handleGuestChange = (idx: number, value: string) => {
    const copy = [...additionalGuests];
    copy[idx] = value;
    setAdditionalGuests(copy);
  };

  const validate = () => {
    const e: { [k: string]: string } = {};

    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Enter a valid email";

    if (!birthdate) e.birthdate = "Birthdate is required";
    if (!firstName) e.firstName = "First name is required";
    if (!lastName) e.lastName = "Last name is required";
    if (!nationality) e.nationality = "Nationality is required";
    if (!bookingType) e.bookingType = "Booking type is required";
    if (!tourPackage) e.tourPackage = "Tour name is required";
    if (tourPackage && !tourDate) e.tourDate = "Tour date is required";

    // Duo/Group guests email check
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

  const handleConfirmBooking = async () => {
    try {
      setConfirmingBooking(true);

      // Check if payment plan is selected (not required for last minute bookings)
      if (!availablePaymentTerm.isLastMinute && !selectedPaymentPlan) {
        alert("Please select a payment plan to continue");
        return;
      }

      console.log(
        "🎯 Confirming booking with payment plan:",
        selectedPaymentPlan
      );

      // Get the selected payment plan details
      const availablePlans = getAvailablePaymentPlans();
      const selectedPlan = availablePlans.find(
        (plan) =>
          plan.id === selectedPaymentPlan || plan.type === selectedPaymentPlan
      );

      // Find the payment document by bookingId
      const { collection, query, where, getDocs } = await import(
        "firebase/firestore"
      );

      const paymentsRef = collection(db, "stripePayments");
      const q = query(paymentsRef, where("bookingId", "==", bookingId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const paymentDoc = querySnapshot.docs[0];
        const paymentDocId = paymentDoc.id;
        console.log(
          "📝 Updating booking with payment plan via API:",
          paymentDocId
        );

        // Call the select-plan API to update both stripePayments and bookings
        const response = await fetch("/api/stripe-payments/select-plan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentDocId: paymentDocId,
            selectedPaymentPlan: selectedPaymentPlan,
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
        console.error(
          "❌ Payment document not found for bookingId:",
          bookingId
        );
        alert("Error: Could not find your booking. Please contact support.");
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
    <div className="min-h-screen bg-background relative overflow-hidden theme-transition">
      {/* Animated gradient background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-crimson-red/20 via-creative-midnight/30 to-spring-green/20 animate-gradient-shift bg-[length:200%_200%]" />
      </div>

      {/* Theme Toggle Button */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Email-check modal shown when existing stripePayments are found for this email */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Existing reservation(s) for this email</DialogTitle>
            <DialogDescription>
              {foundStripePayments &&
              foundStripePayments.some((r) => r.status === "reserve_paid")
                ? "We found a paid reservation for this email — you can reuse it to continue selecting a payment plan or view its details."
                : "We found previous reservation attempts using this email. You can reuse one of them or discard it and create a new reservation."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            {modalLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              foundStripePayments.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded"
                >
                  <div className="text-sm">
                    <div className="font-semibold">
                      {rec.tourPackageName || rec.tourPackageId || "-"}
                    </div>
                    <div className="text-xs text-foreground/70 flex items-center gap-2">
                      {rec.tourDate ? <span>{rec.tourDate} ·</span> : null}
                      <span>
                        {/* compact status tag */}
                        {rec.status === "reserve_paid" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 font-semibold">
                            Paid
                          </span>
                        ) : rec.status === "reserve_pending" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800 font-semibold">
                            Pending
                          </span>
                        ) : rec.status === "terms_selected" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 font-semibold">
                            Terms
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted/30 text-foreground font-semibold">
                            Unknown
                          </span>
                        )}
                      </span>
                      <span>· £{rec.amountGBP || "0.00"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReuseExisting(rec)}
                      className="px-3 py-1 rounded bg-primary text-primary-foreground text-sm font-medium"
                    >
                      Use this
                    </button>
                    {!(
                      rec.status === "reserve_paid" ||
                      rec.status === "terms_selected"
                    ) && (
                      <button
                        onClick={() => handleDiscardExisting(rec.id)}
                        className="px-3 py-1 rounded bg-red-600 text-white text-sm font-medium"
                      >
                        Discard
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
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
          {/* Progress tracker placeholder for Steps 1-3 (static; wire later) */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h2
                  id="reservation-form-title"
                  className="text-2xl sm:text-3xl font-hk-grotesk font-bold text-foreground mb-2"
                >
                  Reserve your tour spot
                </h2>
                <p className="text-sm sm:text-base text-foreground/80 mb-1 leading-relaxed font-medium">
                  Choose your tour package and date, pay the down payment, then
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
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                }}
                className="flex items-center gap-1.5 sm:gap-2 transition-all duration-200 hover:opacity-80 cursor-pointer group"
              >
                <div
                  className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                    step === 1
                      ? "bg-gradient-to-br from-primary to-crimson-red text-primary-foreground shadow-lg scale-110 ring-2 ring-primary/30"
                      : completedSteps.includes(1)
                      ? "bg-white text-green-600 shadow-md group-hover:scale-105 ring-2 ring-green-500/30"
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
                  if (completedSteps.includes(2) || step === 2) {
                    setStep(2);
                  } else if (step === 1 && tourPackage && tourDate) {
                    if (!completedSteps.includes(1)) {
                      setCompletedSteps([...completedSteps, 1]);
                    }
                    setStep(2);
                  }
                }}
                disabled={step === 1 && (!tourPackage || !tourDate)}
                className={`flex items-center gap-1.5 sm:gap-2 transition-all duration-200 group ${
                  step === 1 && (!tourPackage || !tourDate)
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
                      : step === 1 && (!tourPackage || !tourDate)
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
                      ? "bg-gradient-to-br from-primary to-crimson-red text-primary-foreground shadow-lg scale-110 ring-2 ring-primary/30"
                      : !paymentConfirmed
                      ? "bg-muted/50 text-muted-foreground"
                      : "bg-muted text-foreground group-hover:scale-105"
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

            {/* Dynamic Step Description */}
            <div className="mt-4 text-center">
              <p className="text-sm text-foreground/70 font-medium animate-fade-in">
                {getStepDescription()}
              </p>
            </div>

            {/* Helpful Info Card */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50/10 to-purple-50/10 border-2 border-blue-200/20 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-blue-600"
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
                <div className="flex-1">
                  <h4 className="font-bold text-foreground mb-2">
                    How it works
                  </h4>
                  <ul className="text-sm text-foreground/80 space-y-1.5 font-medium">
                    <li className="flex items-start gap-2">
                      <span className="text-crimson-red font-bold">1.</span>
                      <span>
                        Fill in your personal details and select your tour name
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-crimson-red font-bold">2.</span>
                      <span>
                        Pay a small reservation fee to secure your spot
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-crimson-red font-bold">3.</span>
                      <span>
                        Pick a payment plan from a list of available options for
                        your tour date
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* STEP 1 - Personal & Booking Details */}
            {step === 1 && (
              <div className="rounded-lg bg-card/80 backdrop-blur-md p-4 sm:p-6 border border-border shadow-xl">
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
                <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-border/50">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <svg
                      className="w-5 h-5 text-primary"
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
                    Personal & Booking details
                  </h3>
                </div>
                <div
                  className={`space-y-4 transition-all duration-300 ${
                    clearing ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <label className="block relative group">
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
                            isFieldValid("email", email) ? fieldSuccess : ""
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
                      <span className="text-sm font-medium text-foreground">
                        Birthdate
                      </span>
                      <BirthdatePicker
                        value={birthdate}
                        onChange={(iso) => setBirthdate(iso)}
                        minYear={1920}
                        maxYear={new Date().getFullYear()}
                        disabled={paymentConfirmed}
                      />
                      {errors?.birthdate && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.birthdate}
                        </p>
                      )}
                    </label>
                  </div>

                  {/* First name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                              ? fieldSuccess
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
                              ? fieldSuccess
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
                          {errors.lastName}
                        </p>
                      )}
                    </label>
                  </div>

                  {/* Nationality & Booking Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                      />
                      {errors.nationality && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.nationality}
                        </p>
                      )}
                    </label>

                    {/* Booking type */}
                    <label className="block">
                      <span className="text-sm font-medium text-foreground">
                        Booking type
                      </span>
                      <Select
                        value={bookingType}
                        onChange={(v) => handleBookingTypeChange(v)}
                        options={bookingTypeOptions}
                        placeholder="Select booking type"
                        ariaLabel="Booking Type"
                        className="mt-1"
                        disabled={paymentConfirmed}
                      />
                      {errors.bookingType && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.bookingType}
                        </p>
                      )}
                    </label>
                  </div>

                  {/* Additional guests (collapsible) */}
                  <div
                    ref={guestsWrapRef}
                    className="overflow-hidden"
                    style={{ height: guestsHeight }}
                  >
                    {guestsMounted ? (
                      <div ref={guestsContentRef} className="space-y-2">
                        {/* Header row stays same height to prevent shaking */}
                        <div className="flex items-center justify-between min-h-10">
                          <div className="text-sm font-medium text-foreground">
                            Additional guests
                          </div>

                          {/* Keep layout stable; hide controls when not Group */}
                          <div
                            className={`flex items-center gap-3 ${
                              bookingType === "Group Booking"
                                ? ""
                                : "opacity-0 pointer-events-none"
                            }`}
                          >
                            <label className="text-sm text-foreground">
                              Group size
                            </label>
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                aria-label="Decrease group size"
                                onClick={() =>
                                  handleGroupSizeChange(groupSize - 1)
                                }
                                className="h-8 w-8 rounded-md bg-crimson-red text-white flex items-center justify-center hover:brightness-95 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={paymentConfirmed}
                              >
                                −
                              </button>

                              <input
                                type="number"
                                min={3}
                                max={20}
                                value={groupSize}
                                onChange={(e) =>
                                  handleGroupSizeChange(
                                    parseInt(e.target.value || "0", 10)
                                  )
                                }
                                className="w-16 text-center px-2 py-1 rounded-md bg-input border border-border text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                disabled={paymentConfirmed}
                              />

                              <button
                                type="button"
                                aria-label="Increase group size"
                                onClick={() =>
                                  handleGroupSizeChange(groupSize + 1)
                                }
                                className="h-8 w-8 rounded-md bg-crimson-red text-white flex items-center justify-center hover:brightness-95 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={paymentConfirmed}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {bookingType === "Duo Booking" ? (
                            <input
                              type="email"
                              name="guest-email"
                              autoComplete="email"
                              placeholder="Guest email address"
                              value={additionalGuests[0] ?? ""}
                              onChange={(e) =>
                                handleGuestChange(0, e.target.value)
                              }
                              className={`${fieldBase} ${fieldBorder(
                                !!errors["guest-0"]
                              )} ${fieldFocus}`}
                              disabled={paymentConfirmed}
                            />
                          ) : (
                            additionalGuests.map((g, idx) => (
                              <div key={idx}>
                                <input
                                  type="email"
                                  name={`guest-email-${idx}`}
                                  autoComplete="email"
                                  placeholder={`Guest #${
                                    idx + 1
                                  } email address`}
                                  value={g}
                                  onChange={(e) =>
                                    handleGuestChange(idx, e.target.value)
                                  }
                                  className={`${fieldBase} ${fieldBorder(
                                    !!errors[`guest-${idx}`]
                                  )} ${fieldFocus}`}
                                  disabled={paymentConfirmed}
                                />
                                {errors[`guest-${idx}`] && (
                                  <p className="mt-1 text-xs text-destructive">
                                    {errors[`guest-${idx}`]}
                                  </p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {/* Tour package */}
                  <div className="pt-6 border-t-2 border-border/30">
                    <div className="flex items-center gap-2 mb-4">
                      <svg
                        className="w-5 h-5 text-primary"
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
                      <h4 className="text-base font-bold text-foreground">
                        Tour Selection
                      </h4>
                    </div>
                    <label className="block">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        Tour name
                        <span className="text-destructive text-xs">*</span>
                      </span>
                      {isLoadingPackages ? (
                        <div className="mt-1 px-4 py-3 rounded-lg bg-input/50 border-2 border-border backdrop-blur-sm">
                          <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                            <span className="text-muted-foreground">
                              Loading tour packages...
                            </span>
                          </div>
                        </div>
                      ) : (
                        <Select
                          value={tourPackage || null}
                          onChange={(v) => setTourPackage(v)}
                          options={tourPackageOptions}
                          placeholder={
                            tourPackageOptions.length
                              ? "Select a package"
                              : "No packages available"
                          }
                          ariaLabel="Tour Package"
                          className="mt-1"
                          searchable
                          disabled={
                            tourPackageOptions.length === 0 || paymentConfirmed
                          }
                        />
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
                  </div>
                  {/* Tour date (conditionally shown) */}
                  <div
                    className="overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out"
                    style={{
                      maxHeight: dateVisible ? 200 : 0,
                      opacity: dateVisible ? 1 : 0,
                    }}
                  >
                    {dateMounted && (
                      <div className="pt-4">
                        <label className="block">
                          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <svg
                              className="w-4 h-4 text-primary"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            Tour date
                            <span className="text-destructive text-xs">*</span>
                          </span>
                          <Select
                            value={tourDate || null}
                            onChange={setTourDate}
                            options={tourDateOptions}
                            placeholder={
                              tourDateOptions.length === 0
                                ? "No dates available for this tour"
                                : "Select a date"
                            }
                            ariaLabel="Tour Date"
                            className="mt-1"
                            disabled={!tourPackage || paymentConfirmed}
                          />
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
                              <div className="mt-2 p-3 rounded-lg bg-amber-50/10 border border-amber-500/30">
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
                                  <span>
                                    This tour currently has no available dates.
                                    Please check back soon or contact us for
                                    more information.
                                  </span>
                                </p>
                              </div>
                            )}
                        </label>
                      </div>
                    )}
                  </div>
                </div>
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
                            change your booking details. If you need to make
                            changes after payment, you can request a refund
                            through the reservation confirmation email.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/10 border-2 border-border rounded-lg p-5 mb-4 shadow-sm">
                      <div className="flex justify-between items-center text-sm mt-2">
                        <span className="text-foreground/70 font-semibold">
                          Tour package:
                        </span>
                        <span className="font-bold text-foreground">
                          {tourPackages.find((p) => p.id === tourPackage)?.name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-border/50">
                        <span className="text-foreground/70 font-semibold">
                          Reservation fee:
                        </span>
                        <span className="font-bold text-lg text-crimson-red">
                          £{depositAmount.toFixed(2)}
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
                      onSuccess={handlePaymentSuccess}
                    />
                  </>
                )}
              </div>
            )}

            {/* STEP 3 - PAYMENT PLAN */}
            {step === 3 && (
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
                        <span>Booking ID:</span>
                        <span className="font-mono font-semibold text-foreground bg-background/50 px-2 py-0.5 rounded">
                          {bookingId}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-medium text-foreground">
                  Choose your payment plan
                </h3>

                {/* Tour Details Summary */}
                {selectedPackage && (
                  <div className="bg-muted/10 border-2 border-border rounded-lg p-5 shadow-sm">
                    <div className="text-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-foreground/70 font-semibold">
                          Tour package:
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
                          £{selectedPackage.price.toFixed(2)}
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
                          £{(selectedPackage.price - depositAmount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Plan Options */}
                {availablePaymentTerm.isLastMinute ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-md">
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
                          Last Minute Booking
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Your tour is coming up soon! Full payment of £
                          {selectedPackage
                            ? (selectedPackage.price - depositAmount).toFixed(2)
                            : "0.00"}{" "}
                          is required within 48 hours to confirm your spot.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Great news! You have up to{" "}
                      <span className="font-medium text-foreground">
                        {availablePaymentTerm.term}
                      </span>{" "}
                      flexible payment options. Pick what works best for you:
                    </p>

                    <div className="space-y-3">
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
                    checkExistingPaymentsAndMaybeProceed();
                  }}
                  className="group inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-primary to-crimson-red text-primary-foreground rounded-lg shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 font-semibold"
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
                <div className="bg-spring-green/10 text-spring-green border border-spring-green/30 p-6 rounded-md">
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-6 w-6 flex-shrink-0 mt-0.5"
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
                      <h3 className="font-semibold text-lg mb-2">
                        Booking Confirmed! 🎉
                      </h3>
                      <p className="mb-2">
                        Your booking ID is:{" "}
                        <span className="font-mono font-bold">{bookingId}</span>
                      </p>
                      <p className="text-sm opacity-90">
                        A confirmation email with your booking details and
                        payment schedule will be sent to{" "}
                        <span className="font-semibold">{email}</span> shortly.
                      </p>
                      <p className="text-sm opacity-90 mt-2">
                        Thank you for choosing I'm Here Travels! We look forward
                        to making your journey unforgettable.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Success note */}
          {submitted && step === 3 && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Page;
