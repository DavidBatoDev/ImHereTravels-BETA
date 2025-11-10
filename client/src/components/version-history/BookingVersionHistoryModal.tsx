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
  Edit,
  Trash2,
} from "lucide-react";

import {
  BookingVersionSnapshot,
  VersionHistoryFilters,
  VersionHistoryProps,
  RestoreResult,
} from "@/types/version-history";
import { SheetColumn, SheetData } from "@/types/sheet-management";
import { bookingVersionHistoryService } from "@/services/booking-version-history-service";
import { useToast } from "@/hooks/use-toast";
import BookingVersionHistoryGrid from "./BookingVersionHistoryGrid";

interface BookingVersionHistoryModalProps extends VersionHistoryProps {
  columns: SheetColumn[];
  currentUserId?: string;
  currentUserName?: string;
  allBookingsData?: any[]; // All current bookings data to display in the grid
}

export default function BookingVersionHistoryModal({
  bookingId,
  isOpen,
  onClose,
  onRestore,
  columns,
  currentUserId = "anonymous",
  currentUserName = "Unknown User",
  allBookingsData = [],
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

  const loadVersions = useCallback(async () => {
    if (!bookingId) {
      // Load all versions if no specific booking
      setIsLoading(true);
      setError(null);
      try {
        console.log("🔍 [VERSION MODAL] Loading all versions...");
        const allVersions = await bookingVersionHistoryService.getAllVersions({
          orderBy: "createdAt",
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

  // Load versions when modal opens or bookingId changes
  useEffect(() => {
    if (isOpen) {
      loadVersions();
    } else {
      // Reset selection when modal closes
      setSelectedVersionId(undefined);
      setComparisonVersionId(undefined);
    }
  }, [isOpen, bookingId, loadVersions]);

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

    // Sort by version number descending (latest first)
    filtered.sort((a, b) => b.versionNumber - a.versionNumber);

    setFilteredVersions(filtered);
  }, [versions, searchTerm, changeTypeFilter, branchFilter]);

  // Auto-select the latest version when filtered versions change (when modal first opens)
  useEffect(() => {
    if (filteredVersions.length > 0 && !selectedVersionId) {
      setSelectedVersionId(filteredVersions[0].id);
      console.log(
        "🔍 [VERSION MODAL] Auto-selected latest version:",
        filteredVersions[0].versionNumber
      );
    }
  }, [filteredVersions, selectedVersionId]);

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
    async (versionId: string, reconstructedData?: SheetData[]) => {
      const version = versions.find((v) => v.id === versionId);
      if (!version) {
        toast({
          title: "❌ Version Not Found",
          description: "The selected version could not be found",
          variant: "destructive",
        });
        return;
      }

      const targetBookingId =
        version.bookingId ||
        (typeof version.documentSnapshot?.id === "string"
          ? version.documentSnapshot.id
          : undefined) ||
        bookingId;

      if (!targetBookingId) {
        toast({
          title: "❌ Cannot Restore",
          description: "No booking ID available for restoration",
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
          await bookingVersionHistoryService.restoreVersion(targetBookingId, {
            targetVersionId: versionId,
            userId: currentUserId,
            userName: currentUserName,
            reconstructedGridData: reconstructedData, // Pass the pre-reconstructed grid data
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
        <div className="flex-1 min-h-0 flex gap-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full w-full">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Loading version history...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full w-full">
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
            <div className="flex items-center justify-center h-full w-full">
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
            <>
              {/* Left Sidebar - Timeline */}
              <div className="w-72 flex-shrink-0 border-r overflow-y-auto px-4 py-6 scrollbar-hide">
                <div className="relative flex flex-col gap-4">
                  {/* Timeline vertical line */}
                  <div
                    className="absolute left-5 top-0 bottom-0 w-2 bg-purple-300 rounded-full"
                    style={{ zIndex: 0 }}
                  />
                  {filteredVersions.map((version, idx) => {
                    const isSelected = selectedVersionId === version.id;
                    const isComparison = comparisonVersionId === version.id;
                    // Color coding by changeType
                    let nodeColor = "bg-gray-400 border-gray-400";
                    let icon = <Clock className="h-4 w-4 text-white" />;
                    if (version.metadata.changeType === "create") {
                      nodeColor = "bg-green-500 border-green-500";
                      icon = <CheckCircle className="h-4 w-4 text-white" />;
                    } else if (version.metadata.changeType === "update") {
                      nodeColor = "bg-yellow-400 border-yellow-400";
                      icon = <Edit className="h-4 w-4 text-white" />;
                    } else if (version.metadata.changeType === "delete") {
                      nodeColor = "bg-red-500 border-red-500";
                      icon = <Trash2 className="h-4 w-4 text-white" />;
                    } else if (version.metadata.changeType === "restore") {
                      nodeColor = "bg-blue-500 border-blue-500";
                      icon = <RotateCcw className="h-4 w-4 text-white" />;
                    } else if (
                      version.metadata.changeType?.startsWith("bulk_")
                    ) {
                      nodeColor = "bg-blue-400 border-blue-400";
                      icon = <GitBranch className="h-4 w-4 text-white" />;
                    }

                    return (
                      <div
                        key={version.id}
                        className="relative flex items-start gap-4 group cursor-pointer"
                        onClick={() => handleVersionSelect(version.id)}
                      >
                        {/* Timeline node */}
                        <div
                          className={`z-10 w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all duration-150 ${nodeColor} ${
                            isSelected ? "scale-125 shadow-lg" : "opacity-100"
                          }`}
                        >
                          {icon}
                        </div>
                        {/* Details panel styled like Daily Itinerary */}
                        <div
                          className={`flex-1 py-1 px-2 rounded-lg transition-all duration-150 min-h-[60px] ${
                            isSelected ? "bg-muted/30" : "bg-background"
                          } shadow-sm ml-2`}
                        >
                          <div className="text-[10px] text-muted-foreground mb-0.5">
                            {(() => {
                              const timestamp = version.metadata.createdAt;
                              if (!timestamp) return "Unknown";
                              try {
                                if (
                                  timestamp.toDate &&
                                  typeof timestamp.toDate === "function"
                                ) {
                                  return timestamp.toDate().toLocaleString();
                                }
                                if (timestamp instanceof Date) {
                                  return timestamp.toLocaleString();
                                }
                                if (timestamp.seconds) {
                                  return new Date(
                                    timestamp.seconds * 1000
                                  ).toLocaleString();
                                }
                                if (typeof timestamp === "number") {
                                  return new Date(timestamp).toLocaleString();
                                }
                                return "Unknown";
                              } catch (error) {
                                return "Invalid Date";
                              }
                            })()}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {version.metadata.createdByName ||
                                version.metadata.createdBy}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="flex gap-1 mt-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-6 px-1 text-[10px] flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVersionRestore(version.id);
                                }}
                                disabled={isRestoring}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Restore
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Side - Data Grid */}
              <div className="flex-1 min-w-0">
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
                  allBookingsData={allBookingsData}
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
