"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Shield,
  Users,
  FileText,
  Settings,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, clearError, isAuthenticated, userProfile } = useAuthStore();
  const router = useRouter();
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && userProfile) {
      console.log(
        "🔐 LoginPage: User already authenticated, redirecting to dashboard..."
      );
      router.push("/dashboard");
    }
  }, [isAuthenticated, userProfile, router]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🔐 LoginPage: Form submitted", { email });

    if (!validateForm()) {
      console.log("❌ LoginPage: Form validation failed");
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      console.log("🔐 LoginPage: Calling signIn from auth store...");
      await signIn(email, password);
      console.log("✅ LoginPage: Login successful!");

      // Check if user is approved
      if (userProfile && !userProfile.isApproved) {
        console.log("⚠️ LoginPage: User not approved, showing modal");
        setShowApprovalModal(true);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("❌ LoginPage: Login failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-creative-midnight flex">
      {/* Left side - Admin Login Form */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="flex justify-between items-center p-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8">
              <Image
                src="/logos/Logo_Red.svg"
                alt="I'm Here Travels Logo"
                width={32}
                height={32}
                className="w-full h-full"
              />
            </div>
            <span className="text-black font-hk-grotesk text-xl font-medium">
              I&apos;m Here Travels
            </span>
            <span className="text-grey font-dm-sans text-sm bg-light-grey px-2 py-1 rounded">
              Admin
            </span>
          </div>
          <button className="text-grey hover:text-black font-dm-sans text-sm transition-colors flex items-center space-x-1">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Site</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-crimson-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-crimson-red" />
              </div>
              <h1 className="text-black font-hk-grotesk text-3xl font-medium mb-2">
                Admin Access
              </h1>
              <p className="text-grey font-dm-sans text-base">
                Sign in to access the administrative dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-black font-dm-sans text-sm mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="admin@imheretravels.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 bg-light-grey border rounded-lg text-black placeholder-grey font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red focus:border-transparent transition-all ${
                    errors.email ? "border-red-500" : "border-grey"
                  }`}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1 font-dm-sans">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-black font-dm-sans text-sm mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 bg-light-grey border rounded-lg text-black placeholder-grey font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red focus:border-transparent transition-all pr-12 ${
                      errors.password ? "border-red-500" : "border-grey"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-grey hover:text-black transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1 font-dm-sans">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Error messages are now handled by toast notifications */}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-crimson-red hover:bg-light-red disabled:bg-grey disabled:cursor-not-allowed text-white font-dm-sans font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {isSubmitting ? "Signing in..." : "Sign in to Admin Panel"}
              </button>

              <div className="text-center space-y-2">
                <a
                  href="#"
                  className="text-grey hover:text-crimson-red font-dm-sans text-sm transition-colors block"
                >
                  Forgot your password?
                </a>
                <div className="text-grey font-dm-sans text-sm">
                  Don&apos;t have an account?{" "}
                  <a
                    href="/auth/admin/signup"
                    className="text-crimson-red hover:text-light-red font-medium transition-colors"
                  >
                    Apply for Admin Account
                  </a>
                </div>
              </div>
            </form>

            <div className="mt-8 p-4 bg-light-grey rounded-lg border border-grey">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-grey mt-0.5" />
                <div className="text-grey font-dm-sans text-xs">
                  <p className="font-medium mb-1">Security Notice</p>
                  <p>
                    This is a restricted administrative area. Unauthorized
                    access attempts will be logged and reported.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Admin Features */}
      <div className="flex-1 relative flex items-end p-8">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/siargao.jpg')" }}
        />
        {/* Red Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-crimson-red/80 via-crimson-red/70 to-light-red/60" />
        {/* Content */}
        <div className="relative z-10 text-white max-w-lg">
          <h2 className="font-hk-grotesk text-2xl font-medium mb-4">
            Administrative Access
          </h2>
          <div className="space-y-4 font-dm-sans text-sm">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5" />
              <span>Manage bookings and reservations</span>
            </div>
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5" />
              <span>User management and analytics</span>
            </div>
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5" />
              <span>Content and itinerary management</span>
            </div>
            <div className="flex items-center space-x-3">
              <Settings className="w-5 h-5" />
              <span>System configuration and settings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Modal */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-crimson-red/20 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-crimson-red animate-spin" />
              </div>
              <div className="text-center">
                <h3 className="text-black font-hk-grotesk text-lg font-medium mb-2">
                  Signing You In
                </h3>
                <p className="text-grey font-dm-sans text-sm">
                  Please wait while we verify your credentials...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                Your account is currently awaiting admin approval. You&apos;ll
                be able to access the dashboard once an administrator approves
                your account.
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
                onClick={() => setShowApprovalModal(false)}
                className="w-full bg-crimson-red hover:bg-light-red text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
