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
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600">Manage all bookings and reservations</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Bookings List</TabsTrigger>
          <TabsTrigger value="sheet">Sheet Management</TabsTrigger>
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
