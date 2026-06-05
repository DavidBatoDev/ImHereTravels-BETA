"use client";

import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import {
  X, Settings, Plus, AlertCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TourPackage } from "@/types/tours";
import TourDatePicker from "./TourDatePicker";

interface TourSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  form: UseFormReturn<any>;
  tour: TourPackage | null;
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-body font-bold text-dark-gray/60 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-body text-dark-gray mb-0.5">{children}</label>;
}

function TextInput({
  value, onChange, placeholder, type = "text",
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red/40"
    />
  );
}

function Divider() {
  return <hr className="border-light-grey" />;
}

function formatMeta(ts: any): string {
  if (!ts) return "—";
  try {
    const d = typeof ts.toDate === "function" ? ts.toDate()
      : ts.seconds ? new Date(ts.seconds * 1000)
      : new Date(ts);
    return isNaN(d.getTime()) ? "—"
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "—"; }
}

export default function TourSettingsPanel({ open, onClose, form, tour }: TourSettingsPanelProps) {
  const w = (n: string) => form.watch(n as any);
  const sv = (n: string, v: any) => form.setValue(n as any, v);
  const gv = (n: string) => form.getValues(n as any);

  const [destInput, setDestInput] = useState("");
  const destinations: string[] = w("destinations") ?? [];

  const { fields: dateFields, append: addDate, remove: rmDate } =
    useFieldArray({ control: form.control, name: "travelDates" });
  const { fields: reqFields, append: addReq, remove: rmReq } =
    useFieldArray({ control: form.control, name: "details.requirements" as any });

  function addDest(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && destInput.trim()) {
      e.preventDefault();
      const trimmed = destInput.trim().replace(/,$/, "");
      if (trimmed && !destinations.includes(trimmed)) {
        sv("destinations", [...destinations, trimmed]);
      }
      setDestInput("");
    }
  }

  const meta = tour?.metadata as any;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-light-grey bg-white shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-crimson-red" />
            <span className="font-sans font-bold text-midnight text-sm">Tour Settings</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full text-dark-gray hover:bg-light-grey hover:text-midnight transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">

            {/* ── Publish ── */}
            <section>
              <SectionHead>Publish</SectionHead>
              <div className="space-y-3">
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <Select value={w("status") ?? "draft"} onValueChange={v => sv("status", v)}>
                    <SelectTrigger className="h-9 text-sm border-border w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-sm font-body text-midnight">Coming Soon gate</span>
                  <Switch
                    checked={w("comingSoon") ?? false}
                    onCheckedChange={v => sv("comingSoon", v)}
                    className="data-[state=checked]:bg-vivid-orange"
                  />
                </div>
              </div>
            </section>

            <Divider />

            {/* ── Tour Identity ── */}
            <section>
              <SectionHead>Tour Identity</SectionHead>
              <div className="space-y-3">
                <div>
                  <FieldLabel>Destinations</FieldLabel>
                  {destinations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {destinations.map(d => (
                        <span
                          key={d}
                          className="inline-flex items-center gap-1 rounded-full bg-light-grey px-2.5 py-0.5 text-xs font-body text-midnight"
                        >
                          {d}
                          <button
                            type="button"
                            onClick={() => sv("destinations", destinations.filter(x => x !== d))}
                            className="text-dark-gray hover:text-crimson-red transition-colors leading-none"
                          >
                            <X className="size-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input
                    type="text"
                    value={destInput}
                    onChange={e => setDestInput(e.target.value)}
                    onKeyDown={addDest}
                    placeholder="Type city, press Enter to add"
                    className="w-full border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red/40"
                  />
                </div>
              </div>
            </section>

            <Divider />

            {/* ── Travel Dates ── */}
            <section>
              <SectionHead>Travel Dates</SectionHead>
              <div className="space-y-3">
                {(dateFields as any[]).map((field, i) => (
                  <div
                    key={field.id}
                    className={`rounded-[16px] border-2 p-4 ${
                      w(`travelDates.${i}.isAvailable`)
                        ? "border-crimson-red/30 bg-crimson-red/5"
                        : "border-border bg-light-grey/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-sans font-bold text-midnight text-sm flex items-center gap-2">
                        <span className="size-5 bg-crimson-red text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        Date {i + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/60 rounded border border-border">
                          <span className="text-xs">
                            {w(`travelDates.${i}.isAvailable`) ? "Active" : "Inactive"}
                          </span>
                          <Switch
                            checked={w(`travelDates.${i}.isAvailable`) ?? true}
                            onCheckedChange={v => sv(`travelDates.${i}.isAvailable`, v)}
                            className="scale-75 data-[state=checked]:bg-spring-green"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => rmDate(i)}
                          disabled={dateFields.length === 1}
                          className="text-crimson-red disabled:opacity-30"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <TourDatePicker
                          value={w(`travelDates.${i}.startDate`) || ""}
                          onChange={(iso) => {
                            sv(`travelDates.${i}.startDate`, iso);
                            const days = gv(`travelDates.${i}.tourDays`);
                            if (iso && days) {
                              const end = new Date(iso);
                              end.setDate(end.getDate() + Number(days) - 1);
                              sv(`travelDates.${i}.endDate`, end.toISOString().split("T")[0]);
                            }
                          }}
                          label="Start Date"
                          minYear={2000}
                          maxYear={2050}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-dark-gray mb-0.5">Days</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Days"
                          value={w(`travelDates.${i}.tourDays`) ?? ""}
                          onChange={e => {
                            sv(`travelDates.${i}.tourDays`, e.target.value === "" ? undefined : parseInt(e.target.value));
                            const s = gv(`travelDates.${i}.startDate`);
                            if (s && e.target.value) {
                              const end = new Date(s);
                              end.setDate(end.getDate() + parseInt(e.target.value) - 1);
                              sv(`travelDates.${i}.endDate`, end.toISOString().split("T")[0]);
                            }
                          }}
                          className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red/40"
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="w-full flex items-center justify-center rounded-md bg-light-grey/60 px-3 py-2 text-sm text-dark-gray">
                          {w(`travelDates.${i}.endDate`)
                            ? new Date(w(`travelDates.${i}.endDate`) + "T00:00:00")
                                .toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                            : "End date"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addDate({
                    startDate: "", endDate: "", isAvailable: true, hasCustomPricing: false,
                    customOriginal: undefined, customDiscounted: undefined, customDeposit: undefined,
                    hasCustomOriginal: false, hasCustomDiscounted: false, hasCustomDeposit: false,
                  })}
                  className="flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red"
                >
                  <Plus className="h-4 w-4" /> Add Date
                </button>
              </div>
            </section>

            <Divider />

            {/* ── Requirements ── */}
            <section>
              <SectionHead>Requirements</SectionHead>
              <div className="space-y-2">
                {(reqFields as any[]).map((field, i) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-vivid-orange flex-shrink-0" />
                    <input
                      type="text"
                      value={w(`details.requirements.${i}`) ?? ""}
                      onChange={e => sv(`details.requirements.${i}`, e.target.value)}
                      placeholder={`Requirement ${i + 1}`}
                      className="flex-1 border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red/40"
                    />
                    <button
                      type="button"
                      onClick={() => rmReq(i)}
                      disabled={reqFields.length === 1}
                      className="text-crimson-red disabled:opacity-30"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => (addReq as any)("")}
                  className="flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red"
                >
                  <Plus className="h-4 w-4" /> Add requirement
                </button>
              </div>
            </section>

            <Divider />

            {/* ── SEO & URLs ── */}
            <section>
              <SectionHead>SEO & URLs</SectionHead>
              <div className="space-y-3">
                {([
                  ["Tour Code", "tourCode", "text", "e.g. ARW"],
                  ["URL Slug", "slug", "text", "argentina-wonders"],
                  ["Direct URL", "url", "url", "https://…"],
                  ["SEO Title", "seo.title", "text", "Page title for search engines"],
                  ["SEO Description", "seo.description", "text", "Meta description"],
                  ["Booking Slug Override", "bookingSlug", "text", "Overrides slug in reservation URLs"],
                ] as [string, string, string, string][]).map(([label, key, type, placeholder]) => (
                  <div key={key}>
                    <FieldLabel>{label}</FieldLabel>
                    <TextInput
                      value={w(key) ?? ""}
                      onChange={v => sv(key, v)}
                      placeholder={placeholder}
                      type={type}
                    />
                  </div>
                ))}
              </div>
            </section>

            <Divider />

            {/* ── Links ── */}
            <section>
              <SectionHead>Links</SectionHead>
              <div className="space-y-3">
                {([
                  ["Brochure", "brochureLink"],
                  ["Pre-Departure Pack", "preDeparturePack"],
                ] as [string, string][]).map(([label, key]) => (
                  <div key={key}>
                    <FieldLabel>{label}</FieldLabel>
                    <TextInput
                      value={w(key) ?? ""}
                      onChange={v => sv(key, v)}
                      placeholder="https://…"
                      type="url"
                    />
                  </div>
                ))}
              </div>
            </section>

            <Divider />

            {/* ── Map ── */}
            <section>
              <SectionHead>Map</SectionHead>
              <div className="space-y-3">
                <div>
                  <FieldLabel>Map Image URL</FieldLabel>
                  <TextInput
                    value={w("details.map.image") ?? ""}
                    onChange={v => sv("details.map.image", v)}
                    placeholder="https://…"
                    type="url"
                  />
                </div>
                <div>
                  <FieldLabel>Google Maps Embed URL</FieldLabel>
                  <TextInput
                    value={w("details.map.embedUrl") ?? ""}
                    onChange={v => sv("details.map.embedUrl", v)}
                    placeholder="https://www.google.com/maps/embed?…"
                    type="url"
                  />
                </div>
              </div>
            </section>

            <Divider />

            {/* ── Metadata ── */}
            <section className="pb-4">
              <SectionHead>Metadata</SectionHead>
              <dl className="space-y-2">
                {([
                  ["Created", formatMeta(meta?.createdAt)],
                  ["Updated", formatMeta(meta?.updatedAt)],
                  ["Created By", meta?.createdBy ?? "—"],
                  ["Bookings", meta?.bookingsCount != null ? String(meta.bookingsCount) : "—"],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <dt className="text-xs font-body text-dark-gray shrink-0">{label}</dt>
                    <dd className="text-xs font-body text-midnight truncate text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

          </div>
        </div>
      </div>
    </>
  );
}
