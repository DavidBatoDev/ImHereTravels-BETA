# tourPackages Schema Changelog — Migration 048

Applied: 2026-06-04  
Migration: `048-enrich-tour-presentation.ts`

---

## Overview

This migration makes the `tourPackages` Firestore collection the single source of truth for the public `www` website's tour pages, replacing the previous pattern of committing hand-authored TypeScript data files.

Changes are **almost entirely additive**. The only removals are two deprecated capacity fields that are no longer used anywhere in the system.

---

## Before → After

### Top-level document

| Field | Before | After | Notes |
|---|---|---|---|
| `id` | `string` | `string` | unchanged |
| `name` | `string` | `string` | unchanged |
| `slug` | `string` | `string` | unchanged |
| `url` | `string?` | `string?` | unchanged |
| `tourCode` | `string` | `string` | unchanged |
| `description` | `string` | `string` | unchanged |
| `location` | `string` | `string` | unchanged |
| `duration` | `string` | `string` | unchanged |
| `status` | `"active"\|"draft"\|"archived"` | `"active"\|"draft"\|"archived"` | unchanged |
| `travelDates` | `TravelDate[]` | `TravelDate[]` | see below — fields removed inside |
| `pricing` | `TourPricing` | `TourPricing` | unchanged |
| `details` | `TourDetails` | `TourDetails` | see below — fields added inside |
| `media` | `TourMedia` | `TourMedia` | unchanged |
| `pricingHistory` | `PricingHistoryEntry[]` | `PricingHistoryEntry[]` | unchanged |
| `currentVersion` | `number?` | `number?` | unchanged |
| `metadata` | `TourMetadata` | `TourMetadata` | unchanged |
| `brochureLink` | `string?` | `string?` | unchanged |
| `stripePaymentLink` | `string?` | `string?` | unchanged |
| `preDeparturePack` | `string?` | `string?` | unchanged |
| `seo` | — | `{ title?: string; description?: string }?` | **NEW** — SEO overrides for www; falls back to name/description |
| `comingSoon` | — | `boolean?` | **NEW** — gates full content on www; shows Coming Soon screen |
| `bookingSlug` | — | `string?` | **NEW** — overrides the slug used in booking/reservation URLs |

---

### `TravelDate` (inside `travelDates[]`)

| Field | Before | After | Notes |
|---|---|---|---|
| `startDate` | `Timestamp` | `Timestamp` | unchanged |
| `endDate` | `Timestamp` | `Timestamp` | unchanged |
| `tourDays` | `number?` | `number?` | unchanged |
| `isAvailable` | `boolean` | `boolean` | unchanged |
| `maxCapacity` | `number\|null\|undefined` | ~~removed~~ | **REMOVED** — no longer tracked per date |
| `currentBookings` | `number\|null\|undefined` | ~~removed~~ | **REMOVED** — tracked in bookings collection |
| `customOriginal` | `number\|null?` | `number\|null?` | unchanged |
| `customDiscounted` | `number\|null?` | `number\|null?` | unchanged |
| `customDeposit` | `number\|null?` | `number\|null?` | unchanged |
| `hasCustomOriginal` | `boolean?` | `boolean?` | unchanged |
| `hasCustomDiscounted` | `boolean?` | `boolean?` | unchanged |
| `hasCustomDeposit` | `boolean?` | `boolean?` | unchanged |

---

### `TourDetails` (inside `details`)

| Field | Before | After | Notes |
|---|---|---|---|
| `highlights` | `(string \| Highlight)[]` | `(string \| Highlight)[]` | unchanged; see `Highlight` below |
| `itinerary` | `TourItinerary[]` | `TourItinerary[]` | unchanged shape; see `TourItinerary` below |
| `requirements` | `string[]` | `string[]` | unchanged |
| `route` | — | `string?` | **NEW** — e.g. `"Punakha → Thimphu → Paro"` — renders as Route key fact on www |
| `tags` | — | `string[]?` | **NEW** — location/theme labels for header tags; falls back to `location` + `destinations` |
| `inclusions` | — | `TourInclusion[]?` | **NEW** — "What's Included" items |
| `accommodations` | — | `TourAccommodation[]?` | **NEW** — "Where We Stay" items |
| `faqs` | — | `TourFaq[]?` | **NEW** — FAQ accordion items |
| `thingsToKnow` | — | `TourThingToKnow[]?` | **NEW** — "Things to Know" cards; www falls back to 2 generic defaults when absent |
| `tips` | — | `TourTip[]?` | **NEW** — Tips cards; www falls back to 4 generic defaults when absent |
| `map` | — | `{ image?: string; embedUrl?: string }?` | **NEW** — static map image or embedded map URL |

---

### `Highlight` (inside `details.highlights[]`)

| Field | Before | After |
|---|---|---|
| `text` | `string` | `string` |
| `image` | `string?` | `string?` |
| `subtitle` | — | `string?` **NEW** — rendered as trip-highlight card subtitle on www |

---

### `TourItinerary` (inside `details.itinerary[]`)

| Field | Before | After |
|---|---|---|
| `day` | `number` | `number` |
| `title` | `string` | `string` |
| `description` | `string` | `string` |
| `image` | — | `string?` **NEW** — day card hero image |
| `accommodation` | — | `string?` **NEW** — e.g. `"River Valley Resort"` |
| `activities` | — | `string?` **NEW** — e.g. `"Punakha Dzong, Rafting"` |
| `meals` | — | `string?` **NEW** — e.g. `"1 Breakfast, 1 Lunch, 1 Dinner"` |

---

### New sub-types

```ts
TourInclusion {
  icon?:  string        // TourIcon value e.g. "meals", "transport", "activities"
  label:  string
  value:  string | string[]
}

TourAccommodation {
  image:  string
  name:   string
  nights: string        // e.g. "2 nights in Hotel"
}

TourFaq {
  question: string
  answer:   string
}

TourThingToKnow {
  icon?:       string
  title:       string
  description: string
  ctaLabel:    string
  ctaHref:     string
}

TourTip {
  icon?:       string
  title:       string
  description: string
}
```

---

## What was unchanged

- `pricing` (original, discounted, deposit, currency) — **not touched**
- `pricingHistory` — **not touched** (managed exclusively by the pricing cloud function)
- `currentVersion` — **not touched**
- `travelDates` start/end dates and all `isAvailable` / custom-pricing fields — **not touched**
- `media.coverImage` and `media.gallery` — **not touched**
- All admin CRUD routes, pricing cloud function, and booking-sheet column functions — **not touched**

---

## Consumer changes

| Consumer | Before | After |
|---|---|---|
| Admin CRUD API | reads/writes all fields | unchanged — new optional fields pass through transparently |
| Admin TourForm | had Tour Size (maxCapacity) input per date | Tour Size input removed |
| Admin TourDetails | showed Capacity (bookings / max) per date | Capacity display removed |
| www tour pages | read from static `data/<slug>.ts` files | read from Firestore via `lib/tours-firestore.ts` at build time + ISR (1 h) |
| www sitemap / redirects | used static registry | sitemap uses Firestore registry; redirects still use static registry (config-time constraint) |
