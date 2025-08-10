import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { TourPackage, TourPackageFormData, TourFilters, TourSearchParams } from "@/types/tours";

const TOURS_COLLECTION = "tourPackages";

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

export async function createTour(tourData: TourPackageFormData, userId: string): Promise<string> {
  try {
    const now = Timestamp.now();
    
    const tourPackage: Omit<TourPackage, "id"> = {
      ...tourData,
      media: {
        coverImage: tourData.media?.coverImage || "",
        gallery: tourData.media?.gallery || [],
      },
      pricingHistory: [
        {
          date: now,
          price: tourData.pricing.original,
          changedBy: userId,
        },
      ],
      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        bookingsCount: 0,
      },
    };

    const docRef = await addDoc(collection(db, TOURS_COLLECTION), tourPackage);
    return docRef.id;
  } catch (error) {
    console.error("Error creating tour:", error);
    throw new Error("Failed to create tour");
  }
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

export async function getTours(
  filters?: TourFilters,
  sortBy: string = "createdAt",
  sortOrder: "asc" | "desc" = "desc",
  pageLimit: number = 10,
  lastDoc?: DocumentSnapshot
): Promise<{ tours: TourPackage[]; lastDoc: DocumentSnapshot | null }> {
  try {
    let q = query(collection(db, TOURS_COLLECTION));

    // Apply filters
    if (filters?.status) {
      q = query(q, where("status", "==", filters.status));
    }

    if (filters?.location) {
      q = query(q, where("location", "==", filters.location));
    }

    if (filters?.priceRange) {
      q = query(q, where("pricing.original", ">=", filters.priceRange.min));
      q = query(q, where("pricing.original", "<=", filters.priceRange.max));
    }

    // Apply sorting
    q = query(q, orderBy(sortBy, sortOrder));

    // Apply pagination
    q = query(q, limit(pageLimit));

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const querySnapshot = await getDocs(q);
    const tours: TourPackage[] = [];
    let newLastDoc: DocumentSnapshot | null = null;

    querySnapshot.forEach((doc) => {
      tours.push({ id: doc.id, ...doc.data() } as TourPackage);
      newLastDoc = doc;
    });

    // Apply text search client-side (Firestore doesn't support full-text search)
    let filteredTours = tours;
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredTours = tours.filter(
        (tour) =>
          tour.name.toLowerCase().includes(searchTerm) ||
          tour.description.toLowerCase().includes(searchTerm) ||
          tour.location.toLowerCase().includes(searchTerm)
      );
    }

    return { tours: filteredTours, lastDoc: newLastDoc };
  } catch (error) {
    console.error("Error getting tours:", error);
    throw new Error("Failed to fetch tours");
  }
}

export async function getTourById(id: string): Promise<TourPackage | null> {
  try {
    const docRef = doc(db, TOURS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as TourPackage;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting tour:", error);
    throw new Error("Failed to fetch tour");
  }
}

export async function getAllTours(): Promise<TourPackage[]> {
  try {
    const querySnapshot = await getDocs(collection(db, TOURS_COLLECTION));
    const tours: TourPackage[] = [];

    querySnapshot.forEach((doc) => {
      tours.push({ id: doc.id, ...doc.data() } as TourPackage);
    });

    return tours;
  } catch (error) {
    console.error("Error getting all tours:", error);
    throw new Error("Failed to fetch all tours");
  }
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

export async function updateTour(
  id: string,
  updates: Partial<TourPackageFormData>,
  userId: string
): Promise<void> {
  try {
    const docRef = doc(db, TOURS_COLLECTION, id);
    const now = Timestamp.now();

    // Get current tour data to check if price changed
    const currentDoc = await getDoc(docRef);
    const currentData = currentDoc.data() as TourPackage;

    const updateData: any = {
      ...updates,
      "metadata.updatedAt": now,
    };

    // If price changed, add to pricing history
    if (updates.pricing?.original && updates.pricing.original !== currentData.pricing.original) {
      const newPricingEntry = {
        date: now,
        price: updates.pricing.original,
        changedBy: userId,
      };
      updateData.pricingHistory = [...currentData.pricingHistory, newPricingEntry];
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error("Error updating tour:", error);
    throw new Error("Failed to update tour");
  }
}

export async function updateTourStatus(id: string, status: "active" | "draft" | "archived"): Promise<void> {
  try {
    const docRef = doc(db, TOURS_COLLECTION, id);
    await updateDoc(docRef, {
      status,
      "metadata.updatedAt": Timestamp.now(),
    });
  } catch (error) {
    console.error("Error updating tour status:", error);
    throw new Error("Failed to update tour status");
  }
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

export async function deleteTour(id: string): Promise<void> {
  try {
    const docRef = doc(db, TOURS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting tour:", error);
    throw new Error("Failed to delete tour");
  }
}

// Soft delete - mark as archived instead of deleting
export async function archiveTour(id: string): Promise<void> {
  try {
    await updateTourStatus(id, "archived");
  } catch (error) {
    console.error("Error archiving tour:", error);
    throw new Error("Failed to archive tour");
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export async function batchUpdateTours(
  updates: { id: string; data: Partial<TourPackageFormData> }[]
): Promise<void> {
  try {
    const batch = writeBatch(db);

    updates.forEach(({ id, data }) => {
      const docRef = doc(db, TOURS_COLLECTION, id);
      batch.update(docRef, {
        ...data,
        "metadata.updatedAt": Timestamp.now(),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error batch updating tours:", error);
    throw new Error("Failed to batch update tours");
  }
}

export async function batchDeleteTours(ids: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);

    ids.forEach((id) => {
      const docRef = doc(db, TOURS_COLLECTION, id);
      batch.delete(docRef);
    });

    await batch.commit();
  } catch (error) {
    console.error("Error batch deleting tours:", error);
    throw new Error("Failed to batch delete tours");
  }
}

// ============================================================================
// SEARCH AND FILTER HELPERS
// ============================================================================

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateTourData(data: TourPackageFormData): string[] {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length < 3) {
    errors.push("Tour name must be at least 3 characters long");
  }

  if (!data.description || data.description.trim().length < 10) {
    errors.push("Description must be at least 10 characters long");
  }

  if (!data.location || data.location.trim().length < 2) {
    errors.push("Location is required");
  }

  if (!data.duration || data.duration < 1) {
    errors.push("Duration must be at least 1 day");
  }

  if (!data.pricing.original || data.pricing.original <= 0) {
    errors.push("Original price must be greater than 0");
  }

  if (data.pricing.discounted && data.pricing.discounted >= data.pricing.original) {
    errors.push("Discounted price must be less than original price");
  }

  if (!data.pricing.deposit || data.pricing.deposit <= 0) {
    errors.push("Deposit amount is required and must be greater than 0");
  }

  if (data.details.highlights.length === 0) {
    errors.push("At least one highlight is required");
  }

  if (data.details.itinerary.length === 0) {
    errors.push("At least one itinerary item is required");
  }

  return errors;
}
