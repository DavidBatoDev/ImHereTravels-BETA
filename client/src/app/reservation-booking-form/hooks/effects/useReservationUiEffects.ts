import { useEffect } from "react";

type UseReservationUiEffectsOptions = {
  tourPackage: string;
  showTourModal: boolean;
  setDateMounted: (value: boolean) => void;
  setDateVisible: (value: boolean) => void;
  setTourDate: (value: string) => void;
  setErrors: (
    update: { [k: string]: string } | ((prev: { [k: string]: string }) => { [k: string]: string }),
  ) => void;
};

export const useReservationUiEffects = ({
  tourPackage,
  showTourModal,
  setDateMounted,
  setDateVisible,
  setTourDate,
  setErrors,
}: UseReservationUiEffectsOptions) => {
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
  }, [tourPackage, setDateMounted, setDateVisible, setTourDate, setErrors]);

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
};
