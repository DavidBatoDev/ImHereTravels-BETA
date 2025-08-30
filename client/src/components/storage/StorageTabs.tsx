"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GalleryTab from "./GalleryTab";

export default function StorageTabs() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Storage</h1>
          <p className="text-gray-600">
            Manage file storage and image collections
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="gallery" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="mt-6">
          <GalleryTab />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Documents
            </h3>
            <p className="text-gray-500">Document management coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="media" className="mt-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Media</h3>
            <p className="text-gray-500">Media management coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
