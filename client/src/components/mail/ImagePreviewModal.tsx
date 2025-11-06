"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  filename: string;
  mimeType: string;
}

export function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  filename,
  mimeType,
}: ImagePreviewModalProps) {
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Reset loading state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsImageLoading(true);
    }
  }, [isOpen, imageUrl]);

  // Download the image
  const handleDownload = async () => {
    try {
      // Fetch the image as a blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Create a download link
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download image:", error);
    }
  };

  if (!isOpen) return null;

  return (
    typeof window !== "undefined" &&
    createPortal(
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300"
        onClick={onClose}
        style={{ pointerEvents: "auto" }}
      >
        <div
          className="bg-background rounded-lg w-[1200px] max-w-[95vw] h-[80vh] flex overflow-hidden relative animate-in zoom-in-95 duration-300 ease-out"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-0 right-1 text-muted-foreground hover:text-red-800 w-8 h-8 p-0 z-10"
            onClick={onClose}
          >
            ✕
          </Button>

          {/* Image Content - 70% */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {/* Loading state */}
            {isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
                  <p className="text-sm text-muted-foreground">
                    Loading image...
                  </p>
                </div>
              </div>
            )}
            {/* Blurred background image */}
            <div
              className="absolute inset-0 bg-cover bg-center filter blur-xl scale-110 opacity-70"
              style={{
                backgroundImage: `url(${imageUrl})`,
              }}
            />
            {/* Main image */}
            <img
              src={imageUrl}
              alt={filename}
              className="max-w-full max-h-full object-contain relative z-10"
              onLoadStart={() => setIsImageLoading(true)}
              onLoad={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
            />
          </div>

          {/* Image Information - 30% */}
          <div className="w-[400px] p-6 overflow-y-auto overflow-x-hidden border-l">
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {filename}
                </h2>
                <p className="text-sm text-muted-foreground">Image Preview</p>
              </div>

              {/* Image Details */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-foreground">
                    File Name:
                  </span>
                  <span className="text-sm text-muted-foreground font-mono break-all ml-2">
                    {filename}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Type:
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {mimeType}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-muted-foreground mb-3">
                  💡 Right-click the image and select "Save As" to download to
                  your device.
                </p>
                <div className="space-y-2">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => window.open(imageUrl, "_blank")}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Size
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={handleDownload}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download Image
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  );
}
