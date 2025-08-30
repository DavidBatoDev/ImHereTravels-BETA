"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookingsList from "./BookingsList";
import BookingsSheet from "../sheet-management/BookingsSheet";

export default function BookingsTabs() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-creative-midnight font-hk-grotesk">
            Bookings
          </h1>
          <p className="text-grey text-lg">
            Manage all bookings and reservations
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-light-grey border border-royal-purple/20">
          <TabsTrigger
            value="list"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            Bookings List
          </TabsTrigger>
          <TabsTrigger
            value="sheet"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            Sheet Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <BookingsList />
        </TabsContent>

        <TabsContent value="sheet" className="mt-6">
          <BookingsSheet />
        </TabsContent>
      </Tabs>
    </div>
  );
}
