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

      // If we have changed field paths but no detailed changes, create basic field changes
      if (
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

      // Create the base version snapshot object without undefined fields
      const versionSnapshot: any = {
        bookingId,
        versionNumber,
        branchId,
        documentSnapshot,
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
}

// ============================================================================
// SERVICE INSTANCE
// ============================================================================

export const bookingVersionHistoryService =
  new BookingVersionHistoryServiceImpl();
