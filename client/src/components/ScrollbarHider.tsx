"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ScrollbarHider() {
  const pathname = usePathname();

  useEffect(() => {
    const isReservationPage = pathname?.includes("/reservation-booking-form");

    if (isReservationPage) {
      document.documentElement.classList.add("scrollbar-hide");
      document.body.classList.add("scrollbar-hide");
    } else {
      document.documentElement.classList.remove("scrollbar-hide");
      document.body.classList.remove("scrollbar-hide");
    }

    return () => {
      document.documentElement.classList.remove("scrollbar-hide");
      document.body.classList.remove("scrollbar-hide");
    };
  }, [pathname]);

  return null;
}
