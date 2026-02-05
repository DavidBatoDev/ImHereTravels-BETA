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
import crypto from "crypto";
import { bookingVersionHistoryService } from "./booking-version-history-service";
import { SheetData } from "@/types/sheet-management";
import { useAuthStore } from "@/store/auth-store";

// ============================================================================
// COLLECTION CONSTANTS
// ============================================================================

const COLLECTION_NAME = "bookings";

/**
 * Generate a secure, unguessable access token using crypto.randomBytes
 * Uses 32 bytes of cryptographically secure random data encoded as URL-safe base64
 * This provides 256 bits of entropy, making it practically impossible to guess
 *
 * @returns {string} A secure access token (43 characters, URL-safe)
 */
function generateAccessToken(): string {
  return crypto
    .randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// Configuration for version tracking
const VERSION_TRACKING_CONFIG = {
  enabled: true, // Set to false to completely disable version tracking
  async: true, // Set to false to make version tracking synchronous (not recommended)
  trackingLevels: {
    create: true, // Track booking creation
    update: true, // Track booking updates
    delete: true, // Track booking deletions
    bulkOperations: true, // Track bulk operations (import, bulk delete)
    fieldUpdates: true, // Track individual field updates
    clearFields: true, // Track field clearing operations
  },
  performance: {
    skipVersioningForBulkImports: true, // Skip individual version tracking during bulk imports (recommended)
    batchVersionSnapshots: true, // Batch version snapshots for better performance
    maxVersionsPerBooking: 100, // Maximum versions to keep per booking (0 = unlimited)
  },
};

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
    callback: (bookings: DocumentData[]) => void,
  ): Unsubscribe;
  subscribeToBooking(
    bookingId: string,
    callback: (booking: DocumentData | null) => void,
  ): Unsubscribe;

  // Utility Methods
  updateBookingField(
    bookingId: string,
    fieldPath: string,
    value: any,
  ): Promise<void>;

  // Create or update a complete booking
  createOrUpdateBooking(
    bookingId: string,
    bookingData: Record<string, any>,
  ): Promise<void>;

  // Row number management
  getNextRowNumber(): Promise<number>;
  getRowNumberForId(bookingId: string): Promise<number>;

  // Clear booking fields (keep document, clear data)
  clearBookingFields(bookingId: string): Promise<void>;

  // Delete booking and shift subsequent rows
  deleteBookingWithRowShift(bookingId: string): Promise<void>;

  // Version tracking configuration
  getVersionTrackingConfig(): typeof VERSION_TRACKING_CONFIG;
  setVersionTracking(
    trackingType: keyof typeof VERSION_TRACKING_CONFIG.trackingLevels,
    enabled: boolean,
  ): void;
}

// ============================================================================
// BOOKING SERVICE IMPLEMENTATION
// ============================================================================

class BookingServiceImpl implements BookingService {
  // Track bookings that are in the "create then update" pattern
  private pendingCreations = new Set<string>();

  // ========================================================================
  // CRUD OPERATIONS
  // ========================================================================

  async updateBooking(
    bookingId: string,
    updates: Record<string, any>,
  ): Promise<void> {
    console.log(
      `🔍 [UPDATE BOOKING DEBUG] Called for ${bookingId}, updates:`,
      Object.keys(updates),
    );
    try {
      // Get current booking data for version tracking (start async)
      const currentBookingPromise = this.getBooking(bookingId);

      const docRef = doc(db, COLLECTION_NAME, bookingId);
      const updatedData = {
        ...updates,
        updatedAt: new Date(),
      };

      // Perform the main update operation first (this is what the user is waiting for)
      await updateDoc(docRef, updatedData);
      console.log(`✅ Updated booking ${bookingId}`);

      // Create version snapshot asynchronously (fire-and-forget, don't await)
      if (
        VERSION_TRACKING_CONFIG.enabled &&
        VERSION_TRACKING_CONFIG.trackingLevels.update
      ) {
        // Check if this is the first update after an empty creation
        if (this.pendingCreations.has(bookingId)) {
          console.log(
            `📝 [PENDING CREATION] First update for ${bookingId}, treating as creation`,
          );
          this.pendingCreations.delete(bookingId);

          // Treat this as a "create" operation
          this.createVersionSnapshotAsync(
            bookingId,
            Promise.resolve(null), // No previous data for creation
            updates,
            "create",
            "Initial booking creation",
          );
        } else {
          // Normal update operation
          this.createVersionSnapshotAsync(
            bookingId,
            currentBookingPromise,
            updates,
            "update",
          );
        }
      }
    } catch (error) {
      console.error(
        `❌ Failed to update booking ${bookingId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      throw error;
    }
  }

  async deleteBooking(bookingId: string): Promise<void> {
    let currentBooking: DocumentData | null = null;
    let versionSnapshotId: string | null = null;

    try {
      // Get current booking data for version tracking BEFORE deletion
      if (
        VERSION_TRACKING_CONFIG.enabled &&
        VERSION_TRACKING_CONFIG.trackingLevels.delete
      ) {
        currentBooking = await this.getBooking(bookingId);
        if (!currentBooking) {
          console.warn(
            `⚠️ Booking ${bookingId} not found for deletion version tracking`,
          );
        }
      }

      const docRef = doc(db, COLLECTION_NAME, bookingId);

      // Create version snapshot BEFORE deletion (synchronously for rollback capability)
      if (
        VERSION_TRACKING_CONFIG.enabled &&
        VERSION_TRACKING_CONFIG.trackingLevels.delete &&
        currentBooking
      ) {
        try {
          const { user, userProfile } = useAuthStore.getState();
          const currentUserId = user?.uid || "system";
          const currentUserName =
            userProfile?.profile?.firstName && userProfile?.profile?.lastName
              ? `${userProfile.profile.firstName} ${userProfile.profile.lastName}`
              : userProfile?.email || user?.email || "System";

          versionSnapshotId =
            await bookingVersionHistoryService.createVersionSnapshot(
              bookingId,
              currentBooking as SheetData,
              {
                changeType: "delete",
                changeDescription: "Booking deleted",
                userId: currentUserId,
                userName: currentUserName,
              },
            );
          console.log(
            `📝 Created delete version snapshot: ${versionSnapshotId}`,
          );
        } catch (versionError) {
          console.error(
            `⚠️ Failed to create version snapshot, proceeding with deletion:`,
            versionError,
          );
          // Continue with deletion even if version tracking fails
        }
      }

      // Clean up associated scheduled payment reminder emails
      await this.cleanupScheduledEmails(bookingId);

      // Perform the actual deletion
      await deleteDoc(docRef);
      console.log(`✅ Deleted booking ${bookingId}`);
    } catch (error) {
      console.error(
        `❌ Failed to delete booking ${bookingId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );

      // If deletion failed but we created a version snapshot, we should clean it up
      if (versionSnapshotId) {
        try {
          console.log(
            `🧹 Cleaning up version snapshot ${versionSnapshotId} due to failed deletion`,
          );
          // Note: In a real implementation, you might want to mark the version as "failed" instead of deleting it
          // For now, we'll just log the cleanup attempt
        } catch (cleanupError) {
          console.error(`❌ Failed to cleanup version snapshot:`, cleanupError);
        }
      }

      throw error;
    }
  }

  async deleteAllBookings(): Promise<void> {
    try {
      const bookingsCollection = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(bookingsCollection);

      const BATCH_SIZE = 400; // keep well under the 500 limit
      const docs = snapshot.docs;
      const totalCount = docs.length;

      // Create bulk delete version snapshot before deletion
      if (
        VERSION_TRACKING_CONFIG.enabled &&
        VERSION_TRACKING_CONFIG.trackingLevels.bulkOperations &&
        totalCount > 0
      ) {
        const { user, userProfile } = useAuthStore.getState();
        const currentUserId = user?.uid || "system";
        const currentUserName =
          userProfile?.profile?.firstName && userProfile?.profile?.lastName
            ? `${userProfile.profile.firstName} ${userProfile.profile.lastName}`
            : userProfile?.email || user?.email || "System";

        const affectedBookingIds = docs.map((doc) => doc.id);

        // Create bulk delete snapshot asynchronously (fire-and-forget)
        this.createBulkDeleteSnapshotAsync({
          operationType: "delete",
          operationDescription: `Bulk delete of all ${totalCount} bookings`,
          affectedBookingIds,
          userId: currentUserId,
          userName: currentUserName,
          totalCount,
        });
      }

      // Perform the actual deletion
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
        }`,
      );
      throw error;
    }
  }

  async createBooking(bookingData: Record<string, any>): Promise<string> {
    let docId: string | undefined;

    try {
      // Generate access token for new booking
      const access_token = generateAccessToken();

      const priceSnapshotMetadata = {
        lockPricing: bookingData.lockPricing ?? false,
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...bookingData,
        access_token,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...priceSnapshotMetadata,
      });
      docId = docRef.id;
      console.log(`✅ Created booking with ID: ${docRef.id}`);

      // Only create version snapshot if this is not an empty placeholder booking
      // Empty bookings are typically created just to get an ID, then immediately updated
      const isEmptyPlaceholder = Object.keys(bookingData).length === 0;
      const needsIdField = !bookingData.hasOwnProperty("id");

      console.log(`🔍 [CREATE DEBUG] Booking ${docRef.id}:`, {
        bookingDataKeys: Object.keys(bookingData),
        isEmptyPlaceholder,
        needsIdField,
        willCreateVersion:
          VERSION_TRACKING_CONFIG.enabled &&
          VERSION_TRACKING_CONFIG.trackingLevels.create &&
          !isEmptyPlaceholder &&
          !needsIdField,
      });

      // Track bookings that will be updated shortly (either empty or missing id field)
      if (isEmptyPlaceholder || needsIdField) {
        this.pendingCreations.add(docRef.id);
        console.log(
          `📝 [PENDING CREATION] Added ${docRef.id} to pending creations (${
            isEmptyPlaceholder ? "empty" : "needs id field"
          })`,
        );
      }

      if (
        VERSION_TRACKING_CONFIG.enabled &&
        VERSION_TRACKING_CONFIG.trackingLevels.create &&
        !isEmptyPlaceholder &&
        !needsIdField
      ) {
        this.createVersionSnapshotAsync(
          docRef.id,
          Promise.resolve(null),
          bookingData,
          "create",
        );
      }

      return docRef.id;
    } catch (error) {
      // Clean up pending creation if creation failed
      if (docId) {
        this.pendingCreations.delete(docId);
      }

      console.error(
        `❌ Failed to create booking: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
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
        }`,
      );
      throw error;
    }
  }

  async getAllBookings(): Promise<DocumentData[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc")),
      );

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error(
        `❌ Failed to get all bookings: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      throw error;
    }
  }

  // ========================================================================
  // REAL-TIME LISTENERS
  // ========================================================================

  subscribeToBookings(
    callback: (bookings: DocumentData[]) => void,
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
      },
    );
  }

  subscribeToBooking(
    bookingId: string,
    callback: (booking: DocumentData | null) => void,
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
          `❌ Error listening to booking ${bookingId}: ${error.message}`,
        );
      },
    );
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  async updateBookingField(
    bookingId: string,
    fieldPath: string,
    value: any,
  ): Promise<void> {
    console.log(
      `🔍 [UPDATE FIELD DEBUG] Called for ${bookingId}, field: ${fieldPath}, value:`,
      value,
    );
    try {
      const docRef = doc(db, COLLECTION_NAME, bookingId);

      // Check if document exists
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Create the document if it doesn't exist
        const newBookingData = {
          id: bookingId,
          [fieldPath]: value,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await setDoc(docRef, newBookingData);
        console.log(
          `✅ Created and updated field ${fieldPath} in new booking ${bookingId}`,
        );

        // Create version snapshot for new booking creation
        if (
          VERSION_TRACKING_CONFIG.enabled &&
          VERSION_TRACKING_CONFIG.trackingLevels.create
        ) {
          this.createVersionSnapshotAsync(
            bookingId,
            Promise.resolve(null),
            newBookingData,
            "create",
            `Created booking with field ${fieldPath}`,
          );
        }
      } else {
        // Get current booking data for version tracking
        const currentBookingData = { id: bookingId, ...docSnap.data() };

        // Update existing document
        const updateData = {
          [fieldPath]: value,
          updatedAt: new Date(),
        };

        await updateDoc(docRef, updateData);
        console.log(
          `✅ Updated field ${fieldPath} in existing booking ${bookingId}`,
        );

        // Create version snapshot for field update
        if (
          VERSION_TRACKING_CONFIG.enabled &&
          VERSION_TRACKING_CONFIG.trackingLevels.fieldUpdates
        ) {
          // Check if this is part of the initial creation process
          if (this.pendingCreations.has(bookingId)) {
            // If we're setting the 'id' field, this completes the initial creation
            if (fieldPath === "id") {
              console.log(
                `📝 [PENDING CREATION] Completing initial creation for ${bookingId} with id field`,
              );
              this.pendingCreations.delete(bookingId);

              // Create the "create" version snapshot with the complete booking data
              const completeBookingData = {
                ...currentBookingData,
                [fieldPath]: value,
              };
              this.createVersionSnapshotAsync(
                bookingId,
                Promise.resolve(null), // No previous data for creation
                completeBookingData,
                "create",
                "Initial booking creation",
              );
            } else {
              console.log(
                `📝 [PENDING CREATION] Skipping field update version for ${bookingId}, part of initial creation`,
              );
              // Don't create version snapshot for other field updates during initial creation
            }
          } else {
            this.createVersionSnapshotAsync(
              bookingId,
              Promise.resolve(currentBookingData),
              updateData,
              "update",
              `Updated field ${fieldPath}`,
            );
          }
        }
      }
    } catch (error) {
      console.error(
        `❌ Failed to update field ${fieldPath} in booking ${bookingId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      throw error;
    }
  }

  async createOrUpdateBooking(
    bookingId: string,
    bookingData: Record<string, any>,
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, bookingId);

      // Check if document exists
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Create new document
        // Generate access token for new booking
        const access_token = generateAccessToken();

        const priceSnapshotMetadata = {
          lockPricing: bookingData.lockPricing ?? false,
        };

        const newBookingData = {
          ...bookingData,
          id: bookingId,
          access_token,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...priceSnapshotMetadata,
        };

        await setDoc(docRef, newBookingData);
        console.log(`✅ Created new booking ${bookingId}`);

        // Create version snapshot for new booking creation
        if (
          VERSION_TRACKING_CONFIG.enabled &&
          VERSION_TRACKING_CONFIG.trackingLevels.create
        ) {
          this.createVersionSnapshotAsync(
            bookingId,
            Promise.resolve(null),
            newBookingData,
            "create",
            "Created complete booking",
          );
        }
      } else {
        // Get current booking data for version tracking
        const currentBookingData = { id: bookingId, ...docSnap.data() };

        // Update existing document
        const updateData = {
          ...bookingData,
          updatedAt: new Date(),
        };

        await updateDoc(docRef, updateData);
        console.log(`✅ Updated existing booking ${bookingId}`);

        // Create version snapshot for booking update
        if (
          VERSION_TRACKING_CONFIG.enabled &&
          VERSION_TRACKING_CONFIG.trackingLevels.update
        ) {
          this.createVersionSnapshotAsync(
            bookingId,
            Promise.resolve(currentBookingData),
            updateData,
            "update",
            "Updated complete booking",
          );
        }
      }
    } catch (error) {
      console.error(
        `❌ Failed to create/update booking ${bookingId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
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
        }`,
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
        }`,
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
          (key) => key !== "id" && key !== "createdAt" && key !== "updatedAt",
        ),
      );

      // Create version snapshot before clearing fields (this is essentially a bulk field deletion)
      if (
        VERSION_TRACKING_CONFIG.enabled &&
        VERSION_TRACKING_CONFIG.trackingLevels.clearFields
      ) {
        const currentBookingWithId = { id: bookingId, ...currentData };
        this.createVersionSnapshotAsync(
          bookingId,
          Promise.resolve(currentBookingWithId),
          preservedFields, // The new state after clearing
          "update", // This is an update operation that clears fields
          `Cleared all fields except id, createdAt, updatedAt`,
        );
      }

      // Delete the document and recreate it with only essential fields
      // This ensures all dynamic fields are completely removed
      await deleteDoc(docRef);
      await setDoc(docRef, preservedFields);

      console.log(
        `✅ Cleared all fields from booking ${bookingId}, preserved essential fields`,
      );
    } catch (error) {
      console.error(
        `❌ Failed to clear booking fields ${bookingId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      throw error;
    }
  }

  // ========================================================================
  // SCHEDULED EMAIL CLEANUP
  // ========================================================================

  /**
   * Clean up scheduled payment reminder emails associated with a booking
   * Called automatically when a booking is deleted
   */
  private async cleanupScheduledEmails(bookingId: string): Promise<void> {
    try {
      console.log(
        `🧹 Cleaning up scheduled emails for booking ${bookingId}...`,
      );

      // Query for all scheduled payment reminder emails for this booking
      const scheduledEmailsRef = collection(db, "scheduledEmails");
      const q = query(
        scheduledEmailsRef,
        where("bookingId", "==", bookingId),
        where("emailType", "==", "payment-reminder"),
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log(`No scheduled emails found for booking ${bookingId}`);
        return;
      }

      console.log(
        `Found ${snapshot.docs.length} scheduled emails to delete for booking ${bookingId}`,
      );

      // Delete all scheduled emails in a batch
      const batch = writeBatch(db);
      const statusCounts: Record<string, number> = {};

      snapshot.docs.forEach((doc) => {
        const emailData = doc.data();
        const status = emailData.status || "unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(
        `✅ Successfully deleted ${snapshot.docs.length} scheduled emails for booking ${bookingId}`,
        statusCounts,
      );
    } catch (error) {
      console.error(
        `⚠️ Error cleaning up scheduled emails for booking ${bookingId}:`,
        error,
      );
      // Don't throw - we don't want to fail the booking deletion if cleanup fails
    }
  }

  // ========================================================================
  // DELETE WITH ROW SHIFTING
  // ========================================================================

  async deleteBookingWithRowShift(bookingId: string): Promise<void> {
    try {
      console.log(
        `🗑️ Starting delete with row shift for booking ${bookingId}...`,
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
          `⚠️ Booking ${bookingId} has no valid row number, deleting without shifting`,
        );

        // Create version snapshot before deletion even without row shifting
        if (
          VERSION_TRACKING_CONFIG.enabled &&
          VERSION_TRACKING_CONFIG.trackingLevels.delete
        ) {
          const currentBookingWithId = { id: bookingId, ...bookingData };
          this.createVersionSnapshotAsync(
            bookingId,
            Promise.resolve(currentBookingWithId),
            currentBookingWithId,
            "delete",
          );
        }

        // Clean up scheduled emails before deleting
        await this.cleanupScheduledEmails(bookingId);

        await deleteDoc(doc(db, COLLECTION_NAME, bookingId));
        return;
      }

      console.log(`📍 Deleting booking at row ${deletedRowNumber}`);

      // Get all bookings with row numbers greater than the deleted row
      const bookingsRef = collection(db, COLLECTION_NAME);
      const q = query(
        bookingsRef,
        where("row", ">", deletedRowNumber),
        orderBy("row", "asc"),
      );

      const snapshot = await getDocs(q);
      const bookingsToUpdate = snapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data(),
        row: doc.data().row,
      }));

      console.log(`📊 Found ${bookingsToUpdate.length} bookings to shift down`);

      // Create version snapshot before deletion with row shifting
      if (
        VERSION_TRACKING_CONFIG.enabled &&
        VERSION_TRACKING_CONFIG.trackingLevels.delete
      ) {
        const currentBookingWithId = { id: bookingId, ...bookingData };
        this.createVersionSnapshotAsync(
          bookingId,
          Promise.resolve(currentBookingWithId),
          currentBookingWithId,
          "delete",
          `Deleted booking at row ${deletedRowNumber} with row shifting`,
        );
      }

      // Clean up scheduled emails before deleting
      await this.cleanupScheduledEmails(bookingId);

      // Delete the original booking
      await deleteDoc(doc(db, COLLECTION_NAME, bookingId));

      // If no bookings to shift, we're done
      if (bookingsToUpdate.length === 0) {
        console.log(
          `✅ Deleted booking at row ${deletedRowNumber}, no rows to shift`,
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
          }`,
        );
      }

      console.log(
        `✅ Successfully deleted booking at row ${deletedRowNumber} and shifted ${bookingsToUpdate.length} subsequent rows down`,
      );
    } catch (error) {
      console.error(
        `❌ Failed to delete booking with row shift ${bookingId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      throw error;
    }
  }
  // ========================================================================
  // ASYNC VERSION TRACKING (NON-BLOCKING)
  // ========================================================================

  /**
   * Create version snapshot asynchronously without blocking the main operation
   * This runs in the background and doesn't affect user-facing performance
   */
  private createVersionSnapshotAsync(
    bookingId: string,
    currentBookingPromise: Promise<DocumentData | null>,
    updates: Record<string, any>,
    changeType: "create" | "update" | "delete",
    customDescription?: string,
  ): void {
    // Fire-and-forget async operation
    (async () => {
      try {
        console.log(
          `📝 [ASYNC] Creating version snapshot for booking: ${bookingId}`,
        );

        // Get current user info from auth store
        const { user, userProfile } = useAuthStore.getState();
        const currentUserId = user?.uid || "system";
        const currentUserName =
          userProfile?.profile?.firstName && userProfile?.profile?.lastName
            ? `${userProfile.profile.firstName} ${userProfile.profile.lastName}`
            : userProfile?.email || user?.email || "System";

        // Wait for current booking data (if needed)
        const currentBooking = await currentBookingPromise;

        // For create/update operations, get the current booking from database
        // For delete operations, use the provided booking data (since it's already deleted from DB)
        let bookingData: DocumentData | null = null;

        if (changeType === "delete") {
          // For delete operations, use the booking data that was passed in (before deletion)
          bookingData = await currentBookingPromise;
        } else {
          // For create/update operations, get the current state from database
          bookingData = await this.getBooking(bookingId);
        }

        if (bookingData) {
          let description: string;
          if (customDescription) {
            description = customDescription;
          } else if (changeType === "create") {
            description = "Initial booking creation";
          } else if (changeType === "delete") {
            description = "Booking deleted";
          } else {
            description = `Updated ${Object.keys(updates).join(", ")}`;
          }

          const versionId =
            await bookingVersionHistoryService.createVersionSnapshot(
              bookingId,
              bookingData as SheetData,
              {
                changeType,
                changeDescription: description,
                userId: currentUserId,
                userName: currentUserName,
              },
            );

          // Check if version snapshot was skipped (no changes after sanitization)
          if (versionId === "__SKIPPED__") {
            console.log(
              `⏭️  [ASYNC] Version snapshot skipped for ${bookingId}: update operation with no actual changes`,
            );
            return;
          }

          console.log(
            `✅ [ASYNC] Version snapshot created successfully for ${bookingId}`,
          );
        }
      } catch (versionError) {
        // Log error but don't throw - this is fire-and-forget
        console.error(
          `❌ [ASYNC] Failed to create version snapshot for ${bookingId}:`,
          versionError,
        );
      }
    })();
  }

  /**
   * Create bulk operation snapshot asynchronously without blocking the main operation
   */
  private createBulkDeleteSnapshotAsync(options: {
    operationType: "delete" | "import" | "update";
    operationDescription: string;
    affectedBookingIds: string[];
    userId: string;
    userName?: string;
    totalCount: number;
    successCount?: number;
    failureCount?: number;
  }): void {
    // Fire-and-forget async operation
    (async () => {
      try {
        console.log(
          `📝 [BULK ASYNC] Creating bulk operation snapshot for ${options.operationType}`,
        );

        await bookingVersionHistoryService.createBulkOperationSnapshot({
          operationType: options.operationType,
          operationDescription: options.operationDescription,
          affectedBookingIds: options.affectedBookingIds,
          userId: options.userId,
          userName: options.userName,
          totalCount: options.totalCount,
          successCount: options.successCount || options.totalCount,
          failureCount: options.failureCount || 0,
        });

        console.log(
          `✅ [BULK ASYNC] Bulk operation snapshot created successfully for ${options.operationType}`,
        );
      } catch (error) {
        console.error(
          `❌ [BULK ASYNC] Failed to create bulk operation snapshot:`,
          error,
        );
      }
    })();
  }

  // ========================================================================
  // VERSION TRACKING CONFIGURATION
  // ========================================================================

  getVersionTrackingConfig(): typeof VERSION_TRACKING_CONFIG {
    return VERSION_TRACKING_CONFIG;
  }

  setVersionTracking(
    trackingType: keyof typeof VERSION_TRACKING_CONFIG.trackingLevels,
    enabled: boolean,
  ): void {
    VERSION_TRACKING_CONFIG.trackingLevels[trackingType] = enabled;
    console.log(
      `📝 [VERSION CONFIG] Set ${trackingType} tracking to ${enabled}`,
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const bookingService = new BookingServiceImpl();
export default bookingService;
