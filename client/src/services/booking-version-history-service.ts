import { db } from "@/lib/firebase";
import {
  doc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  Timestamp,
  Unsubscribe,
  DocumentData,
  serverTimestamp,
} from "firebase/firestore";
import {
  BookingVersionSnapshot,
  CreateVersionOptions,
  RestoreVersionOptions,
  RestoreResult,
  VersionHistoryFilters,
  VersionHistoryQueryOptions,
  FieldChange,
  BranchInfo,
  VersionComparison,
  BulkOperationOptions,
  BulkOperationMetadata,
} from "@/types/version-history";
import { SheetData } from "@/types/sheet-management";
import { bookingService } from "./booking-service";

// ============================================================================
// COLLECTION CONSTANTS
// ============================================================================

const VERSIONS_COLLECTION = "bookingVersions";
const BOOKINGS_COLLECTION = "bookings";

// ============================================================================
// VERSION HISTORY SERVICE INTERFACE
// ============================================================================

export interface BookingVersionHistoryService {
  // Version creation
  createVersionSnapshot(
    bookingId: string,
    documentSnapshot: SheetData,
    options: CreateVersionOptions,
    columns?: any[] // Optional column definitions for determining data types
  ): Promise<string>;

  // Version retrieval
  getVersion(versionId: string): Promise<BookingVersionSnapshot | null>;
  getVersionsForBooking(
    bookingId: string,
    options?: VersionHistoryQueryOptions
  ): Promise<BookingVersionSnapshot[]>;
  getAllVersions(
    options?: VersionHistoryQueryOptions
  ): Promise<BookingVersionSnapshot[]>;

  // Version comparison
  compareVersions(
    fromVersionId: string,
    toVersionId: string
  ): Promise<VersionComparison>;

  // Version restoration
  restoreVersion(
    bookingId: string,
    options: RestoreVersionOptions
  ): Promise<RestoreResult>;

  // Real-time listeners
  subscribeToBookingVersions(
    bookingId: string,
    callback: (versions: BookingVersionSnapshot[]) => void,
    options?: VersionHistoryQueryOptions
  ): Unsubscribe;

  subscribeToAllVersions(
    callback: (versions: BookingVersionSnapshot[]) => void,
    options?: VersionHistoryQueryOptions
  ): Unsubscribe;

  // Utility methods
  getLatestVersion(bookingId: string): Promise<BookingVersionSnapshot | null>;
  getVersionCount(bookingId: string): Promise<number>;
  detectFieldChanges(
    oldDocument: SheetData,
    newDocument: SheetData
  ): FieldChange[];

  // Grid state reconstruction
  getGridStateAtTimestamp(
    timestamp: Date | number,
    currentBookings: SheetData[]
  ): Promise<SheetData[]>;

  // Bulk operations
  createBulkOperationSnapshot(options: BulkOperationOptions): Promise<string>;
}

// ============================================================================
// VERSION HISTORY SERVICE IMPLEMENTATION
// ============================================================================

class BookingVersionHistoryServiceImpl implements BookingVersionHistoryService {
  // ========================================================================
  // VERSION CREATION
  // ========================================================================

  async createVersionSnapshot(
    bookingId: string,
    documentSnapshot: SheetData,
    options: CreateVersionOptions,
    columns?: any[] // Optional column definitions for determining data types
  ): Promise<string> {
    try {
      console.log("🔍 [VERSION SERVICE] Creating version snapshot:", {
        bookingId,
        changeType: options.changeType,
        description: options.changeDescription,
      });
      // Use a simple counter approach for version numbers to avoid expensive queries
      // We'll use timestamp + random to ensure uniqueness instead of sequential numbers
      const versionNumber = Date.now() + Math.floor(Math.random() * 1000);
      console.log(
        "🔍 [VERSION SERVICE] Generated version number:",
        versionNumber
      );

      // For performance, skip change detection unless explicitly provided
      let changes = options.changedFields || [];

      // Special handling for "create" change type
      if (options.changeType === "create" && changes.length === 0) {
        console.log(
          "🔍 [VERSION SERVICE] Creating 'Added new row' change for create operation"
        );

        // Create a single descriptive change entry for row creation
        changes = [
          {
            fieldPath: "_row_created",
            fieldName: "Row Created",
            oldValue: null,
            newValue: "Added new row",
            dataType: "string",
          },
        ];
      }
      // Special handling for "delete" change type
      else if (options.changeType === "delete" && changes.length === 0) {
        console.log(
          "🔍 [VERSION SERVICE] Creating 'Deleted row' change for delete operation"
        );

        // Create a single descriptive change entry for row deletion
        changes = [
          {
            fieldPath: "_row_deleted",
            fieldName: "Row Deleted",
            oldValue: "Row existed",
            newValue: null,
            dataType: "string",
          },
        ];
      }
      // If we have changed field paths but no detailed changes, create basic field changes
      else if (
        changes.length === 0 &&
        options.changedFieldPaths &&
        options.changedFieldPaths.length > 0
      ) {
        console.log(
          "🔍 [VERSION SERVICE] Creating field changes from provided paths:",
          options.changedFieldPaths
        );

        changes = options.changedFieldPaths
          .map((fieldPath) => {
            const newValue = documentSnapshot[fieldPath as keyof SheetData];

            // Determine data type from column definition if available
            let dataType = "unknown";
            if (columns && columns.length > 0) {
              const column = columns.find((col) => col.id === fieldPath);
              if (column) {
                dataType = column.dataType || "string";
              }
            }

            // If still unknown, try to infer from value
            if (dataType === "unknown") {
              if (typeof newValue === "number") dataType = "number";
              else if (typeof newValue === "boolean") dataType = "boolean";
              else if (
                newValue instanceof Date ||
                (newValue && typeof newValue.toDate === "function")
              )
                dataType = "date";
              else if (typeof newValue === "string") dataType = "string";
            }

            return {
              fieldPath: fieldPath,
              fieldName: fieldPath, // Use fieldPath as fieldName for now
              oldValue: null, // We don't have old values from batched writer
              newValue,
              dataType,
            };
          })
          .filter((change) => {
            // Skip changes where old value is null and new value is empty string
            // BUT only for string fields, not for date, boolean, or select fields
            if (
              (change.oldValue === null || change.oldValue === undefined) &&
              change.newValue === "" &&
              change.dataType === "string"
            ) {
              console.log(
                `🔍 [VERSION SERVICE] Skipping null → "" change for string field: ${change.fieldPath}`
              );
              return false;
            }
            return true;
          });
      }

      console.log(
        "🔍 [VERSION SERVICE] Using changes:",
        changes.length,
        "fields:",
        changes.map((c) => `${c.fieldName} (${c.dataType})`)
      );

      // Generate branch ID (always use main branch for performance)
      let branchId = `main-${bookingId}`;
      let parentVersionId: string | undefined = undefined;
      console.log(
        "🔍 [VERSION SERVICE] Branch ID:",
        branchId,
        "Parent ID:",
        parentVersionId
      );

      // If this is a restore point, create a new branch
      if (options.isRestorePoint) {
        branchId = `restore-${Date.now()}-${bookingId}`;
        console.log("🔍 [VERSION SERVICE] Creating restore branch:", branchId);
      }

      // Create branch info
      const branchInfo: BranchInfo = {
        isMainBranch: !options.isRestorePoint,
        branchName: options.isRestorePoint ? "Restored Version" : undefined,
        branchStartVersionId: options.isRestorePoint
          ? parentVersionId
          : undefined,
        hasChildBranches: false,
        childBranchIds: [],
      };

      // Create version snapshot
      console.log("🔍 [VERSION SERVICE] Creating version snapshot object");

      // Clean the documentSnapshot to ensure all fields are properly serialized
      // Remove undefined values and convert complex types to simple types
      const cleanedSnapshot: Record<string, any> = {};
      Object.keys(documentSnapshot).forEach((key) => {
        const value = documentSnapshot[key as keyof SheetData];

        // Skip undefined values
        if (value === undefined) {
          return;
        }

        // Handle null explicitly
        if (value === null) {
          cleanedSnapshot[key] = null;
          return;
        }

        // Handle Firestore Timestamps
        if (value && typeof value === "object" && "toDate" in value) {
          cleanedSnapshot[key] = value; // Keep Firestore Timestamp as-is
          return;
        }

        // Handle Dates
        if (value instanceof Date) {
          cleanedSnapshot[key] = Timestamp.fromDate(value);
          return;
        }

        // Handle arrays
        if (Array.isArray(value)) {
          cleanedSnapshot[key] = value;
          return;
        }

        // Handle objects (but not Firestore types)
        if (typeof value === "object") {
          cleanedSnapshot[key] = value;
          return;
        }

        // Handle primitives (string, number, boolean)
        cleanedSnapshot[key] = value;
      });

      console.log("🔍 [VERSION SERVICE] Cleaned snapshot:", {
        originalKeys: Object.keys(documentSnapshot).length,
        cleanedKeys: Object.keys(cleanedSnapshot).length,
        sampleCleanedValues: {
          firstName: cleanedSnapshot.firstName,
          bookingType: cleanedSnapshot.bookingType,
          bookingCode: cleanedSnapshot.bookingCode,
        },
      });

      // Create the base version snapshot object without undefined fields
      const versionSnapshot: any = {
        bookingId,
        versionNumber,
        branchId,
        documentSnapshot: cleanedSnapshot,
        metadata: {
          createdAt: Timestamp.now(),
          createdBy: options.userId,
          createdByName: options.userName,
          changeType: options.changeType,
          changeDescription: options.changeDescription,
          isRestorePoint: options.isRestorePoint || false,
        },
        changes,
        branchInfo: {
          isMainBranch: branchInfo.isMainBranch,
          hasChildBranches: branchInfo.hasChildBranches,
          childBranchIds: branchInfo.childBranchIds,
        },
      };

      // Only include optional fields if they have values (not undefined)
      if (parentVersionId !== undefined) {
        versionSnapshot.parentVersionId = parentVersionId;
      }

      if (options.restoredFromVersionId !== undefined) {
        versionSnapshot.metadata.restoredFromVersionId =
          options.restoredFromVersionId;
      }

      if (branchInfo.branchName !== undefined) {
        versionSnapshot.branchInfo.branchName = branchInfo.branchName;
      }

      if (branchInfo.branchStartVersionId !== undefined) {
        versionSnapshot.branchInfo.branchStartVersionId =
          branchInfo.branchStartVersionId;
      }
      console.log("🔍 [VERSION SERVICE] Version snapshot object created:", {
        bookingId: versionSnapshot.bookingId,
        versionNumber: versionSnapshot.versionNumber,
        branchId: versionSnapshot.branchId,
        changesCount: versionSnapshot.changes.length,
      });

      // Add to Firestore
      console.log(
        "🔍 [VERSION SERVICE] Adding to Firestore collection:",
        VERSIONS_COLLECTION
      );

      // Remove any undefined values recursively to prevent Firestore errors
      const cleanVersionSnapshot = this.removeUndefinedValues(versionSnapshot);

      // Log the complete object being sent to Firestore for debugging
      console.log(
        "🔍 [VERSION SERVICE] Complete version snapshot being saved:",
        JSON.stringify(cleanVersionSnapshot, null, 2)
      );

      const docRef = await addDoc(
        collection(db, VERSIONS_COLLECTION),
        cleanVersionSnapshot
      );
      console.log("🔍 [VERSION SERVICE] Document added with ID:", docRef.id);

      // Update parent version to mark it has child branches (if this is a restore)
      if (options.isRestorePoint && parentVersionId) {
        await this.updateParentBranchInfo(parentVersionId, docRef.id);
      }

      console.log(
        `✅ Created version snapshot ${docRef.id} for booking ${bookingId} (v${versionNumber})`
      );
      return docRef.id;
    } catch (error) {
      console.error(
        `❌ Failed to create version snapshot for booking ${bookingId}:`,
        error
      );
      throw error;
    }
  }

  // ========================================================================
  // VERSION RETRIEVAL
  // ========================================================================

  async getVersion(versionId: string): Promise<BookingVersionSnapshot | null> {
    try {
      const docRef = doc(db, VERSIONS_COLLECTION, versionId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as BookingVersionSnapshot;
    } catch (error) {
      console.error(`❌ Failed to get version ${versionId}:`, error);
      throw error;
    }
  }

  async getVersionsForBooking(
    bookingId: string,
    options?: VersionHistoryQueryOptions
  ): Promise<BookingVersionSnapshot[]> {
    try {
      // Simple query without complex ordering to avoid index requirements
      let q = query(
        collection(db, VERSIONS_COLLECTION),
        where("bookingId", "==", bookingId)
      );

      // Apply limit if specified
      if (options?.limit) {
        q = query(q, firestoreLimit(options.limit));
      }

      const querySnapshot = await getDocs(q);
      let versions = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        // Convert Firestore timestamp back to proper Timestamp object
        if (data.metadata?.createdAt && data.metadata.createdAt.seconds) {
          data.metadata.createdAt = new Timestamp(
            data.metadata.createdAt.seconds,
            data.metadata.createdAt.nanoseconds || 0
          );
        }
        return {
          id: doc.id,
          ...data,
        };
      }) as BookingVersionSnapshot[];

      // Apply client-side filtering and sorting to avoid Firestore index requirements
      if (options?.filters) {
        const filters = options.filters;

        if (filters.userId) {
          versions = versions.filter(
            (v) => v.metadata.createdBy === filters.userId
          );
        }

        if (filters.changeType) {
          versions = versions.filter(
            (v) => v.metadata.changeType === filters.changeType
          );
        }

        if (filters.branchId) {
          versions = versions.filter((v) => v.branchId === filters.branchId);
        }

        if (filters.isMainBranch !== undefined) {
          versions = versions.filter(
            (v) => v.branchInfo.isMainBranch === filters.isMainBranch
          );
        }
      }

      // Apply client-side sorting
      const orderByField: string = options?.orderBy || "versionNumber";
      const orderDirection = options?.orderDirection || "desc";

      versions.sort((a, b) => {
        let aValue, bValue;

        if (orderByField === "versionNumber") {
          aValue = a.versionNumber;
          bValue = b.versionNumber;
        } else if (orderByField === "metadata.createdAt") {
          aValue = a.metadata.createdAt?.toMillis?.() || 0;
          bValue = b.metadata.createdAt?.toMillis?.() || 0;
        } else {
          aValue = 0;
          bValue = 0;
        }

        if (orderDirection === "desc") {
          return bValue - aValue;
        } else {
          return aValue - bValue;
        }
      });

      return versions;
    } catch (error) {
      console.error(
        `❌ Failed to get versions for booking ${bookingId}:`,
        error
      );
      throw error;
    }
  }

  async getAllVersions(
    options?: VersionHistoryQueryOptions
  ): Promise<BookingVersionSnapshot[]> {
    try {
      console.log(
        "🔍 [VERSION SERVICE] Getting all versions from collection:",
        VERSIONS_COLLECTION
      );

      // Simple query without ordering to avoid index requirements
      let q = query(collection(db, VERSIONS_COLLECTION));

      // Apply limit if specified
      if (options?.limit) {
        q = query(q, firestoreLimit(options.limit));
      }

      const querySnapshot = await getDocs(q);
      console.log(
        "🔍 [VERSION SERVICE] Query returned",
        querySnapshot.docs.length,
        "documents"
      );

      let versions = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        // Convert Firestore timestamp back to proper Timestamp object
        if (data.metadata?.createdAt && data.metadata.createdAt.seconds) {
          data.metadata.createdAt = new Timestamp(
            data.metadata.createdAt.seconds,
            data.metadata.createdAt.nanoseconds || 0
          );
        }
        return {
          id: doc.id,
          ...data,
        };
      }) as BookingVersionSnapshot[];

      // Apply client-side filtering to avoid Firestore index requirements
      if (options?.filters) {
        const filters = options.filters;

        if (filters.bookingId) {
          versions = versions.filter((v) => v.bookingId === filters.bookingId);
        }

        if (filters.userId) {
          versions = versions.filter(
            (v) => v.metadata.createdBy === filters.userId
          );
        }

        if (filters.changeType) {
          versions = versions.filter(
            (v) => v.metadata.changeType === filters.changeType
          );
        }

        if (filters.branchId) {
          versions = versions.filter((v) => v.branchId === filters.branchId);
        }

        if (filters.isMainBranch !== undefined) {
          versions = versions.filter(
            (v) => v.branchInfo.isMainBranch === filters.isMainBranch
          );
        }
      }

      // Apply client-side sorting
      const orderByField: string = options?.orderBy || "metadata.createdAt";
      const orderDirection = options?.orderDirection || "desc";

      versions.sort((a, b) => {
        let aValue, bValue;

        if (orderByField === "versionNumber") {
          aValue = a.versionNumber;
          bValue = b.versionNumber;
        } else if (orderByField === "metadata.createdAt") {
          aValue = a.metadata.createdAt?.toMillis?.() || 0;
          bValue = b.metadata.createdAt?.toMillis?.() || 0;
        } else {
          aValue = 0;
          bValue = 0;
        }

        if (orderDirection === "desc") {
          return bValue - aValue;
        } else {
          return aValue - bValue;
        }
      });

      console.log(
        "🔍 [VERSION SERVICE] Mapped and sorted versions:",
        versions.length
      );
      return versions;
    } catch (error) {
      console.error("❌ Failed to get all versions:", error);
      throw error;
    }
  }

  // ========================================================================
  // VERSION COMPARISON
  // ========================================================================

  async compareVersions(
    fromVersionId: string,
    toVersionId: string
  ): Promise<VersionComparison> {
    try {
      const [fromVersion, toVersion] = await Promise.all([
        this.getVersion(fromVersionId),
        this.getVersion(toVersionId),
      ]);

      if (!fromVersion || !toVersion) {
        throw new Error("One or both versions not found");
      }

      const changedFields = this.detectFieldChanges(
        fromVersion.documentSnapshot,
        toVersion.documentSnapshot
      );

      const fromFields = Object.keys(fromVersion.documentSnapshot);
      const toFields = Object.keys(toVersion.documentSnapshot);

      const addedFields = toFields.filter(
        (field) => !fromFields.includes(field)
      );
      const removedFields = fromFields.filter(
        (field) => !toFields.includes(field)
      );

      return {
        fromVersion,
        toVersion,
        changedFields,
        addedFields,
        removedFields,
      };
    } catch (error) {
      console.error(
        `❌ Failed to compare versions ${fromVersionId} and ${toVersionId}:`,
        error
      );
      throw error;
    }
  }

  // ========================================================================
  // VERSION RESTORATION
  // ========================================================================

  async restoreVersion(
    bookingId: string,
    options: RestoreVersionOptions
  ): Promise<RestoreResult> {
    try {
      // Get the version to restore
      const versionToRestore = await this.getVersion(options.targetVersionId);
      if (!versionToRestore) {
        return {
          success: false,
          error: "Version to restore not found",
        };
      }

      // Get current booking data
      const currentBooking = await bookingService.getBooking(bookingId);
      if (!currentBooking) {
        return {
          success: false,
          error: "Current booking not found",
        };
      }

      // Update the booking document with restored data
      await bookingService.updateBooking(
        bookingId,
        versionToRestore.documentSnapshot
      );

      // Create a new version snapshot for the restore operation
      const newVersionId = await this.createVersionSnapshot(
        bookingId,
        versionToRestore.documentSnapshot,
        {
          changeType: "restore",
          changeDescription: `Restored from version ${versionToRestore.versionNumber}`,
          userId: options.userId,
          userName: options.userName,
          isRestorePoint: true,
          restoredFromVersionId: options.targetVersionId,
        }
      );

      // Get the new version to return its details
      const newVersion = await this.getVersion(newVersionId);

      return {
        success: true,
        newVersionId,
        newVersionNumber: newVersion?.versionNumber,
        branchId: newVersion?.branchId,
      };
    } catch (error) {
      console.error(
        `❌ Failed to restore version ${options.targetVersionId}:`,
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ========================================================================
  // REAL-TIME LISTENERS
  // ========================================================================

  subscribeToBookingVersions(
    bookingId: string,
    callback: (versions: BookingVersionSnapshot[]) => void,
    options?: VersionHistoryQueryOptions
  ): Unsubscribe {
    let q = query(
      collection(db, VERSIONS_COLLECTION),
      where("bookingId", "==", bookingId)
    );

    // Apply ordering
    const orderByField = options?.orderBy || "versionNumber";
    const orderDirection = options?.orderDirection || "desc";
    q = query(q, orderBy(orderByField, orderDirection));

    // Apply limit
    if (options?.limit) {
      q = query(q, firestoreLimit(options.limit));
    }

    return onSnapshot(
      q,
      (querySnapshot) => {
        const versions = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          // Convert Firestore timestamp back to proper Timestamp object
          if (data.metadata?.createdAt && data.metadata.createdAt.seconds) {
            data.metadata.createdAt = new Timestamp(
              data.metadata.createdAt.seconds,
              data.metadata.createdAt.nanoseconds || 0
            );
          }
          return {
            id: doc.id,
            ...data,
          };
        }) as BookingVersionSnapshot[];
        callback(versions);
      },
      (error) => {
        console.error(
          `❌ Error in booking versions subscription for ${bookingId}:`,
          error
        );
      }
    );
  }

  subscribeToAllVersions(
    callback: (versions: BookingVersionSnapshot[]) => void,
    options?: VersionHistoryQueryOptions
  ): Unsubscribe {
    let q = query(collection(db, VERSIONS_COLLECTION));

    // Apply ordering
    const orderByField = options?.orderBy || "metadata.createdAt";
    const orderDirection = options?.orderDirection || "desc";
    q = query(q, orderBy(orderByField, orderDirection));

    // Apply limit
    if (options?.limit) {
      q = query(q, firestoreLimit(options.limit));
    }

    return onSnapshot(
      q,
      (querySnapshot) => {
        const versions = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          // Convert Firestore timestamp back to proper Timestamp object
          if (data.metadata?.createdAt && data.metadata.createdAt.seconds) {
            data.metadata.createdAt = new Timestamp(
              data.metadata.createdAt.seconds,
              data.metadata.createdAt.nanoseconds || 0
            );
          }
          return {
            id: doc.id,
            ...data,
          };
        }) as BookingVersionSnapshot[];
        callback(versions);
      },
      (error) => {
        console.error("❌ Error in all versions subscription:", error);
      }
    );
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  async getLatestVersion(
    bookingId: string
  ): Promise<BookingVersionSnapshot | null> {
    try {
      // For now, just get all versions for this booking and find the latest one
      // This avoids the Firestore index requirement
      const q = query(
        collection(db, VERSIONS_COLLECTION),
        where("bookingId", "==", bookingId)
      );

      const querySnapshot = await getDocs(q);
      const versions = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        // Convert Firestore timestamp back to proper Timestamp object
        if (data.metadata?.createdAt && data.metadata.createdAt.seconds) {
          data.metadata.createdAt = new Timestamp(
            data.metadata.createdAt.seconds,
            data.metadata.createdAt.nanoseconds || 0
          );
        }
        return {
          id: doc.id,
          ...data,
        };
      }) as BookingVersionSnapshot[];

      if (versions.length === 0) {
        return null;
      }

      // Find the version with the highest version number
      return versions.reduce((latest, current) =>
        current.versionNumber > latest.versionNumber ? current : latest
      );
    } catch (error) {
      console.error(
        `❌ Failed to get latest version for booking ${bookingId}:`,
        error
      );
      throw error;
    }
  }

  async getVersionCount(bookingId: string): Promise<number> {
    try {
      const versions = await this.getVersionsForBooking(bookingId);
      return versions.length;
    } catch (error) {
      console.error(
        `❌ Failed to get version count for booking ${bookingId}:`,
        error
      );
      throw error;
    }
  }

  detectFieldChanges(
    oldDocument: SheetData,
    newDocument: SheetData
  ): FieldChange[] {
    const changes: FieldChange[] = [];
    const allFields = new Set([
      ...Object.keys(oldDocument),
      ...Object.keys(newDocument),
    ]);

    for (const fieldPath of allFields) {
      const oldValue = oldDocument[fieldPath as keyof SheetData];
      const newValue = newDocument[fieldPath as keyof SheetData];

      // Skip if values are the same (deep comparison for objects)
      if (this.isEqual(oldValue, newValue)) {
        continue;
      }

      // Determine data type (simplified)
      let dataType = "string";
      if (typeof newValue === "number") dataType = "number";
      else if (typeof newValue === "boolean") dataType = "boolean";
      else if (
        newValue instanceof Date ||
        (newValue && typeof newValue.toDate === "function")
      )
        dataType = "date";

      // Skip if old value is null and new value is empty string (not a real change)
      // BUT only for string fields, not for date, boolean, or select fields
      if (
        (oldValue === null || oldValue === undefined) &&
        newValue === "" &&
        dataType === "string"
      ) {
        continue;
      }

      changes.push({
        fieldPath,
        fieldName: fieldPath, // TODO: Map to human-readable name from column definitions
        oldValue,
        newValue,
        dataType,
      });
    }

    return changes;
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  /**
   * Remove undefined values from an object recursively
   */
  private removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.removeUndefinedValues(item));
    }

    if (typeof obj === "object") {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedValues(value);
        }
      }
      return cleaned;
    }

    return obj;
  }

  private async updateParentBranchInfo(
    parentVersionId: string,
    childVersionId: string
  ): Promise<void> {
    try {
      const parentVersion = await this.getVersion(parentVersionId);
      if (!parentVersion) return;

      // Update parent to indicate it has child branches
      const updatedBranchInfo: BranchInfo = {
        ...parentVersion.branchInfo,
        hasChildBranches: true,
        childBranchIds: [
          ...parentVersion.branchInfo.childBranchIds,
          childVersionId,
        ],
      };

      // Note: In a real implementation, you'd need to update the document
      // For now, we'll just log this operation
      console.log(
        `📝 Updated parent version ${parentVersionId} to include child ${childVersionId}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to update parent branch info for ${parentVersionId}:`,
        error
      );
    }
  }

  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;
    if (typeof a !== "object") return a === b;
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.isEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.isEqual(a[key], b[key])) return false;
    }

    return true;
  }

  // ========================================================================
  // GRID STATE RECONSTRUCTION - REPLAY-BASED APPROACH
  // ========================================================================

  /**
   * Reconstruct the complete grid state at a specific point in time
   * Uses replay-based reconstruction: starts from current state and replays changes backwards
   * This is more accurate than using stored snapshots
   */
  async getGridStateAtTimestamp(
    timestamp: Date | number,
    currentBookings: SheetData[]
  ): Promise<SheetData[]> {
    try {
      console.log(
        "� [REPLAY RECONSTRUCTION] Starting replay-based reconstruction at timestamp:",
        timestamp
      );

      // Convert timestamp to comparable format
      let targetTime: number;
      if (timestamp instanceof Date) {
        targetTime = timestamp.getTime();
      } else if (typeof timestamp === "number") {
        targetTime = timestamp;
      } else {
        throw new Error("Invalid timestamp format");
      }

      // Query ALL versions to get complete change history
      const versionsRef = collection(db, VERSIONS_COLLECTION);
      const allVersionsQuery = query(
        versionsRef,
        orderBy("metadata.createdAt", "asc") // Ascending for forward replay
      );

      console.log("� [REPLAY RECONSTRUCTION] Querying all versions...");
      const querySnapshot = await getDocs(allVersionsQuery);
      console.log(
        "� [REPLAY RECONSTRUCTION] Found",
        querySnapshot.size,
        "total versions across all time"
      );

      // Group all versions by bookingId (already in ascending chronological order)
      const allVersionsByBooking = new Map<string, BookingVersionSnapshot[]>();

      querySnapshot.forEach((doc) => {
        const versionData = doc.data() as BookingVersionSnapshot;
        const bookingId = versionData.bookingId;

        if (!allVersionsByBooking.has(bookingId)) {
          allVersionsByBooking.set(bookingId, []);
        }
        allVersionsByBooking.get(bookingId)!.push({
          ...versionData,
          id: doc.id,
        });
      });

      console.log(
        `🔄 [REPLAY RECONSTRUCTION] Found versions for ${allVersionsByBooking.size} bookings`
      );

      // Get all unique booking IDs that have ever existed (from current bookings + version history)
      const allBookingIds = new Set<string>();

      // Add current booking IDs
      currentBookings.forEach((booking) => allBookingIds.add(booking.id));

      // Add booking IDs from version history (including deleted ones)
      allVersionsByBooking.forEach((versions, bookingId) => {
        allBookingIds.add(bookingId);
      });

      console.log(
        `🔄 [REPLAY RECONSTRUCTION] Found ${
          allBookingIds.size
        } unique bookings (${currentBookings.length} current + ${
          allBookingIds.size - currentBookings.length
        } from history)`
      );

      // Reconstruct each booking's state at the target timestamp
      const reconstructedGrid: SheetData[] = Array.from(allBookingIds)
        .map((bookingId) => {
          const currentBooking = currentBookings.find(
            (b) => b.id === bookingId
          );
          const versions = allVersionsByBooking.get(bookingId) || [];

          console.log(
            `🔄 [REPLAY RECONSTRUCTION] Processing booking ${bookingId}: ${
              currentBooking ? "exists" : "deleted"
            }, ${versions.length} versions`
          );

          // Find the creation version to determine when booking was created
          const createVersion = versions.find(
            (v) => v.metadata.changeType === "create"
          );
          let createdTime = 0;

          if (createVersion) {
            const vTime = createVersion.metadata.createdAt;
            if (vTime && typeof vTime === "object" && "seconds" in vTime) {
              createdTime = (vTime as any).seconds * 1000;
            } else if (
              vTime &&
              typeof vTime === "object" &&
              "toDate" in vTime
            ) {
              createdTime = (vTime as any).toDate().getTime();
            } else if (vTime instanceof Date) {
              createdTime = vTime.getTime();
            } else if (typeof vTime === "number") {
              createdTime = vTime;
            }
          } else if (currentBooking?.createdAt) {
            // Fallback to current booking's createdAt if no create version found
            const bookingCreatedAt = currentBooking.createdAt;
            if (
              typeof bookingCreatedAt === "object" &&
              "toDate" in bookingCreatedAt
            ) {
              createdTime = (bookingCreatedAt as any).toDate().getTime();
            } else if (
              typeof bookingCreatedAt === "object" &&
              "seconds" in bookingCreatedAt
            ) {
              createdTime = (bookingCreatedAt as any).seconds * 1000;
            } else if (bookingCreatedAt instanceof Date) {
              createdTime = bookingCreatedAt.getTime();
            } else if (typeof bookingCreatedAt === "number") {
              createdTime = bookingCreatedAt;
            }
          }

          // If booking was created after target time, exclude it
          if (createdTime > targetTime) {
            console.log(
              `⏭️  [REPLAY RECONSTRUCTION] Excluding booking ${bookingId} (created at ${new Date(
                createdTime
              ).toISOString()} after target ${new Date(
                targetTime
              ).toISOString()})`
            );
            return null;
          }

          // Start with current booking state if it exists, otherwise use the latest version snapshot
          let reconstructedState: Record<string, any>;

          if (currentBooking) {
            // Booking currently exists - start with current state
            reconstructedState = { ...currentBooking };
          } else {
            // Booking was deleted - check if deletion happened before or at target time
            const deleteVersion = versions.find(
              (v) => v.metadata.changeType === "delete"
            );

            if (deleteVersion) {
              const deleteTime = deleteVersion.metadata.createdAt;
              let deletionTime: number;

              if (
                deleteTime &&
                typeof deleteTime === "object" &&
                "seconds" in deleteTime
              ) {
                deletionTime = (deleteTime as any).seconds * 1000;
              } else if (
                deleteTime &&
                typeof deleteTime === "object" &&
                "toDate" in deleteTime
              ) {
                deletionTime = (deleteTime as any).toDate().getTime();
              } else if (deleteTime instanceof Date) {
                deletionTime = deleteTime.getTime();
              } else if (typeof deleteTime === "number") {
                deletionTime = deleteTime;
              } else {
                deletionTime = 0;
              }

              // If deletion happened before or at target time, booking should not exist
              if (deletionTime <= targetTime) {
                console.log(
                  `🗑️  [REPLAY RECONSTRUCTION] Booking ${bookingId} was deleted at ${new Date(
                    deletionTime
                  ).toISOString()} before/at target time ${new Date(
                    targetTime
                  ).toISOString()} - excluding from reconstruction`
                );
                return null;
              }

              console.log(
                `🔄 [REPLAY RECONSTRUCTION] Booking ${bookingId} was deleted at ${new Date(
                  deletionTime
                ).toISOString()} after target time ${new Date(
                  targetTime
                ).toISOString()} - will reconstruct`
              );
            }

            // Find the most recent version snapshot before or at target time (excluding delete versions)
            const versionsBeforeOrAtTarget = versions.filter((v) => {
              // Skip delete versions for reconstruction - we use them only for timing checks above
              if (v.metadata.changeType === "delete") {
                return false;
              }

              const vTime = v.metadata.createdAt;
              let versionTime: number;

              if (vTime && typeof vTime === "object" && "seconds" in vTime) {
                versionTime = (vTime as any).seconds * 1000;
              } else if (
                vTime &&
                typeof vTime === "object" &&
                "toDate" in vTime
              ) {
                versionTime = (vTime as any).toDate().getTime();
              } else if (vTime instanceof Date) {
                versionTime = vTime.getTime();
              } else if (typeof vTime === "number") {
                versionTime = vTime;
              } else {
                return false;
              }

              return versionTime <= targetTime;
            });

            if (versionsBeforeOrAtTarget.length === 0) {
              console.log(
                `⚠️  [REPLAY RECONSTRUCTION] No non-delete versions found for deleted booking ${bookingId} before target time`
              );
              return null;
            }

            // Use the most recent non-delete version snapshot before or at target time
            const latestVersion =
              versionsBeforeOrAtTarget[versionsBeforeOrAtTarget.length - 1];
            reconstructedState = { ...latestVersion.documentSnapshot };

            console.log(
              `🔄 [REPLAY RECONSTRUCTION] Using version snapshot for deleted booking ${bookingId} from ${new Date(
                latestVersion.metadata.createdAt?.seconds
                  ? latestVersion.metadata.createdAt.seconds * 1000
                  : 0
              ).toISOString()}`
            );
          }

          // Filter versions that happened AFTER target timestamp
          // These are the changes we need to "undo" by replaying backwards
          const versionsAfterTarget = versions.filter((v) => {
            const vTime = v.metadata.createdAt;
            let versionTime: number;

            if (vTime && typeof vTime === "object" && "seconds" in vTime) {
              versionTime = (vTime as any).seconds * 1000;
            } else if (
              vTime &&
              typeof vTime === "object" &&
              "toDate" in vTime
            ) {
              versionTime = (vTime as any).toDate().getTime();
            } else if (vTime instanceof Date) {
              versionTime = vTime.getTime();
            } else if (typeof vTime === "number") {
              versionTime = vTime;
            } else {
              return false;
            }

            return versionTime > targetTime;
          });

          console.log(
            `🔄 [REPLAY RECONSTRUCTION] Booking ${bookingId}: Found ${versionsAfterTarget.length} versions after target time (will replay backwards)`
          );

          // Replay changes backwards (reverse chronological order)
          // For each version after target time, undo its changes by using oldValue
          versionsAfterTarget.reverse().forEach((version) => {
            // Special handling for delete operations
            if (version.metadata.changeType === "delete") {
              console.log(
                `🔄 [REPLAY RECONSTRUCTION] Undoing deletion for booking ${bookingId} - booking should exist at target time`
              );
              // For delete operations, the booking should exist at target time
              // The reconstructedState already contains the booking data from the version snapshot
              return;
            }

            // Handle regular field changes
            version.changes.forEach((change) => {
              const fieldPath = change.fieldPath;
              const oldValue = change.oldValue;

              // Skip synthetic change markers
              if (fieldPath.startsWith("_")) {
                return;
              }

              console.log(
                `↩️  [REPLAY RECONSTRUCTION] Undoing change for ${bookingId}.${fieldPath}: ${change.newValue} → ${oldValue}`
              );

              // Restore the old value
              reconstructedState[fieldPath] = oldValue;
            });
          });

          console.log(
            `✅ [REPLAY RECONSTRUCTION] Reconstructed booking ${bookingId}:`,
            {
              currentlyExists: !!currentBooking,
              totalVersions: versions.length,
              versionsUndone: versionsAfterTarget.length,
              sampleReconstructedValues: {
                firstName: reconstructedState.firstName,
                bookingType: reconstructedState.bookingType,
                bookingCode: reconstructedState.bookingCode,
              },
            }
          );

          return reconstructedState as SheetData;
        })
        .filter((booking): booking is SheetData => booking !== null);

      console.log(
        "✅ [REPLAY RECONSTRUCTION] Reconstructed grid with",
        reconstructedGrid.length,
        "bookings"
      );
      return reconstructedGrid;
    } catch (error) {
      console.error(
        "❌ [REPLAY RECONSTRUCTION] Failed to reconstruct grid state:",
        error
      );
      throw error;
    }
  }

  // ========================================================================
  // RETENTION POLICY
  // ========================================================================

  /**
   * Clean up old version snapshots based on retention policy
   * Default: Keep last 30 days of versions, or minimum 10 versions per booking
   */
  async cleanupOldVersions(
    retentionDays: number = 30,
    minVersionsPerBooking: number = 10
  ): Promise<{ deleted: number; retained: number }> {
    try {
      console.log("🧹 [RETENTION POLICY] Starting cleanup:", {
        retentionDays,
        minVersionsPerBooking,
      });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

      // Get all versions
      const versionsRef = collection(db, VERSIONS_COLLECTION);
      const allVersionsQuery = query(
        versionsRef,
        orderBy("metadata.createdAt", "desc")
      );
      const querySnapshot = await getDocs(allVersionsQuery);

      console.log(
        `🧹 [RETENTION POLICY] Found ${querySnapshot.size} total versions`
      );

      // Group by bookingId
      const versionsByBooking = new Map<string, BookingVersionSnapshot[]>();
      querySnapshot.forEach((doc) => {
        const versionData = doc.data() as BookingVersionSnapshot;
        const bookingId = versionData.bookingId;

        if (!versionsByBooking.has(bookingId)) {
          versionsByBooking.set(bookingId, []);
        }
        versionsByBooking.get(bookingId)!.push({
          ...versionData,
          id: doc.id,
        });
      });

      let deleted = 0;
      let retained = 0;

      // For each booking, apply retention policy
      for (const [bookingId, versions] of versionsByBooking.entries()) {
        // Sort by creation date (newest first)
        versions.sort((a, b) => {
          const aTime = a.metadata.createdAt;
          const bTime = b.metadata.createdAt;
          let aMs = 0;
          let bMs = 0;

          if (aTime && typeof aTime === "object" && "seconds" in aTime) {
            aMs = (aTime as any).seconds * 1000;
          } else if (aTime instanceof Date) {
            aMs = aTime.getTime();
          }

          if (bTime && typeof bTime === "object" && "seconds" in bTime) {
            bMs = (bTime as any).seconds * 1000;
          } else if (bTime instanceof Date) {
            bMs = bTime.getTime();
          }

          return bMs - aMs; // Descending (newest first)
        });

        // Keep minimum number of versions regardless of age
        const versionsToKeep = versions.slice(0, minVersionsPerBooking);
        const versionsToConsider = versions.slice(minVersionsPerBooking);

        retained += versionsToKeep.length;

        // For remaining versions, delete if older than retention period
        for (const version of versionsToConsider) {
          const vTime = version.metadata.createdAt;
          let shouldDelete = false;

          if (vTime && typeof vTime === "object" && "seconds" in vTime) {
            const vMs = (vTime as any).seconds * 1000;
            shouldDelete = vMs < cutoffDate.getTime();
          } else if (vTime instanceof Date) {
            shouldDelete = vTime.getTime() < cutoffDate.getTime();
          }

          if (shouldDelete && !version.metadata.isRestorePoint) {
            // Don't delete restore points
            // In production, you would delete here:
            // await deleteDoc(doc(db, VERSIONS_COLLECTION, version.id));
            console.log(
              `🗑️  [RETENTION POLICY] Would delete version ${version.id} for booking ${bookingId}`
            );
            deleted++;
          } else {
            retained++;
          }
        }
      }

      console.log(
        `✅ [RETENTION POLICY] Cleanup complete: ${deleted} versions marked for deletion, ${retained} retained`
      );

      return { deleted, retained };
    } catch (error) {
      console.error("❌ [RETENTION POLICY] Cleanup failed:", error);
      throw error;
    }
  }

  // ========================================================================
  // BULK OPERATIONS
  // ========================================================================

  /**
   * Create a summary version snapshot for bulk operations
   * This creates a single version entry that represents a bulk operation affecting multiple bookings
   */
  async createBulkOperationSnapshot(
    options: BulkOperationOptions
  ): Promise<string> {
    try {
      console.log("🔍 [BULK VERSION] Creating bulk operation snapshot:", {
        operationType: options.operationType,
        totalCount: options.totalCount,
        affectedBookingIds: options.affectedBookingIds.slice(0, 5), // Log first 5 IDs
      });

      // Use a timestamp-based version number for bulk operations
      const versionNumber = Date.now() + Math.floor(Math.random() * 1000);

      // Create a synthetic booking ID for bulk operations
      const bulkBookingId = `bulk_${options.operationType}_${Date.now()}`;

      // Generate branch ID for bulk operations
      const branchId = `bulk-${options.operationType}-${Date.now()}`;

      // Create changes array for bulk operation
      const changes: FieldChange[] = [
        {
          fieldPath: "_bulk_operation",
          fieldName: "Bulk Operation",
          oldValue: null,
          newValue: `${options.operationType}: ${options.operationDescription}`,
          dataType: "string",
        },
      ];

      // Create synthetic document snapshot for bulk operation
      const documentSnapshot: SheetData = {
        id: bulkBookingId,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Add bulk operation metadata
        _bulkOperation: {
          type: options.operationType,
          description: options.operationDescription,
          totalCount: options.totalCount,
          successCount: options.successCount || 0,
          failureCount: options.failureCount || 0,
          affectedBookingIds: options.affectedBookingIds,
        },
      } as SheetData;

      // Create branch info for bulk operation
      const branchInfo: BranchInfo = {
        isMainBranch: true, // Bulk operations are part of main timeline
        branchName: `Bulk ${options.operationType}`,
        hasChildBranches: false,
        childBranchIds: [],
      };

      // Create the bulk operation metadata
      const bulkOperationMetadata: BulkOperationMetadata = {
        createdAt: Timestamp.now(),
        createdBy: options.userId,
        createdByName: options.userName,
        changeType:
          options.operationType === "delete"
            ? "bulk_delete"
            : options.operationType === "import"
            ? "bulk_import"
            : "bulk_update",
        changeDescription: options.operationDescription,
        isRestorePoint: false,
        bulkOperation: {
          operationType: options.operationType,
          totalCount: options.totalCount,
          successCount: options.successCount || 0,
          failureCount: options.failureCount || 0,
          affectedBookingIds: options.affectedBookingIds,
        },
      };

      // Create version snapshot for bulk operation
      const versionSnapshot: any = {
        bookingId: bulkBookingId,
        versionNumber,
        branchId,
        documentSnapshot,
        metadata: bulkOperationMetadata,
        changes,
        branchInfo,
      };

      // Remove any undefined values recursively
      const cleanVersionSnapshot = this.removeUndefinedValues(versionSnapshot);

      console.log(
        "🔍 [BULK VERSION] Complete bulk operation snapshot:",
        JSON.stringify(cleanVersionSnapshot, null, 2)
      );

      // Add to Firestore
      const docRef = await addDoc(
        collection(db, VERSIONS_COLLECTION),
        cleanVersionSnapshot
      );

      console.log(
        `✅ Created bulk operation snapshot ${docRef.id} for ${options.operationType} operation affecting ${options.totalCount} bookings`
      );
      return docRef.id;
    } catch (error) {
      console.error(
        `❌ Failed to create bulk operation snapshot for ${options.operationType}:`,
        error
      );
      throw error;
    }
  }
}

// ============================================================================
// SERVICE INSTANCE
// ============================================================================

export const bookingVersionHistoryService =
  new BookingVersionHistoryServiceImpl();
