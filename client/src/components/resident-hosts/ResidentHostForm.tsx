"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Save, ArrowLeft, Plus, X, Settings, Image as ImageIcon, Camera,
  Link2, Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { generateSlug } from "@/utils";

import { ResidentHost, ResidentHostFormData } from "@/types/resident-hosts";
import ImagePickerModal from "@/components/shared/ImagePickerModal";
import ResidentHostSettingsPanel, { HostPickerField } from "./ResidentHostSettingsPanel";
import GallerySlidesEditor from "./GallerySlidesEditor";

// ─── Helpers ────────────────────────────────────────────────────────────────

const WWW_BASE = "https://www.imheretravels.com";
const resolveImg = (url: string | null | undefined): string => {
  if (!url) return "";
  if (url.startsWith("blob:") || url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${WWW_BASE}${url}`;
  return url;
};

// ─── Schema ───────────────────────────────────────────────────────────────────
// zodResolver strips keys not declared here, so every field that must persist is
// listed explicitly (same discipline as TourForm).

const tripSchema = z.object({
  name: z.string(),
  dates: z.string(),
  tourSlug: z.string().optional(),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  duration: z.string().optional(),
  description: z.string().optional(),
  price: z.string().optional(),
  priceNote: z.string().optional(),
  comingSoon: z.boolean().optional(),
});

const galleryItemSchema = z.object({
  seq: z.number(),
  type: z.enum(["photo", "video", "placeholder"]),
  size: z.enum(["tall", "short"]),
  src: z.string().optional(),
  alt: z.string().optional(),
  objectPosition: z.string().optional(),
});

const schema = z.object({
  slug: z.string().min(1),
  displayName: z.string().min(1),
  pageTitle: z.string().min(1),
  status: z.enum(["active", "draft", "archived"]),
  comingSoon: z.boolean().default(false),
  instagram: z.string().optional().or(z.literal("")),
  heroImage: z.string().nullable().optional(),
  heroImageAlt: z.string(),
  heroImages: z.array(z.string()).optional(),
  profileImage: z.string().optional().or(z.literal("")),
  seo: z.object({ title: z.string().optional(), description: z.string().optional() }).optional(),
  intro: z.array(z.string()),
  upcomingTrips: z.array(tripSchema),
  whyTravel: z.array(z.string()),
  whyTravelNotes: z.array(z.string()).optional(),
  howItWorks: z.array(z.string()),
  gallerySlides: z.array(z.array(z.array(galleryItemSchema))).optional(),
  galleryImages: z.array(z.object({ src: z.string(), alt: z.string() })).optional(),
  attachedTourIds: z.array(z.string()),
});

// ─── Inline editing primitives (local state + debounce, focus-aware sync) ──────

function LiveInput({
  value, onChange, placeholder, className = "",
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current !== document.activeElement) setLocal(value); }, [value]);
  return (
    <input
      ref={ref}
      type="text"
      value={local}
      onChange={(e) => {
        const v = e.target.value;
        setLocal(v);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => onChange(v), 300);
      }}
      onBlur={(e) => { clearTimeout(timer.current); onChange(e.target.value); }}
      placeholder={placeholder}
      className={className}
    />
  );
}

function LiveTextarea({
  value, onChange, placeholder, className = "", rows = 2,
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; rows?: number }) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (ref.current !== document.activeElement) setLocal(value); }, [value]);
  return (
    <textarea
      ref={ref}
      value={local}
      onChange={(e) => {
        const v = e.target.value;
        setLocal(v);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => onChange(v), 300);
      }}
      onBlur={(e) => { clearTimeout(timer.current); onChange(e.target.value); }}
      placeholder={placeholder}
      rows={rows}
      className={className}
    />
  );
}

const baseInput =
  "w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red/40";

// ─── Reusable string-list editor ──────────────────────────────────────────────

function StringListEditor({
  form, name, placeholder, addLabel, multiline = false,
}: {
  form: UseFormReturn<any>;
  name: string;
  placeholder: string;
  addLabel: string;
  multiline?: boolean;
}) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: name as any });
  const w = (n: string) => form.watch(n as any);
  const sv = (n: string, v: any) => form.setValue(n as any, v);

  return (
    <div className="space-y-2">
      {fields.map((field, i) => (
        <div key={field.id} className="flex items-start gap-2">
          <span className="mt-2 grid size-6 shrink-0 place-items-center rounded-full bg-light-grey text-[11px] font-bold text-dark-gray">
            {i + 1}
          </span>
          {multiline ? (
            <LiveTextarea
              value={w(`${name}.${i}`) ?? ""}
              onChange={(v) => sv(`${name}.${i}`, v)}
              placeholder={placeholder}
              className={baseInput + " resize-y"}
              rows={2}
            />
          ) : (
            <LiveInput
              value={w(`${name}.${i}`) ?? ""}
              onChange={(v) => sv(`${name}.${i}`, v)}
              placeholder={placeholder}
              className={baseInput}
            />
          )}
          <button
            type="button"
            onClick={() => remove(i)}
            className="mt-1.5 grid size-7 shrink-0 place-items-center rounded-lg text-dark-gray transition-colors hover:bg-crimson-red/10 hover:text-crimson-red"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => (append as any)("")}
        className="flex items-center gap-1 text-sm font-medium text-crimson-red hover:text-light-red"
      >
        <Plus className="h-4 w-4" /> {addLabel}
      </button>
    </div>
  );
}

// ─── Section heading ───────────────────────────────────────────────────────────

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-sans text-lg font-bold text-midnight">{children}</h2>
      {hint && <p className="mt-0.5 text-xs text-dark-gray/70">{hint}</p>}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ResidentHostFormProps {
  onClose: () => void;
  onSubmit: (data: ResidentHostFormData) => Promise<void | string>;
  host?: ResidentHost | null;
  isLoading?: boolean;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ResidentHostForm({ onClose, onSubmit, host, isLoading = false }: ResidentHostFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  // Image picker (hero / profile / split-hero panels / trip cards)
  const [picker, setPicker] = useState<{ field: HostPickerField | `trip-${number}`; initialUrl?: string } | null>(null);

  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: "", displayName: "", pageTitle: "", status: "draft", comingSoon: false,
      instagram: "", heroImage: null, heroImageAlt: "", heroImages: [], profileImage: "",
      seo: { title: "", description: "" },
      intro: [""], upcomingTrips: [], whyTravel: [""], whyTravelNotes: [], howItWorks: [
        "Choose your host & trip",
        "Secure your spot with a deposit",
        "Pay in installments up to 4 times",
        "Travel and meet your community",
      ],
      gallerySlides: [], galleryImages: [], attachedTourIds: [],
    },
  });

  const w = (n: string) => form.watch(n as any);
  const sv = (n: string, v: any) => form.setValue(n as any, v);
  const gv = (n: string) => form.getValues(n as any);

  const displayName = w("displayName") as string;

  const { fields: tripFields, append: addTrip, remove: rmTrip } =
    useFieldArray({ control: form.control, name: "upcomingTrips" });

  // Auto-slug while creating
  useEffect(() => {
    if (displayName && !host) sv("slug", generateSlug(displayName));
  }, [displayName, host]);

  // Populate from existing host
  useEffect(() => {
    if (host) {
      form.reset({
        slug: host.slug || "",
        displayName: host.displayName || "",
        pageTitle: host.pageTitle || "",
        status: host.status || "draft",
        comingSoon: host.comingSoon ?? false,
        instagram: host.instagram ?? "",
        heroImage: host.heroImage ?? null,
        heroImageAlt: host.heroImageAlt ?? "",
        heroImages: host.heroImages ?? [],
        profileImage: host.profileImage ?? "",
        seo: host.seo ?? { title: "", description: "" },
        intro: host.intro?.length ? host.intro : [""],
        upcomingTrips: host.upcomingTrips ?? [],
        whyTravel: host.whyTravel?.length ? host.whyTravel : [""],
        whyTravelNotes: host.whyTravelNotes ?? [],
        howItWorks: host.howItWorks?.length ? host.howItWorks : [""],
        gallerySlides: host.gallerySlides ?? [],
        galleryImages: host.galleryImages ?? [],
        attachedTourIds: host.attachedTourIds ?? [],
      });
      setEditorKey((k) => k + 1);
    }
  }, [host, form]);

  // ── Picker confirm ──────────────────────────────────────────────────────────
  const handlePickerConfirm = (urls: string[]) => {
    if (!picker || !urls[0]) { setPicker(null); return; }
    const { field } = picker;
    if (field === "hero") {
      sv("heroImage", urls[0]);
    } else if (field === "profile") {
      sv("profileImage", urls[0]);
    } else if (field.startsWith("heroPanel-")) {
      const i = Number(field.replace("heroPanel-", ""));
      const next = [...((gv("heroImages") as string[]) ?? [])];
      while (next.length < 3) next.push("");
      next[i] = urls[0];
      sv("heroImages", next);
    } else if (field.startsWith("trip-")) {
      const i = Number(field.replace("trip-", ""));
      sv(`upcomingTrips.${i}.image`, urls[0]);
    }
    setPicker(null);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Tri-panel hero only applies when exactly 3 images are set; drop blanks.
      const cleanedHeroImages = ((data.heroImages as string[]) ?? []).filter(Boolean);
      const payload = { ...data, heroImages: cleanedHeroImages };

      await onSubmit(payload);
      toast({
        title: host ? "Saved" : "Created",
        description: host ? "Resident host updated successfully." : "New resident host created.",
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save resident host.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickerAspect =
    picker?.field === "hero" ? 16 / 9
    : picker?.field === "profile" ? 1
    : picker?.field.startsWith("heroPanel-") ? 3 / 4
    : 4 / 3; // trip

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div key={editorKey} className="min-h-screen bg-light-grey">
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-crimson-red border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Toolbar */}
      <div className="sticky top-16 z-30 bg-white border-b border-light-grey shadow-xsmall">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 font-body text-sm text-dark-gray hover:text-midnight transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resident Hosts
          </button>

          <div className="flex items-center gap-3">
            <Select value={w("status")} onValueChange={(v) => sv("status", v)}>
              <SelectTrigger className="h-8 text-xs border-border w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5 text-xs text-dark-gray">
              <Switch
                checked={w("comingSoon") ?? false}
                onCheckedChange={(v) => sv("comingSoon", v)}
                className="scale-75 data-[state=checked]:bg-vivid-orange"
              />
              <span>Coming Soon</span>
            </div>

            <button
              type="button"
              onClick={() => setPanelOpen((p) => !p)}
              className={`flex items-center gap-1.5 h-9 px-4 rounded-full border font-body text-sm transition-colors ${panelOpen ? "border-crimson-red bg-crimson-red/5 text-crimson-red" : "border-border text-midnight hover:bg-light-grey"}`}
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={form.handleSubmit(handleSubmit, (errs) => {
                console.error("Form validation errors:", errs);
                toast({ title: "Validation error", description: "Check required fields (name, page title, slug) and try again.", variant: "destructive" });
              })}
              className="h-9 bg-crimson-red hover:bg-light-red text-white rounded-full px-5 font-body font-bold text-sm shadow-small"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {isSubmitting ? "Saving…" : host ? "Save Changes" : "Create Host"}
            </Button>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit, (errs) => console.error("Form validation errors:", errs))}>
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">

            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 font-body text-sm text-dark-gray">
              <span>Home</span><span>/</span><span>Resident Hosts</span><span>/</span>
              <span className="text-midnight font-bold truncate max-w-xs">{displayName || "New Host"}</span>
            </nav>

            {/* Identity */}
            <div className="rounded-2xl bg-white p-5 md:p-8 shadow-xsmall">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="size-20 shrink-0 overflow-hidden rounded-full bg-light-grey ring-2 ring-light-grey">
                  {w("profileImage") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveImg(w("profileImage"))} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPicker({ field: "profile" })}
                      className="flex h-full w-full items-center justify-center text-dark-gray/40 hover:bg-light-grey/70"
                    >
                      <Camera className="h-6 w-6" />
                    </button>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <LiveInput
                    value={w("displayName") ?? ""}
                    onChange={(v) => sv("displayName", v)}
                    placeholder="Display name (e.g. Dev)"
                    className="w-full bg-transparent font-display text-3xl font-bold text-midnight outline-none placeholder:text-dark-gray/30"
                  />
                  <LiveInput
                    value={w("pageTitle") ?? ""}
                    onChange={(v) => sv("pageTitle", v)}
                    placeholder="Page title (e.g. Travel with Dev)"
                    className="w-full bg-transparent font-sans text-base text-dark-gray outline-none placeholder:text-dark-gray/30"
                  />
                  <p className="text-xs text-dark-gray/60">
                    Slug: <span className="font-medium text-dark-gray">/{w("slug") || "—"}</span>
                    {"  ·  Hero, profile & SEO live in Settings."}
                  </p>
                </div>
              </div>
            </div>

            {/* Intro */}
            <div className="rounded-2xl bg-white p-5 md:p-8 shadow-xsmall">
              <SectionTitle hint="Bio paragraphs shown below the hero.">Intro</SectionTitle>
              <StringListEditor form={form} name="intro" placeholder="Write an intro paragraph…" addLabel="Add paragraph" multiline />
            </div>

            {/* Upcoming Trips */}
            <div className="rounded-2xl bg-white p-5 md:p-8 shadow-xsmall">
              <SectionTitle hint="Static cards for the 'Upcoming Trips' section. Link a card to a tour page with a Tour Slug.">
                Upcoming Trips
              </SectionTitle>
              <div className="space-y-4">
                {tripFields.map((field, i) => (
                  <div key={field.id} className="rounded-2xl border border-light-grey p-4 shadow-xsmall">
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="group/trip relative aspect-[4/3] w-40 shrink-0 overflow-hidden rounded-xl bg-light-grey">
                        {w(`upcomingTrips.${i}.image`) ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={resolveImg(w(`upcomingTrips.${i}.image`))} alt="" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/0 opacity-0 transition-all group-hover/trip:bg-black/30 group-hover/trip:opacity-100">
                              <button type="button" onClick={() => setPicker({ field: `trip-${i}`, initialUrl: resolveImg(w(`upcomingTrips.${i}.image`)) || undefined })}
                                className="grid size-8 place-items-center rounded-full bg-white text-midnight shadow-small hover:text-crimson-red">
                                <Camera className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => sv(`upcomingTrips.${i}.image`, "")}
                                className="grid size-8 place-items-center rounded-full bg-crimson-red text-white shadow-small">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <button type="button" onClick={() => setPicker({ field: `trip-${i}` })}
                            className="flex h-full w-full flex-col items-center justify-center gap-1 text-dark-gray/40 hover:bg-light-grey/70">
                            <ImageIcon className="h-5 w-5" />
                            <span className="text-[10px]">Add image</span>
                          </button>
                        )}
                      </div>

                      {/* Fields */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <LiveInput value={w(`upcomingTrips.${i}.name`) ?? ""} onChange={(v) => sv(`upcomingTrips.${i}.name`, v)} placeholder="Trip name" className={baseInput + " font-semibold"} />
                          <button type="button" onClick={() => rmTrip(i)} className="grid size-8 shrink-0 place-items-center rounded-lg text-dark-gray hover:bg-crimson-red/10 hover:text-crimson-red">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <Calendar className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-dark-gray/50" />
                            <LiveInput value={w(`upcomingTrips.${i}.dates`) ?? ""} onChange={(v) => sv(`upcomingTrips.${i}.dates`, v)} placeholder="Dates (e.g. March 19, 2027)" className={baseInput + " pl-8"} />
                          </div>
                          <LiveInput value={w(`upcomingTrips.${i}.duration`) ?? ""} onChange={(v) => sv(`upcomingTrips.${i}.duration`, v)} placeholder="Duration (e.g. 11 Days)" className={baseInput} />
                        </div>
                        <LiveTextarea value={w(`upcomingTrips.${i}.description`) ?? ""} onChange={(v) => sv(`upcomingTrips.${i}.description`, v)} placeholder="Short description" className={baseInput + " resize-y"} rows={2} />
                        <div className="grid grid-cols-2 gap-2">
                          <LiveInput value={w(`upcomingTrips.${i}.price`) ?? ""} onChange={(v) => sv(`upcomingTrips.${i}.price`, v)} placeholder="Price (e.g. GBP £1,299)" className={baseInput} />
                          <LiveInput value={w(`upcomingTrips.${i}.priceNote`) ?? ""} onChange={(v) => sv(`upcomingTrips.${i}.priceNote`, v)} placeholder="Price note (optional)" className={baseInput} />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Link2 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-dark-gray/50" />
                            <LiveInput value={w(`upcomingTrips.${i}.tourSlug`) ?? ""} onChange={(v) => sv(`upcomingTrips.${i}.tourSlug`, v)} placeholder="Tour slug to link (optional)" className={baseInput + " pl-8"} />
                          </div>
                          <label className="flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-midnight">
                            <Switch
                              checked={w(`upcomingTrips.${i}.comingSoon`) ?? false}
                              onCheckedChange={(v) => sv(`upcomingTrips.${i}.comingSoon`, v)}
                              className="scale-75 data-[state=checked]:bg-vivid-orange"
                            />
                            Coming Soon
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => (addTrip as any)({ name: "", dates: "TBA", tourSlug: "", image: "", imageAlt: "", duration: "", description: "", price: "", priceNote: "", comingSoon: false })}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-crimson-red/40 py-3 text-sm font-semibold text-crimson-red transition-colors hover:border-crimson-red hover:bg-crimson-red/5"
                >
                  <Plus className="h-4 w-4" /> Add Trip
                </button>
              </div>
            </div>

            {/* Why Travel */}
            <div className="rounded-2xl bg-white p-5 md:p-8 shadow-xsmall">
              <SectionTitle hint="Bullet points for the 'Why Travel With Us' section.">Why Travel With Us</SectionTitle>
              <StringListEditor form={form} name="whyTravel" placeholder="Reason to travel…" addLabel="Add reason" />
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-dark-gray/70">Notes (optional, parallel to the points above)</p>
                <StringListEditor form={form} name="whyTravelNotes" placeholder="Supporting note…" addLabel="Add note" multiline />
              </div>
            </div>

            {/* How It Works */}
            <div className="rounded-2xl bg-white p-5 md:p-8 shadow-xsmall">
              <SectionTitle hint="Numbered steps shown in the 'How It Works' section.">How It Works</SectionTitle>
              <StringListEditor form={form} name="howItWorks" placeholder="Step…" addLabel="Add step" />
            </div>

            {/* Gallery */}
            <div className="rounded-2xl bg-white p-5 md:p-8 shadow-xsmall">
              <SectionTitle hint="Masonry 'Real Moments' gallery — each slide is one grid of up to 4 columns.">Gallery</SectionTitle>
              <GallerySlidesEditor form={form} storageFolder={w("slug") ? `images/resident-hosts/${w("slug")}` : "images/resident-hosts"} />
            </div>

          </div>
        </form>

        <ResidentHostSettingsPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          form={form}
          host={host ?? null}
          onPickImage={(field, initialUrl) => setPicker({ field, initialUrl })}
        />
      </Form>

      {picker && (
        <ImagePickerModal
          open
          onClose={() => setPicker(null)}
          onConfirm={handlePickerConfirm}
          storageFolder={w("slug") ? `images/resident-hosts/${w("slug")}` : "images/resident-hosts"}
          aspectRatio={pickerAspect}
          initialImageUrl={picker.initialUrl}
          title={
            picker.field === "hero" ? "Select Hero Image"
            : picker.field === "profile" ? "Select Profile Image"
            : picker.field.startsWith("heroPanel-") ? "Select Split-Hero Image"
            : "Select Trip Image"
          }
        />
      )}
    </div>
  );
}
