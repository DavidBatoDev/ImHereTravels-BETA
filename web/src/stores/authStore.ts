import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserService } from "@/services/userService";
import { UserProfile } from "@/types/user";

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;

  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
  updateUserProfileData: (data: Partial<UserProfile>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      userProfile: null,
      loading: true,
      error: null,

      signIn: async (email: string, password: string) => {
        try {
          set({ loading: true, error: null });
          const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
          );
          
          // Update last login and get user profile
          await UserService.updateLastLogin(userCredential.user.uid);
          const userProfile = await UserService.getUserProfile(userCredential.user.uid);
          
          set({ 
            user: userCredential.user, 
            userProfile,
            loading: false 
          });
        } catch (error: any) {
          set({
            error: error.message || "Failed to sign in",
            loading: false,
          });
          throw error;
        }
      },

      signUp: async (email: string, password: string, displayName?: string) => {
        try {
          set({ loading: true, error: null });
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );

          if (displayName) {
            await updateProfile(userCredential.user, { displayName });
          }

          // Create user profile in Firestore
          const userProfile = await UserService.createUserProfile(
            userCredential.user,
            { displayName }
          );

          set({ 
            user: userCredential.user, 
            userProfile,
            loading: false 
          });
        } catch (error: any) {
          set({
            error: error.message || "Failed to create account",
            loading: false,
          });
          throw error;
        }
      },

      signInWithGoogle: async () => {
        try {
          set({ loading: true, error: null });
          const provider = new GoogleAuthProvider();
          const userCredential = await signInWithPopup(auth, provider);
          
          // Check if user profile exists, create if not
          let userProfile = await UserService.getUserProfile(userCredential.user.uid);
          
          if (!userProfile) {
            userProfile = await UserService.createUserProfile(userCredential.user);
          } else {
            // Update last login
            await UserService.updateLastLogin(userCredential.user.uid);
          }
          
          set({ 
            user: userCredential.user, 
            userProfile,
            loading: false 
          });
        } catch (error: any) {
          set({
            error: error.message || "Failed to sign in with Google",
            loading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ loading: true, error: null });
          await signOut(auth);
          set({ 
            user: null, 
            userProfile: null, 
            loading: false 
          });
        } catch (error: any) {
          set({
            error: error.message || "Failed to sign out",
            loading: false,
          });
          throw error;
        }
      },

      resetPassword: async (email: string) => {
        try {
          set({ loading: true, error: null });
          await sendPasswordResetEmail(auth, email);
          set({ loading: false });
        } catch (error: any) {
          set({
            error: error.message || "Failed to send reset email",
            loading: false,
          });
          throw error;
        }
      },

      updateUserProfile: async (displayName: string) => {
        try {
          const { user, userProfile } = get();
          if (!user) throw new Error("No user logged in");

          set({ loading: true, error: null });
          await updateProfile(user, { displayName });
          
          // Update Firestore profile
          if (userProfile) {
            await UserService.updateUserProfile(user.uid, { displayName });
            const updatedProfile = await UserService.getUserProfile(user.uid);
            set({
              user: { ...user, displayName },
              userProfile: updatedProfile,
              loading: false,
            });
          } else {
            set({
              user: { ...user, displayName },
              loading: false,
            });
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to update profile",
            loading: false,
          });
          throw error;
        }
      },

      updateUserProfileData: async (data: Partial<UserProfile>) => {
        try {
          const { user } = get();
          if (!user) throw new Error("No user logged in");

          set({ loading: true, error: null });
          await UserService.updateUserProfile(user.uid, data);
          const updatedProfile = await UserService.getUserProfile(user.uid);
          
          set({
            userProfile: updatedProfile,
            loading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || "Failed to update profile data",
            loading: false,
          });
          throw error;
        }
      },

      refreshUserProfile: async () => {
        try {
          const { user } = get();
          if (!user) return;

          const userProfile = await UserService.getUserProfile(user.uid);
          set({ userProfile });
        } catch (error: any) {
          console.error("Failed to refresh user profile:", error);
        }
      },

      clearError: () => set({ error: null }),

      setLoading: (loading: boolean) => set({ loading }),

      initializeAuth: () => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            try {
              // Get user profile from Firestore
              const userProfile = await UserService.getUserProfile(user.uid);
              set({ user, userProfile, loading: false });
            } catch (error) {
              console.error("Error loading user profile:", error);
              set({ user, userProfile: null, loading: false });
            }
          } else {
            set({ user: null, userProfile: null, loading: false });
          }
        });

        // Return cleanup function
        return unsubscribe;
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        userProfile: state.userProfile,
      }),
    }
  )
);
