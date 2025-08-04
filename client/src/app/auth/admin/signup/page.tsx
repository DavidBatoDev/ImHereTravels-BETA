"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Shield,
  Users,
  FileText,
  Settings,
  ArrowLeft,
  UserPlus,
  Check,
  Upload,
  Eye,
  EyeOff,
  Loader2,
  Calendar,
  MessageSquare,
  BarChart3,
  Edit,
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/hooks/use-toast";

export default function AdminSignupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [userCredential, setUserCredential] = useState<any>(null);
  const [step1State, setStep1State] = useState<
    "email" | "password" | "existing-password"
  >("email");
  const [existingAccount, setExistingAccount] = useState<any>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "agent" as "agent" | "admin",
    password: "",
    confirmPassword: "",
    avatar: null as File | null,
    agreeTerms: false,
  });

  const {
    signUp,
    sendEmailVerification,
    checkEmailVerification,
    checkExistingAccount,
    signInAndGetUser,
    signInForSignup,
    clearError,
  } = useAuthStore();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({
      ...prev,
      avatar: file,
    }));
  };

  const validateEmail = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.role) {
      newErrors.role = "Please select a role";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (step1State === "password" && !formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (
      step1State === "password" &&
      formData.password !== formData.confirmPassword
    ) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    // Step 2 is email verification - no validation needed
    return true;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = "You must agree to the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailContinue = async () => {
    if (!validateEmail()) return;

    setIsSubmitting(true);
    clearError();

    try {
      const accountCheck = await checkExistingAccount(formData.email);

      if (accountCheck.exists) {
        if (accountCheck.hasAgreed) {
          console.log(
            "accountCheck for account already exists and terms agreed",
            accountCheck
          );
          // Account exists and terms agreed - throw error
          toast({
            title: "Account Already Exists",
            description: "An account already exists with this email address.",
            variant: "destructive",
          });
          setErrors({
            email: "An account already exists with this email address.",
          });
        } else {
          // Account exists but terms not agreed - ask for password
          console.log(
            "accountCheck for account already exists and terms not agreed",
            accountCheck
          );
          setExistingAccount(accountCheck.user);
          setStep1State("existing-password");
          setFormData((prev) => ({
            ...prev,
            firstName: accountCheck.user?.profile?.firstName || "",
            lastName: accountCheck.user?.profile?.lastName || "",
            role: accountCheck.user?.role || "agent",
          }));
        }
      } else {
        console.log("accountCheck for account does not exist");
        // Account doesn't exist - show password fields for new account
        setStep1State("password");
      }
    } catch (error) {
      console.error("Error checking existing account:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordContinue = async () => {
    if (!validatePassword()) return;

    setIsSubmitting(true);
    clearError();

    try {
      if (existingAccount) {
        // Existing account - try to sign in (use signup-specific method)
        const user = await signInForSignup(formData.email, formData.password);

        // Check email verification status from Firebase Auth
        const isEmailVerified = user.emailVerified;

        if (isEmailVerified && !existingAccount.hasAgreed) {
          // Email verified but terms not agreed - go directly to step 3
          setUserCredential(user);
          setCurrentStep(3);
          toast({
            title: "Email Already Verified",
            description:
              "Your email is verified. Please complete your profile setup.",
          });
        } else if (!isEmailVerified) {
          // Email not verified - go to step 2
          setUserCredential(user);
          setCurrentStep(2);
        }
      } else {
        // New account - create account
        const user = await signUp(formData.email, formData.password, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
        });

        // Send email verification
        await sendEmailVerification(user);
        setEmailVerificationSent(true);
        setUserCredential(user);
        setCurrentStep(2);
      }
    } catch (error) {
      console.error("Password verification failed:", error);
      setErrors({
        password: "Invalid password. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    console.log("nextStep called, currentStep:", currentStep);
    let isValid = false;

    switch (currentStep) {
      case 1:
        if (step1State === "email") {
          await handleEmailContinue();
        } else if (
          step1State === "password" ||
          step1State === "existing-password"
        ) {
          await handlePasswordContinue();
        }
        break;
      case 2:
        console.log("Case 2: Email verification check");
        console.log("userCredential value:", userCredential);
        // Check if email is verified before proceeding
        if (userCredential) {
          console.log("userCredential exists:", userCredential);
          setIsSubmitting(true);
          try {
            console.log("Calling checkEmailVerification...");
            const isVerified = await checkEmailVerification(userCredential);

            if (isVerified) {
              // Email verified - go to step 3
              setCurrentStep(3);
              setErrors({});
              toast({
                title: "Email Verified!",
                description: "Your email has been verified successfully.",
              });
            } else {
              setErrors({
                verification:
                  "Please verify your email before continuing. Check your inbox and click the verification link.",
              });
              toast({
                title: "Email Not Verified",
                description: "Please verify your email before continuing.",
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error("Error checking email verification:", error);
            setErrors({
              verification:
                "Unable to check email verification status. Please try again.",
            });
          } finally {
            setIsSubmitting(false);
          }
        }
        break;
      case 3:
        isValid = validateStep3();
        if (isValid) {
          // Final submission
          handleSubmit(new Event("submit") as any);
        }
        break;
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) {
      toast({
        title: "Please Wait",
        description: `Please wait ${resendCooldown} seconds before requesting another verification email.`,
        variant: "destructive",
      });
      return;
    }

    if (!userCredential) {
      toast({
        title: "Error",
        description: "No user found. Please try signing up again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await sendEmailVerification(userCredential);

      // Set cooldown for 60 seconds
      setResendCooldown(60);
      const cooldownInterval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error resending verification email:", error);
      // Error handling is done in the auth store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep3()) {
      setIsSubmitting(true);
      clearError();

      try {
        // Update user profile with final data
        if (userCredential) {
          // Update the user profile in Firestore with the final data
          const userRef = doc(db, "users", userCredential.uid);
          await updateDoc(userRef, {
            "profile.firstName": formData.firstName,
            "profile.lastName": formData.lastName,
            "profile.avatar": formData.avatar
              ? `https://api.dicebear.com/8.x/pixel-art/svg?seed=${formData.firstName}${formData.lastName}`
              : `https://api.dicebear.com/8.x/pixel-art/svg?seed=${formData.firstName}${formData.lastName}`,
            hasAgreedToTerms: true,
            metadata: {
              updatedAt: new Date() as any,
            },
          });

          // Update Firebase Auth display name
          await updateProfile(userCredential, {
            displayName: `${formData.firstName} ${formData.lastName}`.trim(),
          });

          setIsSuccess(true);

          // Show success toast
          toast({
            title: "Account Setup Complete!",
            description:
              "Your account has been created and is pending approval.",
          });

          // Redirect to dashboard after showing success message
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 3000);
        }
      } catch (error) {
        console.error("Profile update failed:", error);
        toast({
          title: "Profile Update Failed",
          description: "Failed to update your profile. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-creative-midnight flex">
      {/* Left side - Admin Signup Form */}
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
                <UserPlus className="w-8 h-8 text-crimson-red" />
              </div>
              <h1 className="text-black font-hk-grotesk text-3xl font-medium mb-2">
                {currentStep === 1 && "Account Setup"}
                {currentStep === 2 && "Email Verification"}
                {currentStep === 3 && "Profile Setup"}
              </h1>
              <p className="text-grey font-dm-sans text-base">
                {currentStep === 1 && "Set up your account credentials"}
                {currentStep === 2 && "Verify your email address"}
                {currentStep === 3 && "Complete your profile"}
              </p>
            </div>

            {/* Step Indicator */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center">
                {[1, 2, 3].map((step, index) => (
                  <React.Fragment key={step}>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                        step <= currentStep
                          ? "bg-crimson-red text-white shadow-lg"
                          : "bg-light-grey text-grey"
                      }`}
                    >
                      {step < currentStep ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        step
                      )}
                    </div>
                    {index < 2 && (
                      <div
                        className={`w-12 h-0.5 mx-2 transition-all duration-300 ${
                          step < currentStep
                            ? "bg-crimson-red"
                            : "bg-light-grey"
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Fixed Height Container for Form Content */}
            <div className="min-h-[400px] flex flex-col justify-center">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Step 1: Email Check and Password Setup */}
                {currentStep === 1 && (
                  <>
                    {/* Email Input - Always shown */}
                    <div>
                      <label className="block text-black font-dm-sans text-sm mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          placeholder="admin@imheretravels.com"
                          value={formData.email}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                          disabled={step1State !== "email"}
                          className={`w-full px-4 py-3 bg-light-grey border rounded-lg text-black placeholder-grey font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red focus:border-transparent transition-all ${
                            errors.email ? "border-red-500" : "border-grey"
                          } ${step1State !== "email" ? "opacity-50" : ""}`}
                          required
                        />
                        {step1State !== "email" && (
                          <button
                            type="button"
                            onClick={() => {
                              setStep1State("email");
                              setErrors({});
                              // Clear password inputs when going back to email
                              handleInputChange("password", "");
                              handleInputChange("confirmPassword", "");
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-grey hover:text-crimson-red transition-colors"
                            title="Edit email"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      {errors.email && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Continue Button - Only shown in email state */}
                    {step1State === "email" && (
                      <button
                        type="button"
                        onClick={handleEmailContinue}
                        disabled={isSubmitting}
                        className="w-full bg-crimson-red hover:bg-light-red disabled:bg-grey disabled:cursor-not-allowed text-white font-dm-sans font-medium py-3 px-4 rounded-lg transition-colors"
                      >
                        {isSubmitting ? "Checking..." : "Continue"}
                      </button>
                    )}

                    {/* Password Fields - Only shown in password states */}
                    {(step1State === "password" ||
                      step1State === "existing-password") && (
                      <>
                        {/* Role Selection - Only for new accounts */}
                        {step1State === "password" && (
                          <div>
                            <label className="block text-black font-dm-sans text-sm mb-2">
                              Select Your Role
                            </label>
                            <div className="flex border border-grey rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() =>
                                  handleInputChange("role", "agent")
                                }
                                className={`flex-1 px-4 py-3 font-dm-sans text-sm font-medium transition-all ${
                                  formData.role === "agent"
                                    ? "bg-crimson-red text-white"
                                    : "bg-light-grey text-grey hover:bg-grey hover:text-black"
                                }`}
                              >
                                Agent
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleInputChange("role", "admin")
                                }
                                className={`flex-1 px-4 py-3 font-dm-sans text-sm font-medium transition-all ${
                                  formData.role === "admin"
                                    ? "bg-crimson-red text-white"
                                    : "bg-light-grey text-grey hover:bg-grey hover:text-black"
                                }`}
                              >
                                Administrator
                              </button>
                            </div>
                            {errors.role && (
                              <p className="text-red-500 text-xs mt-1">
                                {errors.role}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Password Input */}
                        <div>
                          <label className="block text-black font-dm-sans text-sm mb-2">
                            {existingAccount
                              ? "Enter your password"
                              : "Create a password"}
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder={
                                existingAccount
                                  ? "Enter your existing password"
                                  : "Create a strong password"
                              }
                              value={formData.password}
                              onChange={(e) =>
                                handleInputChange("password", e.target.value)
                              }
                              className={`w-full px-4 py-3 pr-12 bg-light-grey border rounded-lg text-black placeholder-grey font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red focus:border-transparent transition-all ${
                                errors.password
                                  ? "border-red-500"
                                  : "border-grey"
                              }`}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-grey hover:text-black transition-colors"
                            >
                              {showPassword ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                          {errors.password && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.password}
                            </p>
                          )}
                          {!existingAccount && (
                            <p className="text-grey text-xs mt-1">
                              Password must be at least 6 characters long
                            </p>
                          )}
                        </div>

                        {/* Confirm Password - Only for new accounts */}
                        {step1State === "password" && (
                          <div>
                            <label className="block text-black font-dm-sans text-sm mb-2">
                              Confirm Password
                            </label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={(e) =>
                                  handleInputChange(
                                    "confirmPassword",
                                    e.target.value
                                  )
                                }
                                className={`w-full px-4 py-3 pr-12 bg-light-grey border rounded-lg text-black placeholder-grey font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red focus:border-transparent transition-all ${
                                  errors.confirmPassword
                                    ? "border-red-500"
                                    : "border-grey"
                                }`}
                                required
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setShowConfirmPassword(!showConfirmPassword)
                                }
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-grey hover:text-black transition-colors"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="w-5 h-5" />
                                ) : (
                                  <Eye className="w-5 h-5" />
                                )}
                              </button>
                            </div>
                            {errors.confirmPassword && (
                              <p className="text-red-500 text-xs mt-1">
                                {errors.confirmPassword}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Action Button */}
                        <button
                          type="button"
                          onClick={handlePasswordContinue}
                          disabled={isSubmitting}
                          className="w-full bg-crimson-red hover:bg-light-red disabled:bg-grey disabled:cursor-not-allowed text-white font-dm-sans font-medium py-3 px-4 rounded-lg transition-colors"
                        >
                          {isSubmitting
                            ? "Processing..."
                            : step1State === "password"
                            ? "Create Account"
                            : "Next"}
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* Step 2: Email Verification */}
                {currentStep === 2 && (
                  <>
                    <div className="text-center space-y-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-8 h-8 text-green-600" />
                      </div>

                      <div>
                        <h3 className="text-black font-hk-grotesk text-xl font-medium mb-2">
                          Verification Email Sent!
                        </h3>
                        <p className="text-grey font-dm-sans text-sm mb-4">
                          We&apos;ve sent a verification email to{" "}
                          <span className="font-medium text-black">
                            {formData.email}
                          </span>
                        </p>
                        <p className="text-grey font-dm-sans text-sm">
                          Please check your inbox and click the verification
                          link to continue.
                        </p>
                      </div>

                      {errors.verification && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <MessageSquare className="w-5 h-5 text-red-600 mt-0.5" />
                            <div className="text-red-600 font-dm-sans text-xs">
                              <p className="font-medium mb-1">
                                Email Not Verified
                              </p>
                              <p>{errors.verification}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-4 bg-light-grey rounded-lg border border-grey">
                        <div className="flex items-start space-x-3">
                          <MessageSquare className="w-5 h-5 text-grey mt-0.5" />
                          <div className="text-grey font-dm-sans text-xs">
                            <p className="font-medium mb-1">
                              Didn&apos;t receive the email?
                            </p>
                            <p>
                              Check your spam folder or click the button below
                              to resend the verification email.
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={isSubmitting || resendCooldown > 0}
                        className="w-full bg-light-grey hover:bg-grey text-black font-dm-sans font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resendCooldown > 0
                          ? `Resend in ${resendCooldown}s`
                          : "Resend Verification Email"}
                      </button>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={prevStep}
                        className="flex-1 bg-light-grey hover:bg-grey text-black font-dm-sans font-medium py-3 px-4 rounded-lg transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={nextStep}
                        disabled={isSubmitting}
                        className="flex-1 bg-crimson-red hover:bg-light-red disabled:bg-grey disabled:cursor-not-allowed text-white font-dm-sans font-medium py-3 px-4 rounded-lg transition-colors"
                      >
                        {isSubmitting
                          ? "Checking Verification..."
                          : "Check Verification & Continue"}
                      </button>
                    </div>
                  </>
                )}

                {/* Step 3: Profile Setup and Terms */}
                {currentStep === 3 && (
                  <>
                    {/* Avatar Upload - Circular */}
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-light-grey border-2 border-grey flex items-center justify-center overflow-hidden">
                          {formData.avatar ? (
                            <img
                              src={URL.createObjectURL(formData.avatar)}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Upload className="w-8 h-8 text-grey" />
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                          id="avatar-upload"
                        />
                        <label
                          htmlFor="avatar-upload"
                          className="absolute -bottom-2 -right-2 w-8 h-8 bg-crimson-red rounded-full flex items-center justify-center cursor-pointer hover:bg-light-red transition-colors"
                        >
                          <Upload className="w-4 h-4 text-white" />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-black font-dm-sans text-sm mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          placeholder="John"
                          value={formData.firstName}
                          onChange={(e) =>
                            handleInputChange("firstName", e.target.value)
                          }
                          className={`w-full px-4 py-3 bg-light-grey border rounded-lg text-black placeholder-grey font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red focus:border-transparent transition-all ${
                            errors.firstName ? "border-red-500" : "border-grey"
                          }`}
                          required
                        />
                        {errors.firstName && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.firstName}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-black font-dm-sans text-sm mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          placeholder="Doe"
                          value={formData.lastName}
                          onChange={(e) =>
                            handleInputChange("lastName", e.target.value)
                          }
                          className={`w-full px-4 py-3 bg-light-grey border rounded-lg text-black placeholder-grey font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red focus:border-transparent transition-all ${
                            errors.lastName ? "border-red-500" : "border-grey"
                          }`}
                          required
                        />
                        {errors.lastName && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.lastName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="agree-terms"
                          checked={formData.agreeTerms}
                          onChange={(e) =>
                            handleInputChange("agreeTerms", e.target.checked)
                          }
                          className={`mt-1 w-4 h-4 text-crimson-red bg-light-grey border rounded focus:ring-crimson-red focus:ring-2 ${
                            errors.agreeTerms ? "border-red-500" : "border-grey"
                          }`}
                        />
                        <label
                          htmlFor="agree-terms"
                          className="text-black font-dm-sans text-sm"
                        >
                          I agree to the{" "}
                          <a
                            href="#"
                            className="text-crimson-red hover:text-light-red underline"
                          >
                            Terms of Service
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-crimson-red hover:text-light-red underline"
                          >
                            Privacy Policy
                          </a>
                        </label>
                      </div>
                      {errors.agreeTerms && (
                        <p className="text-red-500 text-xs ml-7">
                          {errors.agreeTerms}
                        </p>
                      )}

                      {/* Error messages are now handled by toast notifications */}

                      {isSuccess && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Check className="w-5 h-5 text-green-600" />
                            <p className="text-green-600 text-sm font-medium">
                              Account created successfully! Redirecting to
                              dashboard...
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="p-4 bg-light-grey rounded-lg border border-grey">
                        <div className="flex items-start space-x-3">
                          <Shield className="w-5 h-5 text-grey mt-0.5" />
                          <div className="text-grey font-dm-sans text-xs">
                            <p className="font-medium mb-1">
                              Account Approval Required
                            </p>
                            <p>
                              New admin accounts require approval from existing
                              administrators. You will receive an email
                              confirmation once your account is activated.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={prevStep}
                        className="flex-1 bg-light-grey hover:bg-grey text-black font-dm-sans font-medium py-3 px-4 rounded-lg transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        type="submit"
                        disabled={
                          !formData.agreeTerms || isSubmitting || isSuccess
                        }
                        className="flex-1 bg-crimson-red hover:bg-light-red disabled:bg-grey disabled:cursor-not-allowed text-white font-dm-sans font-medium py-3 px-4 rounded-lg transition-colors"
                      >
                        {isSubmitting
                          ? "Creating Account..."
                          : isSuccess
                          ? "Account Created!"
                          : `Create ${
                              formData.role === "admin"
                                ? "Administrator"
                                : "Agent"
                            } Account`}
                      </button>
                    </div>
                  </>
                )}

                {currentStep === 1 && (
                  <div className="text-center">
                    <span className="text-grey font-dm-sans text-sm">
                      Already have an account?{" "}
                    </span>
                    <a
                      href="/auth/admin/login"
                      className="text-crimson-red hover:text-light-red font-dm-sans text-sm transition-colors"
                    >
                      Sign in here
                    </a>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Dynamic Features based on Role */}
      <div className="flex-1 relative flex items-end p-8">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/sunrise.jpg')" }}
        />
        {/* Red Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-crimson-red/80 via-crimson-red/70 to-light-red/60" />
        {/* Content */}
        <div className="relative z-10 text-white max-w-lg">
          <h2 className="font-hk-grotesk text-2xl font-medium mb-4">
            {formData.role === "admin"
              ? "Administrative Access"
              : "Agent Access"}
          </h2>
          <div className="space-y-4 font-dm-sans text-sm">
            {formData.role === "admin" ? (
              <>
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
              </>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5" />
                  <span>Manage bookings and reservations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5" />
                  <span>View booking schedules</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5" />
                  <span>Customer communication</span>
                </div>
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-5 h-5" />
                  <span>Basic reporting access</span>
                </div>
              </>
            )}
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
                  Creating Your Account
                </h3>
                <p className="text-grey font-dm-sans text-sm">
                  Please wait while we set up your{" "}
                  {formData.role === "admin" ? "administrator" : "agent"}{" "}
                  account...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
