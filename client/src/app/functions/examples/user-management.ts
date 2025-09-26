// user-management.ts
// Example TypeScript function for user management with Firebase SDK

import {
  db,
  auth,
  firebaseUtils,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "../firebase-utils";

export default function userManagement(
  action: "create" | "update" | "delete" | "list" | "get",
  userData?: any,
  userId?: string
) {
  // Functions are pre-authenticated, no need to check auth state
  switch (action) {
    case "create":
      return createUser(userData);

    case "update":
      if (!userId) throw new Error("User ID is required for update operation");
      return updateUser(userId, userData);

    case "delete":
      if (!userId) throw new Error("User ID is required for delete operation");
      return deleteUser(userId);

    case "list":
      return listUsers();

    case "get":
      if (!userId) throw new Error("User ID is required for get operation");
      return getUser(userId);

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// Create a new user document
async function createUser(userData: any) {
  try {
    const userDoc = {
      ...userData,
      createdBy: firebaseUtils.getUserId(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docId = await firebaseUtils.addDocument("users", userDoc);
    return {
      success: true,
      userId: docId,
      message: "User created successfully",
    };
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("Failed to create user");
  }
}

// Update an existing user
async function updateUser(userId: string, updateData: any) {
  try {
    await firebaseUtils.updateDocument("users", userId, updateData);
    return { success: true, userId, message: "User updated successfully" };
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error("Failed to update user");
  }
}

// Delete a user
async function deleteUser(userId: string) {
  try {
    await firebaseUtils.deleteDocument("users", userId);
    return { success: true, userId, message: "User deleted successfully" };
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new Error("Failed to delete user");
  }
}

// List all users
async function listUsers() {
  try {
    const users = await firebaseUtils.getCollectionData("users", [
      orderBy("createdAt", "desc"),
    ]);
    return { success: true, users, count: users.length };
  } catch (error) {
    console.error("Error listing users:", error);
    throw new Error("Failed to list users");
  }
}

// Get a specific user
async function getUser(userId: string) {
  try {
    const user = await firebaseUtils.getDocumentData("users", userId);
    if (!user) {
      throw new Error("User not found");
    }
    return { success: true, user };
  } catch (error) {
    console.error("Error getting user:", error);
    throw new Error("Failed to get user");
  }
}
