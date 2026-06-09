"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const ALL_SECTIONS = [
  { id: "section-gallery", label: "Gallery" },
  { id: "section-description", label: "Description" },
  { id: "section-key-facts", label: "Key Facts" },
  { id: "section-inclusions", label: "What's Included" },
  { id: "section-highlights", label: "Trip Highlights" },
  { id: "section-map", label: "Map" },
  { id: "section-itinerary", label: "Itinerary" },
  { id: "section-accommodations", label: "Where We Stay" },
  { id: "section-faqs", label: "FAQs" },
  { id: "section-things-to-know", label: "Things to Know" },
  { id: "section-tips", label: "Tips" },
  { id: "section-reviews", label: "Reviews" },
];

interface TourOutlinePanelProps {
  hasMap?: boolean;
}

export default function TourOutlinePanel({ hasMap = false }: TourOutlinePanelProps) {
  const [activeSection, setActiveSection] = useState<string>("section-gallery");
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sections = ALL_SECTIONS.filter((s) => s.id !== "section-map" || hasMap);

  useEffect(() => {
    const sectionIds = sections.map((s) => s.id);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost section that is intersecting
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: "-10% 0px -70% 0px",
        threshold: 0,
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  // Re-run when hasMap changes (Map section appears/disappears)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMap]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="sticky top-[120px] flex flex-col gap-0.5 pt-2">
      <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        Contents
      </p>
      {sections.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => scrollTo(id)}
          className={cn(
            "text-left px-3 py-1.5 rounded-md transition-colors text-xs border-l-2",
            activeSection === id
              ? "border-crimson-red text-foreground font-semibold bg-muted"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
