import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
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
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert a column name to a camelCase ID
 * Examples:
 * - "First Name" → "firstName"
 * - "Booking ID" → "bookingId"
 * - "P1 Due Date" → "p1DueDate"
 * - "Include BCC (Reservation)" → "includeBccReservation"
 */
function generateCustomId(columnName: string): string {
  return columnName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters except spaces
    .replace(/\s+/g, " ") // Normalize multiple spaces to single space
    .trim()
    .split(" ")
    .map((word, index) => {
      if (index === 0) {
        return word; // First word stays lowercase
      }
      return word.charAt(0).toUpperCase() + word.slice(1); // Capitalize first letter of subsequent words
    })
    .join("");
}

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

      // Generate custom ID from column name
      const customId = generateCustomId(column.columnName);

      // Check if a column with this ID already exists
      const existingColumn = await this.getColumn(customId);
      if (existingColumn) {
        throw new Error(
          `Column with ID '${customId}' already exists. Please choose a different name.`
        );
      }

      // Get the next order number
      const existingColumns = await this.getAllColumns();
      const maxOrder = Math.max(...existingColumns.map((col) => col.order), 0);

      // Clean the column data to remove undefined values
      const cleanColumn = { ...column };
      Object.keys(cleanColumn).forEach((key) => {
        if (cleanColumn[key] === undefined) {
          delete cleanColumn[key];
        }
      });

      const newColumn = {
        ...cleanColumn,
        id: customId, // Use custom ID
        order: maxOrder + 1,
      };

      console.log(`🔍 Creating column with data:`, newColumn);

      // Create the column document with custom ID as the document ID
      const docRef = doc(db, COLLECTION_NAME, customId);
      await setDoc(docRef, newColumn);

      console.log(
        `✅ Created column: ${column.columnName} with custom ID: ${customId}`
      );

      // Sync the new column to all existing bookings
      await this.syncColumnToAllBookings(
        customId,
        this.getDefaultValueForType(column.dataType)
      );

      return customId;
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
      // Column "id" is the logical field (e.g., returnDate), not necessarily the Firestore document id.
      // We need to find the document where field "id" == columnId.
      const qSnap = await getDocs(
        query(collection(db, COLLECTION_NAME), where("id", "==", columnId))
      );
      const docSnap = qSnap.docs[0];

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data() as SheetColumn;
        return { ...data, docId: docSnap.id } as SheetColumn;
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

      return querySnapshot.docs.map((doc) => {
        const data = doc.data() as SheetColumn;
        return { ...data, docId: doc.id } as SheetColumn;
      });
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
      // Temporarily allow updates to default columns (requested)

      // Validate updates
      const existingColumn = await this.getColumn(columnId);
      if (!existingColumn) {
        throw new Error(`Column not found: ${columnId}`);
      }

      // Prepare updates, excluding id field and handling columnName changes
      const cleanUpdates = { ...updates };

      // Remove id field from updates - we never change the ID
      delete cleanUpdates.id;

      // Handle columnName changes - track history
      if (
        updates.columnName &&
        updates.columnName !== existingColumn.columnName
      ) {
        const now = new Date().toISOString();
        const nameHistoryEntry = {
          oldName: existingColumn.columnName,
          newName: updates.columnName,
          timestamp: now,
        };

        // Get existing history or create new array
        const existingHistory = existingColumn.columnNameHistory || [];
        cleanUpdates.columnNameHistory = [...existingHistory, nameHistoryEntry];

        console.log(
          `📝 Column name changed: "${existingColumn.columnName}" → "${updates.columnName}"`
        );
      }

      // Remove undefined values
      Object.keys(cleanUpdates).forEach((key) => {
        if (cleanUpdates[key] === undefined) {
          delete cleanUpdates[key];
        }
      });

      const updatedColumn = { ...existingColumn, ...cleanUpdates };
      const validation = this.validateColumn(updatedColumn);
      if (!validation.isValid) {
        throw new Error(`Invalid column data: ${validation.errors.join(", ")}`);
      }

      console.log(`🔍 Updating column ${columnId} with data:`, cleanUpdates);
      console.log(`🔍 Column details:`, {
        columnId,
        docId: existingColumn.docId,
        columnName: existingColumn.columnName,
        currentWidth: existingColumn.width,
        newWidth: cleanUpdates.width,
      });
      console.log(`🔍 Clean updates object keys:`, Object.keys(cleanUpdates));
      console.log(
        `🔍 Clean updates object values:`,
        Object.values(cleanUpdates)
      );
      console.log(
        `🔍 Width specifically:`,
        cleanUpdates.width,
        typeof cleanUpdates.width
      );

      const targetId = existingColumn.docId ?? columnId;
      console.log(`🔍 Using target document ID: ${targetId}`);
      const docRef = doc(db, COLLECTION_NAME, targetId);
      console.log(`🔍 Document reference:`, docRef.path);

      // Let's also check what the document looks like before update
      try {
        const docSnap = await getDoc(docRef);
        console.log(`🔍 Document exists before update:`, docSnap.exists());
        if (docSnap.exists()) {
          console.log(`🔍 Current document data:`, docSnap.data());
        }
      } catch (error) {
        console.log(`🔍 Error checking document before update:`, error);
      }

      await updateDoc(docRef, cleanUpdates);
      console.log(`✅ Updated column: ${columnId} in document: ${targetId}`);

      // Let's also check what the document looks like after update
      try {
        const docSnapAfter = await getDoc(docRef);
        console.log(`🔍 Document exists after update:`, docSnapAfter.exists());
        if (docSnapAfter.exists()) {
          console.log(`🔍 Document data after update:`, docSnapAfter.data());
        }
      } catch (error) {
        console.log(`🔍 Error checking document after update:`, error);
      }
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
      const existingColumn = await this.getColumn(columnId);
      if (!existingColumn) throw new Error(`Column not found: ${columnId}`);
      const targetId = existingColumn.docId ?? columnId;
      const docRef = doc(db, COLLECTION_NAME, targetId);
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

  async getColumnsByFunction(functionId: string): Promise<SheetColumn[]> {
    const allColumns = await this.getAllColumns();
    return allColumns.filter((col) => col.function === functionId);
  }

  async getDependentColumns(functionId: string): Promise<SheetColumn[]> {
    const allColumns = await this.getAllColumns();

    // Find columns that directly use this function
    const directDependentColumns = allColumns.filter(
      (col) => col.function === functionId
    );

    if (directDependentColumns.length === 0) {
      return [];
    }

    // Build column dependency graph
    const dependencyGraph = this.buildColumnDependencyGraph(allColumns);

    // Find all columns that depend on the directly dependent columns
    const allDependentColumnIds = new Set<string>();

    for (const column of directDependentColumns) {
      // Add the column itself
      allDependentColumnIds.add(column.id);

      // Find all columns that depend on this column
      const dependents = this.getColumnDependents(column.id, dependencyGraph);
      dependents.forEach((depId) => allDependentColumnIds.add(depId));
    }

    // Return all dependent columns
    return allColumns.filter((col) => allDependentColumnIds.has(col.id));
  }

  async getDependentFunctions(functionId: string): Promise<any[]> {
    const allColumns = await this.getAllColumns();

    // Find columns that directly use this function
    const directDependentColumns = allColumns.filter(
      (col) => col.function === functionId
    );

    if (directDependentColumns.length === 0) {
      return [];
    }

    // Build column dependency graph
    const dependencyGraph = this.buildColumnDependencyGraph(allColumns);

    // Find all columns that depend on the directly dependent columns
    const allDependentColumnIds = new Set<string>();

    for (const column of directDependentColumns) {
      // Add the column itself
      allDependentColumnIds.add(column.id);

      // Find all columns that depend on this column
      const dependents = this.getColumnDependents(column.id, dependencyGraph);
      dependents.forEach((depId) => allDependentColumnIds.add(depId));
    }

    // Get all dependent columns
    const dependentColumns = allColumns.filter((col) =>
      allDependentColumnIds.has(col.id)
    );

    // Extract unique function IDs from dependent columns
    const functionIds = new Set<string>();
    dependentColumns.forEach((col) => {
      if (col.function) {
        functionIds.add(col.function);
      }
    });

    // Get function details from Firestore
    const functions = [];
    for (const funcId of functionIds) {
      try {
        const funcDoc = await getDoc(doc(db, "ts_files", funcId));
        if (funcDoc.exists()) {
          functions.push({
            id: funcId,
            ...funcDoc.data(),
          });
        }
      } catch (error) {
        console.error(`Error fetching function ${funcId}:`, error);
      }
    }

    return functions;
  }

  async getDependentColumnsForColumn(columnId: string): Promise<SheetColumn[]> {
    const allColumns = await this.getAllColumns();

    // Build column dependency graph
    const dependencyGraph = this.buildColumnDependencyGraph(allColumns);

    // Find all columns that depend on this column
    const allDependentColumnIds = new Set<string>();
    allDependentColumnIds.add(columnId); // Include the column itself

    const dependents = this.getColumnDependents(columnId, dependencyGraph);
    dependents.forEach((depId) => allDependentColumnIds.add(depId));

    // Return all dependent columns
    return allColumns.filter((col) => allDependentColumnIds.has(col.id));
  }

  async getRelatedColumns(columnId: string): Promise<{
    dependencies: SheetColumn[];
    dependents: SheetColumn[];
  }> {
    const allColumns = await this.getAllColumns();
    const dependencyGraph = this.buildColumnDependencyGraph(allColumns);

    // Find dependencies (columns this column depends on)
    const dependencies = dependencyGraph.get(columnId) || [];
    const dependencyColumns = allColumns.filter((col) =>
      dependencies.includes(col.id)
    );

    // Find dependents (columns that depend on this column)
    const dependents = this.getColumnDependents(columnId, dependencyGraph);
    const dependentColumns = allColumns.filter((col) =>
      dependents.includes(col.id)
    );

    return {
      dependencies: dependencyColumns,
      dependents: dependentColumns,
    };
  }

  private buildColumnDependencyGraph(
    columns: SheetColumn[]
  ): Map<string, string[]> {
    const dependencyGraph = new Map<string, string[]>();

    columns.forEach((column) => {
      const dependencies: string[] = [];

      if (column.arguments) {
        column.arguments.forEach((arg) => {
          // Check for single column reference by column name
          if (arg.columnReference) {
            // Skip "ID" reference since it's not a column dependency
            if (arg.columnReference !== "ID") {
              const refColumn = columns.find(
                (c) => c.columnName === arg.columnReference
              );
              if (refColumn) {
                dependencies.push(refColumn.id);
              }
            }
          }

          // Check for multiple column references by column name
          if (arg.columnReferences && Array.isArray(arg.columnReferences)) {
            arg.columnReferences.forEach((refName) => {
              // Skip "ID" reference since it's not a column dependency
              if (refName !== "ID") {
                const refColumn = columns.find((c) => c.columnName === refName);
                if (refColumn) {
                  dependencies.push(refColumn.id);
                }
              }
            });
          }

          // Check for column reference by column ID in arguments[n].name
          if (arg.name) {
            const refColumn = columns.find((c) => c.id === arg.name);
            if (refColumn) {
              dependencies.push(refColumn.id);
            }
          }
        });
      }

      dependencyGraph.set(column.id, dependencies);
    });

    return dependencyGraph;
  }

  private getColumnDependents(
    columnId: string,
    dependencyGraph: Map<string, string[]>
  ): string[] {
    const visited = new Set<string>();
    const dependents: string[] = [];

    const collectDependents = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      for (const [colId, dependencies] of dependencyGraph.entries()) {
        if (dependencies.includes(currentId)) {
          dependents.push(colId);
          collectDependents(colId);
        }
      }
    };

    collectDependents(columnId);
    return dependents;
  }

  async reorderColumns(columnIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      // columnIds are logical ids; fetch docIds map first
      const all = await this.getAllColumns();
      const idToDocId = new Map<string, string>();
      all.forEach((c) => {
        if (c.id && c.docId) idToDocId.set(c.id, c.docId);
      });

      columnIds.forEach((columnId, index) => {
        const docId = idToDocId.get(columnId) ?? columnId;
        const docRef = doc(db, COLLECTION_NAME, docId);
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
        console.log(
          `✅ Synced column ${column.id} (${column.columnName}) to ${updatedCount} bookings`
        );
      } else {
        console.log(
          `ℹ️  Column ${column.id} (${column.columnName}) already exists in all bookings`
        );
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
      const column = await this.getColumn(columnId);
      if (!column) {
        throw new Error(`Column not found: ${columnId}`);
      }

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
          `✅ Removed column ${column.id} (${column.columnName}) from ${updatedCount} bookings`
        );
      } else {
        console.log(
          `ℹ️  Column ${column.id} (${column.columnName}) not found in any bookings`
        );
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
      column.dataType === "function" &&
      column.function !== undefined &&
      (!column.function || column.function.trim().length === 0)
    ) {
      errors.push("Function columns must have a valid function name");
    }

    if (
      column.order !== undefined &&
      (column.order < 1 || !Number.isInteger(column.order))
    ) {
      errors.push("Order must be a positive integer");
    }

    if (
      column.width !== undefined &&
      (column.width < 50 || column.width > 3000)
    ) {
      errors.push("Width must be between 50 and 3000");
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
