# 065 — Add reviews to TourDetails

## What changed

Added an optional `reviews` array to the `TourDetails` sub-object on every `tourPackages` document.

## Schema

```ts
interface TourReview {
  rating: number;           // 1–5 stars
  date: string;             // Display string, e.g. "May 2023"
  body: string;             // Review text
  reviewerName: string;
  reviewerLocation: string;
  reviewerAvatar?: string;  // Optional URL / storage path
}

// Added to TourDetails:
reviews?: TourReview[];
```

## Migration script

None required. The `PATCH /api/tours/[id]` handler merges `details` objects server-side (`{ ...currentData.details, ...updates.details }`), so existing documents without `reviews` simply omit the field and continue to work. No backfill is needed.

## www behaviour

- If `details.reviews` is present and non-empty → render per-tour review cards in the "What people say about us" section (positioned after Tips).
- If absent or empty → render the 3 generic placeholder review cards (Flynn Deanne, Manuel Madonna, Bella Millan).

## Admin editor

The `TourForm` WYSIWYG editor renders the reviews section after Tips:
- **No reviews**: greyed-out placeholder cards + "No reviews yet — generic placeholder cards shown on www." + "Add review" button.
- **With reviews**: inline editable cards with clickable star rating, date, body, reviewer name, reviewer location, drag-to-reorder, and per-card delete.
