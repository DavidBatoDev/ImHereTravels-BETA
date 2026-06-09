"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Returns true when the user is scrolling down (bars should hide).
 * Shows again on scroll-up or when near the top of the page.
 */
export function useScrollDirection(threshold = 8) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const curr = window.scrollY;
      if (curr < 60) {
        setHidden(false);
      } else if (curr > lastY.current + threshold) {
        setHidden(true);
      } else if (curr < lastY.current - threshold) {
        setHidden(false);
      }
      lastY.current = curr;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return hidden;
}
