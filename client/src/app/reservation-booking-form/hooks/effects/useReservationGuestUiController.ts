import { useCallback, useEffect } from "react";
import { updateGuestGroupSizeAction } from "../../actions/updateGuestGroupSizeAction";

type GuestDetail = {
  email: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  nationality: string;
  whatsAppNumber: string;
  whatsAppCountry: string;
};

type UseReservationGuestUiControllerOptions = {
  bookingType: string;
  setBookingType: (value: string) => void;
  groupSize: number;
  setGroupSize: (value: number | ((prev: number) => number)) => void;
  additionalGuests: string[];
  setAdditionalGuests: (
    value: string[] | ((prev: string[]) => string[]),
  ) => void;
  guestDetails: GuestDetail[];
  setGuestDetails: (
    value:
      | GuestDetail[]
      | ((prev: GuestDetail[]) => GuestDetail[]),
  ) => void;
  activeGuestTab: number;
  setActiveGuestTab: (value: number) => void;
  guestsMounted: boolean;
  setGuestsMounted: (value: boolean) => void;
  guestsWrapRef: React.RefObject<HTMLDivElement | null>;
  guestsContentRef: React.RefObject<HTMLDivElement | null>;
  setGuestsHeight: (value: string) => void;
  ANIM_DURATION: number;
};

export const useReservationGuestUiController = ({
  bookingType,
  setBookingType,
  groupSize,
  setGroupSize,
  additionalGuests,
  setAdditionalGuests,
  guestDetails,
  setGuestDetails,
  activeGuestTab,
  setActiveGuestTab,
  guestsMounted,
  setGuestsMounted,
  guestsWrapRef,
  guestsContentRef,
  setGuestsHeight,
  ANIM_DURATION,
}: UseReservationGuestUiControllerOptions) => {
  const animateHeight = useCallback(
    (from: number, to: number) => {
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
            { duration: ANIM_DURATION, easing: "cubic-bezier(.2,.8,.2,1)" },
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
    },
    [guestsWrapRef, setGuestsHeight, ANIM_DURATION],
  );

  useEffect(() => {
    if (bookingType === "Duo Booking" || bookingType === "Group Booking") {
      setGuestsMounted(true);
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
  }, [
    bookingType,
    guestsContentRef,
    setGuestsHeight,
    setGuestsMounted,
    ANIM_DURATION,
  ]);

  useEffect(() => {
    if (
      (bookingType === "Duo Booking" || bookingType === "Group Booking") &&
      additionalGuests.length > 0
    ) {
      if (!guestsMounted) {
        setGuestsMounted(true);
      }

      const calculateHeight = () => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            const contentHeight = guestsContentRef.current?.scrollHeight ?? 0;
            console.log(
              "ðŸ“ Calculating guest section height:",
              contentHeight,
              "guestsMounted:",
              guestsMounted,
            );
            if (contentHeight > 0) {
              setGuestsHeight(`${contentHeight}px`);
              console.log("âœ… Guest section height updated to:", contentHeight);
            } else {
              setTimeout(() => {
                const retryHeight = guestsContentRef.current?.scrollHeight ?? 0;
                console.log("ðŸ“ Retry calculating height:", retryHeight);
                if (retryHeight > 0) {
                  setGuestsHeight(`${retryHeight}px`);
                  console.log(
                    "âœ… Guest section height updated (retry) to:",
                    retryHeight,
                  );
                }
              }, 150);
            }
          }, 100);
        });
      };

      calculateHeight();
    }
  }, [
    bookingType,
    additionalGuests,
    guestsMounted,
    guestsContentRef,
    setGuestsMounted,
    setGuestsHeight,
  ]);

  const handleBookingTypeChange = useCallback(
    async (value: string) => {
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

      if (bookingType === "Group Booking" && value === "Duo Booking") {
        await animateToState(() => {
          setAdditionalGuests([additionalGuests[0] ?? ""]);
          setGroupSize(2);
          setBookingType("Duo Booking");
          setGuestDetails([
            {
              email: guestDetails[0]?.email || "",
              firstName: guestDetails[0]?.firstName || "",
              lastName: guestDetails[0]?.lastName || "",
              birthdate: guestDetails[0]?.birthdate || "",
              nationality: guestDetails[0]?.nationality || "",
              whatsAppNumber: guestDetails[0]?.whatsAppNumber || "",
              whatsAppCountry: guestDetails[0]?.whatsAppCountry || "GB",
            },
          ]);
          setActiveGuestTab(1);
        });
        return;
      }

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

      if (value === "Duo Booking") {
        await animateToState(() => {
          setGroupSize(2);
          setAdditionalGuests((prev) => [prev[0] ?? ""]);
          setBookingType("Duo Booking");
          setGuestDetails([
            {
              email: guestDetails[0]?.email || "",
              firstName: guestDetails[0]?.firstName || "",
              lastName: guestDetails[0]?.lastName || "",
              birthdate: guestDetails[0]?.birthdate || "",
              nationality: guestDetails[0]?.nationality || "",
              whatsAppNumber: guestDetails[0]?.whatsAppNumber || "",
              whatsAppCountry: guestDetails[0]?.whatsAppCountry || "GB",
            },
          ]);
          setActiveGuestTab(1);
        });
        return;
      }

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
          const newGuestDetails: GuestDetail[] = [];
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
          setActiveGuestTab(1);
        });
      }
    },
    [
      guestsMounted,
      setGuestsMounted,
      setGuestsHeight,
      guestsWrapRef,
      guestsContentRef,
      animateHeight,
      bookingType,
      additionalGuests,
      setAdditionalGuests,
      setGroupSize,
      setBookingType,
      setGuestDetails,
      guestDetails,
      setActiveGuestTab,
      groupSize,
    ],
  );

  const handleGroupSizeChange = useCallback(
    (val: number) => {
      const nextState = updateGuestGroupSizeAction({
        bookingType,
        requestedGroupSize: val,
        activeGuestTab,
        additionalGuests,
        guestDetails,
      });

      if (!nextState) return;

      setGroupSize(nextState.groupSize);
      setActiveGuestTab(nextState.activeGuestTab);
      setAdditionalGuests(nextState.additionalGuests);
      setGuestDetails(nextState.guestDetails);
    },
    [
      bookingType,
      activeGuestTab,
      additionalGuests,
      guestDetails,
      setGroupSize,
      setActiveGuestTab,
      setAdditionalGuests,
      setGuestDetails,
    ],
  );

  const handleGuestDetailsUpdate = useCallback(
    (index: number, data: GuestDetail) => {
      setGuestDetails((prev) => {
        const newGuests = [...prev];
        if (index >= 0 && index < newGuests.length) {
          newGuests[index] = data;
        }
        return newGuests;
      });
    },
    [setGuestDetails],
  );

  return {
    animateHeight,
    handleBookingTypeChange,
    handleGroupSizeChange,
    handleGuestDetailsUpdate,
  };
};

