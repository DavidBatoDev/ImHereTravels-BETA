import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  DocumentData,
  QueryDocumentSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { SheetColumn } from "@/types/sheet-management";

// ============================================================================
// COLLECTION CONSTANTS
// ============================================================================

const COLLECTION_NAME = "bookingSheetColumns";

// ============================================================================
// COLUMN SERVICE INTERFACE
// ============================================================================

export interface BookingSheetColumnService {
  // CRUD Operations
  createColumn(column: Omit<SheetColumn, "id">): Promise<string>;
  getColumn(columnId: string): Promise<SheetColumn | null>;
  getAllColumns(): Promise<SheetColumn[]>;
  updateColumn(columnId: string, updates: Partial<SheetColumn>): Promise<void>;
  deleteColumn(columnId: string): Promise<void>;

  // Special Operations
  getDefaultColumns(): Promise<SheetColumn[]>;
  getCustomColumns(): Promise<SheetColumn[]>;
  reorderColumns(columnIds: string[]): Promise<void>;

  // Real-time Listeners
  subscribeToColumns(callback: (columns: SheetColumn[]) => void): Unsubscribe;
  subscribeToColumnChanges(
    columnId: string,
    callback: (column: SheetColumn | null) => void
  ): Unsubscribe;

  // Data Synchronization
  syncColumnToAllBookings(columnId: string, defaultValue?: any): Promise<void>;
  removeColumnFromAllBookings(columnId: string): Promise<void>;

  // Validation
  validateColumn(column: Partial<SheetColumn>): {
    isValid: boolean;
    errors: string[];
  };
  isDefaultColumn(columnId: string): boolean;
}

// ============================================================================
// DEFAULT COLUMN IDS (Protected from deletion/modification)
// ============================================================================

const DEFAULT_COLUMN_IDS = [
  "bookingId",
  "bookingCode",
  "tourCode",
  "reservationDate",
  "bookingType",
  "bookingStatus",
  "daysBetweenBookingAndTour",
  "groupId",
  "isMainBooker",
  "travellerInitials",
  "firstName",
  "lastName",
  "fullName",
  "emailAddress",
  "tourPackageNameUniqueCounter",
  "tourPackageName",
  "formattedDate",
  "tourDate",
  "returnDate",
  "tourDuration",
  "useDiscountedTourCost",
  "originalTourCost",
  "discountedTourCost",
  "reservationEmail",
  "includeBccReservation",
  "generateEmailDraft",
  "emailDraftLink",
  "subjectLineReservation",
  "sendEmail",
  "sentEmailLink",
  "reservationEmailSentDate",
  "paymentCondition",
  "eligible2ndOfMonths",
  "availablePaymentTerms",
  "paymentPlan",
  "paymentMethod",
  "enablePaymentReminder",
  "paymentProgress",
  "fullPayment",
  "fullPaymentDueDate",
  "fullPaymentAmount",
  "fullPaymentDatePaid",
  "paymentTerm1",
  "paymentTerm2",
  "paymentTerm3",
  "paymentTerm4",
  "reservationFee",
  "paid",
  "remainingBalance",
  "manualCredit",
  "creditFrom",
  "reasonForCancellation",
  "includeBccCancellation",
  "generateCancellationEmailDraft",
  "cancellationEmailDraftLink",
  "subjectLineCancellation",
  "sendCancellationEmail",
  "sentCancellationEmailLink",
  "cancellationEmailSentDate",
];

// ============================================================================
// COLUMN SERVICE IMPLEMENTATION
// ============================================================================

class BookingSheetColumnServiceImpl implements BookingSheetColumnService {
  // ========================================================================
  // CRUD OPERATIONS
  // ========================================================================

  async createColumn(column: Omit<SheetColumn, "id">): Promise<string> {
    try {
      // Validate column data
      const validation = this.validateColumn(column);
      if (!validation.isValid) {
        throw new Error(`Invalid column data: ${validation.errors.join(", ")}`);
      }

      // Get the next order number
      const existingColumns = await this.getAllColumns();
      const maxOrder = Math.max(...existingColumns.map((col) => col.order), 0);
      const newColumn = {
        ...column,
        order: maxOrder + 1,
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newColumn);
      console.log(
        `✅ Created column: ${column.columnName} with ID: ${docRef.id}`
      );

      // Sync the new column to all existing bookings
      await this.syncColumnToAllBookings(
        docRef.id,
        this.getDefaultValueForType(column.dataType)
      );

      return docRef.id;
    } catch (error) {
      console.error(
        `❌ Failed to create column: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async getColumn(columnId: string): Promise<SheetColumn | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, columnId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as SheetColumn;
      }

      return null;
    } catch (error) {
      console.error(
        `❌ Failed to get column ${columnId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async getAllColumns(): Promise<SheetColumn[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, COLLECTION_NAME), orderBy("order", "asc"))
      );

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SheetColumn[];
    } catch (error) {
      console.error(
        `❌ Failed to get all columns: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async updateColumn(
    columnId: string,
    updates: Partial<SheetColumn>
  ): Promise<void> {
    try {
      // Check if it's a default column
      if (this.isDefaultColumn(columnId)) {
        throw new Error(`Cannot modify default column: ${columnId}`);
      }

      // Validate updates
      const existingColumn = await this.getColumn(columnId);
      if (!existingColumn) {
        throw new Error(`Column not found: ${columnId}`);
      }

      const updatedColumn = { ...existingColumn, ...updates };
      const validation = this.validateColumn(updatedColumn);
      if (!validation.isValid) {
        throw new Error(`Invalid column data: ${validation.errors.join(", ")}`);
      }

      const docRef = doc(db, COLLECTION_NAME, columnId);
      await updateDoc(docRef, updates);
      console.log(`✅ Updated column: ${columnId}`);
    } catch (error) {
      console.error(
        `❌ Failed to update column ${columnId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async deleteColumn(columnId: string): Promise<void> {
    try {
      // Check if it's a default column
      if (this.isDefaultColumn(columnId)) {
        throw new Error(`Cannot delete default column: ${columnId}`);
      }

      // Remove the column from all existing bookings
      await this.removeColumnFromAllBookings(columnId);

      // Delete the column definition
      const docRef = doc(db, COLLECTION_NAME, columnId);
      await deleteDoc(docRef);
      console.log(`✅ Deleted column: ${columnId}`);
    } catch (error) {
      console.error(
        `❌ Failed to delete column ${columnId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  // ========================================================================
  // SPECIAL OPERATIONS
  // ========================================================================

  async getDefaultColumns(): Promise<SheetColumn[]> {
    const allColumns = await this.getAllColumns();
    return allColumns.filter((col) => this.isDefaultColumn(col.id));
  }

  async getCustomColumns(): Promise<SheetColumn[]> {
    const allColumns = await this.getAllColumns();
    return allColumns.filter((col) => !this.isDefaultColumn(col.id));
  }

  async reorderColumns(columnIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);

      columnIds.forEach((columnId, index) => {
        const docRef = doc(db, COLLECTION_NAME, columnId);
        batch.update(docRef, { order: index + 1 });
      });

      await batch.commit();
      console.log(`✅ Reordered ${columnIds.length} columns`);
    } catch (error) {
      console.error(
        `❌ Failed to reorder columns: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  // ========================================================================
  // REAL-TIME LISTENERS
  // ========================================================================

  subscribeToColumns(callback: (columns: SheetColumn[]) => void): Unsubscribe {
    return onSnapshot(
      query(collection(db, COLLECTION_NAME), orderBy("order", "asc")),
      (querySnapshot) => {
        const columns = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SheetColumn[];
        callback(columns);
      },
      (error) => {
        console.error(`❌ Error listening to columns: ${error.message}`);
      }
    );
  }

  subscribeToColumnChanges(
    columnId: string,
    callback: (column: SheetColumn | null) => void
  ): Unsubscribe {
    return onSnapshot(
      doc(db, COLLECTION_NAME, columnId),
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() } as SheetColumn);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error(
          `❌ Error listening to column ${columnId}: ${error.message}`
        );
      }
    );
  }

  // ========================================================================
  // DATA SYNCHRONIZATION
  // ========================================================================

  async syncColumnToAllBookings(
    columnId: string,
    defaultValue?: any
  ): Promise<void> {
    try {
      const column = await this.getColumn(columnId);
      if (!column) {
        throw new Error(`Column not found: ${columnId}`);
      }

      const batch = writeBatch(db);
      const bookingsSnapshot = await getDocs(collection(db, "bookings"));

      let updatedCount = 0;
      bookingsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (!(columnId in data)) {
          batch.update(doc.ref, {
            [columnId]:
              defaultValue ?? this.getDefaultValueForType(column.dataType),
          });
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        await batch.commit();
        console.log(`✅ Synced column ${columnId} to ${updatedCount} bookings`);
      } else {
        console.log(`ℹ️  Column ${columnId} already exists in all bookings`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to sync column ${columnId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async removeColumnFromAllBookings(columnId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      const bookingsSnapshot = await getDocs(collection(db, "bookings"));

      let updatedCount = 0;
      bookingsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (columnId in data) {
          const { [columnId]: removedField, ...remainingData } = data;
          batch.update(doc.ref, remainingData);
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        await batch.commit();
        console.log(
          `✅ Removed column ${columnId} from ${updatedCount} bookings`
        );
      } else {
        console.log(`ℹ️  Column ${columnId} not found in any bookings`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to remove column ${columnId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  // ========================================================================
  // VALIDATION
  // ========================================================================

  validateColumn(column: Partial<SheetColumn>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!column.columnName || column.columnName.trim().length === 0) {
      errors.push("Column name is required");
    }

    if (
      !column.dataType ||
      ![
        "string",
        "number",
        "boolean",
        "date",
        "select",
        "email",
        "currency",
        "function",
      ].includes(column.dataType)
    ) {
      errors.push("Valid column type is required");
    }

    if (
      column.dataType === "select" &&
      (!column.options || column.options.length === 0)
    ) {
      errors.push("Select columns must have options");
    }

    if (
      column.order !== undefined &&
      (column.order < 1 || !Number.isInteger(column.order))
    ) {
      errors.push("Order must be a positive integer");
    }

    if (
      column.width !== undefined &&
      (column.width < 50 || column.width > 500)
    ) {
      errors.push("Width must be between 50 and 500");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  isDefaultColumn(columnId: string): boolean {
    return DEFAULT_COLUMN_IDS.includes(columnId);
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  private getDefaultValueForType(type: string): any {
    switch (type) {
      case "string":
      case "email":
        return "";
      case "number":
      case "currency":
        return 0;
      case "boolean":
        return false;
      case "date":
        return null;
      case "select":
        return "";
      case "function":
        return "";
      default:
        return "";
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const bookingSheetColumnService = new BookingSheetColumnServiceImpl();
export default bookingSheetColumnService;
