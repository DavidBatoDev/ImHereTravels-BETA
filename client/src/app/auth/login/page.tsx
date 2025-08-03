'use client'

import React, { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-creative-midnight flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-crimson-red rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-white font-hk-grotesk text-xl font-medium">I'm Here Travels</span>
          </div>
          <button className="text-light-grey hover:text-white font-dm-sans text-sm transition-colors">
            Login
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-white font-hk-grotesk text-4xl font-medium mb-4">
                Start your journey
              </h1>
              <p className="text-light-grey font-dm-sans text-base">
                Enter your email below to create your travel account
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-brand-grey/10 border border-brand-grey/20 rounded-lg text-white placeholder-light-grey font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-crimson-red focus:border-transparent transition-all"
                />
              </div>

              <button className="w-full bg-crimson-red hover:bg-light-red text-white font-dm-sans font-medium py-3 px-4 rounded-lg transition-colors">
                Sign in with Email
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-brand-grey/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-creative-midnight text-light-grey font-dm-sans text-xs uppercase tracking-wider">
                    Or continue with
                  </span>
                </div>
              </div>

              <button className="w-full bg-transparent border border-brand-grey/20 hover:border-brand-grey/40 text-white font-dm-sans font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>GitHub</span>
              </button>
            </div>

            <p className="text-center text-light-grey font-dm-sans text-xs mt-8">
              By clicking continue, you agree to our{' '}
              <a href="#" className="text-crimson-red hover:text-light-red underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-crimson-red hover:text-light-red underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Testimonial */}
      <div className="flex-1 bg-gradient-to-br from-crimson-red via-crimson-red to-light-red flex items-end p-8">
        <div className="text-white max-w-lg">
          <blockquote className="font-dm-sans text-lg leading-relaxed mb-6">
            "This platform has connected me with incredible travelers and helped me discover hidden gems around the world. Every journey becomes a story worth sharing."
          </blockquote>
          <cite className="font-dm-sans text-sm opacity-90">
            - Maria Santos, Travel Enthusiast
          </cite>
        </div>
      </div>
    </div>
  );
}