import { create } from "zustand";
import {
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import type { User as UserType } from "@/types/users";
import { parseFirebaseError } from "../utils/auth-errors";
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
  signInAndGetUser: (email: string, password: string) => Promise<User>;
  signInForSignup: (email: string, password: string) => Promise<User>;
  signUp: (
    email: string,
    password: string,
    userData: { firstName: string; lastName: string; role: "admin" | "agent" }
  ) => Promise<User>;
  sendEmailVerification: (user: User) => Promise<void>;
  checkEmailVerification: (user: User) => Promise<boolean>;
  markEmailAsVerified: (userId: string) => Promise<void>;
  checkExistingAccount: (email: string) => Promise<{
    exists: boolean;
    user?: UserType;
    isVerified?: boolean | null;
    hasAgreed?: boolean;
  }>;
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
          hasAgreedToTerms: userData.hasAgreedToTerms,
        });

        // Check if user has agreed to terms (completed signup process)
        if (!userData.hasAgreedToTerms) {
          console.log("⚠️ Auth Store: User has not agreed to terms");
          set({
            user: null,
            userProfile: null,
            isAuthenticated: false,
            isLoading: false,
            error: "Please complete your signup process",
          });

          // Show error toast
          toast({
            title: "Signup Process Incomplete",
            description:
              "You must complete the signup process for your account. Please check your email for verification and complete your profile setup.",
            variant: "destructive",
          });

          // Sign out the user to prevent access
          await signOut(auth);
          return;
        }
        // Check if user is approved
        else if (!userData.isApproved) {
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
    } catch (error: unknown) {
      // Parse Firebase error and show user-friendly message
      const authError = parseFirebaseError(error as Error);
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

  // Sign in and return user object
  signInAndGetUser: async (email: string, password: string) => {
    console.log("🔐 Auth Store: Starting signInAndGetUser process...");
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

      // Check if user has completed signup process
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserType;

        // Check if user has agreed to terms (completed signup process)
        if (!userData.hasAgreedToTerms) {
          console.log("⚠️ Auth Store: User has not agreed to terms");
          set({
            user: null,
            userProfile: null,
            isAuthenticated: false,
            isLoading: false,
            error: "Please complete your signup process",
          });

          // Show error toast
          toast({
            title: "Signup Process Incomplete",
            description:
              "You must complete the signup process for your account. Please check your email for verification and complete your profile setup.",
            variant: "destructive",
          });

          // Sign out the user to prevent access
          await signOut(auth);
          throw new Error("Please complete your signup process");
        }
      }

      set({
        isLoading: false,
        error: null,
      });

      return user;
    } catch (error: unknown) {
      // Parse Firebase error and show user-friendly message
      const authError = parseFirebaseError(error as Error);
      const errorMessage = authError.userFriendlyMessage;

      set({
        isLoading: false,
        error: errorMessage,
      });

      // Re-throw the error so the component can handle it
      throw error;
    }
  },

  // Sign in for signup flow (doesn't check terms agreement)
  signInForSignup: async (email: string, password: string) => {
    console.log("🔐 Auth Store: Starting signInForSignup process...");
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

      set({
        isLoading: false,
        error: null,
      });

      return user;
    } catch (error: unknown) {
      // Parse Firebase error and show user-friendly message
      const authError = parseFirebaseError(error as Error);
      const errorMessage = authError.userFriendlyMessage;

      set({
        isLoading: false,
        error: errorMessage,
      });

      // Re-throw the error so the component can handle it
      throw error;
    }
  },

  // Sign up with email and password
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

      // Create user profile in Firestore with minimal data initially
      const userProfile: UserType = {
        id: user.uid,
        email: user.email!,
        role: userData.role,
        profile: {
          firstName: "", // Will be filled in step 3
          lastName: "", // Will be filled in step 3
          avatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${email}`, // Temporary avatar
          timezone: "Asia/Manila",
        },
        hasAgreedToTerms: false,
        isEmailVerified: false,
        permissions: {
          canManageBookings: false,
          canManageTours: false,
          canManageTemplates: false,
          canManageUsers: false,
          canManagePaymentTypes: false,
          canManageStorage: false,
          canManageFunctions: false,
          canManageEmails: false,
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
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
          isActive: false, // New users need approval
        },
        isApproved: false,
      };

      await setDoc(doc(db, "users", user.uid), userProfile);

      set({
        user,
        userProfile,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return user;
    } catch (error: unknown) {
      // Parse Firebase error and show user-friendly message
      const authError = parseFirebaseError(error as Error);
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

  // Send email verification using our custom service
  sendEmailVerification: async (user: User) => {
    set({ isLoading: true, error: null });

    try {
      // Import the service dynamically to avoid circular dependencies
      const { EmailVerificationService } = await import(
        "../services/email-verification-service"
      );

      // Get user profile to get firstName
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        throw new Error("User profile not found");
      }

      const userData = userDoc.data() as UserType;
      const firstName =
        userData.profile?.firstName || userData.email.split("@")[0];

      const result = await EmailVerificationService.sendVerificationEmail({
        email: user.email!,
        firstName,
        userId: user.uid,
      });

      if (result.success) {
        set({
          isLoading: false,
          error: null,
        });

        // Show success toast
        toast({
          title: "Verification Email Sent!",
          description:
            "Please check your email and click the verification link.",
        });
      } else {
        throw new Error(result.error || "Failed to send verification email");
      }
    } catch (error: unknown) {
      console.error("Error sending email verification:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to send verification email. Please try again later.";

      set({
        isLoading: false,
        error: errorMessage,
      });

      // Show error toast
      toast({
        title: "Email Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });

      // Re-throw the error so the component can handle it
      throw error;
    }
  },

  // Check email verification status from database
  checkEmailVerification: async (user: User) => {
    set({ isLoading: true, error: null });

    try {
      // Get user profile from Firestore to check email verification status
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserType;
        const isVerified = userData.isEmailVerified || false;

        set({
          isLoading: false,
          error: null,
        });

        return isVerified;
      } else {
        set({
          isLoading: false,
          error: "User profile not found",
        });
        return false;
      }
    } catch (error: unknown) {
      // Parse Firebase error and show user-friendly message
      const authError = parseFirebaseError(error as Error);
      const errorMessage = authError.userFriendlyMessage;

      set({
        isLoading: false,
        error: errorMessage,
      });

      // Re-throw the error so the component can handle it
      throw error;
    }
  },

  // Mark email as verified in database
  markEmailAsVerified: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      // Update the user document to mark email as verified
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        isEmailVerified: true,
        "metadata.updatedAt": serverTimestamp(),
      });

      set({
        isLoading: false,
        error: null,
      });

      // Show success toast
      toast({
        title: "Email Verified!",
        description: "Your email has been verified successfully.",
      });
    } catch (error: unknown) {
      console.error("Error marking email as verified:", error);

      const errorMessage =
        "Failed to update email verification status. Please try again.";

      set({
        isLoading: false,
        error: errorMessage,
      });

      // Show error toast
      toast({
        title: "Verification Update Failed",
        description: errorMessage,
        variant: "destructive",
      });

      // Re-throw the error so the component can handle it
      throw error;
    }
  },

  // Check if account exists and get its status
  checkExistingAccount: async (email: string) => {
    set({ isLoading: true, error: null });

    try {
      // Query users collection by email field
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as UserType;
        return {
          exists: true,
          user: userData,
          isVerified: userData.isEmailVerified || false,
          hasAgreed: userData.hasAgreedToTerms || false,
        };
      } else {
        return {
          exists: false,
        };
      }
    } catch (error: unknown) {
      // Parse Firebase error and show user-friendly message
      const authError = parseFirebaseError(error as Error);
      const errorMessage = authError.userFriendlyMessage;

      set({
        isLoading: false,
        error: errorMessage,
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
    } catch (error: unknown) {
      // Parse Firebase error and show user-friendly message
      const authError = parseFirebaseError(error as Error);
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to send password reset email";
      set({
        isLoading: false,
        error: errorMessage,
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
          updatedAt: serverTimestamp() as any,
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
              updatedAt: serverTimestamp() as any,
            },
          },
          isLoading: false,
          error: null,
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update profile";
      set({
        isLoading: false,
        error: errorMessage,
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
