import type { GalleryMediaItem } from "@/types/resident-hosts";

/**
 * Firestore does not allow an array to directly contain another array, so the
 * editor's triple-nested `gallerySlides` shape (GalleryMediaItem[][][] —
 * slides → columns → items) cannot be stored as-is. It is persisted as an
 * array of maps instead:
 *
 *   { columns: { items: GalleryMediaItem[] }[] }[]
 *
 * These helpers convert between the stored shape and the editor shape at the
 * API boundary so the rest of the admin keeps working with plain [][][] arrays.
 */

export interface StoredGallerySlide {
  columns: { items: GalleryMediaItem[] }[];
}

export function encodeGallerySlides(
  slides: GalleryMediaItem[][][] | undefined | null,
): StoredGallerySlide[] | undefined {
  if (!slides) return undefined;
  return slides.map((slide) => ({
    columns: (slide ?? []).map((col) => ({ items: col ?? [] })),
  }));
}

export function decodeGallerySlides(stored: any): GalleryMediaItem[][][] {
  if (!Array.isArray(stored)) return [];
  return stored.map((slide: any) => {
    // Stored shape: { columns: { items: [] }[] }
    if (slide && Array.isArray(slide.columns)) {
      return slide.columns.map((col: any) =>
        Array.isArray(col?.items) ? col.items : [],
      );
    }
    // Defensive: already a raw [][] slide
    return Array.isArray(slide) ? slide : [];
  });
}
