"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GalleryTab from "./GalleryTab";

export default function StorageTabs() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-hk-grotesk">
            Storage
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage file storage and image collections
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="gallery" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted border border-royal-purple/20 dark:border-border">
          <TabsTrigger
            value="gallery"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            Gallery
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            Documents
          </TabsTrigger>
          <TabsTrigger
            value="media"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            Media
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="mt-6">
          <GalleryTab />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">
              Documents
            </h3>
            <p className="text-muted-foreground">
              Document management coming soon...
            </p>
          </div>
        </TabsContent>

        <TabsContent value="media" className="mt-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">Media</h3>
            <p className="text-muted-foreground">
              Media management coming soon...
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
