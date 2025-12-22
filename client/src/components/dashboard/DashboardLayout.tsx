"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Search, Mail, User, Lock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth-store";
import { Input } from "@/components/ui/input";
import SearchBar from "@/components/dashboard/SearchBar";
import AuthGuard from "@/components/auth/AuthGuard";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSidebar } from "@/contexts/SidebarContext";
import GlobalSearchDialog from "@/components/search/GlobalSearchDialog";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const { userProfile, signOut, isLoading } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/auth/admin/login";
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const handleLock = () => {
    // Placeholder for lock action — implement actual lock logic later
    console.log("Lock action triggered");
  };

  // Global search keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSearchDialogOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background dark:bg-sidebar data-[theme=dark]:bg-sidebar">
        <style>{`
          @keyframes bellRing {
            0% { transform: rotate(0deg); }
            10% { transform: rotate(20deg); }
            30% { transform: rotate(-15deg); }
            50% { transform: rotate(10deg); }
            70% { transform: rotate(-6deg); }
            100% { transform: rotate(0deg); }
          }
          .bell-ring { transform-origin: 50% 10%; animation: bellRing 1s cubic-bezier(.2,.9,.2,1) infinite; }
        `}</style>
        {/* Sidebar */}
        <DashboardSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />

        {/* Main content */}
        <div
          className={`transition-all duration-300 ${
            sidebarCollapsed ? "lg:pl-28" : "lg:pl-72 "
          }`}
        >
          {/* Mobile header - only for sidebar toggle */}
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background dark:bg-sidebar data-[theme=dark]:bg-sidebar px-4 shadow-sm lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <h1 className="text-lg font-semibold text-foreground">
                Dashboard
              </h1>
            </div>
            {/* Mobile search button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchDialogOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>

          {/* Desktop navbar: left search, right theme toggle */}
          <div
            className={`${
              sidebarCollapsed ? "lg:px-4 lg:pl-10" : "lg:px-4"
            } hidden lg:flex sticky top-0 z-40 h-16 items-center    border-b border-border shadow-sm`}
            style={{ backgroundColor: "hsl(var(--card-surface))" }}
          >
            <div className="flex flex-1 items-center">
              {/* Click to open global search */}
              <div
                onClick={() => setSearchDialogOpen(true)}
                className="relative w-full max-w-xl cursor-pointer"
              >
                <div className="flex items-center bg-muted pl-10 pr-24 py-2 rounded-full border border-transparent hover:border-border transition-colors">
                  <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Search bookings, tours, payment terms...
                  </span>
                  <kbd className="absolute right-3 pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border border-border bg-background px-2 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-x-2">
              <a
                href="https://mail.google.com/mail/u/0/"
                target="_blank"
                rel="noopener noreferrer"
                title="Open Gmail"
                aria-label="Open Gmail"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-md"
                >
                  <Mail className="h-4 w-4" />
                  <span className="ml-2 text-sm font-medium">Open Gmail</span>
                </Button>
              </a>

              {/* Notifications dropdown */}
              <NotificationDropdown />

              <ThemeToggle />

              {/* Avatar dropdown (right-most) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 ml-2"
                  >
                    <Avatar>
                      {userProfile?.profile?.avatar ? (
                        <AvatarImage
                          src={userProfile.profile.avatar}
                          alt="Profile"
                        />
                      ) : (
                        <AvatarFallback>
                          <User className="h-4 w-4 text-foreground" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-4 py-3">
                    <div className="text-sm font-semibold text-foreground">
                      {userProfile?.profile?.firstName || "User"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {userProfile?.email}
                    </div>
                  </div>

                  <DropdownMenuItem
                    disabled
                    className="flex items-center gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Edit Preferences</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowLogoutModal(true)}
                    className="text-destructive"
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Logout Confirmation Modal (same style as sidebar) */}
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
                    onClick={handleSignOut}
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing out..." : "Sign out"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Page content */}
          <main className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>

        {/* Fixed floating hamburger menu - only show when sidebar is collapsed on desktop */}
        {sidebarCollapsed && (
          <div className="fixed top-4 left-[88px] z-50 hidden lg:block">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarCollapsed(false)}
              className="bg-background border-border hover:bg-muted shadow-lg"
              title="Open sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Theme toggle moved into the desktop navbar */}

        {/* Global Search Dialog */}
        <GlobalSearchDialog
          open={searchDialogOpen}
          onOpenChange={setSearchDialogOpen}
        />
      </div>
    </AuthGuard>
  );
}
