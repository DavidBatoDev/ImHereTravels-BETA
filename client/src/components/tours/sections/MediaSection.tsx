"use client";

import React from "react";
import { Image as ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import SectionWrapper from "../shared/SectionWrapper";

interface MediaSectionProps {
  uploadedCover: string | null;
  uploadedGallery: string[];
  useCoverUrl: boolean;
  coverImageUrl: string;
  isSubmitting: boolean;
  onCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGalleryUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCoverToggle: (checked: boolean) => void;
  onCoverImageUrlChange: (url: string) => void;
  onRemoveCover: () => void;
  onRemoveGallery: (index: number) => void;
}

export default function MediaSection({
  uploadedCover,
  uploadedGallery,
  useCoverUrl,
  coverImageUrl,
  isSubmitting,
  onCoverUpload,
  onGalleryUpload,
  onCoverToggle,
  onCoverImageUrlChange,
  onRemoveCover,
  onRemoveGallery,
}: MediaSectionProps) {
  return (
    <div className="space-y-6">
      {/* Cover Image */}
      <SectionWrapper
        id="cover-image"
        title="Cover Image"
        description="The hero image shown at the top of the tour page. Recommended 16:9, min 1200×675px."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-light-grey/60 rounded-[12px] border border-light-grey">
              <div className="flex items-center gap-2">
                <Switch
                  id="cover-toggle"
                  checked={useCoverUrl}
                  onCheckedChange={onCoverToggle}
                  disabled={isSubmitting}
                />
                <Label htmlFor="cover-toggle" className="text-sm font-medium text-midnight">
                  {useCoverUrl ? "Use Image URL" : "Upload Image File"}
                </Label>
              </div>
              <Badge variant="outline" className="border-crimson-red text-crimson-red text-xs">
                {useCoverUrl ? "URL Mode" : "Upload Mode"}
              </Badge>
            </div>

            {!useCoverUrl ? (
              <div className="space-y-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onCoverUpload}
                  disabled={isSubmitting}
                  className="hidden"
                  id="cover-upload"
                />
                <Label
                  htmlFor="cover-upload"
                  className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed border-crimson-red/30 rounded-[12px] cursor-pointer hover:bg-crimson-red/5 transition-colors ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Upload className="h-4 w-4 text-crimson-red" />
                  <span className="font-medium text-midnight text-sm">Choose Cover Image</span>
                </Label>
                <p className="font-body text-b4-desktop text-dark-gray">JPEG, PNG, WebP accepted.</p>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-sm font-medium text-midnight">Image URL</Label>
                <Input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={coverImageUrl}
                  onChange={(e) => onCoverImageUrlChange(e.target.value)}
                  disabled={isSubmitting}
                  className="border-2 border-border focus:border-crimson-red"
                />
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="flex items-center justify-center">
            {uploadedCover ? (
              <div className="relative w-full max-w-md">
                <img
                  src={uploadedCover}
                  alt="Cover preview"
                  className="w-full object-cover rounded-[16px] border border-light-grey"
                  style={{ aspectRatio: "16/9" }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onRemoveCover}
                  className="absolute top-2 right-2 bg-crimson-red hover:bg-light-red h-7 w-7 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="w-full max-w-md h-32 bg-light-grey rounded-[16px] flex items-center justify-center" style={{ aspectRatio: "16/9" }}>
                <div className="text-center text-dark-gray">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No image selected</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SectionWrapper>

      {/* Gallery */}
      <SectionWrapper
        id="gallery"
        title="Gallery Images"
        description="Additional photos shown in the thumbnail strip below the hero image."
      >
        <div className="space-y-5">
          <div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onGalleryUpload}
              disabled={isSubmitting}
              className="hidden"
              id="gallery-upload"
            />
            <Label
              htmlFor="gallery-upload"
              className={`inline-flex items-center gap-3 px-5 py-3 border-2 border-dashed border-royal-purple/40 rounded-[12px] cursor-pointer hover:bg-royal-purple/5 transition-colors ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Upload className="h-5 w-5 text-royal-purple" />
              <span className="font-medium text-midnight">Choose Gallery Images</span>
            </Label>
          </div>

          {uploadedGallery.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {uploadedGallery.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-28 object-cover rounded-[12px] border border-light-grey"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => onRemoveGallery(index)}
                    className="absolute top-2 right-2 bg-crimson-red hover:bg-light-red h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionWrapper>
    </div>
  );
}
