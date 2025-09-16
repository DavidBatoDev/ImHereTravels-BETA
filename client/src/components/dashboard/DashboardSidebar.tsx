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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
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
  sidebarCollapsed,
  setSidebarCollapsed,
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
        <div
          className={cn(
            "fixed inset-y-0 left-0 flex flex-col bg-background border-r border-border shadow-2xl transition-all duration-300",
            sidebarCollapsed ? "w-20" : "w-72"
          )}
        >
          <div className="flex h-20 items-center justify-between px-6 bg-muted border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-background rounded-xl p-2 border border-border">
                <Image
                  src="/logos/Logo_Red.svg"
                  alt="ImHereTravels Logo"
                  width={24}
                  height={24}
                  className="w-full h-full"
                />
              </div>
              {!sidebarCollapsed && (
                <h1 className="text-xl font-bold text-foreground font-hk-grotesk">
                  ImHereTravels
                </h1>
              )}
            </div>
            {sidebarCollapsed ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="text-muted-foreground hover:bg-background hover:text-foreground p-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  className="text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
          <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto scrollbar-hide">
            <TooltipProvider>
              {navigation.map((item, index) => {
                if (item.type === "separator") {
                  if (sidebarCollapsed) return null; // Hide separators when collapsed
                  return (
                    <div key={`separator-${index}`} className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground font-medium">
                          Section
                        </span>
                      </div>
                    </div>
                  );
                }

                const isActive = pathname === item.href;
                const navItem = (
                  <Link
                    key={`nav-${index}-${item.name}`}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center text-sm font-medium rounded-xl transition-all duration-200 ease-in-out",
                      sidebarCollapsed
                        ? "px-3 py-3 justify-center"
                        : "px-4 py-3",
                      isActive
                        ? "bg-primary text-white shadow-lg shadow-primary/25"
                        : "text-foreground hover:bg-royal-purple/10 hover:text-royal-purple hover:shadow-md"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div
                      className={cn(
                        "p-2 rounded-lg transition-all duration-200",
                        !sidebarCollapsed && "mr-3",
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
                    {!sidebarCollapsed && (
                      <>
                        <div className="flex-1">
                          <div className="font-semibold">{item.name}</div>
                          <div
                            className={cn(
                              "text-xs opacity-75 transition-opacity duration-200",
                              isActive
                                ? "text-white/80"
                                : "text-muted-foreground"
                            )}
                          >
                            {item.description}
                          </div>
                        </div>
                        {isActive && (
                          <div className="absolute right-2 w-2 h-2 bg-white rounded-full" />
                        )}
                      </>
                    )}
                  </Link>
                );

                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={`nav-${index}-${item.name}`}>
                      <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                      <TooltipContent side="right" className="ml-2">
                        <div>
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.description}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return navItem;
              })}
            </TooltipProvider>
          </nav>
          <div className="border-t border-border p-6 bg-muted">
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="flex-shrink-0">
                  {userProfile?.profile?.avatar ? (
                    <img
                      src={userProfile.profile.avatar}
                      alt="Profile"
                      className="h-10 w-10 rounded-xl object-cover ring-2 ring-border shadow-md"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-10 h-10 p-0 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border border-primary/20 rounded-xl transition-all duration-200"
                  onClick={() => setShowLogoutModal(true)}
                  disabled={isLoading}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    {userProfile?.profile?.avatar ? (
                      <img
                        src={userProfile.profile.avatar}
                        alt="Profile"
                        className="h-12 w-12 rounded-xl object-cover ring-2 ring-border shadow-md"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-md">
                        <User className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {userProfile?.profile?.firstName || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300",
          sidebarCollapsed ? "lg:w-20" : "lg:w-72"
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col bg-background border-r border-border shadow">
          <div className="flex items-center px-6 py-3 bg-muted border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-background rounded-xl p-2 border border-border">
                <Image
                  src="/logos/Logo_Red.svg"
                  alt="ImHereTravels Logo"
                  width={24}
                  height={24}
                  className="w-full h-full"
                />
              </div>
              {!sidebarCollapsed && (
                <h1 className="text-xl font-bold text-foreground font-hk-grotesk">
                  ImHereTravels
                </h1>
              )}
            </div>
            {sidebarCollapsed ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="ml-auto text-muted-foreground hover:bg-background hover:text-foreground p-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="ml-auto text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
          <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto scrollbar-hide">
            <TooltipProvider>
              {navigation.map((item, index) => {
                if (item.type === "separator") {
                  if (sidebarCollapsed) return null; // Hide separators when collapsed
                  return (
                    <div
                      key={`desktop-separator-${index}`}
                      className="relative py-2"
                    >
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground font-medium">
                          Section
                        </span>
                      </div>
                    </div>
                  );
                }

                const isActive = pathname === item.href;
                const navItem = (
                  <Link
                    key={`desktop-nav-${index}-${item.name}`}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center text-sm font-medium rounded-xl transition-all duration-200 ease-in-out",
                      sidebarCollapsed
                        ? "px-3 py-3 justify-center"
                        : "px-4 py-3",
                      isActive
                        ? "bg-primary text-white shadow-lg shadow-primary/25"
                        : "text-foreground hover:bg-royal-purple/10 hover:text-royal-purple hover:shadow-md"
                    )}
                  >
                    <div
                      className={cn(
                        "p-2 rounded-lg transition-all duration-200",
                        !sidebarCollapsed && "mr-3",
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
                    {!sidebarCollapsed && (
                      <>
                        <div className="flex-1">
                          <div className="font-semibold">{item.name}</div>
                          <div
                            className={cn(
                              "text-xs opacity-75 transition-opacity duration-200",
                              isActive
                                ? "text-white/80"
                                : "text-muted-foreground"
                            )}
                          >
                            {item.description}
                          </div>
                        </div>
                        {isActive && (
                          <div className="absolute right-2 w-2 h-2 bg-white rounded-full" />
                        )}
                      </>
                    )}
                  </Link>
                );

                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={`desktop-nav-${index}-${item.name}`}>
                      <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                      <TooltipContent side="right" className="ml-2">
                        <div>
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.description}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return navItem;
              })}
            </TooltipProvider>
          </nav>
          <div className="border-t border-border p-6 bg-muted">
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="flex-shrink-0">
                  {userProfile?.profile?.avatar ? (
                    <img
                      src={userProfile.profile.avatar}
                      alt="Profile"
                      className="h-10 w-10 rounded-xl object-cover ring-2 ring-border shadow-md"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-10 h-10 p-0 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border border-primary/20 rounded-xl transition-all duration-200"
                  onClick={() => setShowLogoutModal(true)}
                  disabled={isLoading}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    {userProfile?.profile?.avatar ? (
                      <img
                        src={userProfile.profile.avatar}
                        alt="Profile"
                        className="h-12 w-12 rounded-xl object-cover ring-2 ring-border shadow-md"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-md">
                        <User className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {userProfile?.profile?.firstName || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-border">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground font-hk-grotesk">
                  Confirm Logout
                </h3>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to sign out?
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1 border-border text-primary hover:bg-primary/10 rounded-xl transition-all duration-200"
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
