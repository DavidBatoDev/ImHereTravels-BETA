"use client";

import React from "react";
import {
  Calendar,
  Route,
  Users,
  Bus,
  Plane,
  Hotel,
  Compass,
  Utensils,
  HeartHandshake,
  CheckCircle2,
  MapPin,
  Info,
  HelpCircle,
  Download,
  Camera,
  Luggage,
  ShieldCheck,
  Sun,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ICON_MAP: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  days:          { icon: Calendar,      label: "Days / Calendar" },
  route:         { icon: Route,         label: "Route" },
  people:        { icon: Users,         label: "People / Group" },
  transport:     { icon: Bus,           label: "Transport / Bus" },
  airport:       { icon: Plane,         label: "Airport / Flights" },
  accommodation: { icon: Hotel,         label: "Accommodation" },
  activities:    { icon: Compass,       label: "Activities" },
  meals:         { icon: Utensils,      label: "Meals" },
  team:          { icon: HeartHandshake,label: "Team / Guides" },
  plus:          { icon: CheckCircle2,  label: "Included / Check" },
  location:      { icon: MapPin,        label: "Location / Pin" },
  info:          { icon: Info,          label: "Info" },
  faq:           { icon: HelpCircle,    label: "FAQ / Help" },
  download:      { icon: Download,      label: "Download" },
  instagram:     { icon: Camera,        label: "Instagram / Camera" },
  luggage:       { icon: Luggage,       label: "Luggage / Packing" },
  shield:        { icon: ShieldCheck,   label: "Insurance / Safety" },
  sun:           { icon: Sun,           label: "Climate / Weather" },
  handshake:     { icon: HeartHandshake,label: "Community / Respect" },
};

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function IconPicker({ value, onChange, placeholder = "Pick icon" }: IconPickerProps) {
  const selected = ICON_MAP[value];
  const SelectedIcon = selected?.icon;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full border-2 border-border focus:border-crimson-red">
        <SelectValue placeholder={placeholder}>
          {selected && (
            <span className="flex items-center gap-2">
              <SelectedIcon className="h-4 w-4 text-crimson-red flex-shrink-0" />
              <span className="text-sm truncate">{selected.label}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(ICON_MAP).map(([key, { icon: Icon, label }]) => (
          <SelectItem key={key} value={key}>
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-crimson-red" />
              <span>{label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { ICON_MAP };
