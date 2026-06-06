import { Timestamp } from "firebase/firestore";

// ============================================================================
// RESIDENT HOST CORE TYPES
// ============================================================================
//
// Backs the `residentHost` Firestore collection. The shape mirrors the www
// `Host` type (www/web/data/hosts.ts) so the admin can author the same content
// the public resident-host pages render, plus admin conventions (`status`,
// `metadata`) and the relational `attachedTourIds` used to classify which
// tourPackages are "hosted" by this host.

export interface ResidentHost {
  id: string; // Auto-generated Firestore ID
  slug: string; // URL-friendly ID, e.g. "dev" → /resident-hosts/dev
  displayName: string; // e.g. "Dev"
  pageTitle: string; // e.g. "Travel with Dev"
  status: "active" | "draft" | "archived"; // Controls www visibility
  comingSoon?: boolean; // Gate full content on www

  instagram?: string; // Handle without the leading @

  // Hero
  heroImage?: string | null; // Single hero (null → solid crimson bg on www)
  heroImageAlt: string;
  heroImages?: string[]; // Exactly 3 → tri-panel split hero (overrides heroImage)

  profileImage?: string; // Circular intro photo

  // SEO overrides; fall back to pageTitle / intro
  seo?: { title?: string; description?: string };

  // ── Static content (manually authored) ─────────────────────────────────────
  intro: string[]; // Bio / intro paragraphs
  upcomingTrips: HostTrip[]; // Static "Upcoming Trips" cards
  whyTravel: string[]; // "Why Travel With Us" bullet points
  whyTravelNotes?: string[]; // Carousel notes (parallel to whyTravel)
  howItWorks: string[]; // Numbered "How It Works" steps
  gallerySlides?: GalleryMediaItem[][][]; // Masonry "Real Moments" (slides → columns → items)
  galleryImages?: GalleryImage[]; // Legacy flat gallery list; kept for compatibility

  // ── Relational — basis for hosted/normal tour classification ───────────────
  attachedTourIds: string[]; // tourPackages doc IDs hosted by this host

  metadata: ResidentHostMetadata;
}

export interface HostTrip {
  name: string;
  dates: string; // e.g. "March 19, 2027" or "TBA"
  tourSlug?: string; // If set, the card links to /tours/[tourSlug]
  image?: string;
  imageAlt?: string;
  duration?: string; // e.g. "13 Days and 12 Nights"
  description?: string;
  price?: string; // e.g. "GBP £1,299"
  priceNote?: string;
  comingSoon?: boolean; // Non-clickable card with a Coming Soon badge
}

export interface GalleryMediaItem {
  seq: number; // Drives the www door-slide direction (right when seq ∈ {2,5,7,11})
  type: "photo" | "video" | "placeholder";
  size: "tall" | "short";
  src?: string;
  alt?: string;
  objectPosition?: string; // CSS object-position override, e.g. "top"
}

export interface GalleryImage {
  src: string;
  alt: string;
}

export interface ResidentHostMetadata {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // Reference to users
}

// ============================================================================
// FORM TYPES (what the form actually sends — no Timestamp content fields)
// ============================================================================

export interface ResidentHostFormData {
  slug: string;
  displayName: string;
  pageTitle: string;
  status: "active" | "draft" | "archived";
  comingSoon?: boolean;
  instagram?: string;
  heroImage?: string | null;
  heroImageAlt: string;
  heroImages?: string[];
  profileImage?: string;
  seo?: { title?: string; description?: string };
  intro: string[];
  upcomingTrips: HostTrip[];
  whyTravel: string[];
  whyTravelNotes?: string[];
  howItWorks: string[];
  gallerySlides?: GalleryMediaItem[][][];
  galleryImages?: GalleryImage[];
  attachedTourIds: string[];
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export type ResidentHostStatus = "active" | "draft" | "archived";

export interface ResidentHostFilters {
  status?: ResidentHostStatus;
  search?: string;
}
