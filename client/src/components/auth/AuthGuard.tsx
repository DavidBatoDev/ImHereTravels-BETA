"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading,
    userProfile,
    isInitialized,
    initializeAuth,
  } = useAuthStore();

  // Initialize auth only once to prevent multiple initializations
  useEffect(() => {
    if (!isInitialized) {
      console.log("🔐 AuthGuard: Initializing auth...");
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  // Check authentication and redirect if needed
  useEffect(() => {
    console.log("🔐 AuthGuard: Checking authentication...", {
      isAuthenticated,
      isLoading,
      hasUserProfile: !!userProfile,
      isInitialized,
    });

    // Only redirect if we're not loading and not authenticated
    if (!isLoading && !isAuthenticated && isInitialized) {
      console.log(
        "🔐 AuthGuard: User not authenticated, redirecting to login..."
      );
      router.push("/auth/admin/login");
    }
  }, [isAuthenticated, isLoading, isInitialized, router]);

  // Show loading screen only on initial load, not during navigation
  if (isLoading && !isInitialized) {
    return (
      fallback || (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Don't render children if not authenticated (will redirect)
  if (!isAuthenticated || !userProfile) {
    console.log(
      "🔐 AuthGuard: Not authenticated or no user profile, redirecting...",
      {
        isAuthenticated,
        hasUserProfile: !!userProfile,
      }
    );
    return null;
  }

  // Check if user is approved
  if (!userProfile.isApproved) {
    console.log("🔐 AuthGuard: User not approved, showing approval modal");
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Account Pending Approval
            </h2>
            <p className="text-gray-600 mb-6">
              Your account is currently awaiting admin approval. You&apos;ll be
              able to access the dashboard once an administrator approves your
              account.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                <strong>What happens next?</strong>
                <br />
                • An administrator will review your application
                <br />
                • You&apos;ll receive an email notification once approved
                <br />• You can then sign in and access the dashboard
              </p>
            </div>
            <button
              onClick={() => {
                // Sign out the user since they can't access the dashboard
                window.location.href = "/auth/admin/login";
              }}
              className="w-full bg-crimson-red hover:bg-light-red text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render children if authenticated
  return <>{children}</>;
}
