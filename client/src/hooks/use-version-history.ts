import { useState, useEffect, useCallback } from "react";
import {
  BookingVersionSnapshot,
  VersionHistoryFilters,
  VersionHistoryQueryOptions,
  RestoreResult,
} from "@/types/version-history";
import { bookingVersionHistoryService } from "@/services/booking-version-history-service";

interface UseVersionHistoryOptions {
  bookingId?: string;
  autoLoad?: boolean;
  queryOptions?: VersionHistoryQueryOptions;
}

interface UseVersionHistoryReturn {
  versions: BookingVersionSnapshot[];
  isLoading: boolean;
  error: string | null;
  selectedVersionId: string | undefined;
  comparisonVersionId: string | undefined;
  
  // Actions
  loadVersions: () => Promise<void>;
  selectVersion: (versionId: string) => void;
  setComparisonVersion: (versionId: string | undefined) => void;
  restoreVersion: (versionId: string, userId: string, userName?: string) => Promise<RestoreResult>;
  
  // Utilities
  getVersion: (versionId: string) => BookingVersionSnapshot | undefined;
  getLatestVersion: () => BookingVersionSnapshot | undefined;
  getVersionCount: () => number;
}

export function useVersionHistory(options: UseVersionHistoryOptions = {}): UseVersionHistoryReturn {
  const { bookingId, autoLoad = true, queryOptions } = options;
  
  const [versions, setVersions] = useState<BookingVersionSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const [comparisonVersionId, setComparisonVersionId] = useState<string | undefined>();

  const loadVersions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let loadedVersions: BookingVersionSnapshot[];
      
      if (bookingId) {
        loadedVersions = await bookingVersionHistoryService.getVersionsForBooking(
          bookingId,
          queryOptions
        );
      } else {
        loadedVersions = await bookingVersionHistoryService.getAllVersions(
          queryOptions
        );
      }
      
      setVersions(loadedVersions);
      
      // Auto-select the latest version if none selected
      if (!selectedVersionId && loadedVersions.length > 0) {
        setSelectedVersionId(loadedVersions[0].id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load version history";
      setError(errorMessage);
      console.error("Failed to load version history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, queryOptions, selectedVersionId]);

  const selectVersion = useCallback((versionId: string) => {
    setSelectedVersionId(versionId);
  }, []);

  const setComparisonVersion = useCallback((versionId: string | undefined) => {
    setComparisonVersionId(versionId);
  }, []);

  const restoreVersion = useCallback(async (
    versionId: string,
    userId: string,
    userName?: string
  ): Promise<RestoreResult> => {
    if (!bookingId) {
      return {
        success: false,
        error: "No booking ID specified for restoration",
      };
    }

    try {
      const result = await bookingVersionHistoryService.restoreVersion(bookingId, {
        targetVersionId: versionId,
        userId,
        userName,
      });

      if (result.success) {
        // Reload versions to show the new restore point
        await loadVersions();
        
        // Select the new version if created
        if (result.newVersionId) {
          setSelectedVersionId(result.newVersionId);
        }
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to restore version";
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [bookingId, loadVersions]);

  const getVersion = useCallback((versionId: string): BookingVersionSnapshot | undefined => {
    return versions.find(v => v.id === versionId);
  }, [versions]);

  const getLatestVersion = useCallback((): BookingVersionSnapshot | undefined => {
    if (versions.length === 0) return undefined;
    return versions.reduce((latest, current) => 
      current.versionNumber > latest.versionNumber ? current : latest
    );
  }, [versions]);

  const getVersionCount = useCallback((): number => {
    return versions.length;
  }, [versions]);

  // Auto-load versions when hook is initialized or bookingId changes
  useEffect(() => {
    if (autoLoad) {
      loadVersions();
    }
  }, [autoLoad, loadVersions]);

  return {
    versions,
    isLoading,
    error,
    selectedVersionId,
    comparisonVersionId,
    
    loadVersions,
    selectVersion,
    setComparisonVersion,
    restoreVersion,
    
    getVersion,
    getLatestVersion,
    getVersionCount,
  };
}
