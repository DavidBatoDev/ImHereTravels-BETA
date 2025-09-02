"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  MessageSquare,
  BarChart3,
  Settings,
  User,
  X,
  LogOut,
  AlertTriangle,
  CreditCard,
  Code,
  HardDrive,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

interface DashboardSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview and analytics",
  },
  {
    name: "Bookings",
    href: "/bookings",
    icon: Calendar,
    description: "Manage reservations",
  },
  { type: "separator" },
  {
    name: "Tour Packages",
    href: "/tours",
    icon: MapPin,
    description: "Travel destinations",
  },
  {
    name: "Payment Types",
    href: "/payment-terms",
    icon: CreditCard,
    description: "Billing options",
  },
  {
    name: "Communications",
    href: "/communications",
    icon: MessageSquare,
    description: "Customer messages",
  },
  {
    name: "BCC Users",
    href: "/bcc-users",
    icon: User,
    description: "User management",
  },
  { type: "separator" },
  {
    name: "Storage",
    href: "/storage",
    icon: HardDrive,
    description: "File management",
  },
  {
    name: "Apps Script",
    href: "/functions",
    icon: Code,
    description: "Automation tools",
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Analytics & insights",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "System configuration",
  },
];

export default function DashboardSidebar({
  sidebarOpen,
  setSidebarOpen,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { userProfile, signOut, isLoading } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    console.log("🚀 Starting logout process...");
    console.log("📊 Current auth state:", { userProfile, isLoading });

    try {
      console.log("🔐 Calling signOut from auth store...");
      await signOut();
      console.log("✅ SignOut completed successfully");

      // Redirect to login page after logout
      console.log("🔄 Redirecting to login page...");
      window.location.href = "/auth/admin/login";
    } catch (error) {
      console.error("❌ Logout failed:", error);
    }
  };

  return (
    <>
      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          sidebarOpen ? "block" : "hidden"
        )}
      >
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white shadow-2xl">
          <div className="flex h-20 items-center justify-between px-6 bg-primary">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl p-2 backdrop-blur-sm">
                <Image
                  src="/logos/Logo_White.svg"
                  alt="ImHereTravels Logo"
                  width={24}
                  height={24}
                  className="w-full h-full"
                />
              </div>
              <h1 className="text-xl font-bold text-white font-hk-grotesk">
                ImHereTravels
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="text-white hover:bg-white/20 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex-1 space-y-2 px-4 py-6">
            {navigation.map((item, index) => {
              if (item.type === "separator") {
                return (
                  <div key={`separator-${index}`} className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-royal-purple/20" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-royal-purple/60 font-medium">
                        Section
                      </span>
                    </div>
                  </div>
                );
              }

              const isActive = pathname === item.href;
              return (
                <Link
                  key={`nav-${index}-${item.name}`}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out",
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/25"
                      : "text-creative-midnight hover:bg-royal-purple/10 hover:text-royal-purple hover:shadow-md"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div
                    className={cn(
                      "mr-3 p-2 rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-white/20 backdrop-blur-sm"
                        : "bg-royal-purple/10 group-hover:bg-royal-purple/20"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                        isActive
                          ? "text-white"
                          : "text-royal-purple group-hover:text-royal-purple"
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{item.name}</div>
                    <div
                      className={cn(
                        "text-xs opacity-75 transition-opacity duration-200",
                        isActive ? "text-white/80" : "text-grey"
                      )}
                    >
                      {item.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="absolute right-2 w-2 h-2 bg-white rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-royal-purple/20 p-6 bg-light-grey">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                {userProfile?.profile?.avatar ? (
                  <img
                    src={userProfile.profile.avatar}
                    alt="Profile"
                    className="h-12 w-12 rounded-xl object-cover ring-2 ring-royal-purple/20 shadow-md"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-royal-purple flex items-center justify-center shadow-md">
                    <User className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-semibold text-creative-midnight">
                  {userProfile?.profile?.firstName || "User"}
                </p>
                <p className="text-xs text-grey">
                  {userProfile?.email || "user@imheretravels.com"}
                </p>
                <div className="inline-flex items-center px-2 py-1 rounded-full bg-spring-green/20 text-xs font-medium text-spring-green mt-1">
                  {userProfile?.role || "user"}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border border-primary/20 rounded-xl transition-all duration-200"
              onClick={() => setShowLogoutModal(true)}
              disabled={isLoading}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoading ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white shadow">
          {/* <div className="flex items-center px-6 py-3 bg-primary"> */}
          <div className="flex items-center px-6 py-3 bg-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl p-2 backdrop-blur-sm">
                <Image
                  src="/logos/Logo_Red.svg"
                  alt="ImHereTravels Logo"
                  width={24}
                  height={24}
                  className="w-full h-full"
                />
              </div>
              {/* <h1 className="text-xl font-bold text-white font-hk-grotesk"> */}
              <h1 className="text-xl font-bold text-creative-midnight font-hk-grotesk">
                ImHereTravels
              </h1>
            </div>
          </div>
          <nav className="flex-1 space-y-2 px-4 py-6">
            {navigation.map((item, index) => {
              if (item.type === "separator") {
                return (
                  <div
                    key={`desktop-separator-${index}`}
                    className="relative py-2"
                  >
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-royal-purple/20" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-royal-purple/60 font-medium">
                        Section
                      </span>
                    </div>
                  </div>
                );
              }

              const isActive = pathname === item.href;
              return (
                <Link
                  key={`desktop-nav-${index}-${item.name}`}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out",
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-primary-red/25"
                      : "text-creative-midnight hover:bg-royal-purple/10 hover:text-royal-purple hover:shadow-md"
                  )}
                >
                  <div
                    className={cn(
                      "mr-3 p-2 rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-white/20 backdrop-blur-sm"
                        : "bg-royal-purple/10 group-hover:bg-royal-purple/20"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                        isActive
                          ? "text-white"
                          : "text-royal-purple group-hover:text-royal-purple"
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{item.name}</div>
                    <div
                      className={cn(
                        "text-xs opacity-75 transition-opacity duration-200",
                        isActive ? "text-white/80" : "text-grey"
                      )}
                    >
                      {item.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="absolute right-2 w-2 h-2 bg-white rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-royal-purple/20 p-6 bg-light-grey">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                {userProfile?.profile?.avatar ? (
                  <img
                    src={userProfile.profile.avatar}
                    alt="Profile"
                    className="h-12 w-12 rounded-xl object-cover ring-2 ring-royal-purple/20 shadow-md"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-royal-purple flex items-center justify-center shadow-md">
                    <User className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-semibold text-creative-midnight">
                  {userProfile?.profile?.firstName || "User"}
                </p>
                <p className="text-xs text-grey">
                  {userProfile?.email || "user@imheretravels.com"}
                </p>
                <div className="inline-flex items-center px-2 py-1 rounded-full bg-spring-green/20 text-xs font-medium text-spring-green mt-1">
                  {userProfile?.role || "user"}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border border-primary/20 rounded-xl transition-all duration-200"
              onClick={() => setShowLogoutModal(true)}
              disabled={isLoading}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoading ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-royal-purple/10">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-creative-midnight font-hk-grotesk">
                  Confirm Logout
                </h3>
                <p className="text-sm text-grey">
                  Are you sure you want to sign out?
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1 border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 rounded-xl transition-all duration-200"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all duration-200 shadow-lg shadow-primary/25"
                onClick={handleLogout}
                disabled={isLoading}
              >
                {isLoading ? "Signing out..." : "Sign out"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
