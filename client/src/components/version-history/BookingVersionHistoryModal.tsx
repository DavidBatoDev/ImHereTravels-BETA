"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  X,
  Search,
  Filter,
  History,
  GitBranch,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  RefreshCw,
} from "lucide-react";

import {
  BookingVersionSnapshot,
  VersionHistoryFilters,
  VersionHistoryProps,
  RestoreResult,
} from "@/types/version-history";
import { SheetColumn } from "@/types/sheet-management";
import { bookingVersionHistoryService } from "@/services/booking-version-history-service";
import { useToast } from "@/hooks/use-toast";
import BookingVersionHistoryGrid from "./BookingVersionHistoryGrid";

interface BookingVersionHistoryModalProps extends VersionHistoryProps {
  columns: SheetColumn[];
  currentUserId?: string;
  currentUserName?: string;
}

export default function BookingVersionHistoryModal({
  bookingId,
  isOpen,
  onClose,
  onRestore,
  columns,
  currentUserId = "anonymous",
  currentUserName = "Unknown User",
}: BookingVersionHistoryModalProps) {
  const { toast } = useToast();

  // State
  const [versions, setVersions] = useState<BookingVersionSnapshot[]>([]);
  const [filteredVersions, setFilteredVersions] = useState<
    BookingVersionSnapshot[]
  >([]);
  const [selectedVersionId, setSelectedVersionId] = useState<
    string | undefined
  >();
  const [comparisonVersionId, setComparisonVersionId] = useState<
    string | undefined
  >();
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Load versions when modal opens or bookingId changes
  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, bookingId]);

  // Filter versions based on search and filters
  useEffect(() => {
    let filtered = [...versions];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((version) => {
        return (
          version.metadata.changeDescription
            ?.toLowerCase()
            .includes(searchLower) ||
          version.metadata.createdByName?.toLowerCase().includes(searchLower) ||
          version.metadata.createdBy.toLowerCase().includes(searchLower) ||
          version.versionNumber.toString().includes(searchLower) ||
          version.changes.some(
            (change) =>
              change.fieldName.toLowerCase().includes(searchLower) ||
              change.newValue?.toString().toLowerCase().includes(searchLower)
          )
        );
      });
    }

    // Apply change type filter
    if (changeTypeFilter !== "all") {
      filtered = filtered.filter(
        (version) => version.metadata.changeType === changeTypeFilter
      );
    }

    // Apply branch filter
    if (branchFilter === "main") {
      filtered = filtered.filter((version) => version.branchInfo.isMainBranch);
    } else if (branchFilter === "restore") {
      filtered = filtered.filter((version) => version.metadata.isRestorePoint);
    }

    setFilteredVersions(filtered);
  }, [versions, searchTerm, changeTypeFilter, branchFilter]);

  const loadVersions = useCallback(async () => {
    if (!bookingId) {
      // Load all versions if no specific booking
      setIsLoading(true);
      setError(null);
      try {
        console.log("🔍 [VERSION MODAL] Loading all versions...");
        const allVersions = await bookingVersionHistoryService.getAllVersions({
          orderBy: "metadata.createdAt",
          orderDirection: "desc",
          limit: 100,
        });
        console.log("🔍 [VERSION MODAL] Loaded versions:", allVersions.length);
        setVersions(allVersions);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load versions";
        setError(errorMessage);
        toast({
          title: "❌ Failed to Load Version History",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Load versions for specific booking
      setIsLoading(true);
      setError(null);
      try {
        console.log(
          "🔍 [VERSION MODAL] Loading versions for booking:",
          bookingId
        );
        const bookingVersions =
          await bookingVersionHistoryService.getVersionsForBooking(bookingId, {
            orderBy: "versionNumber",
            orderDirection: "desc",
          });
        console.log(
          "🔍 [VERSION MODAL] Loaded booking versions:",
          bookingVersions.length
        );
        setVersions(bookingVersions);

        // Auto-select the latest version
        if (bookingVersions.length > 0) {
          setSelectedVersionId(bookingVersions[0].id);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load version history";
        setError(errorMessage);
        toast({
          title: "❌ Failed to Load Version History",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  }, [bookingId, toast]);

  const handleVersionSelect = useCallback((versionId: string) => {
    setSelectedVersionId(versionId);
  }, []);

  const handleVersionCompare = useCallback(
    (versionId: string) => {
      if (comparisonVersionId === versionId) {
        setComparisonVersionId(undefined);
      } else {
        setComparisonVersionId(versionId);
      }
    },
    [comparisonVersionId]
  );

  const handleVersionRestore = useCallback(
    async (versionId: string) => {
      if (!bookingId) {
        toast({
          title: "❌ Cannot Restore",
          description: "No booking ID specified for restoration",
          variant: "destructive",
        });
        return;
      }

      const version = versions.find((v) => v.id === versionId);
      if (!version) {
        toast({
          title: "❌ Version Not Found",
          description: "The selected version could not be found",
          variant: "destructive",
        });
        return;
      }

      // Confirm restoration
      const confirmed = window.confirm(
        `Are you sure you want to restore to version ${version.versionNumber}?\n\n` +
          `This will create a new version with the data from version ${version.versionNumber}. ` +
          `The current data will be preserved in the version history.`
      );

      if (!confirmed) return;

      setIsRestoring(true);
      try {
        const result: RestoreResult =
          await bookingVersionHistoryService.restoreVersion(bookingId, {
            targetVersionId: versionId,
            userId: currentUserId,
            userName: currentUserName,
          });

        if (result.success) {
          toast({
            title: "✅ Version Restored",
            description: `Successfully restored to version ${version.versionNumber}. New version ${result.newVersionNumber} created.`,
            variant: "default",
          });

          // Reload versions to show the new restore point
          await loadVersions();

          // Select the new version
          if (result.newVersionId) {
            setSelectedVersionId(result.newVersionId);
          }

          // Notify parent component
          if (onRestore) {
            onRestore(versionId);
          }
        } else {
          toast({
            title: "❌ Restore Failed",
            description: result.error || "Failed to restore version",
            variant: "destructive",
          });
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to restore version";
        toast({
          title: "❌ Restore Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsRestoring(false);
      }
    },
    [
      bookingId,
      versions,
      currentUserId,
      currentUserName,
      toast,
      loadVersions,
      onRestore,
    ]
  );

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setChangeTypeFilter("all");
    setBranchFilter("all");
  }, []);

  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (searchTerm) count++;
    if (changeTypeFilter !== "all") count++;
    if (branchFilter !== "all") count++;
    return count;
  }, [searchTerm, changeTypeFilter, branchFilter]);

  // Get unique change types for filter dropdown
  const changeTypes = Array.from(
    new Set(versions.map((v) => v.metadata.changeType))
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-royal-purple" />
            <DialogTitle className="text-xl font-bold">
              {bookingId
                ? `Version History - Booking ${bookingId}`
                : "All Version History"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Filters and Search */}
        <div className="flex-shrink-0 space-y-4 border-b pb-4">
          {/* Main Controls */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search versions, users, changes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={loadVersions}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            {getActiveFiltersCount() > 0 && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-md">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Change Type
                </label>
                <Select
                  value={changeTypeFilter}
                  onValueChange={setChangeTypeFilter}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {changeTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() +
                          type.slice(1).replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Branch</label>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    <SelectItem value="main">Main Branch</SelectItem>
                    <SelectItem value="restore">Restore Points</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredVersions.length} of {versions.length}{" "}
                  versions
                </div>
              </div>
            </div>
          )}

          {/* Status Bar */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {selectedVersionId && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>
                    Selected: Version{" "}
                    {
                      versions.find((v) => v.id === selectedVersionId)
                        ?.versionNumber
                    }
                  </span>
                </div>
              )}

              {comparisonVersionId && (
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-blue-600" />
                  <span>
                    Comparing with: Version{" "}
                    {
                      versions.find((v) => v.id === comparisonVersionId)
                        ?.versionNumber
                    }
                  </span>
                </div>
              )}
            </div>

            {isRestoring && (
              <div className="flex items-center gap-2 text-orange-600">
                <RotateCcw className="h-4 w-4 animate-spin" />
                <span>Restoring version...</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Loading version history...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-600 font-medium">
                  Failed to load version history
                </p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <Button
                  variant="outline"
                  onClick={loadVersions}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : filteredVersions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground font-medium">
                  No version history found
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {versions.length === 0
                    ? "This booking has no version history yet"
                    : "No versions match your current filters"}
                </p>
                {getActiveFiltersCount() > 0 && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <BookingVersionHistoryGrid
              columns={columns}
              versions={filteredVersions}
              selectedVersionId={selectedVersionId}
              comparisonVersionId={comparisonVersionId}
              onVersionSelect={handleVersionSelect}
              onVersionRestore={handleVersionRestore}
              onVersionCompare={handleVersionCompare}
              isRestoring={isRestoring}
              className="h-full"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
