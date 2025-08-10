import {
  uploadTourCoverImage,
  uploadTourGalleryImages,
} from "./file-upload-service";
import type { UploadResult } from "./file-upload-service";

// ============================================================================
// BLOB TO STORAGE UPLOAD FUNCTIONS
// ============================================================================

/**
 * Upload cover blob to Supabase storage after tour creation
 */
export async function uploadCoverBlobToStorage(
  file: File,
  tourId: string
): Promise<UploadResult> {
  try {
    return await uploadTourCoverImage(file, tourId);
  } catch (error) {
    console.error("Error uploading cover blob:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to upload cover image",
    };
  }
}

/**
 * Upload gallery blobs to Supabase storage after tour creation
 */
export async function uploadGalleryBlobsToStorage(
  files: File[],
  tourId: string
): Promise<{ successful: UploadResult[]; failed: UploadResult[] }> {
  try {
    const result = await uploadTourGalleryImages(files, tourId);
    return {
      successful: result.successful,
      failed: result.failed.map((f) => ({
        success: false,
        error: f.error,
      })),
    };
  } catch (error) {
    console.error("Error uploading gallery blobs:", error);
    return {
      successful: [],
      failed: files.map(() => ({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload gallery image",
      })),
    };
  }
}

/**
 * Upload all blobs (cover + gallery) to storage after tour creation
 */
export async function uploadAllBlobsToStorage(
  coverBlob: File | null,
  galleryBlobs: File[],
  tourId: string
): Promise<{
  coverResult: UploadResult | null;
  galleryResults: { successful: UploadResult[]; failed: UploadResult[] };
  allSuccessful: boolean;
}> {
  let coverResult: UploadResult | null = null;
  let galleryResults = {
    successful: [] as UploadResult[],
    failed: [] as UploadResult[],
  };

  // Upload cover image
  if (coverBlob) {
    coverResult = await uploadCoverBlobToStorage(coverBlob, tourId);
  }

  // Upload gallery images
  if (galleryBlobs.length > 0) {
    galleryResults = await uploadGalleryBlobsToStorage(galleryBlobs, tourId);
  }

  // Check if all uploads were successful
  const coverSuccess = !coverBlob || coverResult?.success === true;
  const gallerySuccess =
    galleryBlobs.length === 0 || galleryResults.failed.length === 0;
  const allSuccessful = coverSuccess && gallerySuccess;

  return {
    coverResult,
    galleryResults,
    allSuccessful,
  };
}

/**
 * Clean up blob URLs to prevent memory leaks
 */
export function cleanupBlobUrls(urls: string[]): void {
  urls.forEach((url) => {
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  });
}
