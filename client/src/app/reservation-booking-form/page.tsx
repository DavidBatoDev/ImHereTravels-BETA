"use client";

import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import StripePayment from "./StripePayment";
import BirthdatePicker from "./BirthdatePicker";
import Select from "./Select";

const Page = () => {
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
      name: string;
      travelDates: string[];
      status?: "active" | "inactive";
      stripePaymentLink?: string;
      deposit?: number; // reservation fee from pricing.deposit
      price: number; // total tour price
    }>
  >([]);
  const [tourDates, setTourDates] = useState<string[]>([]);

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
  // clear all “Personal & Booking” inputs together with one animation
  const [clearing, setClearing] = useState(false);
  // animation timing (ms) used for transitions so entrance/exit durations match
  const ANIM_DURATION = 300;

  // ---- multi-step flow state ----
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState<string>("");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmingBooking, setConfirmingBooking] = useState(false);

  // Generate booking ID after payment
  // Format: <PREFIX>-<ABBREV>-YYYYMMDD-<INITIALS>-<CODE>
  // PREFIX: SB (Single Booking), DB (Duo Booking), GB (Group Booking)
  // For Single: CODE = Count (e.g., 001)
  // For Duo/Group: CODE = Random4Digits (e.g., 8472, same random code for all guests in group)
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
    // Extract first letter of each word (e.g., "Japan Adventure" -> "JA")
    // Remove any text in parentheses first (e.g., "Japan Adventure (Standard)" -> "Japan Adventure")
    const packageName = selectedPackage?.name || "";
    const cleanName = packageName.replace(/\([^)]*\)/g, "").trim(); // Remove text in parentheses
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
        const bookingCount = querySnapshot.size + 1; // Current count + 1 for this new booking
        codeSuffix = String(bookingCount).padStart(3, "0");
      } catch (error) {
        console.error("Error counting bookings:", error);
        // Fallback to random number if query fails
        const randomNum = Math.floor(Math.random() * 900) + 100;
        codeSuffix = String(randomNum);
      }
    } else {
      // For duo/group bookings: use random 4-digit code (same for all guests in the group)
      // This code will be shared by all members of the duo/group
      const randomCode = Math.floor(Math.random() * 9000) + 1000; // 4-digit random (1000-9999)
      codeSuffix = String(randomCode);
    }

    return `${prefix}-${packageAbbrev}-${dateStr}-${initials}-${codeSuffix}`;
  };

  // computed helpers
  const canEditStep1 = !paymentConfirmed; // lock step 1 after payment
  const progressWidth = step === 1 ? "w-1/3" : step === 2 ? "w-2/3" : "w-full";

  // Get deposit amount from selected package
  const selectedPackage = tourPackages.find((p) => p.id === tourPackage);
  const depositAmount = selectedPackage?.deposit ?? 250;

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
  // This calculates how many monthly payment dates (2nd of month) are available
  // between reservation date and tour date
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
      // Less than 30 days: Last minute booking
      return { term: "last_minute", isLastMinute: true, isInvalid: false };
    } else {
      // Calculate how many 2nd-of-month dates are available
      // Based on spreadsheet formula: counts months from reservation to (tour date - 30 days)
      // This ensures last payment is at least 30 days before tour
      const today = new Date();
      const tourDateObj = new Date(tourDate);
      const fullPaymentDue = new Date(tourDateObj);
      fullPaymentDue.setDate(fullPaymentDue.getDate() - 30); // 30 days before tour

      // Calculate full months between today and full payment due date
      const yearDiff = fullPaymentDue.getFullYear() - today.getFullYear();
      const monthDiff = fullPaymentDue.getMonth() - today.getMonth();
      const monthCount = Math.max(0, yearDiff * 12 + monthDiff);

      // Determine the payment term based on available months
      if (monthCount >= 4) {
        return { term: "P4", isLastMinute: false, isInvalid: false };
      } else if (monthCount === 3) {
        return { term: "P3", isLastMinute: false, isInvalid: false };
      } else if (monthCount === 2) {
        return { term: "P2", isLastMinute: false, isInvalid: false };
      } else if (monthCount === 1) {
        return { term: "P1", isLastMinute: false, isInvalid: false };
      } else {
        // Less than 1 month available but >= 30 days
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

    // Start from next month, always on the 2nd day (using UTC to avoid timezone issues)
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Calculate next month (handle year rollover)
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }

    for (let i = 0; i < monthsRequired; i++) {
      // Calculate payment month/year
      let paymentMonth = nextMonth + i;
      let paymentYear = nextYear;

      // Handle year rollover
      while (paymentMonth > 11) {
        paymentMonth -= 12;
        paymentYear++;
      }

      // Create date string in YYYY-MM-DD format (always 2nd of month)
      const dateStr = `${paymentYear}-${String(paymentMonth + 1).padStart(
        2,
        "0"
      )}-02`;

      schedule.push({
        date: dateStr,
        amount:
          i === monthsRequired - 1
            ? remainingBalance - monthlyAmount * (monthsRequired - 1) // Last payment gets the remainder
            : monthlyAmount,
      });
    }

    return schedule;
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

    // Get all plans up to the available term
    const termMap: { [key: string]: number } = { P1: 1, P2: 2, P3: 3, P4: 4 };
    const maxMonths = termMap[availablePaymentTerm.term] || 0;

    return paymentTerms
      .filter((term) => term.monthsRequired && term.monthsRequired <= maxMonths)
      .map((term) => ({
        id: term.id,
        type: term.paymentPlanType,
        label: term.name,
        description: term.description,
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
        // ensure starting height is applied
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

  // shared field classes to keep focus/error border styling uniform
  const fieldBase =
    "mt-1 block w-full px-4 py-3 rounded-md bg-input text-foreground placeholder:opacity-70 transition-shadow";
  const fieldBorder = (err?: boolean) =>
    `border ${err ? "border-destructive" : "border-border"}`;
  const fieldFocus = "focus:outline-none focus:border-primary";

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

  // Fetch tour packages live from Firestore
  useEffect(() => {
    const q = collection(db, "tourPackages");
    const unsub = onSnapshot(
      q,
      (snap) => {
        const pkgList = snap.docs.map((doc) => {
          const payload = doc.data() as any;

          // Normalize travelDates to yyyy-mm-dd (defensive: guard invalid dates)
          const dates = (payload.travelDates ?? [])
            .map((t: any) => {
              const sd = t?.startDate;
              if (!sd) return null;

              // Resolve various possible timestamp shapes (Firestore Timestamp, object with toDate, ISO string)
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

              // If date is invalid, skip it rather than throwing in toISOString
              if (!dateObj || isNaN(dateObj.getTime())) return null;

              return dateObj.toISOString().slice(0, 10);
            })
            .filter(Boolean) as string[];

          return {
            id: doc.id,
            name: payload.name ?? payload.title ?? "",
            travelDates: dates,
            stripePaymentLink: payload.stripePaymentLink,
            status: payload.status === "inactive" ? "inactive" : "active",
            deposit: payload.pricing?.deposit ?? 250, // default to £250 if not found
            price: payload.pricing?.original ?? 2050, // use 'original' field from pricing map
          };
        });

        setTourPackages(pkgList as any); // 'as any' ensures TS doesn't complain about the extra status field
      },
      (err) => console.error("tourPackages snapshot error", err)
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
            // Sort by payment plan type order
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
    if (!tourPackage) return;
    const pkg = tourPackages.find((p) => p.id === tourPackage);
    if (!pkg || pkg.status === "inactive") {
      setTourPackage("");
      setTourDates([]);
      setTourDate("");
    }
    setTourDates(pkg?.travelDates ?? []);
    setTourDate(""); // reset previously picked date when package changes
  }, [tourPackage, tourPackages]);

  // Show/Hide Tour Date when a Tour Package is selected
  useEffect(() => {
    if (tourPackage) {
      setDateMounted(true); // mount content
      requestAnimationFrame(() => setDateVisible(true)); // then fade/expand in
    } else {
      setDateVisible(false); // start collapse
      const t = setTimeout(() => setDateMounted(false), 220); // unmount after anim
      setTourDate(""); // clear previous date
      setErrors((e) => ({ ...e, tourDate: "" })); // drop error if hidden (use empty string to match error type)
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
      setAdditionalGuests([...additionalGuests.slice(0, 1), ""]); // ensure single slot
      return;
    }
    // fallback: do not add
    return;
  };

  const handleBookingTypeChange = async (value: string) => {
    const animateToState = async (applyState: () => void) => {
      const wasMounted = guestsMounted;
      if (!wasMounted) {
        setGuestsMounted(true);
        setGuestsHeight("1px"); // allow initial paint
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
    if (bookingType !== "Group Booking") return; // only matters in Group mode
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
    if (!tourPackage) e.tourPackage = "Tour package is required";
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
    // For now, just log values. Replace with API call as needed.
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

      // Update Firestore with selected payment plan and status progression
      const {
        doc,
        updateDoc,
        serverTimestamp,
        collection,
        query,
        where,
        getDocs,
      } = await import("firebase/firestore");

      // Find the payment document by bookingId
      const paymentsRef = collection(db, "stripePayments");
      const q = query(paymentsRef, where("bookingId", "==", bookingId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const paymentDoc = querySnapshot.docs[0];
        console.log("📝 Updating booking with payment plan:", paymentDoc.id);

        const updateData: any = {
          status: "terms_selected",
          selectedPaymentPlan: selectedPaymentPlan,
          confirmedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Add payment plan details if available
        if (selectedPlan) {
          updateData.paymentPlanDetails = selectedPlan;
        }

        console.log("📤 Confirmation update data:", updateData);

        await updateDoc(doc(db, "stripePayments", paymentDoc.id), updateData);

        console.log("✅ Booking confirmed successfully!");
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
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-crimson-red/20 via-creative-midnight/30 to-spring-green/20 animate-gradient-shift bg-[length:200%_200%]" />
      </div>

      <div
        className={`relative z-10 w-full max-w-lg bg-card/95 text-card-foreground border border-border shadow-lg rounded-lg p-8 backdrop-blur-sm transition-all duration-300`}
        aria-labelledby="reservation-form-title"
      >
        {/* assistive live region to announce tour date visibility changes */}
        <div aria-live="polite" className="sr-only">
          {dateVisible ? "Tour date shown" : "Tour date hidden"}
        </div>
        {/* Progress tracker placeholder for Steps 1-3 (static; wire later) */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h2
                id="reservation-form-title"
                className="text-2xl font-hk-grotesk font-semibold text-creative-midnight mb-1"
              >
                Reserve your tour spot
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Choose your tour package and date, pay the down payment, then
                complete your payment plan to secure your spot.
              </p>
            </div>
          </div>

          <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 bg-primary rounded-full transition-all duration-300 ${progressWidth}`}
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-4 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                // Can view step 1 even after payment, but it will be locked (read-only)
                setStep(1);
              }}
              className="flex items-center gap-2 transition-opacity hover:opacity-80 cursor-pointer"
            >
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  step === 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                1
              </div>
              <div>Personal & Booking</div>
            </button>
            <button
              type="button"
              onClick={() => {
                // Can go to step 2 if currently in step 2, or from step 1 if form is valid
                if (step === 2) {
                  setStep(2);
                } else if (step === 1 && tourPackage && tourDate) {
                  setStep(2);
                }
              }}
              disabled={step === 3}
              className={`flex items-center gap-2 transition-opacity ${
                step === 3
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:opacity-80 cursor-pointer"
              }`}
            >
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  step === 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                2
              </div>
              <div>Payment</div>
            </button>
            <button
              type="button"
              onClick={() => {
                // Can only go to step 3 if payment is confirmed
                if (paymentConfirmed) setStep(3);
              }}
              disabled={!paymentConfirmed}
              className={`flex items-center gap-2 transition-opacity ${
                !paymentConfirmed
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:opacity-80 cursor-pointer"
              }`}
            >
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  step === 3
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                3
              </div>
              <div>Payment plan</div>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* STEP 1 - Personal & Booking Details */}
          {step === 1 && (
            <div className="rounded-md bg-card/60 p-4 border border-border">
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
              <h3 className="text-lg font-medium text-foreground mb-3">
                Personal & Booking details
              </h3>
              <div
                className={`space-y-4 transition-all duration-300 ${
                  clearing ? "opacity-0" : "opacity-100"
                }`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-foreground">
                      Email address
                    </span>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={`${fieldBase} ${fieldBorder(
                        !!errors.email
                      )} ${fieldFocus}`}
                      aria-invalid={!!errors.email}
                      aria-describedby={
                        errors.email ? "email-error" : undefined
                      }
                      disabled={paymentConfirmed}
                    />
                    {errors.email && (
                      <p
                        id="email-error"
                        className="mt-1 text-xs text-destructive"
                      >
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
                    {/* optional error text below if you have validation */}
                    {errors?.birthdate && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.birthdate}
                      </p>
                    )}
                  </label>
                </div>

                {/* First name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-foreground">
                      First name
                    </span>
                    <input
                      type="text"
                      name="firstName"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Alex"
                      className={`${fieldBase} ${fieldBorder(
                        !!errors.firstName
                      )} ${fieldFocus}`}
                      aria-invalid={!!errors.firstName}
                      aria-describedby={
                        errors.firstName ? "firstName-error" : undefined
                      }
                      disabled={paymentConfirmed}
                    />
                    {/* error text here */}
                    {errors.firstName && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.firstName}
                      </p>
                    )}
                  </label>

                  {/* Last name */}
                  <label className="block">
                    <span className="text-sm font-medium text-foreground">
                      Last name
                    </span>
                    <input
                      type="text"
                      name="lastName"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Johnson"
                      className={`${fieldBase} ${fieldBorder(
                        !!errors.lastName
                      )} ${fieldFocus}`}
                      aria-invalid={!!errors.lastName}
                      aria-describedby={
                        errors.lastName ? "lastName-error" : undefined
                      }
                      disabled={paymentConfirmed}
                    />
                    {/* error text here */}
                    {errors.lastName && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.lastName}
                      </p>
                    )}
                  </label>
                </div>

                {/* Nationality */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-foreground">
                      Nationality
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
                    {/* error text here */}
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
                    {/* error text here */}
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

                            {/* 👇 allow typing 3..20 */}
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
                                placeholder={`Guest #${idx + 1} email address`}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium text-foreground">
                      Tour package
                    </span>
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
                    {/* error text here */}
                    {errors.tourPackage && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.tourPackage}
                      </p>
                    )}
                  </label>
                </div>
                {/* Tour date (conditionally shown) */}
                <div
                  className="overflow-hidden transition-[max-height,opacity] duration-300"
                  style={{
                    maxHeight: dateVisible ? 140 : 0,
                    opacity: dateVisible ? 1 : 0,
                  }}
                >
                  {dateMounted && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="block">
                        <span className="text-sm font-medium text-foreground">
                          Tour date
                        </span>
                        <Select
                          value={tourDate || null}
                          onChange={setTourDate}
                          options={tourDateOptions}
                          placeholder="Select a date"
                          ariaLabel="Tour Date"
                          className="mt-1"
                          disabled={!tourPackage || paymentConfirmed}
                        />
                        {/* error text here */}
                        {errors?.tourDate && (
                          <p className="mt-1 text-xs text-destructive">
                            {errors.tourDate}
                          </p>
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
            <div className="rounded-md bg-card/60 p-4 border border-border space-y-4">
              <h3 className="text-lg font-medium text-foreground">
                Pay reservation fee
              </h3>

              {!tourPackage ? (
                <p className="text-sm text-destructive">
                  Please go back and choose a tour package before proceeding to
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
                          Once payment is complete, you won't be able to change
                          your booking details. If you need to make changes
                          after payment, you can request a refund through the
                          reservation confirmation email.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/10 border border-border rounded-md p-4 mb-4">
                    <div className="flex justify-between items-center text-sm mt-2">
                      <span className="text-muted-foreground">
                        Tour package:
                      </span>
                      <span className="font-medium">
                        {tourPackages.find((p) => p.id === tourPackage)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-2">
                      <span className="text-muted-foreground">
                        Reservation fee:
                      </span>
                      <span className="font-medium text-lg">
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
                    onSuccess={async (paymentIntentId, paymentDocId) => {
                      try {
                        console.log(
                          "🎉 Payment success! Intent ID:",
                          paymentIntentId
                        );
                        console.log("📄 Payment Document ID:", paymentDocId);

                        // Generate booking ID after successful payment
                        const newBookingId = await generateBookingId();
                        console.log("✅ Generated booking ID:", newBookingId);
                        setBookingId(newBookingId);

                        // Extract group code for duo/group bookings (suffix after initials)
                        // New Format: DB-JA-20260314-JG-8472 -> groupCode = "8472"
                        let groupCode: string | null = null;
                        if (
                          bookingType === "Duo Booking" ||
                          bookingType === "Group Booking"
                        ) {
                          const parts = newBookingId.split("-");
                          if (parts.length >= 5) {
                            groupCode = parts[4]; // e.g., "8472"
                          }
                        }

                        // Save personal & booking information to Firestore stripePayments collection
                        const {
                          doc,
                          updateDoc,
                          serverTimestamp,
                          collection,
                          query,
                          where,
                          getDocs,
                        } = await import("firebase/firestore");

                        const updateData: any = {
                          bookingId: newBookingId,
                          // Personal information
                          email: email,
                          firstName: firstName,
                          lastName: lastName,
                          birthdate: birthdate,
                          nationality: nationality,
                          // Booking details
                          bookingType: bookingType,
                          groupSize:
                            bookingType === "Group Booking"
                              ? groupSize
                              : bookingType === "Duo Booking"
                              ? 2
                              : 1,
                          additionalGuests:
                            bookingType === "Duo Booking" ||
                            bookingType === "Group Booking"
                              ? additionalGuests
                              : [],
                          // Tour information
                          tourPackageId: tourPackage,
                          tourPackageName: selectedPackage?.name || "",
                          tourDate: tourDate,
                          // Update status and timestamp
                          status: "reserve_paid",
                          updatedAt: serverTimestamp(),
                        };

                        // Add group code for duo/group bookings
                        if (groupCode) {
                          updateData.groupCode = groupCode;
                        }

                        console.log("📤 Update data:", updateData);

                        // Try to update using document ID first, fallback to query if not available
                        if (paymentDocId) {
                          console.log(
                            "📝 Updating payment document by ID:",
                            paymentDocId
                          );
                          await updateDoc(
                            doc(db, "stripePayments", paymentDocId),
                            updateData
                          );
                          console.log(
                            "✅ Booking information saved successfully!"
                          );
                        } else {
                          console.warn(
                            "⚠️ No payment document ID provided, falling back to query by stripeIntentId"
                          );

                          // Fallback: Query by stripeIntentId
                          const paymentsRef = collection(db, "stripePayments");
                          const q = query(
                            paymentsRef,
                            where("stripeIntentId", "==", paymentIntentId)
                          );
                          const querySnapshot = await getDocs(q);

                          console.log(
                            "🔍 Found documents by query:",
                            querySnapshot.size
                          );

                          if (!querySnapshot.empty) {
                            const paymentDoc = querySnapshot.docs[0];
                            console.log(
                              "📝 Updating payment document:",
                              paymentDoc.id
                            );
                            await updateDoc(
                              doc(db, "stripePayments", paymentDoc.id),
                              updateData
                            );
                            console.log(
                              "✅ Booking information saved successfully via query!"
                            );
                          } else {
                            console.error(
                              "❌ Payment document not found for paymentIntentId:",
                              paymentIntentId
                            );
                          }
                        }

                        // Keep session storage until user proceeds, to prevent re-initializing a new PaymentIntent on re-render
                        // We'll clear this when the user moves to the next step or starts a new booking.

                        setPaymentConfirmed(true);
                      } catch (error) {
                        console.error(
                          "❌ Error saving booking information:",
                          error
                        );
                        console.error("Error details:", error);
                        // Still proceed with payment confirmation even if saving fails
                        setPaymentConfirmed(true);
                      }
                    }}
                  />
                </>
              )}
            </div>
          )}

          {/* STEP 3 - PAYMENT PLAN */}
          {step === 3 && (
            <div className="rounded-md bg-card/60 p-4 border border-border space-y-4">
              <div className="bg-spring-green/10 border border-spring-green/30 p-4 rounded-md mb-4">
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
                      Reservation confirmed!
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Booking ID:{" "}
                      <span className="font-mono font-medium text-foreground">
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
                <div className="bg-muted/10 border border-border rounded-md p-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Tour package:
                      </span>
                      <span className="font-medium">
                        {selectedPackage.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tour date:</span>
                      <span className="font-medium">{tourDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Days until tour:
                      </span>
                      <span className="font-medium">
                        {calculateDaysBetween(tourDate)} days
                      </span>
                    </div>
                    <div className="border-t border-border my-2"></div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tour cost:</span>
                      <span className="font-medium">
                        £{selectedPackage.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Reservation fee paid:
                      </span>
                      <span className="font-medium text-spring-green">
                        -£{depositAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-border my-2"></div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Remaining balance:
                      </span>
                      <span className="font-bold text-lg">
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
            {step > 1 && step < 3 ? (
              <button
                type="button"
                onClick={() =>
                  setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))
                }
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Back
              </button>
            ) : step === 1 && !paymentConfirmed ? (
              <button
                type="button"
                onClick={async () => {
                  // same reset you had
                  setClearing(true);
                  const startH =
                    guestsWrapRef.current?.getBoundingClientRect().height ?? 0;
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
                  if (!validate()) return;
                  setStep(2);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md shadow-md hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-ring transition"
              >
                Next
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                disabled={!paymentConfirmed}
                onClick={() => {
                  // Clear the payment session when proceeding to next step to allow new bookings later
                  try {
                    const sessionKey = `stripe_payment_${email}_${tourPackage}`;
                    sessionStorage.removeItem(sessionKey);
                  } catch {}
                  setStep(3);
                }}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-ring transition
                              ${
                                paymentConfirmed
                                  ? "bg-primary text-primary-foreground hover:brightness-95"
                                  : "bg-muted text-muted-foreground cursor-not-allowed"
                              }`}
              >
                Continue
              </button>
            )}

            {step === 3 && !bookingConfirmed && (
              <button
                type="button"
                onClick={handleConfirmBooking}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-ring transition ${
                  availablePaymentTerm.isLastMinute || selectedPaymentPlan
                    ? "bg-primary text-primary-foreground hover:brightness-95"
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
                  "Confirm Booking"
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
                      A confirmation email with your booking details and payment
                      schedule will be sent to{" "}
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
  );
};

export default Page;
