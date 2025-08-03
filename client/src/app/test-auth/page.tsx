"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/hooks/use-toast";

export default function TestAuthPage() {
  const { isAuthenticated, isLoading, userProfile, initializeAuth } =
    useAuthStore();

  useEffect(() => {
    console.log("🧪 TestAuthPage: Initializing auth...");
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    console.log("🧪 TestAuthPage: Auth state changed", {
      isAuthenticated,
      isLoading,
      hasUserProfile: !!userProfile,
    });
  }, [isAuthenticated, isLoading, userProfile]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>

        <div className="space-y-4">
          <div>
            <strong>Is Loading:</strong> {isLoading ? "Yes" : "No"}
          </div>
          <div>
            <strong>Is Authenticated:</strong> {isAuthenticated ? "Yes" : "No"}
          </div>
          <div>
            <strong>Has User Profile:</strong> {userProfile ? "Yes" : "No"}
          </div>

          {userProfile && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">User Profile:</h3>
              <p className="text-green-700">
                Name: {userProfile.profile?.firstName}{" "}
                {userProfile.profile?.lastName}
              </p>
              <p className="text-green-700">Email: {userProfile.email}</p>
              <p className="text-green-700">Role: {userProfile.role}</p>
            </div>
          )}

          {!isAuthenticated && !isLoading && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-yellow-800">
                You should be redirected to login page automatically.
              </p>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <button
              onClick={() =>
                toast({
                  title: "Test Success",
                  description: "This is a test success message!",
                })
              }
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Test Success Toast
            </button>
            <button
              onClick={() =>
                toast({
                  title: "Test Error",
                  description: "This is a test error message!",
                  variant: "destructive",
                })
              }
              className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Test Error Toast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
