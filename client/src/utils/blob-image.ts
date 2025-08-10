// ============================================================================
// BLOB TO IMAGE UTILITIES
// ============================================================================

export interface ImageConversionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 for JPEG
  format?: 'jpeg' | 'png' | 'webp';
  maintainAspectRatio?: boolean;
}

export interface BlobUploadResult {
  allSuccessful: boolean;
  coverResult?: {
    success: boolean;
    url?: string;
    error?: string;
  };
  galleryResults: Array<{
    success: boolean;
    url?: string;
    error?: string;
    fileName: string;
  }>;
}

// ============================================================================
// BLOB URL MANAGEMENT
// ============================================================================

export const createBlobUrl = (file: File): string => {
  return URL.createObjectURL(file);
};

export const revokeBlobUrl = (url: string): void => {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

export const cleanupBlobUrls = (urls: string[]): void => {
  urls.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
};

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

export const createImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = createBlobUrl(file);
    
    img.onload = () => {
      revokeBlobUrl(url);
      resolve(img);
    };
    
    img.onerror = () => {
      revokeBlobUrl(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

export const resizeImage = (
  img: HTMLImageElement,
  options: ImageConversionOptions = {}
): HTMLCanvasElement => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    maintainAspectRatio = true
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  let { width, height } = img;

  // Calculate new dimensions
  if (maintainAspectRatio) {
    const aspectRatio = width / height;
    
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
  } else {
    width = Math.min(width, maxWidth);
    height = Math.min(height, maxHeight);
  }

  canvas.width = width;
  canvas.height = height;

  // Draw resized image
  ctx.drawImage(img, 0, 0, width, height);
  
  return canvas;
};

export const canvasToBlob = (
  canvas: HTMLCanvasElement,
  options: ImageConversionOptions = {}
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const { format = 'jpeg', quality = 0.9 } = options;
    
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      `image/${format}`,
      quality
    );
  });
};

// ============================================================================
// FILE CONVERSION
// ============================================================================

export const convertFileToOptimizedBlob = async (
  file: File,
  options: ImageConversionOptions = {}
): Promise<Blob> => {
  try {
    // Load image
    const img = await createImageFromFile(file);
    
    // Resize if needed
    const canvas = resizeImage(img, options);
    
    // Convert to blob
    const blob = await canvasToBlob(canvas, options);
    
    return blob;
  } catch (error) {
    console.error('Error converting file to optimized blob:', error);
    throw error;
  }
};

export const convertFilesToOptimizedBlobs = async (
  files: File[],
  options: ImageConversionOptions = {}
): Promise<Blob[]> => {
  const conversionPromises = files.map(file => 
    convertFileToOptimizedBlob(file, options)
  );
  
  return Promise.all(conversionPromises);
};

// ============================================================================
// BLOB TO FILE CONVERSION
// ============================================================================

export const blobToFile = (blob: Blob, fileName: string): File => {
  return new File([blob], fileName, {
    type: blob.type,
    lastModified: Date.now(),
  });
};

export const optimizeAndConvertToFile = async (
  file: File,
  options: ImageConversionOptions = {}
): Promise<File> => {
  const optimizedBlob = await convertFileToOptimizedBlob(file, options);
  
  // Generate optimized filename
  const extension = options.format || 'jpeg';
  const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
  const optimizedFileName = `${nameWithoutExt}_optimized.${extension}`;
  
  return blobToFile(optimizedBlob, optimizedFileName);
};

// ============================================================================
// IMAGE VALIDATION
// ============================================================================

export const validateImageFile = (file: File): {
  valid: boolean;
  error?: string;
  details?: {
    isImage: boolean;
    size: number;
    type: string;
  };
} => {
  const isImage = file.type.startsWith('image/');
  
  if (!isImage) {
    return {
      valid: false,
      error: 'Selected file is not an image',
      details: {
        isImage: false,
        size: file.size,
        type: file.type,
      }
    };
  }

  return {
    valid: true,
    details: {
      isImage: true,
      size: file.size,
      type: file.type,
    }
  };
};

export const getImageDimensions = (file: File): Promise<{
  width: number;
  height: number;
}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = createBlobUrl(file);
    
    img.onload = () => {
      revokeBlobUrl(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    
    img.onerror = () => {
      revokeBlobUrl(url);
      reject(new Error('Failed to load image for dimension calculation'));
    };
    
    img.src = url;
  });
};

// ============================================================================
// BATCH BLOB UPLOAD TO STORAGE
// ============================================================================

export const uploadAllBlobsToStorage = async (
  coverBlob: File | null,
  galleryBlobs: File[],
  tourId: string
): Promise<BlobUploadResult> => {
  const result: BlobUploadResult = {
    allSuccessful: true,
    galleryResults: [],
  };

  try {
    // Upload cover image if provided
    if (coverBlob) {
      try {
        const { uploadTourCoverImage } = await import('./file-upload');
        const coverResult = await uploadTourCoverImage(coverBlob, tourId);
        
        result.coverResult = {
          success: coverResult.success,
          url: coverResult.data?.publicUrl,
          error: coverResult.error,
        };
        
        if (!coverResult.success) {
          result.allSuccessful = false;
        }
      } catch (error) {
        result.coverResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Cover upload failed',
        };
        result.allSuccessful = false;
      }
    }

    // Upload gallery images
    if (galleryBlobs.length > 0) {
      try {
        const { uploadTourGalleryImages } = await import('./file-upload');
        const galleryResults = await uploadTourGalleryImages(galleryBlobs, tourId);
        
        result.galleryResults = galleryResults.map((uploadResult, index) => ({
          success: uploadResult.success,
          url: uploadResult.data?.publicUrl,
          error: uploadResult.error,
          fileName: galleryBlobs[index].name,
        }));
        
        // Check if any gallery upload failed
        const hasFailedGalleryUpload = result.galleryResults.some(
          res => !res.success
        );
        
        if (hasFailedGalleryUpload) {
          result.allSuccessful = false;
        }
      } catch (error) {
        result.galleryResults = galleryBlobs.map(blob => ({
          success: false,
          error: error instanceof Error ? error.message : 'Gallery upload failed',
          fileName: blob.name,
        }));
        result.allSuccessful = false;
      }
    }

    return result;
  } catch (error) {
    console.error('Error in uploadAllBlobsToStorage:', error);
    
    return {
      allSuccessful: false,
      coverResult: coverBlob ? {
        success: false,
        error: 'Unexpected error during cover upload',
      } : undefined,
      galleryResults: galleryBlobs.map(blob => ({
        success: false,
        error: 'Unexpected error during gallery upload',
        fileName: blob.name,
      })),
    };
  }
};

// ============================================================================
// PREVIEW UTILITIES
// ============================================================================

export const generateImagePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to generate preview'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file for preview'));
    };
    
    reader.readAsDataURL(file);
  });
};

export const generateMultipleImagePreviews = async (
  files: File[]
): Promise<string[]> => {
  const previewPromises = files.map(file => generateImagePreview(file));
  return Promise.all(previewPromises);
};
