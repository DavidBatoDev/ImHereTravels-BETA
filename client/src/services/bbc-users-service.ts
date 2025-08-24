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
// BBC USERS SERVICE
// ============================================================================
// This service handles CRUD operations for BBC users using Firebase
// BBC users only have email and name (no roles, departments, etc.)
// ============================================================================

export interface BBCUserCreateRequest {
  email: string;
  firstName: string;
  lastName: string;
}

export interface BBCUserUpdateRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export interface BBCUserResponse {
  id: string;
  bbcId: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date | any; // Firebase FieldValue
  updatedAt: Date | any; // Firebase FieldValue
}

// Firebase collection reference
const BBC_USERS_COLLECTION = "bbc-users";

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all BBC users
 */
export const getAllBBCUsers = async (): Promise<BBCUserResponse[]> => {
  try {
    const q = query(
      collection(db, BBC_USERS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BBCUserResponse[];
  } catch (error) {
    console.error("Error fetching BBC users:", error);
    throw new Error("Failed to fetch BBC users");
  }
};

/**
 * Get a single BBC user by ID
 */
export const getBBCUserById = async (
  id: string
): Promise<BBCUserResponse | null> => {
  try {
    const docRef = doc(db, BBC_USERS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as BBCUserResponse;
    }
    return null;
  } catch (error) {
    console.error("Error fetching BBC user:", error);
    throw new Error("Failed to fetch BBC user");
  }
};

/**
 * Get a single BBC user by BBC ID
 */
export const getBBCUserByBBCId = async (
  bbcId: string
): Promise<BBCUserResponse | null> => {
  try {
    const q = query(
      collection(db, BBC_USERS_COLLECTION),
      where("bbcId", "==", bbcId)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as BBCUserResponse;
    }
    return null;
  } catch (error) {
    console.error("Error fetching BBC user by BBC ID:", error);
    throw new Error("Failed to fetch BBC user");
  }
};

/**
 * Create a new BBC user
 */
export const createBBCUser = async (
  userData: BBCUserCreateRequest
): Promise<BBCUserResponse> => {
  try {
    // Generate BBC ID
    const bbcId = await generateBBCId();

    const newUserData = {
      bbcId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db, BBC_USERS_COLLECTION),
      newUserData
    );

    return {
      id: docRef.id,
      ...newUserData,
    } as BBCUserResponse;
  } catch (error) {
    console.error("Error creating BBC user:", error);
    throw new Error("Failed to create BBC user");
  }
};

/**
 * Update an existing BBC user
 */
export const updateBBCUser = async (
  id: string,
  userData: BBCUserUpdateRequest
): Promise<BBCUserResponse | null> => {
  try {
    const docRef = doc(db, BBC_USERS_COLLECTION, id);

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
    return await getBBCUserById(id);
  } catch (error) {
    console.error("Error updating BBC user:", error);
    throw new Error("Failed to update BBC user");
  }
};

/**
 * Delete a BBC user
 */
export const deleteBBCUser = async (id: string): Promise<boolean> => {
  try {
    const docRef = doc(db, BBC_USERS_COLLECTION, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting BBC user:", error);
    throw new Error("Failed to delete BBC user");
  }
};

/**
 * Search BBC users by name or email
 */
export const searchBBCUsers = async (
  searchTerm: string
): Promise<BBCUserResponse[]> => {
  try {
    if (!searchTerm.trim()) {
      return await getAllBBCUsers();
    }

    const term = searchTerm.toLowerCase();
    const allUsers = await getAllBBCUsers();

    return allUsers.filter(
      (user) =>
        user.firstName.toLowerCase().includes(term) ||
        user.lastName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.bbcId.toLowerCase().includes(term)
    );
  } catch (error) {
    console.error("Error searching BBC users:", error);
    throw new Error("Failed to search BBC users");
  }
};

/**
 * Get BBC users count
 */
export const getBBCUsersCount = async (): Promise<number> => {
  try {
    const querySnapshot = await getDocs(collection(db, BBC_USERS_COLLECTION));
    return querySnapshot.size;
  } catch (error) {
    console.error("Error getting BBC users count:", error);
    throw new Error("Failed to get BBC users count");
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique BBC ID
 */
export const generateBBCId = async (): Promise<string> => {
  try {
    const count = await getBBCUsersCount();
    const nextNumber = count + 1;
    return `BBC${String(nextNumber).padStart(3, "0")}`;
  } catch (error) {
    // Fallback to timestamp-based ID if count fails
    return `BBC${Date.now().toString().slice(-6)}`;
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
      collection(db, BBC_USERS_COLLECTION),
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
 * Validate BBC user data
 */
export const validateBBCUserData = (
  data: BBCUserCreateRequest
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
