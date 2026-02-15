"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 transition-all duration-[400ms] ease-in">
        <div className="container mx-auto px-5 max-w-[1200px]">
          <div className="flex items-center justify-between gap-5 min-h-[90px]">
            <Link
              href="https://imheretravels.com"
              className="flex items-center"
            >
              <Image
                src="/logos/Digital_Horizontal_Red.svg"
                alt="ImHereTravels"
                width={180}
                height={50}
                className="h-10 w-auto"
              />
            </Link>

            <div className="flex items-center gap-5">
              <Button
                onClick={() =>
                  (window.location.href =
                    "https://imheretravels.com/contact-us/")
                }
                className="bg-crimson-red hover:bg-crimson-red/90 text-white rounded-full px-8 py-5 font-dm-sans"
              >
                Inquire Now
              </Button>

              <Link
                href="/auth/admin/login"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                •
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Check Your Booking Status */}
      <section className="relative min-h-[calc(100vh-73px)] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/sunrise.jpg')",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-creative-midnight/70 via-creative-midnight/50 to-creative-midnight/70" />
        </div>

        <div className="relative z-10 text-center text-white px-4 max-w-3xl mx-auto">
          <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="h-10 w-10 text-white" />
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-hk-grotesk font-bold mb-6 leading-tight">
            Check Your Booking Status
          </h1>

          <p className="text-lg md:text-xl text-gray-200 mb-8 font-dm-sans max-w-2xl mx-auto">
            View your booking details, payment status, and download your
            pre-departure pack
          </p>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-8">
            <div className="flex items-start gap-4 text-left mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-hk-grotesk font-bold mb-2">
                  Check Your Email
                </h3>
                <p className="text-gray-200 font-dm-sans">
                  We've sent you a secure link to access your booking status.
                  Can't find it? Check your spam folder or contact support
                  below.
                </p>
              </div>
            </div>

            <Button
              onClick={() =>
                (window.location.href = "mailto:bella@imheretravels.com")
              }
              className="w-full bg-crimson-red hover:bg-crimson-red/90 text-white h-14 text-lg rounded-full font-dm-sans"
            >
              <Mail className="h-5 w-5 mr-2" />
              Contact Support
            </Button>
          </div>

          <p className="text-sm text-gray-300 font-dm-sans">
            Need immediate assistance? Email us at{" "}
            <a
              href="mailto:bella@imheretravels.com"
              className="text-white hover:underline font-semibold"
            >
              bella@imheretravels.com
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logos/Digital_Horizontal_Red.svg"
                alt="ImHereTravels"
                width={140}
                height={40}
                className="h-8 w-auto"
              />
            </div>
            <div className="text-center text-gray-600 text-sm font-dm-sans">
              <p>
                © {new Date().getFullYear()} ImHereTravels. All rights reserved.
              </p>
              <p className="mt-2">
                <Link
                  href="/dashboard"
                  className="text-gray-400 hover:text-crimson-red transition-colors"
                >
                  Admin? Access Dashboard →
                </Link>
              </p>
            </div>
            <div className="text-sm text-gray-500 font-dm-sans">
              Creating unforgettable experiences since 2020
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
