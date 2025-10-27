"use client";

import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  filename: string;
}

export function PDFPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  filename,
}: PDFPreviewModalProps) {
  // Download the PDF
  const handleDownload = async () => {
    try {
      // Fetch the PDF as a blob
      const response = await fetch(pdfUrl);
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
      console.error("Failed to download PDF:", error);
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
          className="bg-background rounded-lg w-[95vw] h-[90vh] flex overflow-hidden relative animate-in zoom-in-95 duration-300 ease-out"
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

          {/* PDF Content - full width */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 border-b px-6 py-3 flex items-center justify-between bg-white">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {filename}
                </h2>
                <p className="text-sm text-muted-foreground">PDF Document</p>
              </div>
              <Button variant="outline" onClick={handleDownload}>
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
                Download PDF
              </Button>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 relative overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title={filename}
              />
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  );
}
