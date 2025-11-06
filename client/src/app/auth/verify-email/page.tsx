"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { EmailVerificationService } from "@/services/email-verification-service";
import { useAuthStore } from "@/store/auth-store";

import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const [verificationStatus, setVerificationStatus] = useState<
    "loading" | "success" | "error" | "idle"
  >("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { markEmailAsVerified } = useAuthStore();

  const token = searchParams.get("token");
  const userId = searchParams.get("userId");

  useEffect(() => {
    if (token && userId) {
      verifyEmail();
    } else {
      setVerificationStatus("error");
      setError("Invalid verification link. Missing token or user ID.");
    }
  }, [token, userId]);

  const verifyEmail = async () => {
    if (!token || !userId) return;

    setIsVerifying(true);
    setVerificationStatus("loading");

    try {
      const result = await EmailVerificationService.verifyEmail({
        token,
        userId,
      });

      if (result.success) {
        setVerificationStatus("success");
        setMessage(result.message);

        // Update local auth store
        await markEmailAsVerified(userId);
      } else {
        setVerificationStatus("error");
        setError(result.error || "Verification failed");
      }
    } catch (error) {
      setVerificationStatus("error");
      setError("An unexpected error occurred during verification");
    } finally {
      setIsVerifying(false);
    }
  };

  const resendVerification = async () => {
    // This would typically redirect to a resend verification page
    router.push("/auth/login");
  };

  if (verificationStatus === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10">
                  <img
                    src="/logos/Logo_Red.svg"
                    alt="I'm Here Travels Logo"
                    className="w-full h-full"
                  />
                </div>
                <span className="text-gray-900 font-hk-grotesk text-xl font-semibold">
                  I&apos;m Here Travels
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Centered */}
        <div className="flex-1 flex items-center justify-center px-8 py-16">
          <div className="w-full max-w-lg">
            <div className="text-center mb-10">
              <h1 className="text-gray-900 font-hk-grotesk text-4xl font-bold mb-4">
                Email Verification
              </h1>
              <p className="text-gray-600 font-dm-sans text-lg">
                Complete your admin setup
              </p>
            </div>

            {/* Verification Content */}
            <div className="bg-gray-50 rounded-2xl p-10">
              <div className="space-y-8">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                </div>
                <div className="text-center">
                  <h3 className="text-gray-900 font-hk-grotesk text-2xl font-semibold mb-3">
                    Verifying Your Email
                  </h3>
                  <p className="text-gray-600 font-dm-sans text-base leading-relaxed">
                    Please wait while we verify your email address...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (verificationStatus === "success") {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10">
                  <img
                    src="/logos/Logo_Red.svg"
                    alt="I'm Here Travels Logo"
                    className="w-full h-full"
                  />
                </div>
                <span className="text-gray-900 font-hk-grotesk text-xl font-semibold">
                  I&apos;mHereTravels
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Centered */}
        <div className="flex-1 flex items-center justify-center px-8 py-16">
          <div className="w-full max-w-lg">
            <div className="text-center mb-10">
              <h1 className="text-gray-900 font-hk-grotesk text-4xl font-bold mb-4">
                Email Verification
              </h1>
              <p className="text-gray-600 font-dm-sans text-lg">
                Complete your admin setup
              </p>
            </div>

            {/* Verification Content */}
            <div className="bg-gray-50 rounded-2xl p-10">
              <div className="space-y-8">
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-gray-900 font-hk-grotesk text-2xl font-semibold mb-4">
                    Email Verified Successfully!
                  </h3>
                  <p className="text-gray-600 font-dm-sans text-base leading-relaxed">
                    Your email has been verified. You may now close this tab and
                    continue with your admin account creation.
                  </p>
                  <div className="pt-6">
                    <button
                      onClick={() => window.close()}
                      className="inline-block bg-crimson-red hover:bg-light-red text-white font-dm-sans font-semibold py-4 px-10 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      Close Tab
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (verificationStatus === "error") {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10">
                  <img
                    src="/logos/Logo_Red.svg"
                    alt="I'm Here Travels Logo"
                    className="w-full h-full"
                  />
                </div>
                <span className="text-gray-900 font-hk-grotesk text-xl font-semibold">
                  I&apos;m Here Travels
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Centered */}
        <div className="flex-1 flex items-center justify-center px-8 py-16">
          <div className="w-full max-w-lg">
            <div className="text-center mb-10">
              <h1 className="text-gray-900 font-hk-grotesk text-4xl font-bold mb-4">
                Email Verification
              </h1>
              <p className="text-gray-600 font-dm-sans text-lg">
                Complete your admin setup
              </p>
            </div>

            {/* Verification Content */}
            <div className="bg-gray-50 rounded-2xl p-10">
              <div className="space-y-8">
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-12 h-12 text-red-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-gray-900 font-hk-grotesk text-2xl font-semibold mb-4">
                    Verification Failed
                  </h3>
                  <p className="text-gray-600 font-dm-sans text-base leading-relaxed">
                    {error}
                  </p>
                  <div className="pt-6 space-y-4">
                    <button
                      onClick={() => router.push("/auth/signup")}
                      className="inline-block bg-crimson-red hover:bg-light-red text-white font-dm-sans font-semibold py-4 px-10 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      Try Again
                    </button>
                    <br />
                    <button
                      onClick={() => router.push("/auth/login")}
                      className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-dm-sans font-semibold py-4 px-10 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      Back to Login
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10">
                <img
                  src="/logos/Logo_Red.svg"
                  alt="I'm Here Travels Logo"
                  className="w-full h-full"
                />
              </div>
              <span className="text-gray-900 font-hk-grotesk text-xl font-semibold">
                I&apos;m Here Travels
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <h1 className="text-gray-900 font-hk-grotesk text-4xl font-bold mb-4">
              Email Verification
            </h1>
            <p className="text-gray-600 font-dm-sans text-lg">
              Complete your admin setup
            </p>
          </div>

          {/* Verification Content */}
          <div className="bg-gray-50 rounded-2xl p-10">
            <div className="space-y-8">
              <div className="text-center">
                <h3 className="text-gray-900 font-hk-grotesk text-2xl font-semibold">
                  Processing your verification request...
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Loading verification page...</p>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
