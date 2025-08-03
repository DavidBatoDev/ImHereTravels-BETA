import { create } from "zustand";
import {
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { User as UserType } from "@/types/users";
import { parseFirebaseError } from "./auth-errors";
import { toast } from "@/hooks/use-toast";

interface AuthState {
  // State
  user: User | null;
  userProfile: UserType | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  isInitialized: boolean;

  // Actions
  initializeAuth: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    userData: { firstName: string; lastName: string; role: "admin" | "agent" }
  ) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserType>) => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  userProfile: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  isInitialized: false,

  // Initialize auth state listener
  initializeAuth: () => {
    console.log("🔧 Auth Store: initializeAuth called");

    // Check if already initialized
    const { isInitialized } = get();
    if (isInitialized) {
      console.log("🔧 Auth Store: Already initialized, skipping...");
      return;
    }

    set({ isInitialized: true });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔧 Auth Store: onAuthStateChanged triggered", {
        user: user?.uid,
      });
      set({ isLoading: true });

      if (user) {
        // User is signed in
        try {
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data() as UserType;
            set({
              user,
              userProfile: userData,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            // User exists in Auth but not in Firestore
            set({
              user,
              userProfile: null,
              isAuthenticated: true,
              isLoading: false,
              error: "User profile not found",
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          set({
            user,
            userProfile: null,
            isAuthenticated: true,
            isLoading: false,
            error: "Failed to load user profile",
          });
        }
      } else {
        // User is signed out
        set({
          user: null,
          userProfile: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    });

    // Return unsubscribe function for cleanup
    return unsubscribe;
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    console.log("🔐 Auth Store: Starting signIn process...");
    set({ isLoading: true, error: null });

    try {
      console.log(
        "🔐 Auth Store: Calling Firebase signInWithEmailAndPassword..."
      );
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("✅ Auth Store: Firebase signIn completed", {
        userId: user.uid,
      });

      // Fetch user profile from Firestore
      console.log("🔐 Auth Store: Fetching user profile from Firestore...");
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserType;
        console.log("✅ Auth Store: User profile found", {
          userId: userData.id,
          email: userData.email,
          role: userData.role,
          isApproved: userData.isApproved,
        });

        // Check if user is approved
        if (!userData.isApproved) {
          console.log("⚠️ Auth Store: User not approved");
          set({
            user,
            userProfile: userData,
            isAuthenticated: true,
            isLoading: false,
            error: "Account pending approval",
          });

          // Show warning toast
          toast({
            title: "Account Pending Approval",
            description:
              "Your account is awaiting admin approval. You'll be notified once approved.",
            variant: "destructive",
          });
        } else {
          set({
            user,
            userProfile: userData,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          console.log("✅ Auth Store: SignIn process completed successfully");

          // Show success toast
          toast({
            title: "Welcome back!",
            description: `Signed in as ${
              userData.profile?.firstName || userData.email
            }`,
          });
        }
      } else {
        console.log("⚠️ Auth Store: User profile not found in Firestore");
        set({
          user,
          userProfile: null,
          isAuthenticated: true,
          isLoading: false,
          error: "User profile not found",
        });

        // Show warning toast
        toast({
          title: "Profile Not Found",
          description:
            "Signed in but user profile is missing. Please contact support.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      // Parse Firebase error and show user-friendly message
      const authError = parseFirebaseError(error);
      const errorMessage = authError.userFriendlyMessage;

      set({
        isLoading: false,
        error: errorMessage,
      });

      // Show error toast
      toast({
        title: "Sign In Failed",
        description: errorMessage,
        variant: "destructive",
      });

      // Re-throw the error so the component can handle it
      throw error;
    }
  },

  // Sign up with email and password
  signUp: async (
    email: string,
    password: string,
    userData: { firstName: string; lastName: string; role: "admin" | "agent" }
  ) => {
    set({ isLoading: true, error: null });

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Create user profile in Firestore
      const userProfile: UserType = {
        id: user.uid,
        email: user.email!,
        role: userData.role,
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          avatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${userData.firstName}${userData.lastName}`,
          timezone: "Asia/Manila",
        },
        permissions: {
          canManageBookings:
            userData.role === "admin" || userData.role === "agent",
          canManageTours: userData.role === "admin",
          canManageTemplates: userData.role === "admin",
          canManageUsers: userData.role === "admin",
          canAccessReports: userData.role === "admin",
          canEditFinancials: userData.role === "admin",
        },
        preferences: {
          notifications: {
            newBookings: true,
            payments: true,
            cancellations: true,
          },
        },
        security: {
          lastLogin: new Date() as any, // Will be converted to Timestamp
          lastPasswordReset: new Date() as any,
          twoFactorEnabled: false,
        },
        metadata: {
          createdAt: new Date() as any,
          updatedAt: new Date() as any,
          isActive: false, // New users need approval
        },
        isApproved: false,
      };

      await setDoc(doc(db, "users", user.uid), userProfile);

      // Update Firebase Auth display name
      await updateProfile(user, {
        displayName: `${userData.firstName} ${userData.lastName}`.trim(),
      });

      set({
        user,
        userProfile,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Show success toast
      toast({
        title: "Account Created!",
        description: `Welcome ${userData.firstName}! Your account has been created successfully.`,
      });
    } catch (error: any) {
      // Parse Firebase error and show user-friendly message
      const authError = parseFirebaseError(error);
      const errorMessage = authError.userFriendlyMessage;

      set({
        isLoading: false,
        error: errorMessage,
      });

      // Show error toast
      toast({
        title: "Account Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });

      // Re-throw the error so the component can handle it
      throw error;
    }
  },

  // Sign out
  signOut: async () => {
    console.log("🔐 Auth Store: Starting signOut process...");
    set({ isLoading: true, error: null });

    try {
      console.log("🔐 Auth Store: Calling Firebase signOut...");
      await signOut(auth);
      console.log("✅ Auth Store: Firebase signOut completed");

      console.log("🔐 Auth Store: Updating local state...");
      set({
        user: null,
        userProfile: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      console.log("✅ Auth Store: Local state updated, signOut complete");

      // Show success toast
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error: any) {
      // Parse Firebase error and show user-friendly message
      const authError = parseFirebaseError(error);
      const errorMessage = authError.userFriendlyMessage;

      set({
        isLoading: false,
        error: errorMessage,
      });

      // Show error toast
      toast({
        title: "Sign Out Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  },

  // Reset password
  resetPassword: async (email: string) => {
    set({ isLoading: true, error: null });

    try {
      await sendPasswordResetEmail(auth, email);
      set({
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || "Failed to send password reset email",
      });
    }
  },

  // Update user profile
  updateUserProfile: async (data: Partial<UserType>) => {
    const { user } = get();

    if (!user) {
      set({ error: "No user signed in" });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        ...data,
        metadata: {
          updatedAt: new Date() as any,
        },
      });

      // Update local state
      const currentProfile = get().userProfile;
      if (currentProfile) {
        set({
          userProfile: {
            ...currentProfile,
            ...data,
            metadata: {
              ...currentProfile.metadata,
              updatedAt: new Date() as any,
            },
          },
          isLoading: false,
          error: null,
        });
      }
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || "Failed to update profile",
      });
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Set loading state
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));

// Export types for use in components
export type { AuthState };
