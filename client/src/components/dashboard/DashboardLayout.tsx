"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSidebar } from "@/contexts/SidebarContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
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
            sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
          }`}
        >
          {/* Mobile header - only for sidebar toggle */}
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background px-4 shadow-sm lg:hidden">
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
          </div>

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

        {/* Fixed floating theme toggle */}
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
      </div>
    </AuthGuard>
  );
}
