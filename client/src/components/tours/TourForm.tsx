"use client";

/**
 * TourPageEditor — WYSIWYG inline editor that renders the tour page exactly as
 * it appears on www (layout, typography, booking card, section order) with all
 * content fields editable in place, WordPress-style.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Save, ArrowLeft, Plus, X, Minus, Upload, Image as ImageIcon,
  Route, MapPin, Calendar, Clock, Hotel, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Copy, AlertCircle, Globe, Settings, ExternalLink, Plane,
  CheckCircle2, Utensils, Bus, Compass, HeartHandshake, Info,
  HelpCircle, Download, Camera, Luggage, ShieldCheck, Sun, Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

import { TourPackage, TourFormDataWithStringDates } from "@/types/tours";
import {
  createBlobUrl, revokeBlobUrl, cleanupBlobUrls,
  uploadAllBlobsToStorage, validateImageFile,
} from "@/utils/blob-image";
import { generateSlug } from "@/utils";
import { updateTourMedia, cleanupRemovedGalleryImages } from "@/services/tours-service";
import TourDatePicker from "./TourDatePicker";

// ─── Zod helpers ──────────────────────────────────────────────────────────────

const toOptionalNumber = (v: unknown): number | undefined => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const optNum = z.preprocess(toOptionalNumber, z.number().optional());

// Local paths like "/tours/slug/image.webp" are valid static assets on www but
// can't load in the admin app. Resolve them against the www base URL.
const WWW_BASE = "https://www.imheretravels.com";
const resolveImg = (url: string | null | undefined): string => {
  if (!url) return "";
  if (url.startsWith("blob:") || url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${WWW_BASE}${url}`;
  return url;
};

const toDateValue = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "object" && "_seconds" in (v as any)) return new Date((v as any)._seconds * 1000);
  if (typeof v === "object" && "toDate" in (v as any)) { const d = (v as any).toDate(); return isNaN(d.getTime()) ? null : d; }
  const d = new Date(v as any);
  return isNaN(d.getTime()) ? null : d;
};
const toIso = (v: unknown) => { const d = toDateValue(v); return d ? d.toISOString().split("T")[0] : ""; };

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  url: z.string().url().optional().or(z.literal("")),
  tourCode: z.string().min(1),
  description: z.string().min(1),
  location: z.string().min(1),
  locationOther: z.string().optional().or(z.literal("") as any),
  duration: z.string().min(1),
  cardHeaderTitle: z.string().min(1),
  cardSubHeader: z.string().min(1),
  status: z.enum(["active", "draft", "archived"]),
  comingSoon: z.boolean().default(false),
  bookingSlug: z.string().optional().or(z.literal("")),
  seo: z.object({ title: z.string().optional(), description: z.string().optional() }).optional(),
  stripePaymentLink: z.string().url().optional().or(z.literal("")),
  depositNote: z.string().optional().or(z.literal("")),
  footnote: z.string().optional().or(z.literal("")),
  brochureLink: z.string().url().optional().or(z.literal("")),
  preDeparturePack: z.string().url().optional().or(z.literal("")),
  pricing: z.object({
    original: z.preprocess(toOptionalNumber, z.number().min(0.01)),
    discounted: optNum,
    deposit: z.preprocess(toOptionalNumber, z.number().min(0.01)),
    currency: z.enum(["USD", "EUR", "GBP"]),
  }),
  travelDates: z.array(z.object({
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    tourDays: optNum,
    isAvailable: z.boolean(),
    hasCustomPricing: z.boolean().optional(),
    customOriginal: optNum,
    customDiscounted: optNum,
    customDeposit: optNum,
    hasCustomOriginal: z.boolean().optional(),
    hasCustomDiscounted: z.boolean().optional(),
    hasCustomDeposit: z.boolean().optional(),
  })).min(1),
  details: z.object({
    highlights: z.array(z.object({
      text: z.string(),
      image: z.string().optional(),
      subtitle: z.string().optional(),
    })),
    itinerary: z.array(z.object({
      day: z.number(),
      title: z.string(),
      description: z.string(),
      image: z.string().optional(),
      accommodation: z.string().optional(),
      activities: z.string().optional(),
      meals: z.string().optional(),
      details: z.array(z.object({ icon: z.string(), label: z.string(), value: z.string() })).optional(),
    })),
    requirements: z.array(z.string()),
    route: z.string().optional().or(z.literal("")),
    tags: z.array(z.object({ label: z.string(), icon: z.string() })).optional(),
    inclusions: z.array(z.object({ icon: z.string().optional(), label: z.string(), value: z.string() })).optional(),
    accommodations: z.array(z.object({ image: z.string(), name: z.string(), nights: z.string() })).optional(),
    faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    thingsToKnow: z.array(z.object({ icon: z.string().optional(), title: z.string(), description: z.string(), ctaLabel: z.string(), ctaHref: z.string() })).optional(),
    tips: z.array(z.object({ icon: z.string().optional(), title: z.string(), description: z.string() })).optional(),
    map: z.object({ image: z.string().optional(), embedUrl: z.string().optional() }).optional(),
  }),
});

// ─── Icon map (matches www's Icon.tsx) ───────────────────────────────────────

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number | string }>> = {
  days: Calendar, route: Route, people: Users, transport: Bus, airport: Plane,
  accommodation: Hotel, activities: Compass, meals: Utensils, team: HeartHandshake,
  plus: CheckCircle2, location: MapPin, info: Info, faq: HelpCircle, download: Download,
  instagram: Camera, luggage: Luggage, shield: ShieldCheck, sun: Sun, handshake: HeartHandshake,
};

// Tag palette — solid bg colours matching www TourHeader exactly
const TAG_PALETTE = [
  "bg-spring-green text-midnight",
  "bg-vivid-orange text-midnight",
  "bg-sunglow-yellow text-midnight",
  "bg-light-purple text-midnight",
];

const CURRENCY_SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£" };
const PRESET_LOCATIONS = [
  "Philippines","Maldives","Sri Lanka","Argentina","Brazil","Vietnam",
  "India","Tanzania","New Zealand","Ecuador","Galapagos","Amazon","Andes","Coast","Other",
];
const ALL_ICONS = Object.keys(ICON_COMPONENTS);


// ─── Inline editing primitives ────────────────────────────────────────────────

/** Input that shrinks/grows to exactly its content width.
 *  A hidden sibling <span> with the same text drives the layout width;
 *  the real <input> is absolutely positioned on top of it. */
function AutoSizeInput({
  value, onChange, placeholder, className = "",
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return (
    <span className="relative inline-flex min-w-[2ch]">
      {/* Invisible sizer — same font + text as the input */}
      <span className={`invisible whitespace-pre pointer-events-none select-none px-1 ${className}`} aria-hidden>
        {local || placeholder || " "}
      </span>
      <input
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
        className={`absolute inset-0 w-full bg-transparent border-none outline-none
          hover:ring-2 hover:ring-crimson-red/20 focus:ring-2 focus:ring-crimson-red/40
          transition-shadow placeholder:text-dark-gray/30 rounded-sm px-1 ${className}`}
      />
    </span>
  );
}

/** An input that looks like the rendered content. Local state gives instant display;
 *  debounced onChange batches RHF updates to at most once per 300 ms burst. */
function InlineInput({
  value, onChange, placeholder, className = "",
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return (
    <input
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
      className={`bg-transparent border-none outline-none w-full px-1 -mx-1 rounded-sm
        hover:ring-2 hover:ring-crimson-red/20 focus:ring-2 focus:ring-crimson-red/40 transition-shadow
        placeholder:text-dark-gray/30 ${className}`}
    />
  );
}

/** Auto-growing textarea. Same local-state + debounce pattern as InlineInput. */
function InlineTextarea({
  value, onChange, placeholder, className = "",
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) { ref.current.style.height = "auto"; ref.current.style.height = ref.current.scrollHeight + "px"; }
  }, [local]);
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
      rows={1}
      className={`bg-transparent border-none outline-none resize-none w-full px-1 -mx-1 rounded-sm
        hover:ring-2 hover:ring-crimson-red/20 focus:ring-2 focus:ring-crimson-red/40 transition-shadow
        placeholder:text-dark-gray/30 ${className}`}
    />
  );
}

/**
 * Renders `- item` lines as visual bullet points when idle; switches to a raw
 * textarea on click so the user can edit the `- ` prefix syntax directly.
 */
function InlineBulletTextarea({
  value, onChange, placeholder, className = "",
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [editing]);

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={local}
        onChange={(e) => {
          const v = e.target.value;
          setLocal(v);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => onChange(v), 300);
          if (ref.current) { ref.current.style.height = "auto"; ref.current.style.height = ref.current.scrollHeight + "px"; }
        }}
        onBlur={() => { clearTimeout(timer.current); onChange(local); setEditing(false); }}
        rows={1}
        placeholder={placeholder}
        className={`bg-transparent border-none outline-none resize-none w-full px-1 -mx-1 rounded-sm
          ring-2 ring-crimson-red/40 transition-shadow placeholder:text-dark-gray/30 ${className}`}
      />
    );
  }

  const lines = local ? local.split("\n").filter(Boolean) : [];
  if (!lines.length) {
    return (
      <p onClick={() => setEditing(true)}
        className={`cursor-text px-1 -mx-1 rounded-sm text-dark-gray/30 hover:ring-2 hover:ring-crimson-red/20 transition-shadow ${className}`}>
        {placeholder}
      </p>
    );
  }

  return (
    <div onClick={() => setEditing(true)}
      className={`cursor-text px-1 -mx-1 rounded-sm hover:ring-2 hover:ring-crimson-red/20 transition-shadow ${className}`}>
      {lines.map((line, i) => {
        const isBullet = line.trimStart().startsWith("- ");
        const text = isBullet ? line.trimStart().slice(2) : line;
        return isBullet ? (
          <ul key={i} className="list-disc pl-4 marker:text-dark-gray"><li>{text}</li></ul>
        ) : (
          <p key={i}>{text}</p>
        );
      })}
    </div>
  );
}

/** "Edit me" wrapper — shows a dashed outline on hover to indicate editability */
function EditZone({ children, label, className = "" }: { children: React.ReactNode; label?: string; className?: string }) {
  return (
    <div className={`relative group/zone ${className}`}>
      {label && (
        <span className="absolute -top-5 left-0 text-[10px] font-body font-bold text-crimson-red uppercase tracking-widest opacity-0 group-hover/zone:opacity-100 transition-opacity pointer-events-none select-none">
          {label}
        </span>
      )}
      <div className="rounded-sm group-hover/zone:ring-2 group-hover/zone:ring-crimson-red/20 transition-shadow">
        {children}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TourFormProps {
  onClose: () => void;
  onSubmit: (data: TourFormDataWithStringDates) => Promise<void | string>;
  tour?: TourPackage | null;
  isLoading?: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TourForm({ onClose, onSubmit, tour, isLoading = false }: TourFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedCover, setUploadedCover] = useState<string | null>(null);
  const [uploadedGallery, setUploadedGallery] = useState<string[]>([]);
  const [coverBlob, setCoverBlob] = useState<File | null>(null);
  const [galleryBlobs, setGalleryBlobs] = useState<File[]>([]);
  const [originalGallery, setOriginalGallery] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0]));
  const [expandedFaqs, setExpandedFaqs] = useState<Set<number>>(new Set());
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  // Incremented when a tour loads so all InlineInput/InlineTextarea instances remount
  // with fresh initial values (replaces the removed useEffect sync in each primitive).
  const [editorKey, setEditorKey] = useState(0);

  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", slug: "", url: "", tourCode: "", description: "",
      location: "", locationOther: "", duration: "1 days", cardHeaderTitle: "11 Day Tour", cardSubHeader: "Destination", status: "draft",
      comingSoon: false, bookingSlug: "", seo: { title: "", description: "" },
      stripePaymentLink: "", depositNote: "", footnote: "",
      brochureLink: "", preDeparturePack: "",
      pricing: { original: undefined, discounted: undefined, deposit: undefined, currency: "GBP" },
      travelDates: [{ startDate: "", endDate: "", isAvailable: true, hasCustomPricing: false,
        customOriginal: undefined, customDiscounted: undefined, customDeposit: undefined,
        hasCustomOriginal: false, hasCustomDiscounted: false, hasCustomDeposit: false }],
      details: {
        highlights: [{ text: "", image: undefined, subtitle: undefined }],
        itinerary: [{ day: 1, title: "", description: "", image: undefined, accommodation: undefined, activities: undefined, meals: undefined, details: [] }],
        requirements: [""],
        route: "", keyFacts: [], tags: [], inclusions: [], accommodations: [], faqs: [],
        thingsToKnow: [], tips: [], map: { image: "", embedUrl: "" },
      },
    },
  });

  const w = form.watch;
  const sv = (n: string, v: any) => form.setValue(n as any, v);
  const gv = (n: string) => form.getValues(n as any);

  // Field arrays
  const { fields: tagFields, append: addTag, remove: rmTag } = useFieldArray({ control: form.control, name: "details.tags" });
  const { fields: inclFields, append: addIncl, remove: rmIncl } = useFieldArray({ control: form.control, name: "details.inclusions" });
  const { fields: hlFields, append: addHl, remove: rmHl } = useFieldArray({ control: form.control, name: "details.highlights" as any });
  const { fields: iterFields, append: addIter, remove: rmIter } = useFieldArray({ control: form.control, name: "details.itinerary" });
  const { fields: accomFields, append: addAccom, remove: rmAccom } = useFieldArray({ control: form.control, name: "details.accommodations" });
  const { fields: faqFields, append: addFaq, remove: rmFaq } = useFieldArray({ control: form.control, name: "details.faqs" });
  const { fields: ttkFields, append: addTtk, remove: rmTtk } = useFieldArray({ control: form.control, name: "details.thingsToKnow" });
  const { fields: tipFields, append: addTip, remove: rmTip } = useFieldArray({ control: form.control, name: "details.tips" });
  const { fields: reqFields, append: addReq, remove: rmReq } = useFieldArray({ control: form.control, name: "details.requirements" as any });
  const { fields: dateFields, append: addDate, remove: rmDate } = useFieldArray({ control: form.control, name: "travelDates" });
  const { fields: kfFields, append: addKf, remove: rmKf } = useFieldArray({ control: form.control, name: "details.keyFacts" as any });

  // Watched values — only fields used for conditional rendering, computed values, or structural display
  const name = w("name") as string;          // toolbar display + slug auto-gen
  const duration = w("duration") as string;  // durationLabel computed value
  const cardHeaderTitle = w("cardHeaderTitle") as string;
  const cardSubHeader = w("cardSubHeader") as string;
  const pricing = w("pricing");              // booking card live preview
  const tags = w("details.tags") as Array<{ label: string; icon: string }> | undefined;
  const inclusions = w("details.inclusions") as any[] | undefined;
  const highlights = w("details.highlights") as any[] | undefined;
  const itinerary = w("details.itinerary") as any[] | undefined;
  const accoms = w("details.accommodations") as any[] | undefined;
  const faqs = w("details.faqs") as any[] | undefined;
  const ttks = w("details.thingsToKnow") as any[] | undefined;
  const tips = w("details.tips") as any[] | undefined;
  const route = w("details.route") as string; // booking card sidebar display
  const kfData = w("details.keyFacts") as Array<{ icon: string; label: string; values: string[] }> | undefined;
  const mapData = w("details.map") as any;   // conditional render of map section
  const status = w("status") as string;      // conditional section rendering

  // Memoised computed values — only recalculate when their inputs change
  const sym = useMemo(() => CURRENCY_SYM[pricing?.currency ?? "GBP"] ?? "£", [pricing?.currency]);
  const displayPrice = useMemo(() => pricing?.discounted
    ? `${sym}${Number(pricing.discounted).toLocaleString()}`
    : pricing?.original
    ? `${sym}${Number(pricing.original).toLocaleString()}`
    : `${sym}—`, [pricing, sym]);
  const depositAmt = useMemo(() => pricing?.deposit ? `${sym}${Number(pricing.deposit).toLocaleString()}` : null, [pricing, sym]);
  const durationLabel = useMemo(() => duration
    ? duration.replace(/\b(\d+)\s+days?\b/gi, "$1 Day Tour")
    : "", [duration]);

  // Auto-slug
  useEffect(() => { if (name && !tour) sv("slug", generateSlug(name)); }, [name]);

  // Populate from existing tour
  useEffect(() => {
    if (tour) {
      const travelDates = tour.travelDates?.map((td) => {
        const s = toIso(td.startDate), e = toIso(td.endDate);
        let days = td.tourDays;
        if (!days && s && e) days = Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1;
        return { startDate: s, endDate: e, tourDays: days, isAvailable: td.isAvailable,
          hasCustomPricing: !!(td.customOriginal ?? td.customDiscounted ?? td.customDeposit),
          customOriginal: td.customOriginal, customDiscounted: td.customDiscounted, customDeposit: td.customDeposit,
          hasCustomOriginal: td.hasCustomOriginal ?? td.customOriginal !== undefined,
          hasCustomDiscounted: td.hasCustomDiscounted ?? td.customDiscounted !== undefined,
          hasCustomDeposit: td.hasCustomDeposit ?? td.customDeposit !== undefined };
      }) ?? [{ startDate: "", endDate: "", isAvailable: true, hasCustomPricing: false,
               customOriginal: undefined, customDiscounted: undefined, customDeposit: undefined,
               hasCustomOriginal: false, hasCustomDiscounted: false, hasCustomDeposit: false }];

      const highlights = (tour.details?.highlights?.filter(Boolean) ?? [{ text: "", image: undefined, subtitle: undefined }]).map((h: any) =>
        typeof h === "string" ? { text: h, image: undefined, subtitle: undefined }
          : { text: h.text ?? "", image: h.image, subtitle: h.subtitle });

      const itinerary = (tour.details?.itinerary?.filter(Boolean) ?? [{ day: 1, title: "", description: "" }]).map((d: any) => ({
        day: d.day, title: d.title ?? "", description: d.description ?? "",
        image: d.image, accommodation: d.accommodation, activities: d.activities, meals: d.meals,
        details: d.details ?? [] }));

      const d = tour.details as any;
      form.reset({
        name: tour.name || "", slug: tour.slug || "", url: tour.url ?? "",
        tourCode: tour.tourCode || "", description: tour.description || "",
        location: PRESET_LOCATIONS.includes(tour.location ?? "") ? tour.location : tour.location ? "Other" : "",
        locationOther: PRESET_LOCATIONS.includes(tour.location ?? "") ? "" : (tour.location ?? ""),
        duration: tour.duration || "1 days", cardHeaderTitle: (tour as any).cardHeaderTitle ?? "", cardSubHeader: (tour as any).cardSubHeader ?? "", status: tour.status || "draft",
        comingSoon: (tour as any).comingSoon ?? false, bookingSlug: (tour as any).bookingSlug ?? "",
        seo: (tour as any).seo ?? { title: "", description: "" },
        stripePaymentLink: tour.stripePaymentLink ?? "", depositNote: (tour as any).depositNote ?? "",
        footnote: (tour as any).footnote ?? "", brochureLink: tour.brochureLink ?? "",
        preDeparturePack: tour.preDeparturePack ?? "",
        pricing: tour.pricing ? {
          original: tour.pricing.original ?? undefined, discounted: tour.pricing.discounted ?? undefined,
          deposit: tour.pricing.deposit ?? undefined, currency: tour.pricing.currency || "GBP",
        } : { original: undefined, discounted: undefined, deposit: undefined, currency: "GBP" },
        travelDates,
        details: {
          highlights, itinerary,
          requirements: tour.details?.requirements?.filter(Boolean) ?? [""],
          route: d?.route ?? "", keyFacts: d?.keyFacts ?? [], tags: d?.tags ?? [], inclusions: d?.inclusions ?? [],
          accommodations: d?.accommodations ?? [], faqs: d?.faqs ?? [],
          thingsToKnow: d?.thingsToKnow ?? [], tips: d?.tips ?? [],
          map: d?.map ?? { image: "", embedUrl: "" },
        },
      });
      setUploadedCover(tour.media?.coverImage || null);
      setUploadedGallery(tour.media?.gallery || []);
      setOriginalGallery(tour.media?.gallery || []);
      setCoverBlob(null); setGalleryBlobs([]);
      setEditorKey(k => k + 1); // remount all InlineInput/InlineTextarea with fresh values
    }
  }, [tour, form]);

  // ── Media handlers ──────────────────────────────────────────────────────────
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const v = validateImageFile(file);
    if (!v.valid) { toast({ title: "Invalid file", description: v.error, variant: "destructive" }); return; }
    setCoverBlob(file); setUploadedCover(createBlobUrl(file));
  };
  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter((f) => validateImageFile(f).valid);
    setGalleryBlobs((p) => [...p, ...valid]);
    setUploadedGallery((p) => [...p, ...valid.map(createBlobUrl)]);
  };
  const rmGallery = (i: number) => {
    if (uploadedGallery[i]?.startsWith("blob:")) revokeBlobUrl(uploadedGallery[i]);
    setUploadedGallery((p) => p.filter((_, j) => j !== i));
    setGalleryBlobs((p) => p.filter((_, j) => j !== i));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (tour) {
        await onSubmit(data);
        // Upload new media
        if (coverBlob || galleryBlobs.length > 0) {
          const r = await uploadAllBlobsToStorage(coverBlob, galleryBlobs, tour.id);
          const mu: any = {};
          if (r.coverResult?.success) mu.coverImage = r.coverResult.url;
          const urls = r.galleryResults?.filter((x) => x.success).map((x) => x.url!) ?? [];
          if (urls.length) {
            const existing = uploadedGallery.filter((u) => !u.startsWith("blob:"));
            mu.gallery = [...existing, ...urls];
            await cleanupRemovedGalleryImages(originalGallery, mu.gallery);
          }
          if (Object.keys(mu).length) await updateTourMedia(tour.id, mu);
        }
        toast({ title: "Saved", description: "Tour updated successfully." });
      } else {
        const id = await onSubmit(data);
        const tourId = typeof id === "string" ? id : "";
        if (tourId && (coverBlob || galleryBlobs.length > 0)) {
          const r = await uploadAllBlobsToStorage(coverBlob, galleryBlobs, tourId);
          const mu: any = {};
          if (r.coverResult?.success) mu.coverImage = r.coverResult.url;
          const urls = r.galleryResults?.filter((x) => x.success).map((x) => x.url!) ?? [];
          if (urls.length) mu.gallery = urls;
          if (Object.keys(mu).length) await updateTourMedia(tourId, mu);
        }
        toast({ title: "Created", description: "New tour package created." });
      }
      cleanupBlobUrls([...uploadedGallery, ...(uploadedCover ? [uploadedCover] : [])]);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save tour.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div key={editorKey} className="min-h-screen bg-light-grey">
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-crimson-red border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Editor toolbar ─────────────────────────────────────────────────── */}
      {/* DashboardLayout has a sticky h-16 navbar on both mobile and desktop — sit just below it */}
      <div className="sticky top-16 z-30 bg-white border-b border-light-grey shadow-xsmall">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 font-body text-b4-desktop text-dark-gray hover:text-midnight transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tours
          </button>

          <div className="flex items-center gap-3">
            {/* Status badge */}
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

            {/* Coming soon toggle */}
            <div className="flex items-center gap-1.5 text-xs text-dark-gray">
              <Switch
                checked={w("comingSoon") ?? false}
                onCheckedChange={(v) => sv("comingSoon", v)}
                className="scale-75 data-[state=checked]:bg-vivid-orange"
              />
              <span>Coming Soon</span>
            </div>

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={form.handleSubmit(handleSubmit)}
              className="h-9 bg-crimson-red hover:bg-light-red text-white rounded-full px-5 font-body font-bold text-sm shadow-small"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {isSubmitting ? "Saving…" : tour ? "Save Changes" : "Create Tour"}
            </Button>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          {/* ── Page container (matches www max-w-7xl) ────────────────────── */}
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col">

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 font-body text-b4-desktop text-dark-gray mb-4">
              <span>Home</span><span>/</span><span>Tours</span><span>/</span>
              <span className="text-midnight font-bold truncate max-w-xs">{name || "New Tour"}</span>
            </nav>

            {/* H1 — editable tour name */}
            <EditZone label="Tour Name" className="mb-4">
              <InlineInput
                value={name}
                onChange={(v) => sv("name", v)}
                placeholder="Tour Name"
                className="font-display text-h1-mobile md:text-h1-desktop font-bold text-midnight"
              />
            </EditZone>

            {/* ── Two-column grid ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">

              {/* ─── LEFT COLUMN ─────────────────────────────────────────── */}
              <div className="min-w-0">

                {/* Gallery — outside main card, same as www */}
                {(() => {
                  const galleryImages = uploadedGallery.filter(Boolean) as string[];
                  const activeImg = galleryImages[activeGalleryIndex] ?? uploadedCover;
                  return (
                    <>
                      <div className="relative aspect-[4/3] md:aspect-video w-full overflow-hidden rounded-lg bg-light-grey group/hero">
                        {activeImg ? (
                          <img src={resolveImg(activeImg)} alt="Hero" className="w-full h-full object-cover" />
                        ) : (
                          <label htmlFor="cover-upload" className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-light-grey/80 transition-colors">
                            <ImageIcon className="h-10 w-10 text-dark-gray/40 mb-2" />
                            <span className="font-body text-b4-desktop text-dark-gray">Click to upload hero image</span>
                          </label>
                        )}
                        {uploadedCover && (
                          <div className="absolute inset-0 bg-black/0 group-hover/hero:bg-black/30 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover/hero:opacity-100 transition-opacity flex gap-2">
                              <label htmlFor="cover-upload" className="flex items-center gap-2 bg-white text-midnight rounded-full px-4 py-2 text-sm font-body font-bold cursor-pointer shadow-small hover:shadow-medium">
                                <Upload className="h-4 w-4" /> Change Hero
                              </label>
                              <button type="button" onClick={() => { if (uploadedCover?.startsWith("blob:")) revokeBlobUrl(uploadedCover); setUploadedCover(null); setCoverBlob(null); setActiveGalleryIndex(0); }}
                                className="flex items-center gap-1 bg-crimson-red text-white rounded-full px-3 py-2 text-sm font-body cursor-pointer shadow-small">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                        {galleryImages.length > 0 && (
                          <>
                            <button type="button" onClick={() => setActiveGalleryIndex(idx => (idx - 1 + galleryImages.length) % galleryImages.length)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/90 shadow-small flex items-center justify-center hover:bg-white transition-colors">
                              <ChevronLeft className="h-5 w-5 text-midnight" />
                            </button>
                            <button type="button" onClick={() => setActiveGalleryIndex(idx => (idx + 1) % galleryImages.length)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/90 shadow-small flex items-center justify-center hover:bg-white transition-colors">
                              <ChevronRight className="h-5 w-5 text-midnight" />
                            </button>
                          </>
                        )}
                        <input type="file" id="cover-upload" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                      </div>
                      <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide">
                        {galleryImages.map((img, idx) => (
                          <div key={idx} className="relative group/thumb flex-shrink-0 w-[calc((100%-2.5rem)/6)]">
                            <button type="button" onClick={() => setActiveGalleryIndex(idx)}
                              className={`block aspect-[4/3] w-full rounded-md overflow-hidden transition-opacity ${idx === activeGalleryIndex ? "opacity-100 ring-2 ring-crimson-red" : "opacity-60 hover:opacity-80"}`}>
                              <img src={resolveImg(img)} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                            <button type="button" onClick={() => { rmGallery(idx); if (activeGalleryIndex >= galleryImages.length - 1) setActiveGalleryIndex(Math.max(0, galleryImages.length - 2)); }}
                              className="absolute top-0.5 right-0.5 opacity-0 group-hover/thumb:opacity-100 bg-crimson-red text-white rounded-full w-4 h-4 flex items-center justify-center">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                        <label htmlFor="gallery-upload"
                          className="flex-shrink-0 w-[calc((100%-2.5rem)/6)] aspect-[4/3] rounded-md border-2 border-dashed border-dark-gray/20 flex items-center justify-center cursor-pointer hover:border-crimson-red/40 hover:bg-crimson-red/5 transition-colors">
                          <Plus className="h-5 w-5 text-dark-gray/40" />
                        </label>
                        <input type="file" id="gallery-upload" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
                      </div>
                    </>
                  );
                })()}

                {/* ── ONE main card: all content sections ──────────────────── */}
                <div className="mt-6 rounded-lg bg-white px-5 py-8 md:px-10 md:py-10">

                  {/* Tour Header: duration | name — single row, font shrinks with text length */}
                  {(() => {
                    const combined = `${durationLabel || "11 Days"} | ${name || "Tour Name"}`;
                    const len = combined.length;
                    const sz = len <= 20 ? "text-h3-mobile md:text-h3-desktop"
                      : len <= 32 ? "text-h4-mobile md:text-h4-desktop"
                      : len <= 50 ? "text-h5-mobile md:text-h5-desktop"
                      : "text-h6-mobile md:text-h6-desktop";
                    return (
                      <EditZone label="Header">
                        <div className="flex items-baseline gap-x-1">
                          <AutoSizeInput value={duration} onChange={(v) => sv("duration", v)} placeholder="11 Days"
                            className={`font-sans ${sz} font-bold text-midnight`} />
                          <span className={`font-sans ${sz} font-bold text-midnight select-none`}> | </span>
                          <AutoSizeInput value={name} onChange={(v) => sv("name", v)} placeholder="Tour Name"
                            className={`font-sans ${sz} font-bold text-midnight`} />
                        </div>
                      </EditZone>
                    );
                  })()}

                  {/* Tags */}
                  <div className="mt-6 flex flex-wrap gap-2 items-center">
                    {(tagFields as any[]).map((field, i) => {
                      const tag = tags?.[i];
                      const TagIcon = ICON_COMPONENTS[tag?.icon ?? "location"] ?? MapPin;
                      return (
                        <span key={field.id} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-body text-b4-desktop ${TAG_PALETTE[i % 4]} group/tag`}>
                          <TagIcon className="size-3.5 shrink-0" />
                          <AutoSizeInput value={tag?.label ?? ""} onChange={(v) => sv(`details.tags.${i}.label`, v)} placeholder="Tag" className="font-body text-b4-desktop" />
                          <button type="button" onClick={() => rmTag(i)} className="opacity-0 group-hover/tag:opacity-100 transition-opacity"><X className="size-3" /></button>
                        </span>
                      );
                    })}
                    <button type="button" onClick={() => (addTag as any)({ label: "", icon: "location" })}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-dark-gray/30 px-3 py-1.5 font-body text-b4-desktop text-dark-gray/60 hover:border-crimson-red/40 hover:text-crimson-red transition-colors">
                      <Plus className="size-3.5" /> Tag
                    </button>
                  </div>

                  {/* Description */}
                  <EditZone label="Description" className="mt-6 max-w-3xl">
                    <InlineTextarea value={gv("description") ?? ""} onChange={(v) => sv("description", v)}
                      placeholder="Describe the tour experience…" className="font-body text-b2-mobile md:text-b2-desktop text-dark-gray" />
                  </EditZone>

                  {/* Key Facts */}
                  <section className="mt-8 md:mt-10 w-full">
                    <ul className="flex flex-col gap-6">
                      {(kfFields as any[]).map((field, i) => {
                        const kf = kfData?.[i];
                        const KfIcon = ICON_COMPONENTS[kf?.icon ?? "days"] ?? Calendar;
                        return (
                          <li key={field.id} className="flex items-start gap-4 group/kf">
                            <Select value={kf?.icon ?? "days"} onValueChange={(v) => sv(`details.keyFacts.${i}.icon`, v)}>
                              <SelectTrigger className="flex size-12 shrink-0 items-center justify-center rounded-full bg-light-grey border-0 p-0 [&>svg:last-child]:hidden hover:ring-2 hover:ring-crimson-red/20 transition-shadow">
                                <KfIcon className="size-5 text-midnight" strokeWidth={2.75} />
                              </SelectTrigger>
                              <SelectContent>{ALL_ICONS.map((k) => { const IC = ICON_COMPONENTS[k]; return <SelectItem key={k} value={k}><span className="flex items-center gap-2"><IC className="h-4 w-4" />{k}</span></SelectItem>; })}</SelectContent>
                            </Select>
                            <div className="flex-1 min-w-0">
                              <InlineInput value={kf?.label ?? ""} onChange={(v) => sv(`details.keyFacts.${i}.label`, v)}
                                placeholder="Label" className="font-sans text-b2-mobile md:text-b2-desktop !font-bold text-midnight" />
                              <InlineTextarea
                                value={(kf?.values ?? []).join("\n")}
                                onChange={(v) => sv(`details.keyFacts.${i}.values`, v.split("\n").filter(Boolean))}
                                placeholder="Value (one per line)"
                                className="mt-1 font-body text-b2-mobile md:text-b2-desktop text-dark-gray" />
                            </div>
                            <button type="button" onClick={() => rmKf(i)}
                              className="opacity-0 group-hover/kf:opacity-100 transition-opacity text-crimson-red mt-1 shrink-0">
                              <X className="h-4 w-4" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <button type="button" onClick={() => (addKf as any)({ icon: "days", label: "", values: [""] })}
                      className="mt-6 flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red">
                      <Plus className="h-4 w-4" /> Add key fact
                    </button>
                  </section>

                  {/* What's Included */}
                  <section className="mt-10 md:mt-14 w-full">
                    <h2 className="font-sans text-h3-mobile md:text-h3-desktop text-midnight">What's Included</h2>
                    <ul className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                      {(inclFields as any[]).map((field, i) => {
                        const incl = inclusions?.[i];
                        const IncIcon = ICON_COMPONENTS[incl?.icon ?? "plus"] ?? CheckCircle2;
                        const rawValue: string = Array.isArray(incl?.value) ? incl.value.join("\n") : (incl?.value ?? "");
                        return (
                          <li key={field.id} className="flex items-start gap-4 group/incl">
                            <Select value={incl?.icon ?? "plus"} onValueChange={(v) => sv(`details.inclusions.${i}.icon`, v)}>
                              <SelectTrigger className="flex size-12 shrink-0 items-center justify-center rounded-full bg-light-grey text-midnight border-0 p-0 [&>svg:last-child]:hidden hover:ring-2 hover:ring-crimson-red/20 transition-shadow">
                                <IncIcon className="size-5" />
                              </SelectTrigger>
                              <SelectContent>{ALL_ICONS.map((k) => { const IC = ICON_COMPONENTS[k]; return <SelectItem key={k} value={k}><span className="flex items-center gap-2"><IC className="h-4 w-4" />{k}</span></SelectItem>; })}</SelectContent>
                            </Select>
                            <div className="flex-1 min-w-0">
                              <InlineInput value={incl?.label ?? ""} onChange={(v) => sv(`details.inclusions.${i}.label`, v)} placeholder="Label" className="font-sans text-b2-desktop font-bold text-midnight" />
                              <InlineBulletTextarea value={rawValue} onChange={(v) => sv(`details.inclusions.${i}.value`, v)} placeholder="Detail (use - for bullets)" className="mt-1 font-body text-b4-mobile md:text-b4-desktop text-dark-gray" />
                            </div>
                            <button type="button" onClick={() => rmIncl(i)} className="opacity-0 group-hover/incl:opacity-100 transition-opacity text-crimson-red mt-1 shrink-0"><X className="h-4 w-4" /></button>
                          </li>
                        );
                      })}
                    </ul>
                    <button type="button" onClick={() => (addIncl as any)({ icon: "plus", label: "", value: "" })}
                      className="mt-6 flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red">
                      <Plus className="h-4 w-4" /> Add inclusion
                    </button>
                  </section>

                  {/* Trip Highlights */}
                  <section className="mt-10 md:mt-14 w-full">
                    <h2 className="font-sans text-h3-mobile md:text-h3-desktop text-midnight">Trip Highlights</h2>
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {(hlFields as any[]).map((field, i) => {
                        const hl = highlights?.[i];
                        return (
                          <div key={field.id} className="group/hl flex flex-col gap-4">
                            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-light-grey">
                              {hl?.image ? (
                                <>
                                  <img src={resolveImg(hl.image)} alt="" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/0 group-hover/hl:bg-black/20 transition-colors" />
                                  <button type="button" onClick={() => sv(`details.highlights.${i}`, { ...hl, image: undefined })}
                                    className="absolute top-2 right-2 opacity-0 group-hover/hl:opacity-100 bg-crimson-red text-white rounded-full w-6 h-6 flex items-center justify-center">
                                    <X className="h-3 w-3" />
                                  </button>
                                </>
                              ) : (
                                <label className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-light-grey/70">
                                  <ImageIcon className="h-8 w-8 text-dark-gray/30 mb-1" />
                                  <span className="text-xs text-dark-gray/40">Add image</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; if (!validateImageFile(f).valid) return; sv(`details.highlights.${i}`, { ...hl, image: createBlobUrl(f) }); }} />
                                </label>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-start gap-2">
                                <InlineTextarea value={hl?.text ?? ""} onChange={(v) => sv(`details.highlights.${i}`, { ...hl, text: v })} placeholder="Highlight text" className="font-sans text-h6-mobile md:text-h6-desktop font-bold text-midnight flex-1" />
                                <button type="button" onClick={() => rmHl(i)} className="text-crimson-red flex-shrink-0 mt-0.5"><X className="h-4 w-4" /></button>
                              </div>
                              <InlineInput value={hl?.subtitle ?? ""} onChange={(v) => sv(`details.highlights.${i}`, { ...hl, subtitle: v })} placeholder="Subtitle (optional)" className="font-body text-b4-mobile md:text-b4-desktop text-dark-gray" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button type="button" onClick={() => (addHl as any)({ text: "", image: undefined, subtitle: undefined })}
                      className="mt-6 flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red">
                      <Plus className="h-4 w-4" /> Add highlight
                    </button>
                  </section>

                  {/* Map */}
                  {(mapData?.image || mapData?.embedUrl) && (
                    <section className="mt-10 md:mt-14 w-full">
                      <h2 className="font-sans text-h3-mobile md:text-h3-desktop text-midnight">Map</h2>
                      <div className="mt-8 relative aspect-video w-full overflow-hidden rounded-lg bg-light-grey">
                        {mapData.embedUrl ? <iframe src={mapData.embedUrl} className="w-full h-full" /> : mapData.image ? <img src={resolveImg(mapData.image)} alt="Map" className="w-full h-full object-cover" /> : null}
                      </div>
                    </section>
                  )}

                  {/* Itinerary */}
                  <section className="mt-10 md:mt-14 w-full">
                    <h2 className="font-sans text-h3-mobile md:text-h3-desktop text-midnight">Itinerary</h2>
                    <ol className="mt-8 divide-y divide-light-grey border-t border-light-grey">
                      {(iterFields as any[]).map((field, i) => {
                        const day = itinerary?.[i];
                        const isOpen = expandedDays.has(i);
                        return (
                          <li key={field.id} className="group/day">
                            <div className="flex items-center gap-3 py-4">
                              <span className="size-7 shrink-0 bg-crimson-red text-white rounded-full flex items-center justify-center font-sans font-bold text-b4-desktop">{i + 1}</span>
                              <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                                <span className="font-sans text-h6-mobile md:text-h6-desktop font-bold text-midnight shrink-0">Day {i + 1}</span>
                                <InlineInput value={day?.title ?? ""} onChange={(v) => sv(`details.itinerary.${i}.title`, v)} placeholder="Day title…" className="font-sans text-h6-mobile md:text-h6-desktop text-crimson-red" />
                              </div>
                              <button type="button" onClick={() => setExpandedDays((p) => { const n = new Set(p); if (isOpen) { n.delete(i); } else { n.add(i); } return n; })}
                                className={`size-5 shrink-0 text-midnight transition-transform ${isOpen ? "rotate-180" : ""}`}>
                                <ChevronDown className="h-5 w-5" />
                              </button>
                              <button type="button" onClick={() => rmIter(i)} disabled={iterFields.length === 1} className="text-crimson-red opacity-0 group-hover/day:opacity-100 disabled:opacity-0 transition-opacity"><X className="h-4 w-4" /></button>
                            </div>
                            {isOpen && (
                              <div className={`pb-5 grid grid-cols-1 gap-x-6 gap-y-4 ${day?.image ? "md:grid-cols-[1fr_348px]" : ""}`}>
                                <InlineTextarea value={day?.description ?? ""} onChange={(v) => sv(`details.itinerary.${i}.description`, v)} placeholder="Describe this day…" className="font-body text-b4-mobile md:text-b4-desktop text-dark-gray" />
                                {day?.image && (
                                  <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-light-grey md:row-span-2">
                                    <img src={resolveImg(day.image)} alt={`Day ${i + 1}`} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="border-t border-light-grey/60 pt-3">
                                  <ul className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                    {(day?.details ?? []).map((det: any, di: number) => {
                                      const DetIcon = ICON_COMPONENTS[det?.icon ?? "activities"] ?? Compass;
                                      return (
                                        <li key={di} className="flex items-start gap-3 group/det">
                                          <Select value={det?.icon ?? "activities"} onValueChange={(v) => {
                                            const arr = [...(gv(`details.itinerary.${i}.details`) ?? [])];
                                            arr[di] = { ...arr[di], icon: v };
                                            sv(`details.itinerary.${i}.details`, arr);
                                          }}>
                                            <SelectTrigger className="shrink-0 mt-0.5 border-0 bg-transparent shadow-none p-0 w-auto h-auto text-midnight [&>svg:last-child]:hidden hover:text-crimson-red transition-colors">
                                              <DetIcon className="size-4" />
                                            </SelectTrigger>
                                            <SelectContent>{ALL_ICONS.map((k) => { const IC = ICON_COMPONENTS[k]; return <SelectItem key={k} value={k}><span className="flex items-center gap-2"><IC className="h-4 w-4" />{k}</span></SelectItem>; })}</SelectContent>
                                          </Select>
                                          <div className="flex-1 min-w-0">
                                            <InlineInput
                                              value={det?.label ?? ""}
                                              onChange={(v) => {
                                                const arr = [...(gv(`details.itinerary.${i}.details`) ?? [])];
                                                arr[di] = { ...arr[di], label: v };
                                                sv(`details.itinerary.${i}.details`, arr);
                                              }}
                                              placeholder="Label"
                                              className="font-sans text-b4-mobile !font-bold text-midnight w-full"
                                            />
                                            <InlineBulletTextarea
                                              value={det?.value ?? ""}
                                              onChange={(v) => {
                                                const arr = [...(gv(`details.itinerary.${i}.details`) ?? [])];
                                                arr[di] = { ...arr[di], value: v };
                                                sv(`details.itinerary.${i}.details`, arr);
                                              }}
                                              placeholder="Detail (use - for bullets)"
                                              className="mt-0.5 font-body text-b4-mobile text-dark-gray"
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const arr = (gv(`details.itinerary.${i}.details`) ?? []).filter((_: unknown, j: number) => j !== di);
                                              sv(`details.itinerary.${i}.details`, arr);
                                            }}
                                            className="opacity-0 group-hover/det:opacity-100 transition-opacity text-crimson-red mt-0.5 shrink-0"
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const arr = [...(gv(`details.itinerary.${i}.details`) ?? []), { icon: "activities", label: "", value: "" }];
                                      sv(`details.itinerary.${i}.details`, arr);
                                    }}
                                    className="mt-6 flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red"
                                  >
                                    <Plus className="h-4 w-4" /> Add detail
                                  </button>
                                  <div className="mt-3">
                                    <p className="font-sans text-b4-desktop font-bold text-midnight">Day Image URL</p>
                                    <InlineInput value={day?.image ?? ""} onChange={(v) => sv(`details.itinerary.${i}.image`, v)} placeholder="https://…" className="font-body text-b4-desktop text-dark-gray/50" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                    <button type="button" onClick={() => { addIter({ day: iterFields.length + 1, title: "", description: "", image: undefined, accommodation: undefined, activities: undefined, meals: undefined, details: [] }); setExpandedDays((p) => { const n = new Set(p); n.add(iterFields.length); return n; }); }}
                      className="mt-6 flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red">
                      <Plus className="h-4 w-4" /> Add Day {iterFields.length + 1}
                    </button>
                  </section>

                  {/* Where We Stay */}
                  <section className="mt-10 md:mt-14 w-full">
                    <h2 className="font-sans text-h3-mobile md:text-h3-desktop text-midnight">Where We Stay</h2>
                    {accomFields.length > 0 ? (
                      <>
                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {(accomFields as any[]).map((field, i) => {
                            const ac = accoms?.[i];
                            return (
                              <div key={field.id} className="group/ac flex flex-col gap-4">
                                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-light-grey">
                                  {ac?.image ? <img src={resolveImg(ac.image)} alt="" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full"><ImageIcon className="h-8 w-8 text-dark-gray/30" /></div>}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <InlineInput value={ac?.name ?? ""} onChange={(v) => sv(`details.accommodations.${i}.name`, v)} placeholder="Hotel name" className="font-sans text-h6-mobile md:text-h6-desktop font-bold text-midnight flex-1" />
                                    <button type="button" onClick={() => rmAccom(i)} className="text-crimson-red"><X className="h-4 w-4" /></button>
                                  </div>
                                  <InlineInput value={ac?.nights ?? ""} onChange={(v) => sv(`details.accommodations.${i}.nights`, v)} placeholder="e.g. 2 nights" className="font-body text-b4-mobile md:text-b4-desktop text-dark-gray" />
                                  <InlineInput value={ac?.image ?? ""} onChange={(v) => sv(`details.accommodations.${i}.image`, v)} placeholder="Image URL" className="font-body text-b4-desktop text-dark-gray/40" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button type="button" onClick={() => (addAccom as any)({ name: "", nights: "", image: "" })}
                          className="mt-6 flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red">
                          <Plus className="h-4 w-4" /> Add accommodation
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => (addAccom as any)({ name: "", nights: "", image: "" })}
                        className="mt-4 flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red">
                        <Plus className="h-4 w-4" /> Add accommodation
                      </button>
                    )}
                  </section>

                  {/* FAQs */}
                  <section className="mt-10 md:mt-14 w-full">
                    <div className="flex items-center justify-between">
                      <h2 className="font-sans text-h3-mobile md:text-h3-desktop text-midnight">FAQs</h2>
                      {faqFields.length > 0 && (
                        <button type="button"
                          onClick={() => setExpandedFaqs(expandedFaqs.size === faqFields.length ? new Set() : new Set((faqFields as any[]).map((_, i) => i)))}
                          className="font-body text-b4-desktop text-crimson-red underline-offset-2 hover:underline">
                          {expandedFaqs.size === faqFields.length ? "Collapse All" : "Expand All"}
                        </button>
                      )}
                    </div>
                    {faqFields.length > 0 && (
                      <dl className="mt-8">
                        {(faqFields as any[]).map((field, i) => {
                          const faq = faqs?.[i];
                          const isOpen = expandedFaqs.has(i);
                          return (
                            <div key={field.id} className="border-b border-[#d7d6db] group/faq">
                              <div className="flex w-full items-center justify-between gap-4 py-3">
                                <InlineInput value={faq?.question ?? ""} onChange={(v) => sv(`details.faqs.${i}.question`, v)}
                                  placeholder="Question" className="font-sans text-h6-mobile md:text-h6-desktop text-midnight flex-1" />
                                <div className="flex items-center gap-2 shrink-0">
                                  <button type="button" onClick={() => setExpandedFaqs((prev) => { const next = new Set(prev); if (next.has(i)) { next.delete(i); } else { next.add(i); } return next; })}
                                    className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
                                    <ChevronDown className="size-5 text-midnight" />
                                  </button>
                                  <button type="button" onClick={() => rmFaq(i)} className="opacity-0 group-hover/faq:opacity-100 transition-opacity text-crimson-red"><X className="size-4" /></button>
                                </div>
                              </div>
                              {isOpen && (
                                <div className="pb-4">
                                  <InlineTextarea value={faq?.answer ?? ""} onChange={(v) => sv(`details.faqs.${i}.answer`, v)}
                                    placeholder="Answer…" className="font-body text-b2-mobile md:text-b2-desktop text-midnight" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </dl>
                    )}
                    <button type="button" onClick={() => (addFaq as any)({ question: "", answer: "" })}
                      className="mt-6 flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red">
                      <Plus className="h-4 w-4" /> Add FAQ
                    </button>
                  </section>

                  {/* Things to Know */}
                  <section className="mt-10 md:mt-14 w-full">
                    <h2 className="font-sans text-h3-mobile md:text-h3-desktop text-midnight">Things to Know</h2>
                    {ttkFields.length > 0 ? (
                      <>
                        <ul className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                          {(ttkFields as any[]).map((field, i) => {
                            const ttk = ttks?.[i];
                            const Icon = ICON_COMPONENTS[ttk?.icon ?? "info"] ?? Info;
                            return (
                              <li key={field.id} className="flex flex-col gap-4 rounded-lg border border-light-grey p-6 md:p-8 group/ttk">
                                <div className="flex items-center gap-3">
                                  <Select value={ttk?.icon ?? "info"} onValueChange={(v) => sv(`details.thingsToKnow.${i}.icon`, v)}>
                                    <SelectTrigger className="size-14 rounded-full bg-light-grey text-midnight border-0 p-0 justify-center [&>svg:last-child]:hidden"><Icon className="h-6 w-6 text-midnight" /></SelectTrigger>
                                    <SelectContent>{ALL_ICONS.map((k) => { const IC = ICON_COMPONENTS[k]; return <SelectItem key={k} value={k}><span className="flex items-center gap-2"><IC className="h-4 w-4" />{k}</span></SelectItem>; })}</SelectContent>
                                  </Select>
                                  <InlineInput value={ttk?.title ?? ""} onChange={(v) => sv(`details.thingsToKnow.${i}.title`, v)} placeholder="Title" className="font-sans text-h5-mobile md:text-h5-desktop text-midnight flex-1" />
                                  <button type="button" onClick={() => rmTtk(i)} className="text-crimson-red opacity-0 group-hover/ttk:opacity-100 transition-opacity"><X className="h-4 w-4" /></button>
                                </div>
                                <InlineTextarea value={ttk?.description ?? ""} onChange={(v) => sv(`details.thingsToKnow.${i}.description`, v)} placeholder="Description…" className="font-body text-b4-mobile md:text-b4-desktop text-dark-gray" />
                                <div className="mt-auto flex gap-2">
                                  <InlineInput value={ttk?.ctaLabel ?? ""} onChange={(v) => sv(`details.thingsToKnow.${i}.ctaLabel`, v)} placeholder="CTA Label" className="font-body text-b4-desktop text-crimson-red font-bold flex-1" />
                                  <InlineInput value={ttk?.ctaHref ?? ""} onChange={(v) => sv(`details.thingsToKnow.${i}.ctaHref`, v)} placeholder="https://…" className="font-body text-b4-desktop text-dark-gray/40 flex-1" />
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        <button type="button" onClick={() => (addTtk as any)({ icon: "info", title: "", description: "", ctaLabel: "", ctaHref: "" })}
                          className="mt-6 flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red">
                          <Plus className="h-4 w-4" /> Add card
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => (addTtk as any)({ icon: "info", title: "", description: "", ctaLabel: "", ctaHref: "" })}
                        className="mt-4 flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red">
                        <Plus className="h-4 w-4" /> Add card
                      </button>
                    )}
                  </section>

                  {/* Tips */}
                  <section className="mt-10 md:mt-14 w-full">
                    <h2 className="font-sans text-h3-mobile md:text-h3-desktop text-midnight">Tips</h2>
                    {tipFields.length > 0 ? (
                      <>
                        <ul className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                          {(tipFields as any[]).map((field, i) => {
                            const tip = tips?.[i];
                            const Icon = ICON_COMPONENTS[tip?.icon ?? "luggage"] ?? Luggage;
                            return (
                              <li key={field.id} className="flex items-start gap-4 group/tip">
                                <Select value={tip?.icon ?? "luggage"} onValueChange={(v) => sv(`details.tips.${i}.icon`, v)}>
                                  <SelectTrigger className="flex size-12 shrink-0 items-center justify-center rounded-full bg-light-grey text-midnight border-0 p-0 [&>svg:last-child]:hidden hover:ring-2 hover:ring-crimson-red/20 transition-shadow"><Icon className="size-5 text-midnight" /></SelectTrigger>
                                  <SelectContent>{ALL_ICONS.map((k) => { const IC = ICON_COMPONENTS[k]; return <SelectItem key={k} value={k}><span className="flex items-center gap-2"><IC className="h-4 w-4" />{k}</span></SelectItem>; })}</SelectContent>
                                </Select>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start gap-2">
                                    <InlineInput value={tip?.title ?? ""} onChange={(v) => sv(`details.tips.${i}.title`, v)} placeholder="Title" className="font-sans text-b2-desktop font-bold text-midnight flex-1" />
                                    <button type="button" onClick={() => rmTip(i)} className="text-crimson-red opacity-0 group-hover/tip:opacity-100 transition-opacity"><X className="h-4 w-4" /></button>
                                  </div>
                                  <InlineTextarea value={tip?.description ?? ""} onChange={(v) => sv(`details.tips.${i}.description`, v)} placeholder="Tip description…" className="mt-1 font-body text-b4-mobile md:text-b4-desktop text-dark-gray" />
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        <button type="button" onClick={() => (addTip as any)({ icon: "luggage", title: "", description: "" })}
                          className="mt-6 flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red">
                          <Plus className="h-4 w-4" /> Add tip
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => (addTip as any)({ icon: "luggage", title: "", description: "" })}
                        className="mt-4 flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red">
                        <Plus className="h-4 w-4" /> Add tip
                      </button>
                    )}
                  </section>

                </div>{/* end ONE main card */}
              </div>{/* end left column */}

              {/* ─── RIGHT COLUMN: BookingCard ───────────────────────────── */}
              <div className="mt-6 lg:mt-0 lg:sticky lg:top-[136px] self-start">
                <div className="overflow-hidden rounded-lg bg-white shadow-medium">
                  {/* Duration + route */}
                  <div className="px-6 pb-5 pt-6 md:px-7 md:pt-7">
                    <InlineTextarea value={cardHeaderTitle} onChange={(v) => sv("cardHeaderTitle", v)} placeholder={durationLabel || "11 Day Tour"} className="font-sans text-h5-mobile md:text-h5-desktop font-bold text-midnight w-full" />
                    <InlineTextarea value={cardSubHeader} onChange={(v) => sv("cardSubHeader", v)} placeholder={route || "Destination"} className="mt-1 font-body text-b2-mobile md:text-b1 text-dark-gray w-full" />
                  </div>

                  {/* Price */}
                  <div className="border-t border-light-grey px-6 py-4">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-body text-b4-desktop text-dark-gray">From</span>
                      <span className="font-body text-b4-desktop text-dark-gray">{sym}</span>
                      <span className="font-display text-h3-mobile text-midnight leading-none">
                        {pricing?.discounted || pricing?.original
                          ? Number(pricing?.discounted || pricing?.original).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                    {/* Inline price editing */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-dark-gray mb-0.5">Price</p>
                        <div className="flex items-center gap-1 border border-border rounded-md px-2 py-1">
                          <span className="text-xs text-dark-gray">{sym}</span>
                          <InlineInput value={pricing?.original ?? ""} onChange={(v) => sv("pricing.original", v)} placeholder="2499" className="text-sm text-midnight font-body" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-dark-gray mb-0.5">Discounted</p>
                        <div className="flex items-center gap-1 border border-border rounded-md px-2 py-1">
                          <span className="text-xs text-dark-gray">{sym}</span>
                          <InlineInput value={pricing?.discounted ?? ""} onChange={(v) => sv("pricing.discounted", v)} placeholder="—" className="text-sm text-midnight font-body" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-dark-gray mb-0.5">Deposit</p>
                        <div className="flex items-center gap-1 border border-border rounded-md px-2 py-1">
                          <span className="text-xs text-dark-gray">{sym}</span>
                          <InlineInput value={pricing?.deposit ?? ""} onChange={(v) => sv("pricing.deposit", v)} placeholder="300" className="text-sm text-midnight font-body" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-dark-gray mb-0.5">Currency</p>
                        <Select value={pricing?.currency ?? "GBP"} onValueChange={(v) => sv("pricing.currency", v)}>
                          <SelectTrigger className="h-8 text-xs border-border"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GBP">GBP £</SelectItem>
                            <SelectItem value="USD">USD $</SelectItem>
                            <SelectItem value="EUR">EUR €</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Icon facts */}
                  <div className="px-6 pb-4">
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-light-grey"><Calendar className="h-4 w-4 text-midnight" /></span>
                        <span className="font-body text-b4-desktop text-midnight">{cardHeaderTitle || durationLabel || "—"}</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-light-grey"><Route className="h-4 w-4 text-midnight" /></span>
                        <span className="font-body text-b4-desktop text-midnight">{cardSubHeader || route || "—"}</span>
                      </li>
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="border-t border-light-grey px-6 py-5 space-y-3">
                    <div className="flex items-center gap-2 border border-border rounded-md px-3 py-1.5">
                      <ExternalLink className="h-3.5 w-3.5 text-dark-gray flex-shrink-0" />
                      <InlineInput value={w("stripePaymentLink") ?? ""} onChange={(v) => sv("stripePaymentLink", v)} placeholder="Stripe payment link" className="font-body text-b4-desktop text-dark-gray" />
                    </div>
                    <div className="inline-flex w-full items-center justify-center rounded-full bg-crimson-red px-6 py-3.5 font-body font-bold text-white shadow-small pointer-events-none select-none">
                      Reserve Now
                    </div>
                    {/* Deposit notice (editable) */}
                    <div className="mt-2">
                      <InlineTextarea
                        value={gv("depositNote") ?? ""}
                        onChange={(v) => sv("depositNote", v)}
                        placeholder={depositAmt ? `Reserve for ${depositAmt} — deducted from total fees. Non-refundable.` : "Deposit notice text…"}
                        className="font-body text-b4-mobile text-dark-gray text-center"
                      />
                    </div>
                    {/* Footnote (editable) */}
                    <div>
                      <InlineInput
                        value={gv("footnote") ?? ""}
                        onChange={(v) => sv("footnote", v)}
                        placeholder="*Additional fees may apply"
                        className="font-body text-b4-mobile text-grey text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>{/* end two-column */}
          </div>{/* end page container */}

          {/* ── Settings panel ──────────────────────────────────────────────── */}
          <div className="max-w-7xl mx-auto px-4 md:px-8 pb-16 mt-8">
            <button type="button" onClick={() => setSettingsOpen((p) => !p)}
              className="flex items-center gap-2 font-sans font-bold text-midnight mb-4">
              <Settings className="h-5 w-5 text-crimson-red" />
              Tour Settings
              {settingsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {settingsOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Travel Dates */}
                <div className="md:col-span-2 overflow-hidden rounded-[24px] bg-white shadow-medium px-6 py-5">
                  <h4 className="font-sans font-bold text-midnight mb-4 flex items-center gap-2"><Calendar className="h-4 w-4 text-crimson-red" /> Travel Dates</h4>
                  <div className="space-y-4">
                    {(dateFields as any[]).map((field, i) => (
                      <div key={field.id} className={`rounded-[16px] border-2 p-4 ${w(`travelDates.${i}.isAvailable`) ? "border-crimson-red/30 bg-crimson-red/5" : "border-border bg-light-grey/30"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-sans font-bold text-midnight text-sm flex items-center gap-2">
                            <span className="w-6 h-6 bg-crimson-red text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                            Tour Date {i + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <FormField control={form.control} name={`travelDates.${i}.isAvailable`} render={({ field: f }) => (
                              <FormItem><FormControl><div className="flex items-center gap-1.5 px-2 py-1 bg-white/60 rounded border border-border">
                                <span className="text-xs">{f.value ? "Active" : "Inactive"}</span>
                                <Switch checked={f.value} onCheckedChange={f.onChange} className="scale-75 data-[state=checked]:bg-spring-green" />
                              </div></FormControl></FormItem>
                            )} />
                            <button type="button" onClick={() => rmDate(i)} disabled={dateFields.length === 1} className="text-crimson-red disabled:opacity-30"><X className="h-4 w-4" /></button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <FormField control={form.control} name={`travelDates.${i}.startDate`} render={({ field: f }) => (
                            <FormItem className="col-span-2"><FormControl>
                              <TourDatePicker value={f.value || ""} onChange={(iso) => { f.onChange(iso); const days = gv(`travelDates.${i}.tourDays`); if (iso && days) { const end = new Date(iso); end.setDate(end.getDate() + Number(days) - 1); sv(`travelDates.${i}.endDate`, end.toISOString().split("T")[0]); } }} label="Start Date" minYear={2000} maxYear={2050} />
                            </FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name={`travelDates.${i}.tourDays`} render={({ field: f }) => (
                            <FormItem><FormControl>
                              <input type="text" inputMode="numeric" placeholder="Days" value={f.value ?? ""} onChange={(e) => { f.onChange(e.target.value === "" ? undefined : parseInt(e.target.value)); const s = gv(`travelDates.${i}.startDate`); if (s && e.target.value) { const end = new Date(s); end.setDate(end.getDate() + parseInt(e.target.value) - 1); sv(`travelDates.${i}.endDate`, end.toISOString().split("T")[0]); } }} className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red/40" />
                            </FormControl><FormMessage /></FormItem>
                          )} />
                          <div className="flex items-center justify-center rounded-md bg-light-grey/60 px-3 py-2 text-sm text-dark-gray">
                            {w(`travelDates.${i}.endDate`) ? new Date(w(`travelDates.${i}.endDate`) + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "End date"}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => addDate({ startDate: "", endDate: "", isAvailable: true, hasCustomPricing: false, customOriginal: undefined, customDiscounted: undefined, customDeposit: undefined, hasCustomOriginal: false, hasCustomDiscounted: false, hasCustomDeposit: false })}
                      className="flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red">
                      <Plus className="h-4 w-4" /> Add Tour Date
                    </button>
                  </div>
                </div>

                {/* Requirements */}
                <div className="overflow-hidden rounded-[24px] bg-white shadow-medium px-6 py-5">
                  <h4 className="font-sans font-bold text-midnight mb-4 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-vivid-orange" /> Requirements</h4>
                  <div className="space-y-2">
                    {(reqFields as any[]).map((field, i) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-vivid-orange flex-shrink-0" />
                        <input type="text" value={w(`details.requirements.${i}`) ?? ""} onChange={(e) => sv(`details.requirements.${i}`, e.target.value)} placeholder={`Requirement ${i + 1}`}
                          className="flex-1 border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red/40" />
                        <button type="button" onClick={() => rmReq(i)} disabled={reqFields.length === 1} className="text-crimson-red disabled:opacity-30"><X className="h-4 w-4" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => (addReq as any)("")}
                      className="flex items-center gap-1 font-body text-b4-desktop text-crimson-red hover:text-light-red mt-1">
                      <Plus className="h-4 w-4" /> Add requirement
                    </button>
                  </div>
                </div>

                {/* SEO & Publishing */}
                <div className="overflow-hidden rounded-[24px] bg-white shadow-medium px-6 py-5">
                  <h4 className="font-sans font-bold text-midnight mb-4 flex items-center gap-2"><Globe className="h-4 w-4 text-royal-purple" /> SEO & Publishing</h4>
                  <div className="space-y-3">
                    {[["Tour Code", "tourCode"], ["URL Slug", "slug"], ["Direct URL", "url"], ["SEO Title", "seo.title"], ["SEO Description", "seo.description"], ["Booking Slug Override", "bookingSlug"]].map(([label, key]) => (
                      <div key={key}>
                        <label className="text-xs font-body text-dark-gray mb-0.5 block">{label}</label>
                        <input type="text" value={w(key as any) ?? ""} onChange={(e) => sv(key, e.target.value)} placeholder={label}
                          className="w-full border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red/40" />
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-body text-dark-gray">Coming Soon gate</span>
                      <Switch checked={w("comingSoon") ?? false} onCheckedChange={(v) => sv("comingSoon", v)} className="data-[state=checked]:bg-vivid-orange" />
                    </div>
                  </div>
                </div>

                {/* External Links */}
                <div className="overflow-hidden rounded-[24px] bg-white shadow-medium px-6 py-5">
                  <h4 className="font-sans font-bold text-midnight mb-4 flex items-center gap-2"><ExternalLink className="h-4 w-4 text-spring-green" /> External Links</h4>
                  <div className="space-y-3">
                    {[["Brochure Link", "brochureLink"], ["Pre-Departure Pack", "preDeparturePack"]].map(([label, key]) => (
                      <div key={key}>
                        <label className="text-xs font-body text-dark-gray mb-0.5 block">{label}</label>
                        <input type="url" value={w(key as any) ?? ""} onChange={(e) => sv(key, e.target.value)} placeholder="https://…"
                          className="w-full border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red/40" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Map settings */}
                <div className="overflow-hidden rounded-[24px] bg-white shadow-medium px-6 py-5">
                  <h4 className="font-sans font-bold text-midnight mb-4 flex items-center gap-2"><MapPin className="h-4 w-4 text-crimson-red" /> Map</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-body text-dark-gray mb-0.5 block">Map Image URL</label>
                      <input type="url" value={w("details.map.image") ?? ""} onChange={(e) => sv("details.map.image", e.target.value)} placeholder="https://…"
                        className="w-full border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red/40" />
                    </div>
                    <div>
                      <label className="text-xs font-body text-dark-gray mb-0.5 block">Google Maps Embed URL</label>
                      <input type="url" value={w("details.map.embedUrl") ?? ""} onChange={(e) => sv("details.map.embedUrl", e.target.value)} placeholder="https://www.google.com/maps/embed?…"
                        className="w-full border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red/40" />
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
