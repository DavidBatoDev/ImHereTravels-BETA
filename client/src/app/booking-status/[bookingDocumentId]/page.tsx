"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  Download,
  Calendar,
  MapPin,
  CreditCard,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Mail,
  Phone,
} from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { db } from "@/lib/firebase";
import PayNowModal from "@/components/booking-status/PayNowModal";

interface PaymentTokenData {
  token: string;
  expiresAt: any;
  stripePaymentDocId: string;
  status: "pending" | "processing" | "success" | "failed" | "expired";
  paidAt?: any;
  lastAttemptAt?: any;
  errorMessage?: string;
}

interface BookingData {
  bookingDocumentId?: string;
  bookingId: string;
  bookingCode: string;
  tourCode: string;
  emailAddress?: string;
  fullName: string;
  firstName: string;
  travellerInitials: string;
  tourPackageName: string;
  tourDate: any;
  returnDate?: any;
  tourDuration: string;
  formattedDate: string;
  reservationDate: any;
  originalTourCost: number;
  discountedTourCost?: number;
  reservationFee?: number;
  manualCredit?: number;
  creditFrom?: string;
  paid: number;
  remainingBalance: number;
  paymentProgress: number | string;
  paymentPlan?: string;
  bookingStatus: string;
  fullPaymentDueDate?: any;
  fullPaymentAmount?: number;
  fullPaymentDatePaid?: any;
  p1DueDate?: string;
  p1Amount?: number;
  p1DatePaid?: any;
  p2DueDate?: string;
  p2Amount?: number;
  p2DatePaid?: any;
  p3DueDate?: string;
  p3Amount?: number;
  p3DatePaid?: any;
  p4DueDate?: string;
  p4Amount?: number;
  p4DatePaid?: any;
  p1LateFeesPenalty?: number;
  p2LateFeesPenalty?: number;
  p3LateFeesPenalty?: number;
  p4LateFeesPenalty?: number;
  p1LateFeeAppliedAt?: any;
  p2LateFeeAppliedAt?: any;
  p3LateFeeAppliedAt?: any;
  p4LateFeeAppliedAt?: any;
  sentEmailLink?: string;
  eventName?: string;
  discountRate?: number;
  discountType?: string;
  reasonForCancellation?: string | null;
  cancellationEmailSentDate?: any;
  bookingType: string;
  isMainBooker: boolean;
  flexitourMaxChanges?: number;
  flexitourUsedChanges?: number;
  flexitourHistory?: Array<{
    fromTourDate?: any;
    toTourDate?: any;
    changedAt?: any;
    changedBy?: string;
  }>;
  flexitourLastChangedAt?: any;
  flexitourP1SettlementMode?: boolean;
  enablePaymentReminder: boolean;
  paymentTokens?: {
    full_payment?: PaymentTokenData;
    p1?: PaymentTokenData;
    p2?: PaymentTokenData;
    p3?: PaymentTokenData;
    p4?: PaymentTokenData;
  };
  revolutPayments?: {
    [key: string]: {
      revolutPaymentDocId: string;
      status: "pending" | "approved" | "rejected";
      submittedAt?: any;
      approvedAt?: any;
      rejectedAt?: any;
    };
  };
  preDeparturePack?: {
    id: string;
    fileName: string;
    originalName: string;
    fileDownloadURL: string;
    contentType: string;
    size: number;
    uploadedAt: any;
  };
}

interface FlexitourPlanOption {
  value: "Full Payment" | "P1" | "P2" | "P3" | "P4";
  label: string;
  description: string;
  monthsRequired: number;
}

interface FlexitourPreviewRow {
  id: "full_payment" | "p1" | "p2" | "p3" | "p4";
  term: string;
  dueDate: string;
  amount: number;
  status: "Paid" | "Pending";
}

interface FlexitourPreviewData {
  previewRows: FlexitourPreviewRow[];
  effectivePaymentPlan: "Full Payment" | "P1" | "P2" | "P3" | "P4";
  displayMode: "standard" | "p1_settlement";
  p1SettlementMode: boolean;
  notes: string[];
}

const CONTACT_US_URL = "https://imheretravels.com/contact-us/";
const SUPPORT_EMAIL = "bella@imheretravels.com";
const SUPPORT_PHONE_DISPLAY = "+63 998 247 6847";
const SUPPORT_PHONE_TEL = "tel:+639982476847";
const BOOKING_STATUS_UTM_SOURCE = "booking_status_page";

const FOOTER_HELP_LINKS = [
  { label: "Contact Us", href: "https://imheretravels.com/contact-us/" },
  { label: "FAQs", href: "https://imheretravels.com/faqs/" },
  { label: "Newsletter", href: "https://imheretravels.com/join-our-community/" },
  { label: "Terms & Conditions", href: "https://imheretravels.com/terms-and-conditions/" },
] as const;

const FOOTER_RESOURCE_LINKS = [
  {
    label: "Pre-departure Info",
    href: "https://imheretravels.com/pre-departure-information/",
  },
  { label: "Travel Safety", href: "https://imheretravels.com/travel-safety/" },
  { label: "Travel Information", href: "https://imheretravels.com/travel-information/" },
  { label: "FAQs", href: "https://imheretravels.com/faqs/" },
] as const;

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/imheretravels?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    Icon: SiInstagram,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/people/Im-Here-Travels/100089932897402/",
    Icon: SiFacebook,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@imheretravels",
    Icon: SiTiktok,
  },
] as const;

const withUtmSource = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set("utm_source", BOOKING_STATUS_UTM_SOURCE);
    return url.toString();
  } catch (error) {
    console.warn("Failed to add UTM source to URL:", rawUrl, error);
    return rawUrl;
  }
};

export default function BookingStatusPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookingDocumentId = params.bookingDocumentId as string;
  const email = searchParams.get("email");

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState<string | null>(
    null,
  );
  const [paymentMessage, setPaymentMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [paymentTermOptions, setPaymentTermOptions] = useState<
    Array<{
      id: string;
      name: string;
      description?: string;
      paymentPlanType: string;
      monthsRequired?: number;
      monthlyPercentages?: number[];
      color?: string;
    }>
  >([]);
  const [selectingPlanId, setSelectingPlanId] = useState<string | null>(null);
  const [confirmPlanOpen, setConfirmPlanOpen] = useState(false);
  const [confirmFlexitourOpen, setConfirmFlexitourOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{
    id: string;
    label: string;
    description?: string;
    schedule?: Array<{ date: string; amount: number }>;
  } | null>(null);
  const packCacheRef = useRef<{
    bookingDocId: string;
    pack: BookingData["preDeparturePack"] | null;
  } | null>(null);

  // Pay Now Modal state
  const [payNowModalOpen, setPayNowModalOpen] = useState(false);
  const [payNowInstallment, setPayNowInstallment] = useState<{
    id: "full_payment" | "p1" | "p2" | "p3" | "p4";
    amount: number;
  } | null>(null);
  const [importantNoticeExpanded, setImportantNoticeExpanded] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const headerVisibilityRef = useRef(true);
  const scrollAccumulatorRef = useRef(0);
  const lastHeaderToggleTsRef = useRef(0);
  const lastScrollDirectionRef = useRef<1 | -1 | 0>(0);
  const [flexitourDateOptions, setFlexitourDateOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [flexitourSelectedDate, setFlexitourSelectedDate] = useState("");
  const [flexitourSelectedPlan, setFlexitourSelectedPlan] = useState("");
  const [flexitourLoadingDates, setFlexitourLoadingDates] = useState(false);
  const [flexitourSubmitting, setFlexitourSubmitting] = useState(false);
  const [flexitourExpanded, setFlexitourExpanded] = useState(true);
  const [flexitourMessage, setFlexitourMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [flexitourPreviewLoading, setFlexitourPreviewLoading] = useState(false);
  const [flexitourPreview, setFlexitourPreview] =
    useState<FlexitourPreviewData | null>(null);

  // Booking Status page must always stay in light mode, including portal dialogs.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const previous = {
      htmlClass: html.className,
      bodyClass: body.className,
      htmlTheme: html.getAttribute("data-theme"),
      bodyTheme: body.getAttribute("data-theme"),
      htmlColorScheme: html.style.colorScheme,
      bodyColorScheme: body.style.colorScheme,
    };

    const enforceLightMode = () => {
      html.classList.remove("dark");
      body.classList.remove("dark");
      html.classList.add("force-light");
      body.classList.add("force-light");
      html.setAttribute("data-theme", "light");
      body.setAttribute("data-theme", "light");
      html.style.colorScheme = "light";
      body.style.colorScheme = "light";
    };

    enforceLightMode();

    const observer = new MutationObserver(() => {
      if (
        html.classList.contains("dark") ||
        body.classList.contains("dark") ||
        html.getAttribute("data-theme") === "dark" ||
        body.getAttribute("data-theme") === "dark"
      ) {
        enforceLightMode();
      }
    });

    observer.observe(html, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    observer.observe(body, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => {
      observer.disconnect();
      html.className = previous.htmlClass;
      body.className = previous.bodyClass;

      if (previous.htmlTheme === null) html.removeAttribute("data-theme");
      else html.setAttribute("data-theme", previous.htmlTheme);

      if (previous.bodyTheme === null) body.removeAttribute("data-theme");
      else body.setAttribute("data-theme", previous.bodyTheme);

      html.style.colorScheme = previous.htmlColorScheme;
      body.style.colorScheme = previous.bodyColorScheme;
    };
  }, []);

  // Hide header while scrolling down, reveal it when scrolling up.
  useEffect(() => {
    if (typeof window === "undefined") return;

    lastScrollYRef.current = window.scrollY;
    headerVisibilityRef.current = true;
    scrollAccumulatorRef.current = 0;
    lastHeaderToggleTsRef.current = window.performance.now();
    lastScrollDirectionRef.current = 0;
    let rafId: number | null = null;
    const TOP_SHOW_THRESHOLD = 28;
    const HIDE_SCROLL_THRESHOLD = 80;
    const MIN_DELTA = 2;
    const DIRECTIONAL_SCROLL_ACCUMULATION = 18;
    const MAX_SCROLL_ACCUMULATION = 96;
    const TOGGLE_COOLDOWN_MS = 220;

    const applyHeaderVisibility = (nextVisible: boolean, now: number) => {
      if (headerVisibilityRef.current === nextVisible) return;
      if (now - lastHeaderToggleTsRef.current < TOGGLE_COOLDOWN_MS) return;
      headerVisibilityRef.current = nextVisible;
      lastHeaderToggleTsRef.current = now;
      setIsHeaderVisible(nextVisible);
    };

    const onScroll = () => {
      if (rafId !== null) return;

      rafId = window.requestAnimationFrame(() => {
        const now = window.performance.now();
        const currentY = Math.max(window.scrollY, 0);
        const delta = currentY - lastScrollYRef.current;
        lastScrollYRef.current = currentY;

        if (currentY <= TOP_SHOW_THRESHOLD) {
          scrollAccumulatorRef.current = 0;
          lastScrollDirectionRef.current = 0;
          if (!headerVisibilityRef.current) {
            headerVisibilityRef.current = true;
            lastHeaderToggleTsRef.current = now;
            setIsHeaderVisible(true);
          }
          rafId = null;
          return;
        }

        if (Math.abs(delta) < MIN_DELTA) {
          rafId = null;
          return;
        }

        const scrollingDown = delta > 0;
        const nextDirection = scrollingDown ? 1 : -1;
        if (lastScrollDirectionRef.current !== nextDirection) {
          lastScrollDirectionRef.current = nextDirection;
          scrollAccumulatorRef.current = 0;
        }

        const boundedDelta = Math.max(
          Math.min(delta, MAX_SCROLL_ACCUMULATION),
          -MAX_SCROLL_ACCUMULATION,
        );
        scrollAccumulatorRef.current = Math.max(
          Math.min(
            scrollAccumulatorRef.current + boundedDelta,
            MAX_SCROLL_ACCUMULATION,
          ),
          -MAX_SCROLL_ACCUMULATION,
        );

        if (
          scrollingDown &&
          currentY > HIDE_SCROLL_THRESHOLD &&
          scrollAccumulatorRef.current >= DIRECTIONAL_SCROLL_ACCUMULATION
        ) {
          applyHeaderVisibility(false, now);
          scrollAccumulatorRef.current = 0;
        } else if (
          !scrollingDown &&
          scrollAccumulatorRef.current <= -DIRECTIONAL_SCROLL_ACCUMULATION
        ) {
          applyHeaderVisibility(true, now);
          scrollAccumulatorRef.current = 0;
        }

        rafId = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // Check for payment success/cancel messages in URL
  useEffect(() => {
    const paymentSuccess = searchParams.get("payment_success");
    const paymentCancelled = searchParams.get("payment_cancelled");
    const installmentId = searchParams.get("installment");

    if (paymentSuccess === "true" && installmentId) {
      // In development, automatically trigger test confirmation
      const isDevelopment = process.env.NEXT_PUBLIC_ENV === "development";

      if (isDevelopment) {
        console.log(
          "🧪 Development mode: Auto-triggering payment confirmation",
        );
        console.log("📡 Refetching booking to get latest payment tokens...");

        // Refetch booking to get the latest paymentTokens
        const url = email
          ? `/api/public/booking/${bookingDocumentId}?email=${encodeURIComponent(email)}`
          : `/api/public/booking/${bookingDocumentId}`;

        fetch(url)
          .then((res) => res.json())
          .then((result) => {
            if (!result.success) {
              console.error("❌ Failed to refetch booking:", result.error);
              return;
            }

            const freshBooking = result.data;
            console.log(
              "📦 Fresh booking paymentTokens:",
              freshBooking.paymentTokens,
            );
            const stripePaymentDocId =
              freshBooking.paymentTokens?.[
                installmentId as keyof typeof freshBooking.paymentTokens
              ]?.stripePaymentDocId;

            console.log("📝 stripePaymentDocId:", stripePaymentDocId);

            if (stripePaymentDocId) {
              // Automatically confirm the payment in development
              fetch("/api/installments/test-confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  stripe_payment_doc_id: stripePaymentDocId,
                }),
              })
                .then((res) => res.json())
                .then((data) => {
                  console.log("✅ Auto-confirmed payment:", data);
                  // Reload to show updated status
                  setTimeout(() => {
                    window.location.href = `/booking-status/${bookingDocumentId}`;
                  }, 1500);
                })
                .catch((error) => {
                  console.error("❌ Auto-confirm failed:", error);
                });
            } else {
              console.error(
                "❌ No stripePaymentDocId found for installment:",
                installmentId,
              );
            }
          })
          .catch((error) => {
            console.error("❌ Failed to refetch booking:", error);
          });
      } else {
        // Only show message in production
        setPaymentMessage({
          type: "success",
          text: `Payment for ${installmentId.toUpperCase()} installment initiated successfully! Please wait while we confirm your payment.`,
        });
        // Clear message after 10 seconds
        setTimeout(() => setPaymentMessage(null), 10000);
      }
    } else if (paymentCancelled === "true" && installmentId) {
      // Reset the processing status when user cancels
      const resetStatus = async () => {
        try {
          await fetch("/api/installments/reset-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: bookingDocumentId,
              installment_id: installmentId,
            }),
          });
          // Reload booking data to show updated status
          window.location.href = `/booking-status/${bookingDocumentId}`;
        } catch (error) {
          console.error("Failed to reset status:", error);
        }
      };

      resetStatus();

      setPaymentMessage({
        type: "error",
        text: `Payment for ${installmentId.toUpperCase()} was cancelled. You can try again anytime.`,
      });
      // Clear message after 10 seconds
      setTimeout(() => setPaymentMessage(null), 10000);
    }
  }, [searchParams, bookingDocumentId, booking]);

  useEffect(() => {
    let didCancel = false;

    const fetchPreDeparturePack = async (
      bookingDocId: string,
    ): Promise<BookingData["preDeparturePack"] | null> => {
      try {
        const confirmedBookingsQuery = query(
          collection(db, "confirmedBookings"),
          where("bookingDocumentId", "==", bookingDocId),
        );
        const confirmedBookingsSnap = await getDocs(confirmedBookingsQuery);

        if (confirmedBookingsSnap.empty) return null;

        const confirmedBooking = confirmedBookingsSnap.docs[0].data();
        if (!confirmedBooking.preDeparturePackId) return null;

        const packRef = doc(
          db,
          "fileObjects",
          confirmedBooking.preDeparturePackId,
        );
        const packSnap = await getDoc(packRef);

        if (!packSnap.exists()) return null;

        const packData = packSnap.data();
        return {
          id: packSnap.id,
          fileName: packData.fileName,
          originalName: packData.originalName,
          fileDownloadURL: packData.fileDownloadURL,
          contentType: packData.contentType,
          size: packData.size,
          uploadedAt: packData.uploadedAt,
        };
      } catch (error) {
        console.error("Error fetching pre-departure pack:", error);
        return null;
      }
    };

    const buildPublicData = (
      bookingData: any,
      preDeparturePack: BookingData["preDeparturePack"] | null,
    ): BookingData => {
      const totalCost =
        (bookingData.isMainBooker && bookingData.discountedTourCost
          ? bookingData.discountedTourCost
          : bookingData.originalTourCost) || 0;
      const paid = bookingData.paid || 0;

      const fallbackProgress =
        totalCost === 0 ? 0 : Math.round((paid / totalCost) * 100);
      const paymentProgressValue =
        typeof bookingData.paymentProgress === "string"
          ? parseFloat(bookingData.paymentProgress.replace(/%/g, "")) ||
            fallbackProgress
          : typeof bookingData.paymentProgress === "number"
            ? bookingData.paymentProgress
            : fallbackProgress;

      return {
        bookingDocumentId: bookingData.bookingDocumentId,
        bookingId: bookingData.bookingId,
        bookingCode: bookingData.bookingCode,
        tourCode: bookingData.tourCode,
        emailAddress: bookingData.emailAddress,
        fullName: bookingData.fullName,
        firstName: bookingData.firstName,
        travellerInitials: bookingData.travellerInitials,
        tourPackageName: bookingData.tourPackageName,
        tourDate: bookingData.tourDate,
        returnDate: bookingData.returnDate,
        tourDuration: bookingData.tourDuration,
        formattedDate: bookingData.formattedDate,
        reservationDate: bookingData.reservationDate,
        originalTourCost: bookingData.originalTourCost,
        discountedTourCost: bookingData.discountedTourCost,
        reservationFee: bookingData.reservationFee,
        manualCredit: bookingData.manualCredit,
        creditFrom: bookingData.creditFrom,
        paid,
        remainingBalance: bookingData.remainingBalance,
        paymentProgress: paymentProgressValue,
        paymentPlan: bookingData.paymentPlan,
        bookingStatus: bookingData.bookingStatus,
        fullPaymentDueDate: bookingData.fullPaymentDueDate,
        fullPaymentAmount: bookingData.fullPaymentAmount,
        fullPaymentDatePaid: bookingData.fullPaymentDatePaid,
        p1DueDate: bookingData.p1DueDate,
        p1Amount: bookingData.p1Amount,
        p1DatePaid: bookingData.p1DatePaid,
        p2DueDate: bookingData.p2DueDate,
        p2Amount: bookingData.p2Amount,
        p2DatePaid: bookingData.p2DatePaid,
        p3DueDate: bookingData.p3DueDate,
        p3Amount: bookingData.p3Amount,
        p3DatePaid: bookingData.p3DatePaid,
        p4DueDate: bookingData.p4DueDate,
        p4Amount: bookingData.p4Amount,
        p4DatePaid: bookingData.p4DatePaid,
        p1LateFeesPenalty: bookingData.p1LateFeesPenalty,
        p1LateFeeAppliedAt: bookingData.p1LateFeeAppliedAt,
        p2LateFeesPenalty: bookingData.p2LateFeesPenalty,
        p2LateFeeAppliedAt: bookingData.p2LateFeeAppliedAt,
        p3LateFeesPenalty: bookingData.p3LateFeesPenalty,
        p3LateFeeAppliedAt: bookingData.p3LateFeeAppliedAt,
        p4LateFeesPenalty: bookingData.p4LateFeesPenalty,
        p4LateFeeAppliedAt: bookingData.p4LateFeeAppliedAt,
        sentEmailLink: bookingData.sentEmailLink,
        eventName: bookingData.eventName,
        discountRate: bookingData.discountRate,
        discountType: bookingData.discountType,
        bookingType: bookingData.bookingType,
        isMainBooker: bookingData.isMainBooker,
        flexitourMaxChanges: bookingData.flexitourMaxChanges,
        flexitourUsedChanges: bookingData.flexitourUsedChanges,
        flexitourHistory: bookingData.flexitourHistory,
        flexitourLastChangedAt: bookingData.flexitourLastChangedAt,
        flexitourP1SettlementMode: bookingData.flexitourP1SettlementMode,
        enablePaymentReminder: bookingData.enablePaymentReminder,
        preDeparturePack: preDeparturePack ?? undefined,
        revolutPayments: bookingData.revolutPayments,
        ...(process.env.NEXT_PUBLIC_ENV === "development" && {
          paymentTokens: bookingData.paymentTokens,
        }),
      };
    };

    setLoading(true);
    setError(null);

    const bookingsQuery = query(
      collection(db, "bookings"),
      where("access_token", "==", bookingDocumentId),
      limit(1),
    );

    const unsubscribe = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        if (didCancel) return;

        if (snapshot.empty) {
          setBooking(null);
          setError("Booking not found");
          setLoading(false);
          return;
        }

        const bookingDoc = snapshot.docs[0];
        const bookingData = {
          id: bookingDoc.id,
          ...bookingDoc.data(),
          bookingDocumentId: bookingDoc.id,
        } as any;

        const requiredFields = [
          "bookingId",
          "fullName",
          "tourPackageName",
          "tourDate",
          "formattedDate",
          "tourDuration",
          "originalTourCost",
          "paid",
          "remainingBalance",
          "bookingType",
        ];
        const hasMissingRequired = requiredFields.some(
          (field) =>
            bookingData[field] === undefined || bookingData[field] === null,
        );

        if (hasMissingRequired) {
          setBooking(null);
          setError(
            "This is an invalid booking. Contact bella@imheretravels.com if this is a mistake.",
          );
          setLoading(false);
          return;
        }

        if (email) {
          const bookingEmail = bookingData.emailAddress?.toLowerCase();
          const providedEmail = email.toLowerCase();
          if (bookingEmail !== providedEmail) {
            setBooking(null);
            setError("Email does not match booking records");
            setLoading(false);
            return;
          }
        }

        const cachedPack =
          packCacheRef.current?.bookingDocId === bookingDoc.id
            ? packCacheRef.current.pack
            : null;

        setBooking(buildPublicData(bookingData, cachedPack));
        setLoading(false);

        if (!cachedPack) {
          void (async () => {
            const pack = await fetchPreDeparturePack(bookingDoc.id);
            if (didCancel) return;
            packCacheRef.current = {
              bookingDocId: bookingDoc.id,
              pack,
            };
            setBooking((prev) =>
              prev ? { ...prev, preDeparturePack: pack ?? undefined } : prev,
            );
          })();
        }
      },
      (err) => {
        console.error("Failed to load booking details:", err);
        setError("Failed to load booking details");
        setLoading(false);
      },
    );

    return () => {
      didCancel = true;
      unsubscribe();
    };
  }, [bookingDocumentId, email]);

  // Fetch payment terms from Firestore (for payment plan options)
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
        setPaymentTermOptions(terms);
      },
      (err) => console.error("paymentTerms snapshot error", err),
    );

    return () => unsub();
  }, []);

  // Load valid Flexitour dates from the selected tour package.
  useEffect(() => {
    let didCancel = false;

    const parseDate = (value: any): Date | null => {
      if (!value) return null;
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
      }

      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;

        if (/^\d{8}$/.test(trimmed)) {
          const year = Number(trimmed.slice(0, 4));
          const monthIndex = Number(trimmed.slice(4, 6)) - 1;
          const day = Number(trimmed.slice(6, 8));
          const parsed = new Date(Date.UTC(year, monthIndex, day));
          return Number.isNaN(parsed.getTime()) ? null : parsed;
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          const [year, month, day] = trimmed.split("-").map(Number);
          const parsed = new Date(Date.UTC(year, month - 1, day));
          return Number.isNaN(parsed.getTime()) ? null : parsed;
        }

        const parsed = new Date(trimmed);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }

      if (typeof value === "object") {
        if ("seconds" in value && typeof value.seconds === "number") {
          return new Date(value.seconds * 1000);
        }
        if ("toDate" in value && typeof value.toDate === "function") {
          try {
            const parsed = value.toDate();
            return parsed instanceof Date && !Number.isNaN(parsed.getTime())
              ? parsed
              : null;
          } catch {
            return null;
          }
        }
      }

      return null;
    };

    const toDateKey = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const day = String(date.getUTCDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const getDaysBetweenToday = (date: Date): number => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const target = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      );
      const diffMs = target.getTime() - today.getTime();
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    };

    const fetchFlexitourOptions = async () => {
      if (!booking?.tourPackageName) {
        setFlexitourDateOptions([]);
        setFlexitourSelectedDate("");
        setFlexitourSelectedPlan("");
        setFlexitourPreview(null);
        return;
      }

      setFlexitourLoadingDates(true);

      try {
        const tourPackageQuery = query(
          collection(db, "tourPackages"),
          where("name", "==", booking.tourPackageName),
          limit(1),
        );
        const tourPackageSnap = await getDocs(tourPackageQuery);

        if (didCancel) return;

        if (tourPackageSnap.empty) {
          setFlexitourDateOptions([]);
          setFlexitourSelectedDate("");
          setFlexitourSelectedPlan("");
          setFlexitourPreview(null);
          return;
        }

        const currentTourDate =
          parseDate(booking.tourDate) || parseDate(booking.formattedDate);
        const currentDateKey = currentTourDate ? toDateKey(currentTourDate) : "";

        const travelDates =
          (tourPackageSnap.docs[0].data()?.travelDates as any[]) || [];
        const optionMap = new Map<string, string>();

        travelDates.forEach((travelDate) => {
          if (!travelDate || travelDate.isAvailable !== true) return;

          const startDate = parseDate(travelDate.startDate);
          if (!startDate) return;

          if (getDaysBetweenToday(startDate) < 3) return;

          const value = toDateKey(startDate);
          if (value === currentDateKey) return;

          optionMap.set(value, format(startDate, "MMM dd, yyyy"));
        });

        const options = Array.from(optionMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([value, label]) => ({ value, label }));

        setFlexitourDateOptions(options);
        setFlexitourSelectedDate((previous) => {
          if (previous && options.some((option) => option.value === previous)) {
            return previous;
          }
          return options[0]?.value || "";
        });
        setFlexitourSelectedPlan("");
        setFlexitourPreview(null);
      } catch (err) {
        console.error("Failed to load Flexitour dates:", err);
        if (!didCancel) {
          setFlexitourDateOptions([]);
          setFlexitourSelectedDate("");
          setFlexitourSelectedPlan("");
          setFlexitourPreview(null);
        }
      } finally {
        if (!didCancel) {
          setFlexitourLoadingDates(false);
        }
      }
    };

    void fetchFlexitourOptions();

    return () => {
      didCancel = true;
    };
  }, [booking?.tourPackageName, booking?.tourDate, booking?.formattedDate]);

  // Handle installment payment
  const handlePayInstallment = async (
    installmentId: "full_payment" | "p1" | "p2" | "p3" | "p4",
  ) => {
    if (!booking) return;

    setPaymentProcessing(installmentId);
    setPaymentMessage(null);

    try {
      const response = await fetch("/api/installments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: bookingDocumentId, // The bookingDocumentId IS the access_token
          installment_id: installmentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create checkout");
      }

      const { checkout_url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = checkout_url;
    } catch (error: any) {
      console.error("Payment error:", error);
      setPaymentMessage({
        type: "error",
        text: error.message || "Failed to initiate payment. Please try again.",
      });
      setPaymentProcessing(null);
    }
  };

  // Open Pay Now modal instead of direct Stripe redirect
  const handleOpenPayNowModal = (
    installmentId: "full_payment" | "p1" | "p2" | "p3" | "p4",
    installmentAmount: number,
  ) => {
    setPayNowInstallment({ id: installmentId, amount: installmentAmount });
    setPayNowModalOpen(true);
  };

  // Handle Stripe checkout from modal
  const handleStripeCheckoutFromModal = () => {
    if (!payNowInstallment) return;
    handlePayInstallment(payNowInstallment.id);
  };

  // Handle successful Revolut payment submission
  const handleRevolutSubmitted = () => {
    setPaymentMessage({
      type: "success",
      text: "Your Revolut payment has been submitted and is pending verification by our admin team. You'll be notified once it's approved.",
    });
    setPayNowModalOpen(false);
    setPayNowInstallment(null);
  };

  const handleSelectPaymentPlan = async (plan: {
    id: string;
    label: string;
  }) => {
    if (!booking?.bookingDocumentId) {
      setPaymentMessage({
        type: "error",
        text: "Unable to load booking information. Please try again or contact support.",
      });
      return;
    }

    setSelectingPlanId(plan.id);
    setPaymentMessage(null);

    try {
      const response = await fetch("/api/stripe-payments/select-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingDocumentId: booking.bookingDocumentId,
          paymentPlanId: plan.id,
          paymentPlanDetails: {
            id: plan.id,
            label: plan.label,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to select payment plan");
      }

      setPaymentMessage({
        type: "success",
        text: `Successfully selected ${plan.label}. Your payment schedule is now active.`,
      });
    } catch (err: any) {
      console.error("Error selecting payment plan:", err);
      setPaymentMessage({
        type: "error",
        text: err.message || "Failed to select payment plan. Please try again.",
      });
    } finally {
      setSelectingPlanId(null);
    }
  };

  const handleFlexitourSubmit = async () => {
    if (
      !booking ||
      !flexitourSelectedDate ||
      !flexitourSelectedPlan ||
      !flexitourSelectedPlanIsValid
    ) {
      return;
    }

    setFlexitourSubmitting(true);
    setFlexitourMessage(null);

    try {
      const response = await fetch(
        `/api/public/booking/${bookingDocumentId}/flexitour`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newTourDate: flexitourSelectedDate,
            paymentPlan: flexitourSelectedPlan,
            ...(email ? { email } : {}),
          }),
        },
      );

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error || "Failed to update your Flexitour tour date.",
        );
      }

      const successText =
        result?.message ||
        "Flexitour date updated successfully. Payment schedule is being refreshed.";
      setFlexitourMessage(null);
      setFlexitourPreview(null);
      toast({
        title: "Flexitour Updated",
        description: successText,
      });
    } catch (err: any) {
      console.error("Flexitour update failed:", err);
      setFlexitourMessage({
        type: "error",
        text:
          err?.message ||
          "Unable to process Flexitour right now. Please try again.",
      });
    } finally {
      setFlexitourSubmitting(false);
    }
  };

  const handleFlexitourReview = async () => {
    if (flexitourActionDisabled) return;

    setFlexitourPreviewLoading(true);
    setFlexitourMessage(null);
    setFlexitourPreview(null);

    try {
      const response = await fetch(
        `/api/public/booking/${bookingDocumentId}/flexitour/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newTourDate: flexitourSelectedDate,
            paymentPlan: flexitourSelectedPlan,
            ...(email ? { email } : {}),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result?.success || !result?.data) {
        throw new Error(
          result?.error || "Unable to preview your updated payment schedule.",
        );
      }

      setFlexitourPreview(result.data as FlexitourPreviewData);
      setConfirmFlexitourOpen(true);
    } catch (err: any) {
      console.error("Flexitour preview failed:", err);
      setFlexitourMessage({
        type: "error",
        text:
          err?.message ||
          "Unable to preview your date change right now. Please try again.",
      });
    } finally {
      setFlexitourPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="force-light min-h-screen bg-light-grey flex items-center justify-center px-4"
        style={{ colorScheme: "light" }}
      >
        <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white/90 shadow-[0_18px_45px_-30px_rgba(28,31,42,0.4)] p-8 text-center animate-fade-in motion-reduce:animate-none">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-crimson-red/20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-crimson-red border-r-transparent motion-reduce:animate-none" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Loading Booking</p>
          <p className="mt-1 text-xs text-gray-600">
            Please wait while we fetch your latest payment status.
          </p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div
        className="force-light min-h-screen bg-light-grey"
        style={{ colorScheme: "light" }}
      >
        <header className="bg-creative-midnight text-white print:bg-creative-midnight border-b border-white/10">
          <div className="container mx-auto px-4 py-5">
            <Image
              src="/logos/Logo_White.svg"
              alt="ImHereTravels"
              width={180}
              height={50}
              className="h-8 sm:h-9 w-auto"
            />
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 sm:py-20 text-center">
          <div className="mx-auto max-w-xl rounded-2xl border border-white/70 bg-white p-8 sm:p-10 shadow-[0_20px_50px_-32px_rgba(28,31,42,0.35)] animate-slideUpFadeIn motion-reduce:animate-none">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-crimson-red/10">
              <AlertCircle className="h-6 w-6 text-crimson-red" />
            </div>
            <p className="font-cartograph text-sm tracking-wide text-crimson-red">
              Booking Access
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-hk-grotesk font-bold text-gray-900">
              Invalid Booking
            </h1>
            <p className="mt-3 text-sm text-gray-600 mb-6">
              {error ||
                "This is an invalid booking. Contact bella@imheretravels.com if this is a mistake."}
            </p>
            <Button
              onClick={() => (window.location.href = "/")}
              className="bg-crimson-red hover:bg-crimson-red/90"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const toNumber = (value: unknown, fallback = 0) => {
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/[£€,\s]/g, "");
      const parsed = Number(cleaned);
      return Number.isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
  };

  const originalTourCost = toNumber(booking.originalTourCost);
  const discountedTourCost = toNumber(booking.discountedTourCost, 0);
  const totalCost = discountedTourCost || originalTourCost;
  const paidAmount = toNumber(booking.paid);
  const remainingBalanceAmount = toNumber(booking.remainingBalance);
  const manualCreditAmount = toNumber(booking.manualCredit, 0);
  const creditFromLabel = (booking.creditFrom || "").toString().trim();
  const showManualCreditInTable =
    manualCreditAmount > 0 && creditFromLabel.length > 0;
  const paymentProgressValue =
    typeof booking.paymentProgress === "string"
      ? parseFloat(booking.paymentProgress.replace(/%/g, "")) || 0
      : booking.paymentProgress || 0;

  const getDateFromValue = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (/^\d{8}$/.test(trimmed)) {
        const year = Number(trimmed.slice(0, 4));
        const monthIndex = Number(trimmed.slice(4, 6)) - 1;
        const day = Number(trimmed.slice(6, 8));
        const parsed = new Date(year, monthIndex, day);
        return isNaN(parsed.getTime()) ? null : parsed;
      }
      const d = new Date(trimmed);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === "object") {
      if ("seconds" in value && typeof value.seconds === "number") {
        return new Date(value.seconds * 1000);
      }
      if ("toDate" in value && typeof value.toDate === "function") {
        try {
          const d = value.toDate();
          return d instanceof Date && !isNaN(d.getTime()) ? d : null;
        } catch {
          return null;
        }
      }
    }
    return null;
  };

  const tourDateLabel = (() => {
    const date =
      getDateFromValue(booking.tourDate) ||
      getDateFromValue(booking.formattedDate);
    if (date) return format(date, "MMM dd, yyyy");
    return booking.formattedDate || "---";
  })();

  const toDateKey = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const currentTourDateKey = (() => {
    const date =
      getDateFromValue(booking.tourDate) ||
      getDateFromValue(booking.formattedDate);
    return date ? toDateKey(date) : "";
  })();

  const toNonNegativeInteger = (value: unknown, fallback: number): number => {
    const parsed =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : Number.NaN;

    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.floor(parsed));
  };

  const flexitourMaxChanges = toNonNegativeInteger(
    booking.flexitourMaxChanges,
    3,
  );
  const flexitourUsedChanges = toNonNegativeInteger(
    booking.flexitourUsedChanges,
    0,
  );
  const flexitourRemainingChanges = Math.max(
    0,
    flexitourMaxChanges - flexitourUsedChanges,
  );
  const isGroupBooking =
    booking.bookingType === "Duo Booking" ||
    booking.bookingType === "Group Booking";
  const flexitourMainBookerOnly = isGroupBooking && !booking.isMainBooker;
  const flexitourLimitReached = flexitourUsedChanges >= flexitourMaxChanges;
  const flexitourHasOptions = flexitourDateOptions.length > 0;
  const flexitourSelectedIsUnchanged =
    !!flexitourSelectedDate && flexitourSelectedDate === currentTourDateKey;
  const selectedFlexitourOption = flexitourDateOptions.find(
    (option) => option.value === flexitourSelectedDate,
  );
  const selectedFlexitourLabel =
    selectedFlexitourOption?.label || flexitourSelectedDate || "---";

  const calculateDaysBetween = (dateValue: any): number => {
    const tour = getDateFromValue(dateValue);
    if (!tour) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    tour.setHours(0, 0, 0, 0);
    const diffTime = tour.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getAvailablePaymentTerm = (tourDateValue: any) => {
    if (!tourDateValue)
      return { term: "", isLastMinute: false, isInvalid: false };

    const daysBetween = calculateDaysBetween(tourDateValue);

    if (daysBetween < 3) {
      return { term: "invalid", isLastMinute: false, isInvalid: true };
    } else if (daysBetween >= 3 && daysBetween < 30) {
      return { term: "full_payment", isLastMinute: true, isInvalid: false };
    } else {
      const today = new Date();
      const tourDateObj = getDateFromValue(tourDateValue);
      if (!tourDateObj) {
        return { term: "", isLastMinute: false, isInvalid: false };
      }
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

  const fixTermName = (name: string) =>
    name
      .replace(/Instalment/g, "Installment")
      .replace(/instalments/g, "installments");

  const generatePaymentSchedule = (
    monthsRequired: number,
  ): Array<{ date: string; amount: number }> => {
    const total = totalCost || 0;
    const reservationFee = booking.reservationFee || 0;
    const remainingBalance = Math.max(0, total - reservationFee);
    const monthlyAmount = monthsRequired
      ? remainingBalance / monthsRequired
      : remainingBalance;
    const schedule: Array<{ date: string; amount: number }> = [];

    const today = new Date();
    let nextMonth = today.getMonth() + 1;
    let nextYear = today.getFullYear();
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
        "0",
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

  const getAvailablePaymentPlans = () => {
    const availablePaymentTerm = getAvailablePaymentTerm(booking.tourDate);
    if (!availablePaymentTerm.term || availablePaymentTerm.isInvalid) return [];

    if (availablePaymentTerm.isLastMinute) {
      const total = totalCost || 0;
      const reservationFee = booking.reservationFee || 0;
      const remainingBalance = Math.max(0, total - reservationFee);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);

      return [
        {
          id: "full_payment",
          type: "full_payment",
          label: "Full Payment Required Within 48hrs",
          description: "Complete payment of remaining balance within 2 days",
          monthsRequired: 1,
          color: "#f59e0b",
          schedule: [
            {
              date: dueDate.toISOString().slice(0, 10),
              amount: remainingBalance,
            },
          ],
        },
      ];
    }

    const termMap: { [key: string]: number } = { P1: 1, P2: 2, P3: 3, P4: 4 };
    const maxMonths = termMap[availablePaymentTerm.term] || 0;

    return paymentTermOptions
      .filter((term) => term.monthsRequired && term.monthsRequired <= maxMonths)
      .map((term) => ({
        id: term.id,
        type: term.paymentPlanType,
        label: fixTermName(term.name),
        description: getFriendlyDescription(term.monthsRequired || 0),
        monthsRequired: term.monthsRequired || 0,
        color: term.color,
        schedule: generatePaymentSchedule(term.monthsRequired || 0),
      }));
  };

  const hasPaidDate = (value: unknown): boolean => {
    return !!getDateFromValue(value);
  };
  const formatDateLabel = (value: unknown): string => {
    const parsed = getDateFromValue(value);
    return parsed ? format(parsed, "MMM dd, yyyy") : "---";
  };

  const flexitourPaidInstallmentCount = [
    booking.p1DatePaid,
    booking.p2DatePaid,
    booking.p3DatePaid,
    booking.p4DatePaid,
  ].filter(hasPaidDate).length;
  const flexitourP1Paid = hasPaidDate(booking.p1DatePaid);
  const flexitourFullPaymentPaid = hasPaidDate(booking.fullPaymentDatePaid);

  const flexitourPlanOptions: FlexitourPlanOption[] = (() => {
    if (!flexitourSelectedDate) return [];

    const availablePaymentTerm = getAvailablePaymentTerm(flexitourSelectedDate);
    if (!availablePaymentTerm.term || availablePaymentTerm.isInvalid) return [];

    if (flexitourFullPaymentPaid) {
      return [];
    }

    if (availablePaymentTerm.isLastMinute) {
      return [
        {
          value: "Full Payment",
          label: "Full Payment (within 48hrs)",
          description: "Required for this selected travel date.",
          monthsRequired: 1,
        },
      ];
    }

    const termMap: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
    const maxMonths = termMap[availablePaymentTerm.term] || 0;
    const minMonths =
      flexitourPaidInstallmentCount > 0 ? flexitourPaidInstallmentCount + 1 : 1;
    const allowP1SettlementMode =
      flexitourPaidInstallmentCount === 1 &&
      flexitourP1Paid &&
      maxMonths === 1;
    const options: FlexitourPlanOption[] = [];

    for (let months = 1; months <= maxMonths; months += 1) {
      const allowP1SettlementOption =
        allowP1SettlementMode && months === 1 && !flexitourFullPaymentPaid;
      if (months < minMonths && !allowP1SettlementOption) continue;

      const value = `P${months}` as FlexitourPlanOption["value"];
      const matchingTerm = paymentTermOptions.find(
        (term) => term.monthsRequired === months,
      );
      const fallbackLabel =
        months === 1
          ? "P1 - Single Installment"
          : `P${months} - ${months} Installments`;

      options.push({
        value,
        label: matchingTerm?.name ? fixTermName(matchingTerm.name) : fallbackLabel,
        description: allowP1SettlementOption
          ? "Settle your remaining balance as a second P1 row."
          : getFriendlyDescription(months),
        monthsRequired: months,
      });
    }

    return options;
  })();

  const flexitourHasPlanOptions = flexitourPlanOptions.length > 0;
  const flexitourSelectedPlanIsValid = flexitourPlanOptions.some(
    (option) => option.value === flexitourSelectedPlan,
  );
  const selectedFlexitourPlanOption = flexitourPlanOptions.find(
    (option) => option.value === flexitourSelectedPlan,
  );
  const flexitourHasSettlementP1Option =
    flexitourPaidInstallmentCount > 0 &&
    flexitourP1Paid &&
    flexitourPlanOptions.some((option) => option.value === "P1");
  const selectedFlexitourPlanLabel =
    selectedFlexitourPlanOption?.label || flexitourSelectedPlan || "---";
  const flexitourRemainingAfterChange = Math.max(
    0,
    flexitourRemainingChanges - 1,
  );
  const flexitourActionDisabled =
    flexitourSubmitting ||
    flexitourPreviewLoading ||
    flexitourLoadingDates ||
    flexitourMainBookerOnly ||
    flexitourLimitReached ||
    !flexitourHasOptions ||
    !flexitourHasPlanOptions ||
    !flexitourSelectedDate ||
    !flexitourSelectedPlan ||
    !flexitourSelectedPlanIsValid ||
    flexitourSelectedIsUnchanged;

  // Build payment terms with status information
  const buildPaymentTerms = () => {
    const terms: any[] = [];

    const toNumber = (value: any): number => {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
      }
      if (typeof value === "string") {
        const parsed = Number(value.replace(/[^0-9.-]/g, ""));
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };

    const installments = [
      { id: "full_payment", term: "Full Payment", prefix: "fullPayment" },
      { id: "p1", term: "P1", prefix: "p1" },
      { id: "p2", term: "P2", prefix: "p2" },
      { id: "p3", term: "P3", prefix: "p3" },
      { id: "p4", term: "P4", prefix: "p4" },
    ];

    installments.forEach(({ id, term, prefix }) => {
      const displayTerm =
        booking.flexitourP1SettlementMode === true && id === "p2" ? "P1" : term;
      const dueDate = booking[`${prefix}DueDate` as keyof BookingData];
      const amount = booking[`${prefix}Amount` as keyof BookingData];
      const datePaid = booking[`${prefix}DatePaid` as keyof BookingData];
      const hasPaidDate = !!getDateFromValue(datePaid);
      const lateFeeAppliedAt =
        id === "full_payment"
          ? null
          : booking[`${prefix}LateFeeAppliedAt` as keyof BookingData];

      if (!amount) return; // Skip if installment doesn't exist

      // Get status from paymentTokens (primary) or flat DatePaid (fallback)
      const tokenData =
        booking.paymentTokens?.[id as keyof typeof booking.paymentTokens];

      // Check for Revolut payment status
      const revolutData = booking.revolutPayments?.[id];

      let status = "pending";
      let statusInfo: any = {};

      if (revolutData?.status === "approved") {
        status = "paid";
        statusInfo = {
          paidAt: revolutData.approvedAt || datePaid,
        };
      } else if (tokenData?.status === "success") {
        status = "paid";
        statusInfo = {
          paidAt: tokenData?.paidAt || datePaid,
        };
      } else if (hasPaidDate) {
        // Fallback for admin/manual updates where Date Paid exists without token metadata.
        status = "paid";
        statusInfo = {
          paidAt: datePaid,
        };
      } else if (revolutData?.status === "pending") {
        status = "for_verification";
      } else if (tokenData?.status === "processing") {
        status = "processing";
      } else if (tokenData?.status === "failed") {
        status = "failed";
        statusInfo = {
          errorMessage: tokenData.errorMessage,
        };
      } else if (
        dueDate &&
        !isNaN(new Date(dueDate as any).getTime()) &&
        new Date(dueDate as any) < new Date()
      ) {
        status = "overdue";
      }

      const penalty =
        id === "full_payment"
          ? 0
          : toNumber(booking[`${prefix}LateFeesPenalty` as keyof BookingData]);

      terms.push({
        id,
        term: displayTerm,
        dueDate: dueDate || "",
        amount: toNumber(amount),
        penalty,
        lateFeeAppliedAt,
        status,
        ...statusInfo,
      });
    });

    return terms;
  };

  const paymentTerms = buildPaymentTerms();
  const hasAnyPenalty = paymentTerms.some(
    (term) => Number(term.penalty || 0) > 0,
  );
  const availablePaymentPlans = getAvailablePaymentPlans();

  const sectionSurfaceClass =
    "rounded-2xl border border-gray-200/80 bg-white/95 p-4 sm:p-5 shadow-[0_10px_30px_-24px_rgba(28,31,42,0.35)]";
  const sectionHeadingEyebrowClass =
    "font-cartograph text-[11px] sm:text-xs tracking-wide text-crimson-red";
  const sectionEntryAnimationClass =
    "animate-slideUpFadeIn motion-reduce:animate-none";
  const supportActionCardClass =
    "group flex w-full items-start gap-3 sm:gap-4 rounded-xl border border-gray-300 bg-white p-3 sm:p-4 text-left transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[var(--entry-ease)] hover:-translate-y-0.5 hover:border-crimson-red hover:bg-crimson-red hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-red/40 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0";
  const supportActionIconClass =
    "rounded-lg border border-gray-200 bg-gray-50 p-2 sm:p-2.5 text-creative-midnight transition-colors duration-300 group-hover:border-white/20 group-hover:bg-white/10 group-hover:text-white";
  const supportActionLabelClass =
    "text-xs text-gray-500 transition-colors duration-300 group-hover:text-white/80";
  const supportActionValueClass =
    "text-xs sm:text-sm font-semibold text-creative-midnight transition-colors duration-300 group-hover:text-white";

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div
      className="force-light min-h-screen bg-light-grey overflow-x-hidden [--entry-ease:cubic-bezier(0.22,1,0.36,1)] [&_button]:transition-[transform,box-shadow,background-color,border-color,color] [&_button]:duration-300 [&_button]:ease-[var(--entry-ease)] [&_a]:transition-[transform,box-shadow,background-color,border-color,color] [&_a]:duration-300 [&_a]:ease-[var(--entry-ease)] motion-reduce:[&_button]:transition-none motion-reduce:[&_a]:transition-none"
      style={{ colorScheme: "light" }}
    >
      {/* Header */}
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b border-gray-200/80 bg-white/95 text-gray-900 shadow-sm backdrop-blur-sm transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none print:relative print:translate-y-0 print:opacity-100 print:shadow-none ${
          isHeaderVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="container mx-auto h-[72px] max-w-6xl px-3 sm:px-6 lg:px-8 min-[1120px]:h-[90px]">
          <div className="flex h-full flex-row items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Image
                src="/logos/Digital_Wordmark_Red.svg"
                alt="ImHereTravels"
                width={220}
                height={48}
                className="h-9 min-[1120px]:h-[42px] w-auto"
              />
            </div>
            <Button
              asChild
              variant="default"
              className="bg-crimson-red hover:bg-crimson-red/90 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-full px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2 lg:py-3 text-xs sm:text-sm lg:text-base font-medium whitespace-nowrap focus-visible:ring-crimson-red/40 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0"
            >
              <a
                href={CONTACT_US_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Contact Assistance
              </a>
            </Button>
          </div>
        </div>
      </header>
      <div
        aria-hidden="true"
        className="h-[72px] print:hidden min-[1120px]:h-[90px]"
      />

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl px-4 sm:px-6 pt-5 pb-24 sm:pt-8 sm:pb-12">
        {/* Payment Success/Error Message */}
        {paymentMessage && (
          <div
            className={`mb-4 sm:mb-6 rounded-2xl border p-3 sm:p-4 shadow-[0_10px_30px_-24px_rgba(28,31,42,0.35)] animate-fade-in motion-reduce:animate-none ${
              paymentMessage.type === "success"
                ? "bg-white/95 border-creative-midnight/20"
                : "bg-red-50/90 border-red-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {paymentMessage.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-crimson-red mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${
                    paymentMessage.type === "success"
                      ? "text-creative-midnight"
                      : "text-red-900"
                  }`}
                >
                  {paymentMessage.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Notice */}
        {(booking.bookingStatus === "Cancelled" ||
          !!booking.reasonForCancellation) && (
          <div className="mb-4 sm:mb-6 rounded-2xl border border-red-200 bg-red-50/95 px-4 py-4 sm:px-5 sm:py-5 shadow-[0_10px_30px_-24px_rgba(28,31,42,0.35)] animate-slideUpFadeIn motion-reduce:animate-none print:border print:border-red-200">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-10 w-1.5 rounded-full bg-crimson-red/90" />
              <AlertCircle className="h-5 w-5 text-crimson-red mt-1.5 flex-shrink-0" />
              <div>
                <p className={sectionHeadingEyebrowClass}>Support Notice</p>
                <h3 className="text-sm sm:text-base font-semibold text-crimson-red mb-1">
                  Booking Cancelled
                </h3>
                <p className="text-sm text-red-900">
                  This booking has been cancelled. If you believe this is a
                  mistake, please contact our support team.
                </p>
                {booking.reasonForCancellation && (
                  <p className="text-sm text-red-900 mt-2">
                    Reason: {booking.reasonForCancellation}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Important Notice (print-safe static variant) */}
        <div className="hidden print:block mb-4 sm:mb-6 rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-4 sm:px-5 sm:py-5 shadow-[0_10px_30px_-24px_rgba(28,31,42,0.35)] animate-slideUpFadeIn motion-reduce:animate-none print:border print:border-amber-200">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-10 w-1.5 rounded-full bg-sunglow-yellow/90" />
            <AlertCircle className="h-5 w-5 text-sunglow-yellow mt-1.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-amber-900 mb-1">
                Important Notice
              </h3>
              <p className="text-sm text-amber-800">
                Due to high customer demand, this booking status page might not
                be updated in real-time. Our ImHereTravels admin team is
                continuously updating booking statuses. Please allow some time
                for recent changes to reflect here. For urgent inquiries,
                contact our support team directly.
              </p>
            </div>
          </div>
        </div>

        {/* Important Notice (floating collapsible) */}
        <div className="fixed z-40 right-3 bottom-[4.75rem] sm:right-6 sm:bottom-6 print:hidden">
          <div className="relative pointer-events-auto">
            <div
              id="important-notice-panel"
              aria-hidden={!importantNoticeExpanded}
              className={`absolute bottom-12 right-0 w-[min(20rem,calc(100vw-1.25rem))] origin-bottom-right overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 shadow-[0_10px_30px_-24px_rgba(28,31,42,0.35)] backdrop-blur-sm transition-[opacity,transform,max-height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                importantNoticeExpanded
                  ? "pointer-events-auto max-h-64 opacity-100 translate-y-0 scale-100"
                  : "pointer-events-none max-h-0 opacity-0 translate-y-1 scale-95"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-1 h-10 w-1.5 rounded-full bg-sunglow-yellow/90" />
                  <AlertCircle className="h-5 w-5 text-sunglow-yellow mt-1 flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-amber-900">
                    Important Notice
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setImportantNoticeExpanded(false)}
                  aria-expanded={importantNoticeExpanded}
                  aria-controls="important-notice-panel"
                  aria-label="Collapse important notice"
                  className="inline-flex shrink-0 items-center rounded-md border border-amber-300 bg-white/70 px-2 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-1"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-amber-800">
                Due to high customer demand, this booking status page might not
                be updated in real-time. Our ImHereTravels admin team is
                continuously updating booking statuses. Please allow some time
                for recent changes to reflect here. For urgent inquiries,
                contact our support team directly.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setImportantNoticeExpanded((previous) => !previous)}
              aria-expanded={importantNoticeExpanded}
              aria-controls="important-notice-panel"
              aria-label={
                importantNoticeExpanded
                  ? "Collapse important notice"
                  : "Expand important notice"
              }
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_10px_30px_-24px_rgba(28,31,42,0.35)] transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                importantNoticeExpanded
                  ? "scale-105 border-amber-300 bg-amber-100 text-amber-900"
                  : "scale-100 border-amber-200 bg-amber-50/95 text-amber-900 hover:bg-amber-100 hover:-translate-y-0.5"
              }`}
            >
              <AlertCircle
                className={`h-4 w-4 text-sunglow-yellow transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                  importantNoticeExpanded ? "rotate-12" : "rotate-0"
                }`}
              />
              <span className="sr-only">Important Notice</span>
            </button>
          </div>
        </div>

        {/* Main Layout Grid */}
        <div className="grid lg:grid-cols-3 gap-5 lg:gap-7 items-start">
          {/* Left Column - Booking Details */}
          <div className="lg:col-span-2 space-y-5 lg:space-y-6 min-w-0">
            {/* Booking Information */}
            <div
              className={`${sectionSurfaceClass} ${sectionEntryAnimationClass}`}
              style={{ animationDelay: "120ms" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-gray-200">
                <div>
                  <h2 className="text-lg sm:text-xl font-hk-grotesk font-bold text-gray-900 mb-1">
                    {booking.tourPackageName}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600">
                    ID:{" "}
                    <span className="font-semibold text-gray-900">
                      {booking.bookingId}
                    </span>
                  </p>
                </div>
                <Badge className="bg-spring-green text-white px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm self-start sm:self-auto border border-spring-green/50">
                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                  {booking.bookingStatus}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 lg:gap-x-8 gap-y-3 sm:gap-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Traveler Name</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">
                    {booking.fullName}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Tour Dates
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">
                    {tourDateLabel}
                  </p>
                  <p className="text-xs text-gray-600">
                    {booking.tourDuration}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Tour Package
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900 break-words">
                    {booking.tourPackageName}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Booking Type</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">
                    {booking.bookingType}
                    {booking.isMainBooker && " (Main Booker)"}
                  </p>
                </div>

                {booking.eventName && (
                  <div className="sm:col-span-2">
                    <Badge className="bg-crimson-red text-white px-3 py-1 text-xs sm:text-sm border border-crimson-red/60">
                      {booking.eventName} -{" "}
                      {booking.discountType?.toLowerCase() === "flat amount" ||
                      booking.discountType?.toLowerCase()?.includes("amount")
                        ? `£${booking.discountRate} OFF`
                        : `${booking.discountRate}% OFF`}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Flexitour */}
            <div
              className={`${sectionSurfaceClass} ${sectionEntryAnimationClass} bg-white`}
              style={{ animationDelay: "160ms" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-sm sm:text-base font-hk-grotesk font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-crimson-red" />
                  Flexitour
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-white text-gray-700 border border-gray-200 text-[11px] px-2 py-0.5">
                    Used: {flexitourUsedChanges}/{flexitourMaxChanges}
                  </Badge>
                  <Badge className="bg-white text-gray-700 border border-gray-200 text-[11px] px-2 py-0.5">
                    Remaining: {flexitourRemainingChanges}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setFlexitourExpanded((previous) => !previous)}
                    aria-expanded={flexitourExpanded}
                    aria-controls="flexitour-panel"
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700 transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[var(--entry-ease)] hover:border-crimson-red hover:text-crimson-red hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-red/40 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0"
                  >
                    <span>{flexitourExpanded ? "Collapse" : "Expand"}</span>
                    {flexitourExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div
                id="flexitour-panel"
                aria-hidden={!flexitourExpanded}
                className={`grid overflow-hidden transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                  flexitourExpanded
                    ? "grid-rows-[1fr]"
                    : "grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div
                    className={`transform-gpu transition-[opacity,transform] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                      flexitourExpanded
                        ? "pointer-events-auto opacity-100 translate-y-0"
                        : "pointer-events-none opacity-0 -translate-y-1"
                    }`}
                  >
                    <p className="mt-2 text-xs text-gray-600">
                      Need to move your trip? Select a new package date, choose a
                      payment plan, then review before confirming.
                    </p>

                  <div className="mt-3 space-y-2 sm:space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          New tour date
                        </p>
                        <Select
                          value={flexitourSelectedDate}
                          onValueChange={(value) => {
                            setFlexitourSelectedDate(value);
                            setFlexitourSelectedPlan("");
                            setFlexitourMessage(null);
                            setFlexitourPreview(null);
                          }}
                          disabled={
                            flexitourLoadingDates ||
                            flexitourMainBookerOnly ||
                            flexitourLimitReached ||
                            !flexitourHasOptions
                          }
                        >
                          <SelectTrigger className="h-9 bg-white text-gray-900 border-gray-300 transition-all duration-200 hover:border-crimson-red/60 focus:ring-crimson-red/25">
                            <SelectValue
                              placeholder={
                                flexitourLoadingDates
                                  ? "Loading available dates..."
                                  : "No valid dates available"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200 text-gray-900">
                            {flexitourDateOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                className="transition-colors duration-150"
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Payment plan
                        </p>
                        <Select
                          value={flexitourSelectedPlan}
                          onValueChange={(value) => {
                            setFlexitourSelectedPlan(value);
                            setFlexitourMessage(null);
                            setFlexitourPreview(null);
                          }}
                          disabled={
                            flexitourLoadingDates ||
                            flexitourMainBookerOnly ||
                            flexitourLimitReached ||
                            !flexitourHasOptions ||
                            !flexitourSelectedDate ||
                            !flexitourHasPlanOptions
                          }
                        >
                          <SelectTrigger className="h-9 bg-white text-gray-900 border-gray-300 transition-all duration-200 hover:border-crimson-red/60 focus:ring-crimson-red/25">
                            <SelectValue placeholder="Select payment plan" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200 text-gray-900">
                            {flexitourPlanOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                className="transition-colors duration-150"
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={handleFlexitourReview}
                      disabled={flexitourActionDisabled}
                      size="sm"
                      className="bg-crimson-red hover:bg-crimson-red/90 text-white w-full sm:w-auto transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
                    >
                      {flexitourPreviewLoading
                        ? "Preparing Preview..."
                        : "Review Date Change"}
                    </Button>
                  </div>

                  {isGroupBooking && !booking.isMainBooker && (
                    <p className="mt-2 text-xs text-gray-700">
                      Only the main booker can change dates for this{" "}
                      {booking.bookingType.toLowerCase()}.
                    </p>
                  )}

                  {isGroupBooking && booking.isMainBooker && (
                    <p className="mt-2 text-xs text-gray-700">
                      This change will update linked group bookings.
                    </p>
                  )}

                  {flexitourLimitReached && (
                    <p className="mt-2 text-xs text-red-700">
                      Flexitour limit reached. No more date changes are available.
                    </p>
                  )}

                  {!flexitourLoadingDates &&
                    !flexitourHasOptions &&
                    !flexitourLimitReached && (
                      <p className="mt-2 text-xs text-red-700">
                        There are currently no valid future dates for this package.
                      </p>
                    )}

                  {!flexitourLoadingDates &&
                    flexitourHasOptions &&
                    !flexitourHasPlanOptions &&
                    !flexitourLimitReached && (
                      <p className="mt-2 text-xs text-red-700">
                        No eligible payment plan is available for this selected date
                        based on your already paid terms.
                      </p>
                    )}

                  {flexitourPaidInstallmentCount > 0 && flexitourHasPlanOptions && (
                    <p className="mt-2 text-xs text-gray-700">
                      {flexitourHasSettlementP1Option
                        ? "Paid terms stay locked. P1 is available as a settlement row for your remaining balance."
                        : `Paid terms stay locked. Plans up to P${flexitourPaidInstallmentCount} are hidden.`}
                    </p>
                  )}

                  {flexitourSelectedIsUnchanged && (
                    <p className="mt-2 text-xs text-gray-700">
                      Please choose a different tour date from your current
                      schedule.
                    </p>
                  )}

                  {flexitourHasPlanOptions && !flexitourSelectedPlan && (
                    <p className="mt-2 text-xs text-gray-700">
                      Select an available payment plan before reviewing your date
                      change.
                    </p>
                  )}

                    {flexitourMessage && (
                      <div
                        className={`mt-2 rounded-md border px-3 py-2 text-xs sm:text-sm ${
                          flexitourMessage.type === "success"
                            ? "bg-white border-creative-midnight/20 text-creative-midnight"
                            : "bg-red-50 border-red-200 text-red-900"
                        }`}
                      >
                        {flexitourMessage.text}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Options (when no payment plan yet) */}
            {!booking.paymentPlan && availablePaymentPlans.length > 0 && (
              <div
                className={`${sectionSurfaceClass} ${sectionEntryAnimationClass}`}
                style={{ animationDelay: "220ms" }}
              >
                <p className={sectionHeadingEyebrowClass}>Plan Selection</p>
                <h2 className="text-lg sm:text-xl font-hk-grotesk font-bold text-gray-900 mb-4 sm:mb-5 flex items-center gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-crimson-red" />
                  Payment Options
                </h2>
                <div className="mb-4 sm:mb-5 rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700">
                  Choose the plan that fits you best. Once selected, your
                  payment schedule will be created and shown below.
                </div>

                <div className="w-full">
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto shadow-sm">
                    <table
                      className={`w-full ${hasAnyPenalty ? "min-w-[520px] sm:min-w-[640px]" : "min-w-[420px] sm:min-w-[500px]"}`}
                    >
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                            Plan
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                            Due Date
                          </th>
                          <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                            Amount
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {availablePaymentPlans.map((plan) =>
                          plan.schedule.map((payment: any, idx: number) => {
                            const dueDate = payment.date
                              ? new Date(`${payment.date}T00:00:00Z`)
                              : null;
                            const rowSpan = plan.schedule.length;

                            return (
                              <tr
                                key={`${plan.id}-${idx}`}
                                className="border-t border-gray-200 hover:bg-gray-50/90 transition-colors duration-200"
                              >
                                {idx === 0 && (
                                  <td
                                    className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-900 align-middle text-center"
                                    rowSpan={rowSpan}
                                  >
                                    <div className="space-y-1 text-center">
                                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                                        <span
                                          className="inline-flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full"
                                          style={{
                                            backgroundColor: plan.color,
                                          }}
                                        />
                                        <span className="text-xs sm:text-sm">
                                          {plan.label}
                                        </span>
                                      </div>
                                      {plan.description && (
                                        <div className="text-[10px] sm:text-xs text-gray-500">
                                          {plan.description}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                )}
                                <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                                  {dueDate && !isNaN(dueDate.getTime())
                                    ? format(dueDate, "MMM dd, yyyy")
                                    : "---"}
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-semibold text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                                  £{payment.amount.toFixed(2)}
                                </td>
                                {idx === 0 && (
                                  <td
                                    className="py-2 sm:py-3 px-2 sm:px-4 align-middle text-center"
                                    rowSpan={rowSpan}
                                  >
                                    <Button
                                      onClick={() => {
                                        setPendingPlan(plan);
                                        setConfirmPlanOpen(true);
                                      }}
                                      disabled={
                                        selectingPlanId !== null &&
                                        selectingPlanId !== plan.id
                                      }
                                      size="sm"
                                      className="bg-crimson-red hover:bg-crimson-red/90 text-white text-xs sm:text-sm px-2 sm:px-3 hover:shadow-md"
                                    >
                                      {selectingPlanId === plan.id
                                        ? "Selecting..."
                                        : "Select Plan"}
                                    </Button>
                                  </td>
                                )}
                              </tr>
                            );
                          }),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <AlertDialog
              open={confirmPlanOpen}
              onOpenChange={setConfirmPlanOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm payment plan</AlertDialogTitle>
                  <AlertDialogDescription>
                    {pendingPlan
                      ? `You are about to select ${pendingPlan.label}. This will set your payment schedule.`
                      : "Confirm your selected payment plan."}
                  </AlertDialogDescription>
                  {pendingPlan?.schedule?.length ? (
                    <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                      {pendingPlan.schedule.length} payment
                      {pendingPlan.schedule.length !== 1 ? "s" : ""} will be
                      scheduled.
                    </div>
                  ) : null}
                  <div className="mt-3 rounded-md bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
                    Once you select a plan, it cannot be undone.
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    disabled={selectingPlanId !== null}
                    onClick={() => setPendingPlan(null)}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (!pendingPlan) return;
                      setConfirmPlanOpen(false);
                      handleSelectPaymentPlan(pendingPlan);
                    }}
                    disabled={selectingPlanId !== null || !pendingPlan}
                    className="bg-crimson-red hover:bg-crimson-red/90 text-white"
                  >
                    {selectingPlanId ? "Selecting..." : "Confirm Plan"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
              open={confirmFlexitourOpen}
              onOpenChange={setConfirmFlexitourOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Tour Date Change</AlertDialogTitle>
                  <AlertDialogDescription>
                    You are about to change your tour date from{" "}
                    <span className="font-semibold text-foreground">
                      {tourDateLabel}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-foreground">
                      {selectedFlexitourLabel}
                    </span>
                    .
                  </AlertDialogDescription>
                  <div className="mt-3 rounded-md bg-gray-50 border border-gray-200 p-3 text-sm text-gray-900">
                    Selected plan:{" "}
                    <span className="font-semibold">
                      {selectedFlexitourPlanLabel}
                    </span>
                  </div>
                  <div className="mt-3 rounded-md bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
                    Your payment schedule and pending payment reminder dates
                    will be adjusted automatically.
                  </div>
                  <div className="mt-3 rounded-md bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
                    Paid terms will keep their existing due dates and amounts.
                    Only unpaid terms will be recalculated.
                  </div>
                  {flexitourPreview?.previewRows?.length ? (
                    <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        Adjusted payment schedule preview
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[320px] text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 text-gray-500">
                              <th className="py-1.5 text-left font-medium">
                                Term
                              </th>
                              <th className="py-1.5 text-left font-medium">
                                Due Date
                              </th>
                              <th className="py-1.5 text-right font-medium">
                                Amount
                              </th>
                              <th className="py-1.5 text-right font-medium">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {flexitourPreview.previewRows.map((row) => (
                              <tr
                                key={`${row.id}-${row.term}`}
                                className="border-b border-gray-100 last:border-0"
                              >
                                <td className="py-1.5 font-semibold text-gray-900">
                                  {row.term}
                                </td>
                                <td className="py-1.5 text-gray-700">
                                  {formatDateLabel(row.dueDate)}
                                </td>
                                <td className="py-1.5 text-right font-semibold text-gray-900">
                                  {"\u00A3"}
                                  {row.amount.toFixed(2)}
                                </td>
                                <td className="py-1.5 text-right">
                                  <span
                                    className={
                                      row.status === "Paid"
                                        ? "text-crimson-red font-medium"
                                        : "text-gray-700"
                                    }
                                  >
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                  {flexitourPreview?.notes?.length ? (
                    <div className="mt-3 rounded-md bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                      {flexitourPreview.notes.map((note, index) => (
                        <p key={index}>{note}</p>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 rounded-md bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
                    Remaining Flexitour changes after this update:{" "}
                    <span className="font-semibold">
                      {flexitourRemainingAfterChange}
                    </span>
                    .
                    {isGroupBooking && booking.isMainBooker
                      ? " This also updates linked group bookings."
                      : ""}
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={flexitourSubmitting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setConfirmFlexitourOpen(false);
                      handleFlexitourSubmit();
                    }}
                    disabled={flexitourSubmitting}
                    className="bg-crimson-red hover:bg-crimson-red/90 text-white"
                  >
                    {flexitourSubmitting ? "Updating..." : "Yes, Change Date"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Payment Schedule */}
            {booking.paymentPlan && paymentTerms.length > 0 && (
              <div
                className={`${sectionSurfaceClass} ${sectionEntryAnimationClass}`}
                style={{ animationDelay: "260ms" }}
              >
                <h2 className="text-lg sm:text-xl font-hk-grotesk font-bold text-gray-900 mb-4 sm:mb-5 flex items-center gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-crimson-red" />
                  Payment Schedule
                </h2>

                {/* Progress Bar Container */}
                <div className="mb-4 sm:mb-6">
                  {/* Label & Percentage Row */}
                  <div className="flex justify-end mb-1.5">
                    <span className="text-xs sm:text-sm font-bold text-gray-900">
                      {paymentProgressValue}%
                    </span>
                  </div>

                  {/* Bar Track & Fill */}
                  <div className="relative h-3 sm:h-4 w-full rounded-full border border-gray-200 bg-transparent overflow-hidden">
                    <div
                      className="h-full bg-crimson-red transition-all duration-700 ease-out rounded-full motion-reduce:transition-none"
                      style={{ width: `${paymentProgressValue}%` }}
                    />
                  </div>
                </div>

                <div className="w-full">
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto shadow-sm">
                    <table className="w-full min-w-[420px] sm:min-w-[500px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                            Term
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                            Due Date
                          </th>
                          <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                            Amount
                          </th>
                          {hasAnyPenalty && (
                            <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                              Total Amount
                            </th>
                          )}
                          <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                            Status
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                            Paid On
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentTerms.map((term, index) => {
                          const dueDateValue = term.dueDate;
                          const dueDate = dueDateValue
                            ? new Date(dueDateValue)
                            : null;
                          const hasValidDueDate =
                            dueDate instanceof Date &&
                            !isNaN(dueDate.getTime());

                          return (
                            <tr
                              key={index}
                              className="border-t border-gray-200 hover:bg-gray-50/90 transition-colors duration-200"
                            >
                              <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                                {term.term}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                                {hasValidDueDate
                                  ? format(dueDate as Date, "MMM dd, yyyy")
                                  : "---"}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-semibold text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                                £{term.amount.toFixed(2)}
                              </td>
                              {hasAnyPenalty && (
                                <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-semibold text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span>
                                      £
                                      {(
                                        term.amount + (term.penalty || 0)
                                      ).toFixed(2)}
                                    </span>
                                    {term.penalty > 0 && (
                                      <span className="text-[10px] font-normal text-red-600">
                                        + £{term.penalty.toFixed(2)} late fee
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}

                              {/* Status Badge */}
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                                {term.status === "paid" && (
                                  <Badge className="bg-spring-green text-white text-[10px] sm:text-xs px-2 py-0.5">
                                    <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                    Paid
                                  </Badge>
                                )}
                                {term.status === "processing" && (
                                  <Badge className="bg-creative-midnight text-white text-[10px] sm:text-xs px-2 py-0.5">
                                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 animate-spin" />
                                    Processing
                                  </Badge>
                                )}
                                {term.status === "failed" && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] sm:text-xs px-2 py-0.5"
                                    title={
                                      term.errorMessage || "Payment failed"
                                    }
                                  >
                                    <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                    Failed
                                  </Badge>
                                )}
                                {term.status === "overdue" && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] sm:text-xs px-2 py-0.5"
                                  >
                                    <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                    Overdue
                                  </Badge>
                                )}
                                {term.status === "pending" && (
                                  <Badge
                                    variant="outline"
                                    className="border-gray-300 text-gray-700 text-[10px] sm:text-xs px-2 py-0.5"
                                  >
                                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                    Pending
                                  </Badge>
                                )}
                                {term.status === "for_verification" && (
                                  <Badge className="bg-creative-midnight text-white text-[10px] sm:text-xs px-2 py-0.5">
                                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                    For Verification
                                  </Badge>
                                )}
                              </td>

                              {/* Action Column */}
                              <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                                {term.status === "paid" && term.paidAt && (
                                  <span className="text-xs sm:text-sm text-gray-500">
                                    {format(
                                      new Date(
                                        term.paidAt.seconds
                                          ? term.paidAt.seconds * 1000
                                          : term.paidAt,
                                      ),
                                      "MMM dd, yyyy",
                                    )}
                                  </span>
                                )}

                                {(() => {
                                  // Find the first unpaid installment
                                  const firstUnpaid = paymentTerms.find(
                                    (t) =>
                                      t.status === "pending" ||
                                      t.status === "overdue" ||
                                      t.status === "failed",
                                  );

                                  // Only show button if this is the first unpaid OR if it's failed
                                  const showButton =
                                    term.status === "failed" ||
                                    (firstUnpaid && firstUnpaid.id === term.id);

                                  if (
                                    (term.status === "pending" ||
                                      term.status === "overdue" ||
                                      term.status === "failed") &&
                                    showButton
                                  ) {
                                    return (
                                      <Button
                                        onClick={() =>
                                          handleOpenPayNowModal(
                                            term.id,
                                            term.amount + (term.penalty || 0),
                                          )
                                        }
                                        disabled={paymentProcessing !== null}
                                        size="sm"
                                        className="bg-crimson-red hover:bg-crimson-red/90 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 hover:shadow-md"
                                      >
                                        {paymentProcessing === term.id
                                          ? "Processing..."
                                          : term.status === "failed"
                                            ? "Retry Payment"
                                            : "Pay Now"}
                                      </Button>
                                    );
                                  }

                                  // Show message for locked installments
                                  if (
                                    (term.status === "pending" ||
                                      term.status === "overdue") &&
                                    !showButton &&
                                    firstUnpaid
                                  ) {
                                    return (
                                      <span className="text-xs text-gray-500 italic">
                                        Pay {firstUnpaid.term} first
                                      </span>
                                    );
                                  }

                                  return null;
                                })()}

                                {term.status === "processing" && (
                                  <span className="text-xs sm:text-sm text-gray-700 flex items-center gap-1">
                                    <Clock className="h-3 w-3 animate-spin" />
                                    Processing...
                                  </span>
                                )}

                                {term.status === "for_verification" && (
                                  <span className="text-xs sm:text-sm text-gray-700 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Awaiting Verification
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {showManualCreditInTable && (
                          <tr className="border-t border-gray-200 bg-gray-50/70">
                            <td
                              colSpan={hasAnyPenalty ? 6 : 5}
                              className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm"
                            >
                              <span className="font-semibold text-gray-700">
                                Manual Credit Applied:
                              </span>{" "}
                              <span className="font-bold text-creative-midnight">
                                {"\u00A3"}
                                {manualCreditAmount.toFixed(2)}
                              </span>{" "}
                              <span className="text-gray-700">
                                (Credit From: {creditFromLabel})
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Pre-Departure Pack */}
            {booking.preDeparturePack && (
              <div
                className={`${sectionSurfaceClass} ${sectionEntryAnimationClass}`}
                style={{ animationDelay: "300ms" }}
              >
                <p className={sectionHeadingEyebrowClass}>Travel Essentials</p>
                <div>
                  <h2 className="text-lg sm:text-xl font-hk-grotesk font-bold text-gray-900 mb-4 sm:mb-5 flex items-center gap-2">
                    <Download className="h-4 w-4 sm:h-5 sm:w-5 text-crimson-red" />
                    Pre-Departure Pack
                  </h2>

                  <div className="bg-creative-midnight/5 border-2 border-creative-midnight/20 rounded-xl p-4 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="bg-creative-midnight/10 rounded-lg p-2 sm:p-3">
                        <Download className="h-5 w-5 sm:h-7 sm:w-7 text-crimson-red" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 break-words">
                          {booking.preDeparturePack.originalName}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 mb-3">
                          {formatFileSize(booking.preDeparturePack.size)} •{" "}
                          {booking.preDeparturePack.contentType}
                        </p>
                        <Button
                          onClick={() =>
                            window.open(
                              booking.preDeparturePack!.fileDownloadURL,
                              "_blank",
                            )
                          }
                          className="bg-creative-midnight hover:bg-creative-midnight/90 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 hover:shadow-md"
                        >
                          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                          Download Pack
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Payment Summary & Support */}
          <div className="space-y-5 lg:space-y-6 min-w-0 max-w-full">
            {/* Payment Overview */}
            {booking.paymentPlan && (
              <div
                className={`${sectionSurfaceClass} ${sectionEntryAnimationClass}`}
                style={{ animationDelay: "200ms" }}
              >
                <div>
                  <h2 className="text-lg sm:text-xl font-hk-grotesk font-bold text-gray-900 mb-4 sm:mb-5 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-crimson-red" />
                    Payment Summary
                  </h2>

                  <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-5">
                    <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border-l-4 border-gray-300 min-w-0 max-w-full overflow-hidden hover:shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Total Cost</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">
                        £{totalCost.toFixed(2)}
                      </p>
                      {booking.discountedTourCost && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Was: £{originalTourCost.toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div className="bg-green-50 rounded-xl p-3 sm:p-4 border-l-4 border-spring-green min-w-0 max-w-full overflow-hidden hover:shadow-sm">
                      <p className="text-xs text-gray-600 mb-1">Amount Paid</p>
                      <p className="text-xl sm:text-2xl font-bold text-spring-green">
                        £{paidAmount.toFixed(2)}
                      </p>
                      <p className="text-xs text-green-700 mt-0.5">
                        {paymentProgressValue}% Complete
                      </p>
                    </div>

                    <div className="bg-red-50 rounded-xl p-3 sm:p-4 border-l-4 border-crimson-red min-w-0 max-w-full overflow-hidden hover:shadow-sm">
                      <p className="text-xs text-gray-600 mb-1">Balance Due</p>
                      <p className="text-xl sm:text-2xl font-bold text-crimson-red">
                        £{remainingBalanceAmount.toFixed(2)}
                      </p>
                      {booking.paymentPlan && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          {booking.paymentPlan}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Need Assistance */}
            <div
              className={`${sectionSurfaceClass} ${sectionEntryAnimationClass}`}
              style={{ animationDelay: "240ms" }}
            >
              <h2 className="text-lg sm:text-xl font-hk-grotesk font-bold text-gray-900 mb-4 sm:mb-5">
                Need Assistance?
              </h2>

              <div className="space-y-3 sm:space-y-4">
                <a href={`mailto:${SUPPORT_EMAIL}`} className={supportActionCardClass}>
                  <div className={supportActionIconClass}>
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className={supportActionLabelClass}>Email</p>
                    <p className={`${supportActionValueClass} break-all`}>
                      {SUPPORT_EMAIL}
                    </p>
                  </div>
                </a>

                <a href={SUPPORT_PHONE_TEL} className={supportActionCardClass}>
                  <div className={supportActionIconClass}>
                    <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className={supportActionLabelClass}>Phone</p>
                    <p className={supportActionValueClass}>
                      {SUPPORT_PHONE_DISPLAY}
                    </p>
                  </div>
                </a>

                <a
                  href={CONTACT_US_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={supportActionCardClass}
                >
                  <div className={supportActionIconClass}>
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className={supportActionValueClass}>Contact Support</p>
                    <p className={supportActionLabelClass}>Send us a message</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 sm:mt-16 border-t border-gray-200 bg-white">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-[1.25fr_1fr_1fr_0.85fr]">
            <div>
              <Image
                src="/logos/Digital_Horizontal_Red.svg"
                alt="ImHereTravels"
                width={190}
                height={56}
                className="h-9 sm:h-11 w-auto"
              />
            </div>

            <div>
              <h4 className="text-crimson-red font-hk-grotesk font-bold text-xl mb-3 sm:mb-4">
                Help
              </h4>
              <ul className="space-y-2.5 text-lg text-gray-900 font-medium">
                {FOOTER_HELP_LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-md px-1 py-0.5 transition-colors hover:text-crimson-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-red/40 focus-visible:ring-offset-2"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-crimson-red font-hk-grotesk font-bold text-xl mb-3 sm:mb-4">
                Resources
              </h4>
              <ul className="space-y-2.5 text-lg text-gray-900 font-medium">
                {FOOTER_RESOURCE_LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-md px-1 py-0.5 transition-colors hover:text-crimson-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-red/40 focus-visible:ring-offset-2"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-crimson-red font-hk-grotesk font-bold text-xl mb-3 sm:mb-4">
                Connect
              </h4>
              <div className="flex items-center gap-2.5">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.label}
                    href={withUtmSource(social.href)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-crimson-red text-crimson-red transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[var(--entry-ease)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-red/40 focus-visible:ring-offset-2 hover:-translate-y-0.5 hover:bg-crimson-red hover:text-white motion-reduce:hover:translate-y-0"
                  >
                    <social.Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-creative-midnight">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-4 sm:py-5">
            <div className="grid grid-cols-1 items-center gap-3 text-center md:grid-cols-3 md:text-left">
              <p className="text-sm text-white/90">
                © {new Date().getFullYear()} I'm Here Travels. All rights reserved.
              </p>
              <div className="flex justify-center">
                <Image
                  src="/logos/Logo_Red_White.svg"
                  alt="ImHereTravels Symbol"
                  width={44}
                  height={44}
                  className="h-8 w-8 sm:h-9 sm:w-9"
                />
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-white/90 md:justify-end">
                <a
                  href="https://imheretravels.com/terms-and-conditions/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md px-1 py-0.5 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-creative-midnight"
                >
                  Terms & Conditions
                </a>
                <span aria-hidden="true">•</span>
                <a
                  href="https://imheretravels.com/privacy-policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md px-1 py-0.5 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-creative-midnight"
                >
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Pay Now Modal */}
      {booking && payNowInstallment && (
        <PayNowModal
          open={payNowModalOpen}
          onOpenChange={setPayNowModalOpen}
          bookingId={booking.bookingId}
          bookingDocumentId={booking.bookingDocumentId || bookingDocumentId}
          installmentTerm={payNowInstallment.id}
          amount={payNowInstallment.amount}
          currency="GBP"
          customerEmail={booking.emailAddress || email || ""}
          customerName={booking.fullName}
          tourPackageName={booking.tourPackageName}
          onStripeCheckout={handleStripeCheckoutFromModal}
          stripeProcessing={paymentProcessing !== null}
          onRevolutSubmitted={handleRevolutSubmitted}
        />
      )}
    </div>
  );
}




