import { db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  setDoc,
  collection,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot,
  DocumentData,
  Unsubscribe,
  writeBatch,
} from "firebase/firestore";

// ============================================================================
// COLLECTION CONSTANTS
// ============================================================================

const COLLECTION_NAME = "bookings";

// ============================================================================
// BOOKING SERVICE INTERFACE
// ============================================================================

export interface BookingService {
  // CRUD Operations
  updateBooking(bookingId: string, updates: Record<string, any>): Promise<void>;
  deleteBooking(bookingId: string): Promise<void>;
  deleteAllBookings(): Promise<void>;
  createBooking(bookingData: Record<string, any>): Promise<string>;
  getBooking(bookingId: string): Promise<DocumentData | null>;
  getAllBookings(): Promise<DocumentData[]>;

  // Real-time Listeners
  subscribeToBookings(
    callback: (bookings: DocumentData[]) => void
  ): Unsubscribe;
  subscribeToBooking(
    bookingId: string,
    callback: (booking: DocumentData | null) => void
  ): Unsubscribe;

  // Utility Methods
  updateBookingField(
    bookingId: string,
    fieldPath: string,
    value: any
  ): Promise<void>;

  // Create or update a complete booking
  createOrUpdateBooking(
    bookingId: string,
    bookingData: Record<string, any>
  ): Promise<void>;

  // Row number management
  getNextRowNumber(): Promise<number>;
  getRowNumberForId(bookingId: string): Promise<number>;

  // Clear booking fields (keep document, clear data)
  clearBookingFields(bookingId: string): Promise<void>;

  // Delete booking and shift subsequent rows
  deleteBookingWithRowShift(bookingId: string): Promise<void>;
}

// ============================================================================
// BOOKING SERVICE IMPLEMENTATION
// ============================================================================

class BookingServiceImpl implements BookingService {
  // ========================================================================
  // CRUD OPERATIONS
  // ========================================================================

  async updateBooking(
    bookingId: string,
    updates: Record<string, any>
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, bookingId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date(),
      });
      console.log(`✅ Updated booking ${bookingId}`);
    } catch (error) {
      console.error(
        `❌ Failed to update booking ${bookingId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async deleteBooking(bookingId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, bookingId);
      await deleteDoc(docRef);
      console.log(`✅ Deleted booking ${bookingId}`);
    } catch (error) {
      console.error(
        `❌ Failed to delete booking ${bookingId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async deleteAllBookings(): Promise<void> {
    try {
      const bookingsCollection = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(bookingsCollection);

      const BATCH_SIZE = 400; // keep well under the 500 limit
      const docs = snapshot.docs;

      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const slice = docs.slice(i, i + BATCH_SIZE);
        slice.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      console.log(`✅ Deleted all ${snapshot.docs.length} bookings in batches`);
    } catch (error) {
      console.error(
        `❌ Failed to delete all bookings: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async createBooking(bookingData: Record<string, any>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...bookingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✅ Created booking with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error(
        `❌ Failed to create booking: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async getBooking(bookingId: string): Promise<DocumentData | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, bookingId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }

      return null;
    } catch (error) {
      console.error(
        `❌ Failed to get booking ${bookingId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async getAllBookings(): Promise<DocumentData[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"))
      );

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error(
        `❌ Failed to get all bookings: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  // ========================================================================
  // REAL-TIME LISTENERS
  // ========================================================================

  subscribeToBookings(
    callback: (bookings: DocumentData[]) => void
  ): Unsubscribe {
    return onSnapshot(
      query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc")),
      (querySnapshot) => {
        const bookings = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(bookings);
      },
      (error) => {
        console.error(`❌ Error listening to bookings: ${error.message}`);
      }
    );
  }

  subscribeToBooking(
    bookingId: string,
    callback: (booking: DocumentData | null) => void
  ): Unsubscribe {
    return onSnapshot(
      doc(db, COLLECTION_NAME, bookingId),
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() });
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error(
          `❌ Error listening to booking ${bookingId}: ${error.message}`
        );
      }
    );
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  async updateBookingField(
    bookingId: string,
    fieldPath: string,
    value: any
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, bookingId);

      // Check if document exists
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Create the document if it doesn't exist
        await setDoc(docRef, {
          id: bookingId,
          [fieldPath]: value,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(
          `✅ Created and updated field ${fieldPath} in new booking ${bookingId}`
        );
      } else {
        // Update existing document
        await updateDoc(docRef, {
          [fieldPath]: value,
          updatedAt: new Date(),
        });
        console.log(
          `✅ Updated field ${fieldPath} in existing booking ${bookingId}`
        );
      }
    } catch (error) {
      console.error(
        `❌ Failed to update field ${fieldPath} in booking ${bookingId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async createOrUpdateBooking(
    bookingId: string,
    bookingData: Record<string, any>
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, bookingId);

      // Check if document exists
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Create new document
        await setDoc(docRef, {
          ...bookingData,
          id: bookingId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ Created new booking ${bookingId}`);
      } else {
        // Update existing document
        await updateDoc(docRef, {
          ...bookingData,
          updatedAt: new Date(),
        });
        console.log(`✅ Updated existing booking ${bookingId}`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to create/update booking ${bookingId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  // ========================================================================
  // ROW NUMBER MANAGEMENT
  // ========================================================================

  async getNextRowNumber(): Promise<number> {
    try {
      const allBookings = await this.getAllBookings();

      if (allBookings.length === 0) {
        return 1; // First row
      }

      // Find the highest numeric ID
      const numericIds = allBookings
        .map((booking) => {
          const id = parseInt(booking.id);
          return isNaN(id) ? 0 : id;
        })
        .filter((id) => id > 0);

      if (numericIds.length === 0) {
        return 1; // No numeric IDs found
      }

      const maxId = Math.max(...numericIds);
      return maxId + 1;
    } catch (error) {
      console.error(
        `❌ Failed to get next row number: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async getRowNumberForId(bookingId: string): Promise<number> {
    try {
      const numericId = parseInt(bookingId);
      if (isNaN(numericId)) {
        throw new Error(`Invalid booking ID: ${bookingId}`);
      }
      return numericId;
    } catch (error) {
      console.error(
        `❌ Failed to get row number for ID ${bookingId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  // ========================================================================
  // FIELD CLEARING
  // ========================================================================

  async clearBookingFields(bookingId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, bookingId);

      // Get the current document to preserve id, createdAt, updatedAt
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error(`Booking document ${bookingId} does not exist`);
      }

      const currentData = docSnap.data();
      console.log(`🔍 Current data for booking ${bookingId}:`, currentData);

      // Keep only essential fields: id, createdAt, updatedAt
      const preservedFields: Record<string, any> = {
        id: currentData.id || bookingId,
        createdAt: currentData.createdAt || new Date(),
        updatedAt: new Date(),
      };

      console.log(`🔒 Preserved fields:`, preservedFields);
      console.log(
        `🧹 Fields being cleared:`,
        Object.keys(currentData).filter(
          (key) => key !== "id" && key !== "createdAt" && key !== "updatedAt"
        )
      );

      // Delete the document and recreate it with only essential fields
      // This ensures all dynamic fields are completely removed
      await deleteDoc(docRef);
      await setDoc(docRef, preservedFields);

      console.log(
        `✅ Cleared all fields from booking ${bookingId}, preserved essential fields`
      );
    } catch (error) {
      console.error(
        `❌ Failed to clear booking fields ${bookingId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  // ========================================================================
  // DELETE WITH ROW SHIFTING
  // ========================================================================

  async deleteBookingWithRowShift(bookingId: string): Promise<void> {
    try {
      console.log(
        `🗑️ Starting delete with row shift for booking ${bookingId}...`
      );

      // Get the booking to find its row number
      const bookingDoc = await getDoc(doc(db, COLLECTION_NAME, bookingId));
      if (!bookingDoc.exists()) {
        throw new Error(`Booking document ${bookingId} does not exist`);
      }

      const bookingData = bookingDoc.data();
      const deletedRowNumber = bookingData.row;

      if (typeof deletedRowNumber !== "number") {
        console.warn(
          `⚠️ Booking ${bookingId} has no valid row number, deleting without shifting`
        );
        await deleteDoc(doc(db, COLLECTION_NAME, bookingId));
        return;
      }

      console.log(`📍 Deleting booking at row ${deletedRowNumber}`);

      // Get all bookings with row numbers greater than the deleted row
      const bookingsRef = collection(db, COLLECTION_NAME);
      const q = query(
        bookingsRef,
        where("row", ">", deletedRowNumber),
        orderBy("row", "asc")
      );

      const snapshot = await getDocs(q);
      const bookingsToUpdate = snapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data(),
        row: doc.data().row,
      }));

      console.log(`📊 Found ${bookingsToUpdate.length} bookings to shift down`);

      // Delete the original booking
      await deleteDoc(doc(db, COLLECTION_NAME, bookingId));

      // If no bookings to shift, we're done
      if (bookingsToUpdate.length === 0) {
        console.log(
          `✅ Deleted booking at row ${deletedRowNumber}, no rows to shift`
        );
        return;
      }

      // Use batch writes to shift all subsequent rows down by 1
      const BATCH_SIZE = 400; // Stay under Firestore's 500 limit
      for (let i = 0; i < bookingsToUpdate.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const slice = bookingsToUpdate.slice(i, i + BATCH_SIZE);

        slice.forEach(({ id, data }) => {
          const newRowNumber = data.row - 1;
          const docRef = doc(db, COLLECTION_NAME, id);
          batch.update(docRef, {
            row: newRowNumber,
            updatedAt: new Date(),
          });
        });

        await batch.commit();
        console.log(
          `✅ Shifted batch ${Math.floor(i / BATCH_SIZE) + 1}: rows ${
            slice[0].row
          }-${slice[slice.length - 1].row} → ${slice[0].row - 1}-${
            slice[slice.length - 1].row - 1
          }`
        );
      }

      console.log(
        `✅ Successfully deleted booking at row ${deletedRowNumber} and shifted ${bookingsToUpdate.length} subsequent rows down`
      );
    } catch (error) {
      console.error(
        `❌ Failed to delete booking with row shift ${bookingId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const bookingService = new BookingServiceImpl();
export default bookingService;
