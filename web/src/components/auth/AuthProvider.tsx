import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    // Initialize Firebase auth state listener
    const unsubscribe = initializeAuth();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [initializeAuth]);

  return <>{children}</>;
};
