"use client";

import React, { useState, useMemo, useCallback, useEffect, memo } from "react";
// Import react-data-grid components
// @ts-expect-error - react-data-grid v7 has incorrect type definitions
import { DataGrid } from "react-data-grid";
import "react-data-grid/lib/styles.css";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RotateCcw,
  Clock,
  User,
  GitBranch,
  Eye,
  ArrowRight,
} from "lucide-react";

import {
  BookingVersionSnapshot,
  VersionHighlightedData,
  VersionComparison,
} from "@/types/version-history";
import { SheetColumn } from "@/types/sheet-management";
import { bookingVersionHistoryService } from "@/services/booking-version-history-service";

// Define types manually since the package types are not matching
type Column<TRow> = {
  key: string;
  name: string;
  width?: number | string;
  resizable?: boolean;
  sortable?: boolean;
  frozen?: boolean;
  renderCell?: (props: { row: TRow; column: any }) => React.ReactNode;
  renderHeaderCell?: (props: { column: any }) => React.ReactNode;
  [key: string]: any;
};

interface BookingVersionHistoryGridProps {
  columns: SheetColumn[];
  versions: BookingVersionSnapshot[];
  selectedVersionId?: string;
  comparisonVersionId?: string;
  onVersionSelect: (versionId: string) => void;
  onVersionRestore: (versionId: string) => void;
  onVersionCompare?: (versionId: string) => void;
  isRestoring?: boolean;
  className?: string;
}

export default function BookingVersionHistoryGrid({
  columns,
  versions,
  selectedVersionId,
  comparisonVersionId,
  onVersionSelect,
  onVersionRestore,
  onVersionCompare,
  isRestoring = false,
  className = "",
}: BookingVersionHistoryGridProps) {
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);

  // Create version-highlighted data from versions
  const versionData = useMemo<VersionHighlightedData[]>(() => {
    return versions.map((version) => ({
      ...version.documentSnapshot,
      _versionInfo: {
        versionId: version.id,
        versionNumber: version.versionNumber,
        isRestorePoint: version.metadata.isRestorePoint,
        changedFields: version.changes.map((change) => change.fieldPath),
        metadata: version.metadata,
      },
    }));
  }, [versions]);

  // Load comparison when comparison version changes
  useEffect(() => {
    if (
      selectedVersionId &&
      comparisonVersionId &&
      selectedVersionId !== comparisonVersionId
    ) {
      setIsLoadingComparison(true);
      bookingVersionHistoryService
        .compareVersions(comparisonVersionId, selectedVersionId)
        .then(setComparison)
        .catch((error) => {
          console.error("Failed to load version comparison:", error);
          setComparison(null);
        })
        .finally(() => setIsLoadingComparison(false));
    } else {
      setComparison(null);
    }
  }, [selectedVersionId, comparisonVersionId]);

  // Helper function to get change type for a field
  const getFieldChangeType = useCallback(
    (
      fieldPath: string,
      versionInfo: VersionHighlightedData["_versionInfo"]
    ) => {
      if (!versionInfo) return null;

      // Debug logging for specific fields
      if (fieldPath === "customerName" || fieldPath === "email") {
        console.log(`🔍 [CHANGE TYPE DEBUG] Field: ${fieldPath}`, {
          changedFields: versionInfo.changedFields,
          isIncluded: versionInfo.changedFields.includes(fieldPath),
          versionId: versionInfo.versionId,
        });
      }

      // Check if field changed in this version
      if (versionInfo.changedFields.includes(fieldPath)) {
        return "changed";
      }

      // Check if field changed in comparison
      if (comparison) {
        const isChanged = comparison.changedFields.some(
          (change) => change.fieldPath === fieldPath
        );
        if (isChanged) return "comparison";
      }

      return null;
    },
    [comparison]
  );

  // Helper function to get change details for tooltip
  const getChangeDetails = useCallback(
    (
      fieldPath: string,
      versionInfo: VersionHighlightedData["_versionInfo"]
    ) => {
      if (!versionInfo) return null;

      const version = versions.find((v) => v.id === versionInfo.versionId);
      if (!version) return null;

      const change = version.changes.find((c) => c.fieldPath === fieldPath);
      if (!change) return null;

      return {
        fieldName: change.fieldName,
        oldValue: change.oldValue,
        newValue: change.newValue,
        dataType: change.dataType,
      };
    },
    [versions]
  );

  // Version info column (frozen left column)
  const versionInfoColumn: Column<VersionHighlightedData> = {
    key: "versionInfo",
    name: "Version",
    width: 200,
    minWidth: 180,
    maxWidth: 250,
    resizable: true,
    sortable: false,
    frozen: true,
    renderHeaderCell: () => (
      <div className="flex items-center justify-center h-full px-2">
        <span className="font-semibold text-foreground">Version Info</span>
      </div>
    ),
    renderCell: ({ row }) => {
      const versionInfo = row._versionInfo;
      if (!versionInfo) return <div className="p-2">-</div>;

      const isSelected = selectedVersionId === versionInfo.versionId;
      const isComparison = comparisonVersionId === versionInfo.versionId;

      return (
        <div
          className={`p-2 h-full flex flex-col justify-center cursor-pointer transition-colors ${
            isSelected
              ? "bg-royal-purple/20 border-l-4 border-royal-purple"
              : isComparison
              ? "bg-blue-100 border-l-4 border-blue-500"
              : "hover:bg-gray-50"
          }`}
          onClick={() => onVersionSelect(versionInfo.versionId)}
        >
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant={versionInfo.isRestorePoint ? "destructive" : "default"}
              className="text-xs"
            >
              v{versionInfo.versionNumber}
            </Badge>
            {versionInfo.isRestorePoint && (
              <GitBranch className="h-3 w-3 text-orange-600" />
            )}
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {(() => {
              const timestamp = versionInfo.metadata.createdAt;
              if (!timestamp) return "Unknown";

              // Timestamp is now properly handled by the service layer

              try {
                // Handle Firestore Timestamp
                if (
                  timestamp.toDate &&
                  typeof timestamp.toDate === "function"
                ) {
                  return timestamp.toDate().toLocaleString();
                }
                // Handle if it's already a Date object
                if (timestamp instanceof Date) {
                  return timestamp.toLocaleString();
                }
                // Handle if it's a timestamp object with seconds/nanoseconds
                if (timestamp.seconds) {
                  return new Date(timestamp.seconds * 1000).toLocaleString();
                }
                // Handle if it's a number (milliseconds)
                if (typeof timestamp === "number") {
                  return new Date(timestamp).toLocaleString();
                }
                return "Unknown";
              } catch (error) {
                console.error("Error formatting timestamp:", error, timestamp);
                return "Invalid Date";
              }
            })()}
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <User className="h-3 w-3" />
            {versionInfo.metadata.createdByName ||
              versionInfo.metadata.createdBy}
          </div>

          <div className="flex gap-1 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onVersionRestore(versionInfo.versionId);
              }}
              disabled={isRestoring}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Restore
            </Button>

            {onVersionCompare && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onVersionCompare(versionInfo.versionId);
                }}
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      );
    },
  };

  // Row number column (similar to BookingsDataGrid)
  const rowNumberColumn: Column<VersionHighlightedData> = {
    key: "row",
    name: "Row #",
    width: 80,
    minWidth: 60,
    maxWidth: 100,
    resizable: true,
    sortable: false,
    frozen: true,
    renderCell: ({ row }) => {
      const rowNumber = row.row;
      const versionInfo = row._versionInfo;
      const isNewBooking = versionInfo?.metadata?.changeType === "create";

      return (
        <div
          className={`h-full w-full flex items-center justify-center text-xs font-mono px-2 bg-muted/50 border-r border-border relative ${
            !isNewBooking ? "opacity-40" : ""
          }`}
          title={`Row ${rowNumber} (Booking ID: ${row.id})`}
        >
          {!isNewBooking && (
            <div className="absolute inset-0 bg-gray-200/30 pointer-events-none" />
          )}
          <span className="font-semibold text-royal-purple relative z-10">
            {typeof rowNumber === "number" ? rowNumber : "-"}
          </span>
        </div>
      );
    },
    renderHeaderCell: () => (
      <div className="h-full w-full flex items-center justify-center text-xs font-semibold bg-muted border-r border-border">
        Row #
      </div>
    ),
  };

  // Convert SheetColumn to react-data-grid Column format with change highlighting
  const gridColumns = useMemo<Column<VersionHighlightedData>[]>(() => {
    // Safety check for columns
    if (!columns || !Array.isArray(columns)) {
      return [versionInfoColumn, rowNumberColumn];
    }

    const dataColumns = columns
      .filter(
        (col) => col && col.id && col.columnName && col.showColumn !== false
      )
      .sort((a, b) => a.order - b.order)
      .map((col) => {
        const baseColumn: Column<VersionHighlightedData> = {
          key: col.id,
          name: col.columnName,
          width: col.width || 150,
          minWidth: 50,
          maxWidth: 3000,
          resizable: true,
          sortable: false,
        };

        // Add group-based background styling for cells
        const parentTab = col.parentTab || "General";
        const sortedColumns = columns
          .filter((c) => c && c.id && c.columnName)
          .sort((a, b) => a.order - b.order);
        const currentIndex = sortedColumns.findIndex((c) => c.id === col.id);
        const isFirstInGroup =
          currentIndex === 0 ||
          sortedColumns[currentIndex - 1].parentTab !== parentTab;
        const isLastInGroup =
          currentIndex === sortedColumns.length - 1 ||
          sortedColumns[currentIndex + 1].parentTab !== parentTab;

        // Apply group-based cell styling
        let cellClass = "";
        if (isFirstInGroup && isLastInGroup) {
          cellClass = "bg-gray-100 border-l border-r border-gray-300";
        } else if (isFirstInGroup) {
          cellClass = "bg-gray-100 border-l border-r border-gray-300";
        } else if (isLastInGroup) {
          cellClass = "bg-gray-100 border-l border-r border-gray-300";
        } else {
          cellClass = "bg-gray-100 border-l border-r border-gray-300";
        }

        // Override with individual column color if specified
        if (col.color && col.color !== "none") {
          const colorClasses = {
            purple:
              "bg-royal-purple/8 border-l border-r border-royal-purple/40",
            blue: "bg-blue-100 border-l border-r border-royal-purple/40",
            green: "bg-green-100 border-l border-r border-royal-purple/40",
            yellow: "bg-yellow-100 border-l border-r border-royal-purple/40",
            orange: "bg-orange-100 border-l border-r border-royal-purple/40",
            red: "bg-red-100 border-l border-r border-royal-purple/40",
            pink: "bg-pink-100 border-l border-r border-royal-purple/40",
            cyan: "bg-cyan-100 border-l border-r border-royal-purple/40",
            gray: "bg-gray-100 border-l border-r border-royal-purple/40",
          };
          cellClass = colorClasses[col.color] || cellClass;
        }

        // Apply cell styling with change highlighting
        (baseColumn as any).cellClass = (row: VersionHighlightedData) => {
          const changeType = getFieldChangeType(col.id, row._versionInfo);
          const versionInfo = row._versionInfo;
          const isNewBooking = versionInfo?.metadata?.changeType === "create";

          // Debug logging to understand what's happening
          if (col.id === "customerName" || col.id === "email") {
            console.log(`🔍 [CELL STYLING DEBUG] Column: ${col.id}`, {
              changeType,
              isNewBooking,
              changedFields: versionInfo?.changedFields,
              versionId: versionInfo?.versionId,
            });
          }

          let classes = [cellClass];

          // Add change highlighting - changed cells should be bright and highlighted
          if (changeType === "changed") {
            classes.push("bg-green-200 border-2 border-green-500 relative");
            // Ensure changed cells are NOT dimmed by removing any opacity classes
          } else if (changeType === "comparison") {
            classes.push("bg-yellow-200 border-2 border-yellow-500 relative");
            // Ensure comparison cells are NOT dimmed by removing any opacity classes
          } else if (
            !isNewBooking &&
            changeType !== "changed" &&
            changeType !== "comparison"
          ) {
            // Only dim cells that are truly unchanged (not new booking, not changed, not comparison)
            classes.push("opacity-40 bg-gray-50/80 relative");
            // Add subtle overlay to further emphasize the dimming
            classes.push(
              "after:absolute after:inset-0 after:bg-gray-200/30 after:pointer-events-none"
            );
          }

          return classes.join(" ");
        };

        // Add custom header with parent tab
        baseColumn.renderHeaderCell = ({ column }) => {
          const parentTab = col.parentTab || "General";
          const sortedColumns = columns
            .filter((c) => c && c.id && c.columnName)
            .sort((a, b) => a.order - b.order);
          const currentIndex = sortedColumns.findIndex((c) => c.id === col.id);
          const isFirstInGroup =
            currentIndex === 0 ||
            sortedColumns[currentIndex - 1].parentTab !== parentTab;
          const isLastInGroup =
            currentIndex === sortedColumns.length - 1 ||
            sortedColumns[currentIndex + 1].parentTab !== parentTab;

          let parentTabWidth = column.width || 150;
          if (isFirstInGroup && !isLastInGroup) {
            let groupWidth = 0;
            for (let i = currentIndex; i < sortedColumns.length; i++) {
              if (sortedColumns[i].parentTab === parentTab) {
                groupWidth += sortedColumns[i].width || 150;
              } else {
                break;
              }
            }
            parentTabWidth = groupWidth;
          }

          return (
            <div className="flex flex-col w-full h-full relative">
              {/* Parent Tab Row */}
              {isFirstInGroup && isLastInGroup && (
                <div
                  className="bg-gray-400 border-r border-l border-gray-900 px-2 py-1 text-xs font-semibold text-white uppercase tracking-wide absolute top-0 left-0 z-10 flex items-center"
                  style={{ height: "40px" }}
                >
                  <div className="z-[999999999] flex items-center justify-center w-full">
                    {parentTab}
                  </div>
                </div>
              )}
              {isFirstInGroup && !isLastInGroup && (
                <div
                  className="bg-gray-400 border-r border-gray-900 px-2 py-1 text-xs font-semibold text-white uppercase tracking-wide absolute top-0 left-0 z-10 flex items-center"
                  style={{
                    width: `${parentTabWidth}px`,
                    height: "40px",
                  }}
                >
                  <div className="z-[999999999] flex items-center justify-center">
                    {parentTab}
                  </div>
                </div>
              )}
              {!isFirstInGroup && (
                <div
                  className="bg-gray-400 absolute top-0 left-0 z-5 w-full"
                  style={{ height: "40px" }}
                />
              )}
              {isLastInGroup && (
                <div
                  className="bg-gray-400 border-r border-gray-900 absolute top-0 left-0 z-5 w-full"
                  style={{ height: "40px" }}
                />
              )}

              {/* Column Name Row */}
              <div className="flex items-center justify-center flex-1 px-2 mt-10 bg-black text-white">
                <span className="font-medium text-xs">{column.name}</span>
              </div>
            </div>
          );
        };

        // Add header height styling
        (baseColumn as any).headerCellClass = "bg-black h-20 !p-0 text-xs";

        // Render cell with change highlighting and tooltips
        baseColumn.renderCell = ({ row, column }) => {
          const cellValue = row[column.key as keyof VersionHighlightedData];
          const versionInfo = row._versionInfo;
          const changeType = getFieldChangeType(col.id, versionInfo);
          const changeDetails = getChangeDetails(col.id, versionInfo);

          let displayValue = "";
          if (cellValue !== null && cellValue !== undefined) {
            if (col.dataType === "date" && cellValue) {
              try {
                let date: Date | null = null;
                if (
                  cellValue &&
                  typeof cellValue === "object" &&
                  "toDate" in cellValue &&
                  typeof (cellValue as any).toDate === "function"
                ) {
                  date = (cellValue as any).toDate();
                } else if (
                  cellValue &&
                  typeof cellValue === "object" &&
                  "seconds" in cellValue &&
                  typeof (cellValue as any).seconds === "number"
                ) {
                  date = new Date((cellValue as any).seconds * 1000);
                } else if (typeof cellValue === "number") {
                  if (cellValue > 1000000000000) {
                    date = new Date(cellValue);
                  } else {
                    date = new Date(cellValue * 1000);
                  }
                } else if (typeof cellValue === "string") {
                  const numericValue = parseFloat(cellValue);
                  if (!isNaN(numericValue)) {
                    if (numericValue > 1000000000000) {
                      date = new Date(numericValue);
                    } else {
                      date = new Date(numericValue * 1000);
                    }
                  } else {
                    date = new Date(cellValue);
                  }
                } else if (cellValue instanceof Date) {
                  date = cellValue;
                }
                if (date && !isNaN(date.getTime())) {
                  displayValue = date.toLocaleDateString();
                }
              } catch {
                displayValue = cellValue.toString();
              }
            } else if (col.dataType === "boolean") {
              displayValue = cellValue ? "✓" : "✗";
            } else if (col.dataType === "currency") {
              const numValue =
                typeof cellValue === "number"
                  ? cellValue
                  : parseFloat(cellValue?.toString() || "0");
              displayValue = isNaN(numValue) ? "0" : numValue.toFixed(2);
            } else {
              displayValue = cellValue.toString();
            }
          }

          const cellContent = (
            <div className="h-8 w-full flex items-center px-2 text-xs relative">
              {changeType && (
                <div className="absolute top-0 right-0 w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-current z-10" />
              )}
              <span className="truncate">{displayValue}</span>
            </div>
          );

          if (changeDetails) {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-1">
                      <div className="font-semibold">
                        {changeDetails.fieldName}
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">Old:</span>
                          <span>
                            {changeDetails.oldValue?.toString() || "(empty)"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-3 w-3" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">New:</span>
                          <span>
                            {changeDetails.newValue?.toString() || "(empty)"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          return cellContent;
        };

        return baseColumn;
      });

    return [versionInfoColumn, rowNumberColumn, ...dataColumns];
  }, [
    columns,
    versionInfoColumn,
    rowNumberColumn,
    selectedVersionId,
    comparisonVersionId,
    onVersionSelect,
    onVersionRestore,
    onVersionCompare,
    isRestoring,
    getFieldChangeType,
    getChangeDetails,
  ]);

  return (
    <div className={`version-history-grid ${className}`}>
      {/* Comparison Status */}
      {isLoadingComparison && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2">
            <Progress value={undefined} className="flex-1" />
            <span className="text-sm text-blue-700">Loading comparison...</span>
          </div>
        </div>
      )}

      {comparison && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="text-sm text-yellow-800">
            <strong>Comparing:</strong> v{comparison.fromVersion.versionNumber}{" "}
            → v{comparison.toVersion.versionNumber}
            {comparison.changedFields.length > 0 && (
              <span className="ml-2">
                ({comparison.changedFields.length} field
                {comparison.changedFields.length !== 1 ? "s" : ""} changed)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Data Grid */}
      <div className="border border-royal-purple/20 rounded-md shadow-lg overflow-hidden">
        <TooltipProvider>
          <DataGrid
            columns={gridColumns}
            rows={versionData}
            headerRowHeight={80}
            rowHeight={40}
            className="rdg-light custom-grid version-history-grid"
            style={
              {
                height: 600,
                "--rdg-border-color": "hsl(var(--border))",
                "--rdg-header-background-color": "hsl(var(--muted))",
                "--rdg-row-hover-background-color": "hsl(var(--muted) / 0.5)",
                "--rdg-cell-frozen-background-color": "hsl(var(--background))",
                "--rdg-row-border-color": "hsl(var(--border))",
                "--rdg-background-color": "hsl(var(--background))",
                "--rdg-text-color": "hsl(var(--foreground))",
                "--rdg-header-text-color": "hsl(var(--foreground))",
              } as React.CSSProperties
            }
            renderers={{
              noRowsFallback: (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <p>No version history available</p>
                </div>
              ),
            }}
          />
        </TooltipProvider>
      </div>
    </div>
  );
}
