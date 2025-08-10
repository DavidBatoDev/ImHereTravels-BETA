import { useState, useCallback } from 'react';
import {
  uploadFile,
  uploadMultipleFiles,
  uploadTourCoverImage,
  uploadTourGalleryImages,
  uploadTourDocument,
  deleteFile,
  type UploadResult,
  type BulkUploadResult,
  type FileUploadOptions,
} from '@/lib/file-upload-service';

// Re-export types for easier importing
export type { UploadResult, BulkUploadResult, FileUploadOptions };

// ============================================================================
// TYPES
// ============================================================================

export interface UseFileUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  uploadedFiles: UploadResult[];
}

export interface UseFileUploadOptions extends Partial<FileUploadOptions> {
  onSuccess?: (result: UploadResult | BulkUploadResult) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [state, setState] = useState<UseFileUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    uploadedFiles: [],
  });

  const updateState = useCallback((updates: Partial<UseFileUploadState> | ((prev: UseFileUploadState) => Partial<UseFileUploadState>)) => {
    if (typeof updates === 'function') {
      setState(prev => ({ ...prev, ...updates(prev) }));
    } else {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  const resetState = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      uploadedFiles: [],
    });
  }, []);

  // ============================================================================
  // SINGLE FILE UPLOAD
  // ============================================================================

  const uploadSingleFile = useCallback(async (file: File): Promise<UploadResult | null> => {
    try {
      updateState({ isUploading: true, error: null, progress: 0 });
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        updateState(prev => ({ 
          progress: Math.min(prev.progress + 10, 90) 
        }));
      }, 200);

      const result = await uploadFile(file, options);
      
      clearInterval(progressInterval);
      updateState({ progress: 100 });

      if (result.success) {
        updateState(prev => ({
          uploadedFiles: [...prev.uploadedFiles, result],
          isUploading: false,
        }));
        options.onSuccess?.(result);
        return result;
      } else {
        updateState({ 
          error: result.error || 'Upload failed', 
          isUploading: false 
        });
        options.onError?.(result.error || 'Upload failed');
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      updateState({ 
        error: errorMessage, 
        isUploading: false,
        progress: 0 
      });
      options.onError?.(errorMessage);
      return null;
    }
  }, [options, updateState]);

  // ============================================================================
  // MULTIPLE FILES UPLOAD
  // ============================================================================

  const uploadMultiple = useCallback(async (files: File[]): Promise<BulkUploadResult | null> => {
    try {
      updateState({ isUploading: true, error: null, progress: 0 });

      const result = await uploadMultipleFiles(files, options);
      
      updateState({ 
        progress: 100,
        isUploading: false,
        uploadedFiles: result.successful,
      });

      if (result.totalFailed > 0) {
        const errorMessage = `${result.totalFailed} of ${files.length} files failed to upload`;
        updateState({ error: errorMessage });
        options.onError?.(errorMessage);
      }

      options.onSuccess?.(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bulk upload failed';
      updateState({ 
        error: errorMessage, 
        isUploading: false,
        progress: 0 
      });
      options.onError?.(errorMessage);
      return null;
    }
  }, [options, updateState]);

  // ============================================================================
  // TOUR-SPECIFIC UPLOADS
  // ============================================================================

  const uploadTourCover = useCallback(async (file: File, tourId: string): Promise<UploadResult | null> => {
    try {
      updateState({ isUploading: true, error: null, progress: 0 });
      
      const progressInterval = setInterval(() => {
        updateState(prev => ({ 
          progress: Math.min(prev.progress + 15, 90) 
        }));
      }, 300);

      const result = await uploadTourCoverImage(file, tourId);
      
      clearInterval(progressInterval);
      updateState({ progress: 100 });

      if (result.success) {
        updateState(prev => ({
          uploadedFiles: [...prev.uploadedFiles, result],
          isUploading: false,
        }));
        options.onSuccess?.(result);
        return result;
      } else {
        updateState({ 
          error: result.error || 'Cover upload failed', 
          isUploading: false 
        });
        options.onError?.(result.error || 'Cover upload failed');
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Cover upload failed';
      updateState({ 
        error: errorMessage, 
        isUploading: false,
        progress: 0 
      });
      options.onError?.(errorMessage);
      return null;
    }
  }, [options, updateState]);

  const uploadTourGallery = useCallback(async (files: File[], tourId: string): Promise<BulkUploadResult | null> => {
    try {
      updateState({ isUploading: true, error: null, progress: 0 });

      const result = await uploadTourGalleryImages(files, tourId);
      
      updateState({ 
        progress: 100,
        isUploading: false,
        uploadedFiles: result.successful,
      });

      if (result.totalFailed > 0) {
        const errorMessage = `${result.totalFailed} gallery images failed to upload`;
        updateState({ error: errorMessage });
        options.onError?.(errorMessage);
      }

      options.onSuccess?.(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gallery upload failed';
      updateState({ 
        error: errorMessage, 
        isUploading: false,
        progress: 0 
      });
      options.onError?.(errorMessage);
      return null;
    }
  }, [options, updateState]);

  const uploadDocument = useCallback(async (
    file: File, 
    tourId: string, 
    documentType: string
  ): Promise<UploadResult | null> => {
    try {
      updateState({ isUploading: true, error: null, progress: 0 });
      
      const progressInterval = setInterval(() => {
        updateState(prev => ({ 
          progress: Math.min(prev.progress + 12, 90) 
        }));
      }, 250);

      const result = await uploadTourDocument(file, tourId, documentType);
      
      clearInterval(progressInterval);
      updateState({ progress: 100 });

      if (result.success) {
        updateState(prev => ({
          uploadedFiles: [...prev.uploadedFiles, result],
          isUploading: false,
        }));
        options.onSuccess?.(result);
        return result;
      } else {
        updateState({ 
          error: result.error || 'Document upload failed', 
          isUploading: false 
        });
        options.onError?.(result.error || 'Document upload failed');
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Document upload failed';
      updateState({ 
        error: errorMessage, 
        isUploading: false,
        progress: 0 
      });
      options.onError?.(errorMessage);
      return null;
    }
  }, [options, updateState]);

  // ============================================================================
  // FILE DELETION
  // ============================================================================

  const removeFile = useCallback(async (filePath: string, bucket?: string): Promise<boolean> => {
    try {
      const success = await deleteFile(filePath, bucket);
      
      if (success) {
        updateState(prev => ({
          uploadedFiles: prev.uploadedFiles.filter(
            file => file.data?.path !== filePath
          ),
        }));
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      updateState({ error: errorMessage });
      options.onError?.(errorMessage);
      return false;
    }
  }, [options, updateState]);

  // ============================================================================
  // RETURN HOOK INTERFACE
  // ============================================================================

  return {
    // State
    ...state,
    
    // Actions
    uploadSingleFile,
    uploadMultiple,
    uploadTourCover,
    uploadTourGallery,
    uploadDocument,
    removeFile,
    resetState,
    
    // Computed
    hasError: !!state.error,
    hasFiles: state.uploadedFiles.length > 0,
    isIdle: !state.isUploading && state.progress === 0,
    isComplete: !state.isUploading && state.progress === 100,
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook specifically for tour cover image upload
 */
export function useTourCoverUpload(tourId: string, options: UseFileUploadOptions = {}) {
  const upload = useFileUpload(options);
  
  const uploadCover = useCallback((file: File) => {
    return upload.uploadTourCover(file, tourId);
  }, [upload, tourId]);
  
  return {
    ...upload,
    uploadCover,
  };
}

/**
 * Hook specifically for tour gallery upload
 */
export function useTourGalleryUpload(tourId: string, options: UseFileUploadOptions = {}) {
  const upload = useFileUpload(options);
  
  const uploadGallery = useCallback((files: File[]) => {
    return upload.uploadTourGallery(files, tourId);
  }, [upload, tourId]);
  
  return {
    ...upload,
    uploadGallery,
  };
}

/**
 * Hook for general tour-related uploads
 */
export function useTourUpload(tourId: string, options: UseFileUploadOptions = {}) {
  const upload = useFileUpload(options);
  
  const uploadCover = useCallback((file: File) => {
    return upload.uploadTourCover(file, tourId);
  }, [upload, tourId]);
  
  const uploadGallery = useCallback((files: File[]) => {
    return upload.uploadTourGallery(files, tourId);
  }, [upload, tourId]);
  
  const uploadDoc = useCallback((file: File, documentType: string) => {
    return upload.uploadDocument(file, tourId, documentType);
  }, [upload, tourId]);
  
  return {
    ...upload,
    uploadCover,
    uploadGallery,
    uploadDoc,
  };
}
