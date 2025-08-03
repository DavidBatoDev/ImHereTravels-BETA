"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Shield, Users, FileText, Settings, ArrowLeft } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
                <Shield className="w-8 h-8 text-crimson-red" />
              </div>
              <h1 className="text-black font-hk-grotesk text-3xl font-medium mb-2">
                Admin Access
              </h1>
              <p className="text-grey font-dm-sans text-base">
                Sign in to access the administrative dashboard
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-black font-dm-sans text-sm mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="admin@imheretravels.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-light-grey border border-grey rounded-lg text-black placeholder-grey font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-black font-dm-sans text-sm mb-2">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-light-grey border border-grey rounded-lg text-black placeholder-grey font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red focus:border-transparent transition-all"
                />
              </div>

              <button className="w-full bg-crimson-red hover:bg-light-red text-white font-dm-sans font-medium py-3 px-4 rounded-lg transition-colors">
                Sign in to Admin Panel
              </button>

              <div className="text-center">
                <a
                  href="#"
                  className="text-grey hover:text-crimson-red font-dm-sans text-sm transition-colors"
                >
                  Forgot your password?
                </a>
              </div>
            </div>

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
      <div className="flex-1 bg-gradient-to-br from-crimson-red via-crimson-red to-light-red flex items-end p-8">
        <div className="text-white max-w-lg">
          <h2 className="font-hk-grotesk text-2xl font-medium mb-4">
            Administrative Dashboard
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
    </div>
  );
}
