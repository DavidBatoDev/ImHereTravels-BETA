"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookingsSection from "./BookingsSection";
import BookingsSheet from "../sheet-management/BookingsSheet";
import BookingsColumnsTab from "./BookingsColumnsTab";

// Tab mapping utilities
const urlToInternalTab = (urlTab: string | null): string => {
  switch (urlTab) {
    case "bookings":
      return "list";
    case "booking-list": // Backward compatibility
      return "list";
    case "bookings-sheet":
      return "sheet";
    case "sheet-management-tab": // Backward compatibility
      return "sheet";
    case "fields-management":
      return "columns";
    case "columns": // Backward compatibility
      return "columns";
    default:
      return "list"; // Default to booking list
  }
};

const internalTabToUrl = (internalTab: string): string => {
  switch (internalTab) {
    case "list":
      return "bookings";
    case "sheet":
      return "bookings-sheet";
    case "columns":
      return "fields-management";
    default:
      return "bookings";
  }
};

export default function BookingsTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("list");

  // Initialize tab from URL parameters
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    const initialTab = urlToInternalTab(urlTab);
    setActiveTab(initialTab);

    // If no tab parameter or invalid tab, update URL to show default
    if (!urlTab || urlTab !== internalTabToUrl(initialTab)) {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set("tab", internalTabToUrl(initialTab));
      router.replace(`/bookings?${newSearchParams.toString()}`);
    }
  }, [searchParams, router]);

  // Handle tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("tab", internalTabToUrl(newTab));
    router.push(`/bookings?${newSearchParams.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-hk-grotesk">
            Bookings
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage all bookings and reservations
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 bg-muted border border-border">
          <TabsTrigger
            value="list"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            Bookings
          </TabsTrigger>
          <TabsTrigger
            value="sheet"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            Bookings Sheet
          </TabsTrigger>
          <TabsTrigger
            value="columns"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            Fields Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <BookingsSection />
        </TabsContent>

        <TabsContent value="sheet" className="mt-6">
          <BookingsSheet />
        </TabsContent>

        <TabsContent value="columns" className="mt-6">
          <BookingsColumnsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
