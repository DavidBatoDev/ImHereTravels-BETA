"use client";

import { useState, useRef } from "react";
import { Upload, X, FileImage, Loader2 } from "lucide-react";
import { ImageItem } from "@/types/storage";
import storageService from "@/services/storage-service";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onUploadComplete: (image: ImageItem) => void;
  onClose: () => void;
  folder?: string;
}

export default function FileUpload({ onUploadComplete, onClose, folder }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  function addFiles(files: FileList | File[]) {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setSelectedFiles((prev) => [...prev, ...images]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }

  function removeFile(i: number) {
    setSelectedFiles((prev) => prev.filter((_, j) => j !== i));
  }

  async function handleUpload() {
    if (!selectedFiles.length) return;
    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const uploaded = await storageService.uploadImage(file, [], folder);
        onUploadComplete(uploaded);
      }
      toast({ title: `${selectedFiles.length} image${selectedFiles.length > 1 ? "s" : ""} uploaded.` });
      onClose();
    } catch {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-light-grey px-6 py-4">
          <h2 className="text-base font-semibold text-midnight">Upload Images</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-light-grey hover:text-midnight transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors ${
              isDragOver
                ? "border-crimson-red bg-crimson-red/5"
                : "border-light-grey hover:border-crimson-red/40 hover:bg-crimson-red/5"
            }`}
          >
            <Upload className={`size-9 ${isDragOver ? "text-crimson-red" : "text-gray-400"}`} />
            <div className="text-center">
              <p className="text-sm font-medium text-midnight">Drop images here or click to browse</p>
              <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP, GIF — up to 10 MB each</p>
            </div>
          </div>

          {/* Selected files list */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs font-medium text-gray-500">
                {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected
              </p>
              {selectedFiles.map((file, i) => (
                <div key={`${file.name}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-light-grey bg-gray-50 px-3 py-2">
                  <FileImage className="size-5 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-midnight truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-light-grey hover:text-crimson-red transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-light-grey px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-light-grey px-4 py-2 text-sm font-medium text-midnight hover:bg-light-grey transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFiles.length || uploading}
            className="flex items-center gap-2 rounded-lg bg-crimson-red px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {uploading && <Loader2 className="size-4 animate-spin" />}
            {uploading
              ? "Uploading…"
              : `Upload ${selectedFiles.length > 0 ? selectedFiles.length : ""} Image${selectedFiles.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
