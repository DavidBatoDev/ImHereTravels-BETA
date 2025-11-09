import { Timestamp } from "firebase/firestore";
import { SheetData } from "./sheet-management";

// ============================================================================
// VERSION HISTORY INTERFACES
// ============================================================================

/**
 * Represents a complete snapshot of a booking document at a specific point in time
 */
export interface BookingVersionSnapshot {
  id: string; // Auto-generated Firestore ID
  bookingId: string; // Reference to the original booking document
  versionNumber: number; // Sequential version number (1, 2, 3, etc.)
  branchId: string; // Unique identifier for this version branch
  parentVersionId?: string; // ID of the parent version (for branching)

  // Complete document snapshot
  documentSnapshot: SheetData;
  gridSnapshot?: SheetData[];
  previousGridSnapshot?: SheetData[];

  // Metadata
  metadata: VersionMetadata;

  // Change tracking
  changes: FieldChange[];

  // Branching information
  branchInfo: BranchInfo;
}

/**
 * Metadata about when and how a version was created
 */
export interface VersionMetadata {
  createdAt: Timestamp;
  createdBy: string; // User ID who made the change
  createdByName?: string; // Display name of the user
  changeType: VersionChangeType;
  changeDescription?: string; // Optional description of what changed
  isRestorePoint: boolean; // True if this version was created by restoring an older version
  restoredFromVersionId?: string; // If this is a restore, which version was restored
}

/**
 * Information about a specific field change
 */
export interface FieldChange {
  fieldPath: string; // e.g., "firstName", "tour.date", "payment.amount"
  fieldName: string; // Human-readable field name from column definition
  oldValue: any;
  newValue: any;
  dataType: string; // From column definition (string, number, date, etc.)
}

/**
 * Information about version branching
 */
export interface BranchInfo {
  isMainBranch: boolean; // True if this is part of the main timeline
  branchName?: string; // Optional name for the branch
  branchStartVersionId?: string; // The version where this branch started
  hasChildBranches: boolean; // True if other versions branch from this one
  childBranchIds: string[]; // IDs of versions that branch from this one
}

/**
 * Types of changes that can create a new version
 */
export type VersionChangeType =
  | "create" // Initial document creation
  | "update" // Regular field update
  | "delete" // Document deletion
  | "restore" // Restored from an older version
  | "bulk_update" // Multiple fields updated at once
  | "bulk_delete" // Bulk deletion operation
  | "bulk_import" // Bulk CSV import operation
  | "import" // Created via CSV import
  | "system"; // System-generated change (e.g., function computation)

/**
 * Comparison result between two versions
 */
export interface VersionComparison {
  fromVersion: BookingVersionSnapshot;
  toVersion: BookingVersionSnapshot;
  changedFields: FieldChange[];
  addedFields: string[];
  removedFields: string[];
}

/**
 * Options for creating a version snapshot
 */
export interface CreateVersionOptions {
  changeType: VersionChangeType;
  changeDescription?: string;
  userId: string;
  userName?: string;
  changedFields?: FieldChange[];
  changedFieldPaths?: string[]; // Field paths that changed (for efficient change detection)
  isRestorePoint?: boolean;
  restoredFromVersionId?: string;
  gridSnapshot?: SheetData[];
  previousGridSnapshot?: SheetData[];
}

/**
 * Options for restoring a version
 */
export interface RestoreVersionOptions {
  targetVersionId: string;
  userId: string;
  userName?: string;
  createBranch?: boolean; // If true, creates a new branch instead of continuing main timeline
  branchName?: string;
}

/**
 * Result of a restore operation
 */
export interface RestoreResult {
  success: boolean;
  newVersionId?: string;
  newVersionNumber?: number;
  branchId?: string;
  error?: string;
}

/**
 * Filter options for querying version history
 */
export interface VersionHistoryFilters {
  bookingId?: string;
  userId?: string;
  changeType?: VersionChangeType;
  dateFrom?: Date;
  dateTo?: Date;
  branchId?: string;
  isMainBranch?: boolean;
}

/**
 * Options for version history queries
 */
export interface VersionHistoryQueryOptions {
  filters?: VersionHistoryFilters;
  limit?: number;
  orderBy?: "createdAt" | "versionNumber";
  orderDirection?: "asc" | "desc";
}

/**
 * Extended SheetData with version highlighting information
 */
export interface VersionHighlightedData extends SheetData {
  _versionInfo?: {
    versionId: string;
    versionNumber: number;
    isRestorePoint: boolean;
    changedFields: string[]; // Field IDs that changed in this version
    metadata: VersionMetadata;
  };
  _originalRow?: number | null;
}

/**
 * Props for version history components
 */
export interface VersionHistoryProps {
  bookingId?: string; // If provided, show history for specific booking
  isOpen: boolean;
  onClose: () => void;
  onRestore?: (versionId: string) => void;
}

/**
 * State for version history management
 */
export interface VersionHistoryState {
  versions: BookingVersionSnapshot[];
  selectedVersionId?: string;
  comparisonVersionId?: string;
  isLoading: boolean;
  error?: string;
  filters: VersionHistoryFilters;
}

/**
 * Options for bulk operations version tracking
 */
export interface BulkOperationOptions {
  operationType: "delete" | "import" | "update";
  operationDescription: string;
  affectedBookingIds: string[];
  userId: string;
  userName?: string;
  totalCount: number;
  successCount?: number;
  failureCount?: number;
}

/**
 * Extended metadata for bulk operations
 */
export interface BulkOperationMetadata extends VersionMetadata {
  bulkOperation?: {
    operationType: "delete" | "import" | "update";
    totalCount: number;
    successCount: number;
    failureCount: number;
    affectedBookingIds: string[];
  };
}
