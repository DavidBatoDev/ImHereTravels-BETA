"use client"

import React, { useState, useEffect } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "../../lib/firebase"
import BirthdatePicker from "./BirthdatePicker";
import Select from "./Select";

const Page = () => {
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [errors, setErrors] = useState<{ [k: string]: string }>({})
  const [submitted, setSubmitted] = useState(false)
  // Section 1 specific state
  const [birthdate, setBirthdate] = useState<string>("")
  const [nationality, setNationality] = useState("")
  const [bookingType, setBookingType] = useState("Single Booking")
  const [groupSize, setGroupSize] = useState<number>(3)
  const [tourPackage, setTourPackage] = useState("") // will store package id
  const [tourDate, setTourDate] = useState("")
  const [additionalGuests, setAdditionalGuests] = useState<string[]>([])

  // dynamic tour packages and dates loaded from Firestore
  const [tourPackages, setTourPackages] = useState<
    Array<{
      id: string;
      name: string;
      travelDates: string[];
      status?: "active" | "inactive";         // ← add this
      stripePaymentLink?: string;
    }>
  >([]);
  const [tourDates, setTourDates] = useState<string[]>([])
  
  // animation state for tour date mount/visibility
  const [dateMounted, setDateMounted] = useState(false)
  const [dateVisible, setDateVisible] = useState(false)
  // animation state for additional guests area (measured height)
  const guestsWrapRef = React.useRef<HTMLDivElement | null>(null)
  const guestsContentRef = React.useRef<HTMLDivElement | null>(null)
  const [guestsMounted, setGuestsMounted] = useState(false)
  const [guestsHeight, setGuestsHeight] = useState('0px')
  // clear all “Personal & Booking” inputs together with one animation
  const [clearing, setClearing] = useState(false)
  // animation timing (ms) used for transitions so entrance/exit durations match
  const ANIM_DURATION = 300

  // ---- multi-step flow state ----
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // computed helpers
  const canEditStep1 = !paymentConfirmed; // lock step 1 after payment
  const progressWidth = step === 1 ? "w-1/3" : step === 2 ? "w-2/3" : "w-full";

  // helper: animate the guests container height using the Web Animations API (with a fallback)
  const animateHeight = (from: number, to: number) => {
    return new Promise<void>((resolve) => {
      const wrap = guestsWrapRef.current
      if (!wrap) { setGuestsHeight(`${to}px`); resolve(); return }

      try {
        // ensure starting height is applied
        wrap.style.height = `${from}px`
        const anim = wrap.animate(
          [{ height: `${from}px` }, { height: `${to}px` }],
          { duration: ANIM_DURATION, easing: 'cubic-bezier(.2,.8,.2,1)' }
        )
        anim.onfinish = () => {
          wrap.style.height = `${to}px`
          setGuestsHeight(`${to}px`)
          resolve()
        }
      } catch {
        setGuestsHeight(`${to}px`)
        resolve()
      }
    })
  }

  // Animate any content change inside the guests block (size, Duo->Group, etc.)
  const animateGuestsContentChange = async (applyState: () => void) => {
    const startH = guestsWrapRef.current?.getBoundingClientRect().height ?? 0
    applyState()
    await new Promise((r) => requestAnimationFrame(r))
    const targetH = guestsContentRef.current?.scrollHeight ?? 0
    await animateHeight(startH, targetH)
  }
  
  // shared field classes to keep focus/error border styling uniform
  const fieldBase = 'mt-1 block w-full px-4 py-3 rounded-md bg-input text-foreground placeholder:opacity-70 transition-shadow'
  const fieldBorder = (err?: boolean) => `border ${err ? 'border-destructive' : 'border-border'}`
  const fieldFocus = 'focus:outline-none focus:border-primary'

  const guestsVisible = guestsHeight

  const nationalities = ["Philippines", "United States", "United Kingdom", "Canada", "Australia", "India", "Other"]

  const nationalityOptions = nationalities.map(n => ({ label: n, value: n }));

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

  const tourDateOptions = (tourDates ?? []).map((d: string) => ({ label: d, value: d }));

  // Fetch tour packages live from Firestore
  useEffect(() => {
    const q = collection(db, "tourPackages");
    const unsub = onSnapshot(
      q,
      (snap) => {
        const pkgList = snap.docs.map((doc) => {
          const payload = doc.data() as any;

          // Normalize travelDates to yyyy-mm-dd
          const dates = (payload.travelDates ?? []).map((t: any) => {
            const sd = t?.startDate;
            if (!sd) return null;
            if (sd.seconds) return new Date(sd.seconds * 1000).toISOString().slice(0, 10);
            return new Date(sd).toISOString().slice(0, 10);
          }).filter(Boolean) as string[];

          return {
            id: doc.id,
            name: payload.name ?? payload.title ?? "",
            travelDates: dates,
            stripePaymentLink: payload.stripePaymentLink,
            status: payload.status === "inactive" ? "inactive" : "active",
          };
        });

        setTourPackages(pkgList as any); // 'as any' ensures TS doesn't complain about the extra status field
      },
      (err) => console.error("tourPackages snapshot error", err)
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
      setDateMounted(true);                   // mount content
      requestAnimationFrame(() => setDateVisible(true)); // then fade/expand in
    } else {
      setDateVisible(false);                  // start collapse
      const t = setTimeout(() => setDateMounted(false), 220); // unmount after anim
      setTourDate("");                        // clear previous date
      setErrors((e) => ({ ...e, tourDate: undefined })); // drop error if hidden
      return () => clearTimeout(t);
    }
  }, [tourPackage]);

  // animate additional guests area when bookingType changes (measured height)
  useEffect(() => {
    if (bookingType === 'Duo Booking' || bookingType === 'Group Booking') {
      setGuestsMounted(true)
    } else {
      setGuestsHeight('0px')
      setTimeout(() => setGuestsMounted(false), ANIM_DURATION + 20)
    }
  }, [bookingType])

  const handleAddGuest = () => {
    // For group booking, limit guests to groupSize - 1 (booker + others)
    if (bookingType === "Group Booking") {
      const maxGuests = Math.max(0, groupSize - 1)
      if (additionalGuests.length >= maxGuests) return
      setAdditionalGuests([...additionalGuests, ""] )
      return
    }
    // Duo booking only allows one additional guest
    if (bookingType === "Duo Booking") {
      if (additionalGuests.length >= 1) return
      setAdditionalGuests([...(additionalGuests.slice(0,1)), ""]) // ensure single slot
      return
    }
    // fallback: do not add
    return
  }

  const handleBookingTypeChange = async (value: string) => {
    const animateToState = async (applyState: () => void) => {
      const wasMounted = guestsMounted
      if (!wasMounted) {
        setGuestsMounted(true)
        setGuestsHeight('1px') // allow initial paint
      }

      const startH = guestsWrapRef.current?.getBoundingClientRect().height ?? 0
      applyState()
      await new Promise((r) => requestAnimationFrame(r))
      const targetH = guestsContentRef.current?.scrollHeight ?? 0
      await animateHeight(startH, targetH)
    }

    // Group -> Duo
    if (bookingType === 'Group Booking' && value === 'Duo Booking') {
      await animateToState(() => {
        setAdditionalGuests([additionalGuests[0] ?? ""])
        setGroupSize(2)
        setBookingType('Duo Booking')
      })
      return
    }

    // Collapse to Single
    if (value === 'Single Booking') {
      const startH = guestsWrapRef.current?.getBoundingClientRect().height ?? 0
      await animateHeight(startH, 0)
      setGuestsHeight('0px')
      setAdditionalGuests([])
      setGroupSize(3)
      setBookingType('Single Booking')
      setTimeout(() => setGuestsMounted(false), 20)
      return
    }

    // Single/Duo -> Duo
    if (value === 'Duo Booking') {
      await animateToState(() => {
        setGroupSize(2)
        setAdditionalGuests((prev) => [prev[0] ?? ""])
        setBookingType('Duo Booking')
      })
      return
    }

    // Any -> Group
    if (value === 'Group Booking') {
      await animateToState(() => {
        setGroupSize((prev) => Math.max(3, prev))
        const slots = Math.max(1, Math.max(3, groupSize) - 1)
        setBookingType('Group Booking')
        setAdditionalGuests((prev) => {
          const copy = prev.slice(0, slots)
          while (copy.length < slots) copy.push("")
          return copy
        })
      })
      return
    }
  }

  const handleGroupSizeChange = async (val: number) => {
    if (bookingType !== "Group Booking") return // only matters in Group mode
    const clamped = Math.max(3, Math.min(20, val || 3))

    await animateGuestsContentChange(() => {
      setGroupSize(clamped)
      setAdditionalGuests((prev) => {
        const needed = clamped - 1
        const copy = prev.slice(0, needed)
        while (copy.length < needed) copy.push("")
        return copy
      })
    })
  }

  const handleGuestChange = (idx: number, value: string) => {
    const copy = [...additionalGuests]
    copy[idx] = value
    setAdditionalGuests(copy)
  }

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
    if ((bookingType === "Duo Booking" || bookingType === "Group Booking") && additionalGuests.length) {
      additionalGuests.forEach((g, idx) => {
        if (!g.trim()) e[`guest-${idx}`] = `Guest #${idx + 1} email is required`;
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g))
          e[`guest-${idx}`] = `Guest #${idx + 1} enter a valid email`;
      });
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (ev?: React.FormEvent) => {
    ev?.preventDefault()
    if (!validate()) return
    // For now, just log values. Replace with API call as needed.
    console.log({ email, firstName, lastName })
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <form
        onSubmit={onSubmit}
        className={`w-full max-w-lg bg-card/95 text-card-foreground border border-border shadow-lg rounded-lg p-8 backdrop-blur-sm transition-all duration-300`}
        aria-labelledby="reservation-form-title"
      >
        {/* assistive live region to announce tour date visibility changes */}
        <div aria-live="polite" className="sr-only">{dateVisible ? 'Tour date shown' : 'Tour date hidden'}</div>
        {/* Progress tracker placeholder for Steps 1-3 (static; wire later) */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h2 id="reservation-form-title" className="text-2xl font-hk-grotesk font-semibold text-creative-midnight mb-1">
                Reserve your tour spot
              </h2>
              <p className="text-sm text-muted-foreground mb-4">Choose your tour package and date, pay the down payment, then complete your payment plan to secure your spot.</p>
            </div>
          </div>

          <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
            <div className="h-2 bg-primary rounded-full w-1/3" />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">1</div>
              <div>Personal & Booking</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-muted text-foreground flex items-center justify-center">2</div>
              <div>Payment</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-muted text-foreground flex items-center justify-center">3</div>
              <div>Payment plan</div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* STEP 1 - Personal & Booking Details */}
          <div className="rounded-md bg-card/60 p-4 border border-border">
            <h3 className="text-lg font-medium text-foreground mb-3">Personal & Booking details</h3>
            <div className={`space-y-4 transition-all duration-300 ${clearing ? 'opacity-0' : 'opacity-100'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Email address</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`${fieldBase} ${fieldBorder(!!errors.email)} ${fieldFocus}`}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                  {errors.email && <p id="email-error" className="mt-1 text-xs text-destructive">{errors.email}</p>}
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-foreground">Birthdate</span>
                  <BirthdatePicker
                    value={birthdate}
                    onChange={(iso) => setBirthdate(iso)}
                    minYear={1920}
                    maxYear={new Date().getFullYear()}
                  />
                  {/* optional error text below if you have validation */}
                  {errors?.birthdate && (
                    <p className="mt-1 text-xs text-destructive">{errors.birthdate}</p>
                  )}
                </label>
              </div>

              {/* First name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-foreground">First name</span>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alex"
                    className={`${fieldBase} ${fieldBorder(!!errors.firstName)} ${fieldFocus}`}
                    aria-invalid={!!errors.firstName}
                    aria-describedby={errors.firstName ? "firstName-error" : undefined}
                  />
                    {/* error text here */}
                    {errors.firstName && (
                      <p className="mt-1 text-xs text-destructive">{errors.firstName}</p>
                    )}
                </label>

                {/* Last name */}
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Last name</span>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Johnson"
                    className={`${fieldBase} ${fieldBorder(!!errors.lastName)} ${fieldFocus}`}
                    aria-invalid={!!errors.lastName}
                    aria-describedby={errors.lastName ? "lastName-error" : undefined}
                  />
                    {/* error text here */}
                    {errors.lastName && (
                      <p className="mt-1 text-xs text-destructive">{errors.lastName}</p>
                    )}
                </label>
              </div>

              {/* Nationality */} 
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Nationality</span>
                  <Select
                    value={nationality || null}
                    onChange={setNationality}
                    options={nationalityOptions}
                    placeholder="Select nationality"
                    ariaLabel="Nationality"
                    className="mt-1"
                  />
                    {/* error text here */}
                    {errors.nationality && (
                      <p className="mt-1 text-xs text-destructive">{errors.nationality}</p>
                    )}
                </label>

                {/* Booking type */}
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Booking type</span>
                  <Select
                    value={bookingType}
                    onChange={(v) => handleBookingTypeChange(v)}
                    options={bookingTypeOptions}
                    placeholder="Select booking type"
                    ariaLabel="Booking Type"
                    className="mt-1"
                  />
                    {/* error text here */}
                    {errors.bookingType && (
                      <p className="mt-1 text-xs text-destructive">{errors.bookingType}</p>
                    )}
                </label>
              </div>

              {/* Additional guests (collapsible) */}
              <div ref={guestsWrapRef} className="overflow-hidden" style={{ height: guestsHeight }}>
                {guestsMounted ? (
                  <div ref={guestsContentRef} className="space-y-2">
                    {/* Header row stays same height to prevent shaking */}
                    <div className="flex items-center justify-between min-h-10">
                      <div className="text-sm font-medium text-foreground">Additional guests</div>

                      {/* Keep layout stable; hide controls when not Group */}
                      <div className={`flex items-center gap-3 ${bookingType === "Group Booking" ? "" : "opacity-0 pointer-events-none"}`}>
                        <label className="text-sm text-foreground">Group size</label>
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            aria-label="Decrease group size"
                            onClick={() => handleGroupSizeChange(groupSize - 1)}
                            className="h-8 w-8 rounded-md bg-crimson-red text-white flex items-center justify-center hover:brightness-95 focus:outline-none"
                          >
                            −
                          </button>

                          {/* 👇 allow typing 3..20 */}
                          <input
                            type="number"
                            min={3}
                            max={20}
                            value={groupSize}
                            onChange={(e) => handleGroupSizeChange(parseInt(e.target.value || "0", 10))}
                            className="w-16 text-center px-2 py-1 rounded-md bg-input border border-border text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />

                          <button
                            type="button"
                            aria-label="Increase group size"
                            onClick={() => handleGroupSizeChange(groupSize + 1)}
                            className="h-8 w-8 rounded-md bg-crimson-red text-white flex items-center justify-center hover:brightness-95 focus:outline-none"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {bookingType === "Duo Booking" ? (
                        <input
                          placeholder="Guest email address"
                          value={additionalGuests[0] ?? ""}
                          onChange={(e) => handleGuestChange(0, e.target.value)}
                          className={`${fieldBase} ${fieldBorder(!!errors["guest-0"])} ${fieldFocus}`}
                        />
                      ) : (
                        additionalGuests.map((g, idx) => (
                          <div key={idx}>
                            <input
                              placeholder={`Guest #${idx + 1} email address`}
                              value={g}
                              onChange={(e) => handleGuestChange(idx, e.target.value)}
                              className={`${fieldBase} ${fieldBorder(!!errors[`guest-${idx}`])} ${fieldFocus}`}
                            />
                            {errors[`guest-${idx}`] && (
                              <p className="mt-1 text-xs text-destructive">{errors[`guest-${idx}`]}</p>
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
                  <span className="text-sm font-medium text-foreground">Tour package</span>
                  <Select
                    value={tourPackage || null}
                    onChange={(v) => setTourPackage(v)}
                    options={tourPackageOptions}
                    placeholder={tourPackageOptions.length ? "Select a package" : "No packages available"}
                    ariaLabel="Tour Package"
                    className="mt-1"
                    searchable
                    disabled={tourPackageOptions.length === 0}
                  />  
                    {/* error text here */}
                    {errors.tourPackage && (
                      <p className="mt-1 text-xs text-destructive">{errors.tourPackage}</p>
                    )}
                </label>
              </div>
              {/* Tour date (conditionally shown) */}
              <div className="overflow-hidden transition-[max-height,opacity] duration-300"
                style={{ maxHeight: dateVisible ? 140 : 0, opacity: dateVisible ? 1 : 0 }}
              >
                {dateMounted && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-medium text-foreground">Tour date</span>
                      <Select
                        value={tourDate || null}
                        onChange={setTourDate}
                        options={tourDateOptions}
                        placeholder="Select a date"
                        ariaLabel="Tour Date"
                        className="mt-1"
                        disabled={!tourPackage}
                      />
                      {/* error text here */}
                      {errors?.tourDate && (
                        <p className="mt-1 text-xs text-destructive">{errors.tourDate}</p>
                      )}
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* STEP 2 - PAYMENT */}
          {step === 2 && (
            <div className="rounded-md bg-card/60 p-4 border border-border space-y-4">
              <h3 className="text-lg font-medium text-foreground">Pay down payment</h3>

              {!tourPackage ? (
                <p className="text-sm text-destructive">
                  Please go back and choose a tour package before proceeding to payment.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Click the button below to open a secure Stripe Payment Link for your selected package.
                    Return here after payment to continue.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={tourPackages.find((p) => p.id === tourPackage)?.stripePaymentLink || "#"}
                      className={`px-4 py-2 rounded-md ${tourPackages.find((p)=>p.id===tourPackage)?.stripePaymentLink ? "bg-crimson-red text-white hover:brightness-95" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                      aria-disabled={!tourPackages.find((p)=>p.id===tourPackage)?.stripePaymentLink}
                    >
                      Pay now
                    </a>

                    {/* Temporary confirmation until you wire a webhook */}
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={paymentConfirmed}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setPaymentConfirmed(checked);
                          if (checked) {
                            // lock step 1
                            // (we already compute canEditStep1 from paymentConfirmed)
                          }
                        }}
                      />
                      I’ve completed the payment
                    </label>
                  </div>

                  {!tourPackages.find((p)=>p.id===tourPackage)?.stripePaymentLink && (
                    <p className="text-xs text-muted-foreground">
                      No Stripe link is configured for this package yet.
                    </p>
                  )}

                  {!paymentConfirmed && (
                    <p className="text-xs text-muted-foreground">
                      You can still go <button type="button" onClick={()=>setStep(1)} className="underline">Back</button> to revise your details.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP 3 - PAYMENT PLAN */}
          {step === 3 && (
            <div className="rounded-md bg-card/60 p-4 border border-border space-y-4">
              <h3 className="text-lg font-medium text-foreground">Payment plan</h3>
              <p className="text-sm text-muted-foreground">
                We’ll email your schedule and links for monthly payments. You can finalize now or return later via the link we send.
              </p>
              {/* Put your plan selector / summary here later */}
            </div>
          )}

            {/* Step footer actions */}
            <div className="flex items-center justify-between mt-2">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s > 1 ? (s - 1) as 1|2|3 : s))}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    // same reset you had
                    setClearing(true);
                    const startH = guestsWrapRef.current?.getBoundingClientRect().height ?? 0;
                    await animateHeight(startH, 0);
                    setGuestsHeight('0px'); setGuestsMounted(false);
                    setDateVisible(false);
                    setTimeout(() => {
                      setEmail(""); setFirstName(""); setLastName(""); setBirthdate("");
                      setNationality(""); setBookingType("Single Booking");
                      setTourPackage(""); setTourDate(""); setAdditionalGuests([]);
                      setGroupSize(3); setErrors({}); setSubmitted(false);
                      setTimeout(() => setClearing(false), 10);
                    }, ANIM_DURATION + 20);
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Reset
                </button>
              )}

              {step === 1 && (
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
                  onClick={() => setStep(3)}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-ring transition
                              ${paymentConfirmed ? "bg-primary text-primary-foreground hover:brightness-95" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                >
                  Continue
                </button>
              )}

              {step === 3 && (
                <button
                  type="button"
                  onClick={() => {
                    // this is your final submit spot (send to backend later)
                    onSubmit();
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md shadow-md hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-ring transition"
                >
                  Submit
                </button>
              )}
            </div>
        </div>

        {/* Success note */}
        {submitted && step === 3 && ( 
          <div role="status" aria-live="polite" className="mt-6 rounded-md bg-spring-green/10 border border-spring-green/30 p-4 text-sm text-creative-midnight">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-spring-green text-white">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="font-medium">You're on the list</div>
                <div className="text-xs text-muted-foreground">We'll send a confirmation to <span className="font-medium">{email}</span> if provided.</div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

// Placeholder components (simple) for sections 2 & 3 can be expanded later
// Section 2: Payment / Add-ons (placeholder)

// Section 3: Traveler info / Agreements (placeholder)

export default Page