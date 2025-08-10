import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { 
  PaymentTermConfiguration, 
  PaymentTermFormData, 
  PaymentTermCreateRequest, 
  PaymentTermUpdateRequest,
  PaymentTermEvaluationResult
} from "@/types/payment-terms";
import { DEFAULT_PAYMENT_TERMS } from "@/types/payment-terms";

const COLLECTION_NAME = "paymentTerms"; // Core payment types used throughout the booking system

// ============================================================================
// PAYMENT TERMS CRUD OPERATIONS
// ============================================================================

export class PaymentTermsService {
  
  /**
   * Remove undefined values from object to prevent Firestore errors
   */
  private static sanitizeData(obj: any): any {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Recursively sanitize nested objects
          const nestedSanitized = this.sanitizeData(value);
          if (Object.keys(nestedSanitized).length > 0) {
            sanitized[key] = nestedSanitized;
          }
        } else {
          sanitized[key] = value;
        }
      }
    }
    
    return sanitized;
  }
  
  /**
   * Get all payment terms ordered by sortOrder
   */
  static async getAllPaymentTerms(): Promise<PaymentTermConfiguration[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy("sortOrder", "asc")
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentTermConfiguration[];
    } catch (error) {
      console.error("Error fetching payment terms:", error);
      throw new Error("Failed to fetch payment terms");
    }
  }

  /**
   * Get active payment terms only
   */
  static async getActivePaymentTerms(): Promise<PaymentTermConfiguration[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("isActive", "==", true),
        orderBy("sortOrder", "asc")
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentTermConfiguration[];
    } catch (error) {
      console.error("Error fetching active payment terms:", error);
      throw new Error("Failed to fetch active payment terms");
    }
  }

  /**
   * Get payment types for dropdowns and selections (only active ones)
   */
  static async getPaymentTypesForSelection(): Promise<{ value: string; label: string; description: string }[]> {
    try {
      const activeTerms = await this.getActivePaymentTerms();
      return activeTerms.map(term => ({
        value: term.id, // Use ID instead of termType
        label: term.name,
        description: term.description
      }));
    } catch (error) {
      console.error("Error fetching payment types for selection:", error);
      throw new Error("Failed to fetch payment types for selection");
    }
  }

  /**
   * Get a single payment term by ID
   */
  static async getPaymentTermById(id: string): Promise<PaymentTermConfiguration | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as PaymentTermConfiguration;
    } catch (error) {
      console.error("Error fetching payment term:", error);
      throw new Error("Failed to fetch payment term");
    }
  }

  /**
   * Create a new payment term
   */
  static async createPaymentTerm(data: PaymentTermCreateRequest, userId: string): Promise<string> {
    try {
      const now = Timestamp.now();
      const paymentTermData: Omit<PaymentTermConfiguration, 'id'> = {
        ...data,
        metadata: {
          createdAt: now,
          updatedAt: now,
          createdBy: userId
        }
      };

      // Sanitize data to remove undefined values
      const sanitizedData = this.sanitizeData(paymentTermData);

      const docRef = await addDoc(collection(db, COLLECTION_NAME), sanitizedData);
      return docRef.id;
    } catch (error) {
      console.error("Error creating payment term:", error);
      throw new Error("Failed to create payment term");
    }
  }

  /**
   * Update an existing payment term
   */
  static async updatePaymentTerm(data: PaymentTermUpdateRequest, userId: string): Promise<void> {
    try {
      const { id, ...updateData } = data;
      const docRef = doc(db, COLLECTION_NAME, id);
      
      const updatePayload = {
        ...updateData,
        metadata: {
          updatedAt: Timestamp.now(),
          createdBy: userId // This should ideally preserve the original createdBy
        }
      };

      // Sanitize data to remove undefined values
      const sanitizedPayload = this.sanitizeData(updatePayload);

      await updateDoc(docRef, sanitizedPayload);
    } catch (error) {
      console.error("Error updating payment term:", error);
      throw new Error("Failed to update payment term");
    }
  }

  /**
   * Delete a payment term
   */
  static async deletePaymentTerm(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting payment term:", error);
      throw new Error("Failed to delete payment term");
    }
  }

  /**
   * Toggle active status of a payment term
   */
  static async togglePaymentTermStatus(id: string, isActive: boolean, userId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        isActive,
        "metadata.updatedAt": Timestamp.now()
      });
    } catch (error) {
      console.error("Error toggling payment term status:", error);
      throw new Error("Failed to toggle payment term status");
    }
  }

  /**
   * Update sort order of payment terms
   */
  static async updateSortOrder(updates: { id: string; sortOrder: number }[], userId: string): Promise<void> {
    try {
      const batch = updates.map(async ({ id, sortOrder }) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        return updateDoc(docRef, {
          sortOrder,
          "metadata.updatedAt": Timestamp.now()
        });
      });

      await Promise.all(batch);
    } catch (error) {
      console.error("Error updating sort order:", error);
      throw new Error("Failed to update sort order");
    }
  }
}

// ============================================================================
// PAYMENT TERMS CALCULATION UTILITIES
// ============================================================================

export class PaymentTermsCalculator {
  
  /**
   * Evaluate which payment term applies based on reservation date and tour date
   */
  static evaluatePaymentTerm(
    reservationDate: Date, 
    tourDate: Date, 
    paymentTerms: PaymentTermConfiguration[]
  ): PaymentTermEvaluationResult {
    const daysDifference = Math.ceil((tourDate.getTime() - reservationDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Sort payment terms by daysRequired ascending to check from strictest to most lenient
    const sortedTerms = [...paymentTerms]
      .filter(term => term.isActive)
      .sort((a, b) => (a.daysRequired || 0) - (b.daysRequired || 0));

    // Find the applicable term
    for (const term of sortedTerms) {
      if (daysDifference < (term.daysRequired || 0)) {
        return {
          applicableTerm: term.name,
          daysDifference,
          isValid: term.name !== "Invalid Booking",
          message: term.description
        };
      }
    }

    // If no term matches, default to P4 (most lenient)
    const p4Term = sortedTerms.find(term => term.name === "Payment Plan P4");
    return {
      applicableTerm: "Payment Plan P4",
      daysDifference,
      isValid: true,
      message: p4Term?.description || "Standard payment plan applies"
    };
  }

  /**
   * Get payment percentage for a term name
   */
  static getPaymentPercentage(termName: string, paymentTerms: PaymentTermConfiguration[]): number {
    const term = paymentTerms.find(t => t.name === termName);
    return term?.percentage || 100; // Default to 100% if not found
  }

  /**
   * Calculate payment schedule based on term name
   */
  static calculatePaymentSchedule(
    termName: string, 
    totalCost: number, 
    paymentTerms: PaymentTermConfiguration[]
  ): { reservationFee: number; remainingBalance: number } {
    const percentage = this.getPaymentPercentage(termName, paymentTerms);
    const reservationFee = (totalCost * percentage) / 100;
    const remainingBalance = totalCost - reservationFee;

    return {
      reservationFee,
      remainingBalance
    };
  }
}

// ============================================================================
// INITIALIZATION UTILITIES
// ============================================================================

export class PaymentTermsInitializer {
  
  /**
   * Initialize default payment terms if none exist
   */
  static async initializeDefaultPaymentTerms(userId: string): Promise<void> {
    try {
      const existingTerms = await PaymentTermsService.getAllPaymentTerms();
      
      if (existingTerms.length === 0) {
        console.log("No payment terms found. Initializing default terms...");
        
        for (const defaultTerm of DEFAULT_PAYMENT_TERMS) {
          await PaymentTermsService.createPaymentTerm(defaultTerm, userId);
        }
        
        console.log("Default payment terms initialized successfully");
      }
    } catch (error) {
      console.error("Error initializing default payment terms:", error);
      throw new Error("Failed to initialize default payment terms");
    }
  }
}
