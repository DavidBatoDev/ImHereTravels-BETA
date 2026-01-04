"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import BookingsSection from "./BookingsSection";
import BookingsSheet from "../sheet-management/BookingsSheet";
import PreDeparturePackSection from "@/app/(protected)/bookings/components/PreDeparturePackSection";
import ConfirmedBookingsSection from "@/app/(protected)/bookings/components/ConfirmedBookingsSection";
import { getUnsentConfirmedBookingsCount } from "@/services/confirmed-bookings-service";

// Tab mapping utilities
const urlToInternalTab = (urlTab: string | null): string => {
  switch (urlTab) {
    case "bookings":
      return "list";
    case "booking-list": // Backward compatibility
      return "list";
    case "confirmed-bookings":
      return "confirmed";
    case "bookings-sheet":
      return "sheet";
    case "sheet-management-tab": // Backward compatibility
      return "sheet";
    default:
      return "list"; // Default to booking list
  }
};

const internalTabToUrl = (internalTab: string): string => {
  switch (internalTab) {
    case "list":
      return "bookings";
    case "confirmed":
      return "confirmed-bookings";
    case "sheet":
      return "bookings-sheet";
    default:
      return "bookings";
  }
};

export default function BookingsTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("list");
  const [unsentCount, setUnsentCount] = useState<number>(0);

  // Fetch unsent count for confirmed bookings badge
  useEffect(() => {
    const fetchUnsentCount = async () => {
      try {
        const count = await getUnsentConfirmedBookingsCount();
        setUnsentCount(count);
      } catch (error) {
        console.error("Error fetching unsent count:", error);
      }
    };

    fetchUnsentCount();
    // Set up interval to refresh count every 30 seconds
    const interval = setInterval(fetchUnsentCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Initialize tab from URL parameters
  useEffect(() => {
    const urlTab = searchParams?.get("tab") ?? null;
    const initialTab = urlToInternalTab(urlTab);
    setActiveTab(initialTab);

    // If no tab parameter or invalid tab, update URL to show default
    if (!urlTab || urlTab !== internalTabToUrl(initialTab)) {
      const newSearchParams = new URLSearchParams(
        searchParams?.toString() ?? ""
      );
      newSearchParams.set("tab", internalTabToUrl(initialTab));
      router.replace(`/bookings?${newSearchParams.toString()}`);
    }
  }, [searchParams, router]);

  // Handle tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const newSearchParams = new URLSearchParams(searchParams?.toString() ?? "");
    newSearchParams.set("tab", internalTabToUrl(newTab));
    router.push(`/bookings?${newSearchParams.toString()}`);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-hk-grotesk">
            Bookings
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg">
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
        {/* Mobile: Dropdown Select */}
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={handleTabChange}>
            <SelectTrigger className="w-full h-12 bg-card/80 backdrop-blur-sm border-royal-purple/20 dark:border-border rounded-xl shadow-sm hover:shadow-md hover:border-royal-purple/40 transition-all duration-200 font-medium">
              <SelectValue>
                {activeTab === "list" && (
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Bookings
                  </span>
                )}
                {activeTab === "confirmed" && (
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Confirmed Bookings
                    {unsentCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="h-5 min-w-5 px-1.5 text-xs shadow-sm"
                      >
                        {unsentCount}
                      </Badge>
                    )}
                  </span>
                )}
                {activeTab === "sheet" && (
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Bookings Sheet
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-royal-purple/20 dark:border-border shadow-lg">
              <SelectItem
                value="list"
                className="rounded-lg hover:bg-royal-purple/10 focus:bg-royal-purple/10 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {activeTab === "list" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  )}
                  Bookings
                </span>
              </SelectItem>
              <SelectItem
                value="confirmed"
                className="rounded-lg hover:bg-royal-purple/10 focus:bg-royal-purple/10 cursor-pointer"
              >
                <span className="flex items-center justify-between w-full gap-2">
                  <span className="flex items-center gap-2">
                    {activeTab === "confirmed" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    )}
                    Confirmed Bookings
                  </span>
                  {unsentCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-2 h-5 min-w-5 px-1.5 text-xs shadow-sm"
                    >
                      {unsentCount}
                    </Badge>
                  )}
                </span>
              </SelectItem>
              <SelectItem
                value="sheet"
                className="rounded-lg hover:bg-royal-purple/10 focus:bg-royal-purple/10 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {activeTab === "sheet" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  )}
                  Bookings Sheet
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Horizontal Tabs */}
        <TabsList className="hidden md:grid w-full grid-cols-3 bg-muted border border-border">
          <TabsTrigger
            value="list"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            Bookings
          </TabsTrigger>
          <TabsTrigger
            value="confirmed"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            <span>Confirmed Bookings</span>
            {unsentCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-2 h-5 min-w-5 px-1.5 text-xs"
              >
                {unsentCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="sheet"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            Bookings Sheet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <BookingsSection />
        </TabsContent>

        <TabsContent value="confirmed" className="mt-6">
          <div className="space-y-6">
            <PreDeparturePackSection />
            <ConfirmedBookingsSection />
          </div>
        </TabsContent>

        <TabsContent value="sheet" className="mt-6">
          <BookingsSheet />
        </TabsContent>
      </Tabs>
    </div>
  );
}
