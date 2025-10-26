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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ============================================================================
// BCC USERS SERVICE
// ============================================================================
// This service handles CRUD operations for BCC users using Firebase
// BCC users only have email and name (no roles, departments, etc.)
// ============================================================================

export interface BCCUserCreateRequest {
  email: string;
  firstName: string;
  lastName: string;
}

export interface BCCUserUpdateRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export interface BCCUserResponse {
  id: string;
  bccId: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date | any; // Firebase FieldValue
  updatedAt: Date | any; // Firebase FieldValue
}

// Firebase collection reference - keeping "bcc-users" for backwards compatibility
const BCC_USERS_COLLECTION = "bcc-users";

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all BCC users
 */
export const getAllBCCUsers = async (): Promise<BCCUserResponse[]> => {
  try {
    const q = query(
      collection(db, BCC_USERS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BCCUserResponse[];
  } catch (error) {
    console.error("Error fetching BCC users:", error);
    throw new Error("Failed to fetch BCC users");
  }
};

/**
 * Get a single BCC user by ID
 */
export const getBCCUserById = async (
  id: string
): Promise<BCCUserResponse | null> => {
  try {
    const docRef = doc(db, BCC_USERS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as BCCUserResponse;
    }
    return null;
  } catch (error) {
    console.error("Error fetching BCC user:", error);
    throw new Error("Failed to fetch BCC user");
  }
};

/**
 * Get a single BCC user by BCC ID
 */
export const getBCCUserByBCCId = async (
  bccId: string
): Promise<BCCUserResponse | null> => {
  try {
    const q = query(
      collection(db, BCC_USERS_COLLECTION),
      where("bccId", "==", bccId)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as BCCUserResponse;
    }
    return null;
  } catch (error) {
    console.error("Error fetching BCC user by BCC ID:", error);
    throw new Error("Failed to fetch BCC user");
  }
};

/**
 * Create a new BCC user
 */
export const createBCCUser = async (
  userData: BCCUserCreateRequest
): Promise<BCCUserResponse> => {
  try {
    // Generate BCC ID
    const bccId = await generateBCCId();

    const newUserData = {
      bccId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db, BCC_USERS_COLLECTION),
      newUserData
    );

    return {
      id: docRef.id,
      ...newUserData,
    } as BCCUserResponse;
  } catch (error) {
    console.error("Error creating BCC user:", error);
    throw new Error("Failed to create BCC user");
  }
};

/**
 * Update an existing BCC user
 */
export const updateBCCUser = async (
  id: string,
  userData: BCCUserUpdateRequest
): Promise<BCCUserResponse | null> => {
  try {
    const docRef = doc(db, BCC_USERS_COLLECTION, id);

    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (userData.email) {
      updateData.email = userData.email;
    }

    if (userData.firstName) {
      updateData.firstName = userData.firstName;
    }

    if (userData.lastName) {
      updateData.lastName = userData.lastName;
    }

    if (userData.isActive !== undefined) {
      updateData.isActive = userData.isActive;
    }

    await updateDoc(docRef, updateData);

    // Return updated user
    return await getBCCUserById(id);
  } catch (error) {
    console.error("Error updating BCC user:", error);
    throw new Error("Failed to update BCC user");
  }
};

/**
 * Delete a BCC user
 */
export const deleteBCCUser = async (id: string): Promise<boolean> => {
  try {
    const docRef = doc(db, BCC_USERS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting BCC user:", error);
    throw new Error("Failed to delete BCC user");
  }
};

/**
 * Search BCC users by name or email
 */
export const searchBCCUsers = async (
  searchTerm: string
): Promise<BCCUserResponse[]> => {
  try {
    if (!searchTerm.trim()) {
      return await getAllBCCUsers();
    }

    const term = searchTerm.toLowerCase();
    const allUsers = await getAllBCCUsers();

    return allUsers.filter(
      (user) =>
        user.firstName.toLowerCase().includes(term) ||
        user.lastName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.bccId.toLowerCase().includes(term)
    );
  } catch (error) {
    console.error("Error searching BCC users:", error);
    throw new Error("Failed to search BCC users");
  }
};

/**
 * Get BCC users count
 */
export const getBCCUsersCount = async (): Promise<number> => {
  try {
    const querySnapshot = await getDocs(collection(db, BCC_USERS_COLLECTION));
    return querySnapshot.size;
  } catch (error) {
    console.error("Error getting BCC users count:", error);
    throw new Error("Failed to get BCC users count");
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique BCC ID
 */
export const generateBCCId = async (): Promise<string> => {
  try {
    const count = await getBCCUsersCount();
    const nextNumber = count + 1;
    return `BCC${String(nextNumber).padStart(3, "0")}`;
  } catch (error) {
    // Fallback to timestamp-based ID if count fails
    return `BCC${Date.now().toString().slice(-6)}`;
  }
};

/**
 * Check if email already exists
 */
export const isEmailExists = async (
  email: string,
  excludeId?: string
): Promise<boolean> => {
  try {
    const q = query(
      collection(db, BCC_USERS_COLLECTION),
      where("email", "==", email.toLowerCase())
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return false;
    }

    // If excluding an ID, check if the found user is different
    if (excludeId) {
      const foundUser = querySnapshot.docs.find((doc) => doc.id !== excludeId);
      return !!foundUser;
    }

    return true;
  } catch (error) {
    console.error("Error checking email existence:", error);
    return false;
  }
};

/**
 * Validate BCC user data
 */
export const validateBCCUserData = (
  data: BCCUserCreateRequest
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.email || !data.email.trim()) {
    errors.push("Email is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Invalid email format");
  }

  if (!data.firstName || !data.firstName.trim()) {
    errors.push("First name is required");
  }

  if (!data.lastName || !data.lastName.trim()) {
    errors.push("Last name is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};


