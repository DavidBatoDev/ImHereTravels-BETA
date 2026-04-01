import { useRef, useState } from "react";

export type ReservationUiStateSlice = {
  sessionLoading: boolean;
  setSessionLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isCreatingPayment: boolean;
  setIsCreatingPayment: React.Dispatch<React.SetStateAction<boolean>>;
  step2Processing: boolean;
  setStep2Processing: React.Dispatch<React.SetStateAction<boolean>>;
  showTourModal: boolean;
  setShowTourModal: React.Dispatch<React.SetStateAction<boolean>>;
  highlightsExpanded: boolean;
  setHighlightsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  carouselIndex: number;
  setCarouselIndex: React.Dispatch<React.SetStateAction<number>>;
  isCarouselPaused: boolean;
  setIsCarouselPaused: React.Dispatch<React.SetStateAction<boolean>>;
  dateMounted: boolean;
  setDateMounted: React.Dispatch<React.SetStateAction<boolean>>;
  dateVisible: boolean;
  setDateVisible: React.Dispatch<React.SetStateAction<boolean>>;
  guestsWrapRef: React.RefObject<HTMLDivElement | null>;
  guestsContentRef: React.RefObject<HTMLDivElement | null>;
  guestsMounted: boolean;
  setGuestsMounted: React.Dispatch<React.SetStateAction<boolean>>;
  guestsHeight: string;
  setGuestsHeight: React.Dispatch<React.SetStateAction<string>>;
  clearing: boolean;
  setClearing: React.Dispatch<React.SetStateAction<boolean>>;
  howItWorksExpanded: boolean;
  setHowItWorksExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  sessionRestoredRef: React.MutableRefObject<boolean>;
  ANIM_DURATION: number;
};

export const useReservationUiState = (): ReservationUiStateSlice => {
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [step2Processing, setStep2Processing] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [highlightsExpanded, setHighlightsExpanded] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [dateMounted, setDateMounted] = useState(false);
  const [dateVisible, setDateVisible] = useState(false);
  const guestsWrapRef = useRef<HTMLDivElement | null>(null);
  const guestsContentRef = useRef<HTMLDivElement | null>(null);
  const [guestsMounted, setGuestsMounted] = useState(false);
  const [guestsHeight, setGuestsHeight] = useState("0px");
  const [clearing, setClearing] = useState(false);
  const [howItWorksExpanded, setHowItWorksExpanded] = useState(true);
  const sessionRestoredRef = useRef(false);

  return {
    sessionLoading,
    setSessionLoading,
    isCreatingPayment,
    setIsCreatingPayment,
    step2Processing,
    setStep2Processing,
    showTourModal,
    setShowTourModal,
    highlightsExpanded,
    setHighlightsExpanded,
    carouselIndex,
    setCarouselIndex,
    isCarouselPaused,
    setIsCarouselPaused,
    dateMounted,
    setDateMounted,
    dateVisible,
    setDateVisible,
    guestsWrapRef,
    guestsContentRef,
    guestsMounted,
    setGuestsMounted,
    guestsHeight,
    setGuestsHeight,
    clearing,
    setClearing,
    howItWorksExpanded,
    setHowItWorksExpanded,
    sessionRestoredRef,
    ANIM_DURATION: 300,
  };
};

