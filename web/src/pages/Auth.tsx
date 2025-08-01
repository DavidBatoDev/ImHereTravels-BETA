import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

type AuthMode = "login" | "signup" | "forgot-password";

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const { user, loading } = useAuthStore();
  const location = useLocation();

  // Redirect to intended page or home if already authenticated
  const from = (location.state as any)?.from?.pathname || "/";

  useEffect(() => {
    if (user && !loading) {
      // Small delay to allow for smooth transition
      const timer = setTimeout(() => {
        window.location.href = from;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, loading, from]);

  if (user && !loading) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {mode === "login" && (
          <LoginForm
            onToggleMode={() => setMode("signup")}
            onForgotPassword={() => setMode("forgot-password")}
          />
        )}

        {mode === "signup" && (
          <SignUpForm onToggleMode={() => setMode("login")} />
        )}

        {mode === "forgot-password" && (
          <ForgotPasswordForm onBack={() => setMode("login")} />
        )}
      </div>
    </div>
  );
}
