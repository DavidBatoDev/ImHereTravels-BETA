import { useEffect } from "react";
import type { Firestore } from "firebase/firestore";
import { calculateDaysBetween } from "../../utils/bookingFlow";
import {
  buildStripePaymentDocSessionKey,
  isStaleReservationSessionKey,
} from "../../utils/sessionRestore";

type TourPackage = {
  id: string;
  status?: "active" | "inactive" | string;
  travelDates?: string[];
};

type UseReservationTourSelectionStateOptions = {
  db: Firestore;
  email: string;
  tourPackage: string;
  tourPackages: TourPackage[];
  isLoadingPackages: boolean;
  paymentDocId: string | null;
  tourDate: string;
  setPaymentDocId: (value: string | null) => void;
  replaceWithPaymentId: (docId: string | null) => void;
  setTourPackage: (value: string) => void;
  setTourDates: (value: string[]) => void;
  setTourDate: (value: string) => void;
};

export const useReservationTourSelectionState = ({
  db,
  email,
  tourPackage,
  tourPackages,
  isLoadingPackages,
  paymentDocId,
  tourDate,
  setPaymentDocId,
  replaceWithPaymentId,
  setTourPackage,
  setTourDates,
  setTourDate,
}: UseReservationTourSelectionStateOptions) => {
  useEffect(() => {
    try {
      if (!paymentDocId && email && tourPackage) {
        const key = buildStripePaymentDocSessionKey(email, tourPackage);
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
                try {
                  sessionStorage.removeItem(key);
                } catch {}
              }
            } catch (err) {
              console.warn(
                "Failed to validate payment doc, preserving session id:",
                err,
              );
              setPaymentDocId(id);
            }
          })();
        }
      }
    } catch {}

    const cleanupOldSessions = () => {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && isStaleReservationSessionKey({ key, email, tourPackage })) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    };

    cleanupOldSessions();

    if (isLoadingPackages) return;
    if (!tourPackage) return;

    const pkg = tourPackages.find((p) => p.id === tourPackage);
    if (!pkg || pkg.status === "inactive") {
      setTourPackage("");
      setTourDates([]);
      setTourDate("");
      return;
    }

    const nonPastTourDates = (pkg.travelDates ?? []).filter(
      (date) => calculateDaysBetween(date) >= 0,
    );

    setTourDates(nonPastTourDates);
    if (tourDate && !nonPastTourDates.includes(tourDate)) {
      setTourDate("");
    }
  }, [
    db,
    tourPackage,
    tourPackages,
    email,
    isLoadingPackages,
    paymentDocId,
    tourDate,
    setPaymentDocId,
    replaceWithPaymentId,
    setTourPackage,
    setTourDates,
    setTourDate,
  ]);
};

