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
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import {
  PreDeparturePack,
  TourPackageAssignment,
  PreDeparturePackFormData,
  PreDepartureConfig,
} from "@/types/pre-departure-pack";
import { uploadFile, deleteFile, STORAGE_BUCKET } from "@/utils/file-upload";
import { useAuthStore } from "@/store/auth-store";

const PRE_DEPARTURE_PACK_COLLECTION = "preDeparturePack";
const CONFIG_COLLECTION = "config";
const PRE_DEPARTURE_CONFIG_DOC = "pre-departure";

// ============================================================================
// PRE-DEPARTURE PACK CRUD OPERATIONS
// ============================================================================

/**
 * Get all pre-departure packs
 */
export async function getAllPreDeparturePacks(): Promise<PreDeparturePack[]> {
  try {
    const q = query(
      collection(db, PRE_DEPARTURE_PACK_COLLECTION),
      orderBy("uploadedAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PreDeparturePack[];
  } catch (error) {
    console.error("Error fetching pre-departure packs:", error);
    throw new Error("Failed to fetch pre-departure packs");
  }
}

/**
 * Get a single pre-departure pack by ID
 */
export async function getPreDeparturePackById(
  id: string
): Promise<PreDeparturePack | null> {
  try {
    const docRef = doc(db, PRE_DEPARTURE_PACK_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return { id: docSnap.id, ...docSnap.data() } as PreDeparturePack;
  } catch (error) {
    console.error("Error fetching pre-departure pack:", error);
    throw new Error("Failed to fetch pre-departure pack");
  }
}

/**
 * Find pre-departure pack by tour package name
 */
export async function findPackByTourPackageName(
  tourPackageName: string
): Promise<PreDeparturePack | null> {
  try {
    const allPacks = await getAllPreDeparturePacks();

    const pack = allPacks.find((pack) =>
      pack.tourPackages.some(
        (tp) =>
          tp.tourPackageName.toLowerCase().trim() ===
          tourPackageName.toLowerCase().trim()
      )
    );

    return pack || null;
  } catch (error) {
    console.error("Error finding pack by tour package:", error);
    throw new Error("Failed to find pre-departure pack");
  }
}

/**
 * Check if tour packages are already assigned to another pack
 * Returns array of tour package names that are already assigned
 */
export async function checkTourPackageAvailability(
  tourPackages: TourPackageAssignment[],
  excludePackId?: string
): Promise<string[]> {
  try {
    const allPacks = await getAllPreDeparturePacks();
    const assignedPackages: string[] = [];

    for (const pack of allPacks) {
      // Skip the pack we're updating
      if (excludePackId && pack.id === excludePackId) {
        continue;
      }

      for (const tourPackage of tourPackages) {
        const isAssigned = pack.tourPackages.some(
          (tp) => tp.tourPackageId === tourPackage.tourPackageId
        );

        if (
          isAssigned &&
          !assignedPackages.includes(tourPackage.tourPackageName)
        ) {
          assignedPackages.push(tourPackage.tourPackageName);
        }
      }
    }

    return assignedPackages;
  } catch (error) {
    console.error("Error checking tour package availability:", error);
    throw new Error("Failed to check tour package availability");
  }
}

/**
 * Create a new pre-departure pack
 */
export async function createPreDeparturePack(
  formData: PreDeparturePackFormData
): Promise<string> {
  try {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Check if tour packages are already assigned
    const assignedPackages = await checkTourPackageAvailability(
      formData.tourPackages
    );

    if (assignedPackages.length > 0) {
      throw new Error(
        `Tour packages already assigned: ${assignedPackages.join(", ")}`
      );
    }

    // Upload file to Firebase Storage
    const uploadResult = await uploadFile(formData.file, {
      bucket: STORAGE_BUCKET,
      folder: "pre-departure-packs",
      maxSize: 100 * 1024 * 1024, // 100MB max
      allowedTypes: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ],
      generateUniqueName: true,
    });

    if (!uploadResult.success || !uploadResult.data) {
      throw new Error(uploadResult.error || "Failed to upload file");
    }

    // Create pre-departure pack document
    const packData: Omit<PreDeparturePack, "id"> = {
      tourPackages: formData.tourPackages,
      fileName: formData.file.name,
      originalName: formData.file.name,
      fileDownloadURL: uploadResult.data.publicUrl,
      contentType: formData.file.type,
      storagePath: uploadResult.data.path,
      size: formData.file.size,
      uploadedAt: Timestamp.now(),
      uploadedBy: currentUser.uid,
      metadata: formData.metadata || {},
    };

    const docRef = await addDoc(
      collection(db, PRE_DEPARTURE_PACK_COLLECTION),
      packData
    );

    console.log("Pre-departure pack created:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating pre-departure pack:", error);
    throw error;
  }
}

/**
 * Update tour package assignments for a pack
 */
export async function updatePackTourPackages(
  packId: string,
  tourPackages: TourPackageAssignment[]
): Promise<void> {
  try {
    // Check if tour packages are already assigned to other packs
    const assignedPackages = await checkTourPackageAvailability(
      tourPackages,
      packId
    );

    if (assignedPackages.length > 0) {
      throw new Error(
        `Tour packages already assigned: ${assignedPackages.join(", ")}`
      );
    }

    const docRef = doc(db, PRE_DEPARTURE_PACK_COLLECTION, packId);
    await updateDoc(docRef, {
      tourPackages,
    });

    console.log("Tour packages updated for pack:", packId);
  } catch (error) {
    console.error("Error updating pack tour packages:", error);
    throw error;
  }
}

/**
 * Replace the file for a pre-departure pack
 */
export async function replacePackFile(
  packId: string,
  newFile: File
): Promise<void> {
  try {
    const pack = await getPreDeparturePackById(packId);
    if (!pack) {
      throw new Error("Pre-departure pack not found");
    }

    // Delete old file from storage
    if (pack.storagePath) {
      try {
        await deleteFile(pack.storagePath, STORAGE_BUCKET);
      } catch (error) {
        console.warn("Failed to delete old file:", error);
      }
    }

    // Upload new file
    const uploadResult = await uploadFile(newFile, {
      bucket: STORAGE_BUCKET,
      folder: "pre-departure-packs",
      maxSize: 100 * 1024 * 1024,
      allowedTypes: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ],
      generateUniqueName: true,
    });

    if (!uploadResult.success || !uploadResult.data) {
      throw new Error(uploadResult.error || "Failed to upload new file");
    }

    // Update pack document
    const docRef = doc(db, PRE_DEPARTURE_PACK_COLLECTION, packId);
    await updateDoc(docRef, {
      fileName: newFile.name,
      originalName: newFile.name,
      fileDownloadURL: uploadResult.data.publicUrl,
      contentType: newFile.type,
      storagePath: uploadResult.data.path,
      size: newFile.size,
      uploadedAt: Timestamp.now(),
    });

    console.log("File replaced for pack:", packId);
  } catch (error) {
    console.error("Error replacing pack file:", error);
    throw error;
  }
}

/**
 * Delete a pre-departure pack
 */
export async function deletePreDeparturePack(packId: string): Promise<void> {
  try {
    const pack = await getPreDeparturePackById(packId);
    if (!pack) {
      throw new Error("Pre-departure pack not found");
    }

    // Delete file from storage
    if (pack.storagePath) {
      try {
        await deleteFile(pack.storagePath, STORAGE_BUCKET);
      } catch (error) {
        console.warn("Failed to delete file from storage:", error);
      }
    }

    // Delete document
    const docRef = doc(db, PRE_DEPARTURE_PACK_COLLECTION, packId);
    await deleteDoc(docRef);

    console.log("Pre-departure pack deleted:", packId);
  } catch (error) {
    console.error("Error deleting pre-departure pack:", error);
    throw error;
  }
}

// ============================================================================
// CONFIGURATION OPERATIONS
// ============================================================================

/**
 * Get pre-departure configuration
 */
export async function getPreDepartureConfig(): Promise<PreDepartureConfig> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, PRE_DEPARTURE_CONFIG_DOC);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Return default config
      return {
        automaticSends: false,
      };
    }

    return docSnap.data() as PreDepartureConfig;
  } catch (error) {
    console.error("Error fetching pre-departure config:", error);
    throw new Error("Failed to fetch configuration");
  }
}

/**
 * Update pre-departure configuration
 */
export async function updatePreDepartureConfig(
  automaticSends: boolean
): Promise<void> {
  try {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const docRef = doc(db, CONFIG_COLLECTION, PRE_DEPARTURE_CONFIG_DOC);
    await updateDoc(docRef, {
      automaticSends,
      lastUpdated: Timestamp.now(),
      updatedBy: currentUser.uid,
    });

    console.log("Pre-departure config updated");
  } catch (error) {
    console.error("Error updating pre-departure config:", error);
    throw error;
  }
}
