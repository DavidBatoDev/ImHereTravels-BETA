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
} from "lucide-react";

export default function AdminSignupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "agent",
    password: "",
    confirmPassword: "",
    avatar: null as File | null,
    agreeTerms: false,
  });

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

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.role) {
      newErrors.role = "Please select a role";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = "You must agree to the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    let isValid = false;

    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
      setErrors({});
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep3()) {
      // TODO: Implement signup logic
      console.log("Signup data:", formData);
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
              I'm Here Travels
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
                {currentStep === 2 && "Personal Information"}
                {currentStep === 3 && "Terms & Submit"}
              </h1>
              <p className="text-grey font-dm-sans text-base">
                {currentStep === 1 && "Set up your account credentials"}
                {currentStep === 2 && "Tell us about yourself"}
                {currentStep === 3 && "Review and complete registration"}
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
                {/* Step 1: Role, Email, Password */}
                {currentStep === 1 && (
                  <>
                    <div>
                      <label className="block text-black font-dm-sans text-sm mb-2">
                        Role
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) =>
                          handleInputChange("role", e.target.value)
                        }
                        className={`w-full px-4 py-3 bg-light-grey border rounded-lg text-black font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red focus:border-transparent transition-all ${
                          errors.role ? "border-red-500" : "border-grey"
                        }`}
                        required
                      >
                        <option value="agent">Agent</option>
                        <option value="admin">Administrator</option>
                      </select>
                      {errors.role && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.role}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-black font-dm-sans text-sm mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="admin@imheretravels.com"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className={`w-full px-4 py-3 bg-light-grey border rounded-lg text-black placeholder-grey font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red focus:border-transparent transition-all ${
                          errors.email ? "border-red-500" : "border-grey"
                        }`}
                        required
                      />
                      {errors.email && (
                        <p className="text-red-500 text-xs mt-1">
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
                          value={formData.password}
                          onChange={(e) =>
                            handleInputChange("password", e.target.value)
                          }
                          className={`w-full px-4 py-3 pr-12 bg-light-grey border rounded-lg text-black placeholder-grey font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red focus:border-transparent transition-all ${
                            errors.password ? "border-red-500" : "border-grey"
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
                    </div>

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
                            handleInputChange("confirmPassword", e.target.value)
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

                    <button
                      type="button"
                      onClick={nextStep}
                      className="w-full bg-crimson-red hover:bg-light-red text-white font-dm-sans font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                      Next Step
                    </button>
                  </>
                )}

                {/* Step 2: Personal Information */}
                {currentStep === 2 && (
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

                    <div className="grid grid-cols-2 gap-4">
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
                        className="flex-1 bg-crimson-red hover:bg-light-red text-white font-dm-sans font-medium py-3 px-4 rounded-lg transition-colors"
                      >
                        Next Step
                      </button>
                    </div>
                  </>
                )}

                {/* Step 3: Terms and Submit */}
                {currentStep === 3 && (
                  <>
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
                        disabled={!formData.agreeTerms}
                        className="flex-1 bg-crimson-red hover:bg-light-red disabled:bg-grey disabled:cursor-not-allowed text-white font-dm-sans font-medium py-3 px-4 rounded-lg transition-colors"
                      >
                        Create Admin Account
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

      {/* Right side - Admin Features */}
      <div className="flex-1 bg-gradient-to-br from-crimson-red via-crimson-red to-light-red flex items-end p-8">
        <div className="text-white max-w-lg">
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

          <div className="mt-8 p-4 bg-white/10 rounded-lg">
            <h3 className="font-hk-grotesk text-lg font-medium mb-2">
              Role Permissions
            </h3>
            <div className="space-y-2 font-dm-sans text-xs">
              <div>
                <span className="font-medium">Administrator:</span> Full system
                access
              </div>
              <div>
                <span className="font-medium">Agent:</span> Limited booking
                management
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
