"use client";

import React from "react";
import { MapPin, Calendar, Route, Compass, Info, HelpCircle } from "lucide-react";

// Rotating palette matching www TourHeader tags
const TAG_PALETTES = [
  "bg-spring-green/20 text-spring-green border border-spring-green/30",
  "bg-vivid-orange/20 text-vivid-orange border border-vivid-orange/30",
  "bg-sunglow-yellow/20 text-midnight border border-sunglow-yellow/30",
  "bg-royal-purple/20 text-royal-purple border border-royal-purple/30",
] as const;

const SMALL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  location: MapPin,
  days: Calendar,
  route: Route,
  activities: Compass,
  info: Info,
  faq: HelpCircle,
};

interface TagChipProps {
  label: string;
  icon?: string;
  index?: number;
}

export default function TagChip({ label, icon = "location", index = 0 }: TagChipProps) {
  const palette = TAG_PALETTES[index % TAG_PALETTES.length];
  const Icon = SMALL_ICONS[icon] ?? MapPin;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-b4-desktop font-bold ${palette}`}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      {label}
    </span>
  );
}
