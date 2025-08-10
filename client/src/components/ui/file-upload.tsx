import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  X,
  Upload,
  Image,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useFileUpload, type UploadResult } from "@/hooks/use-file-upload";

// ============================================================================
// TYPES
// ============================================================================

export interface FileUploadProps {
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: string) => void;
  multiple?: boolean;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  uploadType?: "cover" | "gallery" | "document";
  tourId?: string;
  documentType?: string;
  className?: string;
  disabled?: boolean;
  showPreview?: boolean;
}

export interface UploadedFile {
  success: boolean;
  data?: {
    path: string;
    fullPath: string;
    publicUrl: string;
  };
  error?: string;
  file?: File;
  preview?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FileUpload({
  onUploadComplete,
  onUploadError,
  multiple = false,
  accept = "image/*",
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  uploadType = "gallery",
  tourId,
  documentType = "general",
  className,
  disabled = false,
  showPreview = true,
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const upload = useFileUpload({
    onSuccess: (result) => {
      if ("successful" in result) {
        // Bulk upload result
        const newFiles = result.successful.map((r) => ({
          ...r,
          file: undefined,
        }));
        setUploadedFiles((prev) => [...prev, ...newFiles]);
        onUploadComplete?.(result.successful);
      } else {
        // Single upload result
        setUploadedFiles((prev) => [...prev, { ...result, file: undefined }]);
        onUploadComplete?.([result]);
      }
    },
    onError: (error) => {
      onUploadError?.(error);
    },
  });

  // ============================================================================
  // FILE HANDLING
  // ============================================================================

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!tourId && (uploadType === "cover" || uploadType === "gallery")) {
        onUploadError?.("Tour ID is required for cover and gallery uploads");
        return;
      }

      // Create previews for images
      if (showPreview) {
        const newPreviews = files
          .filter((file) => file.type.startsWith("image/"))
          .map((file) => URL.createObjectURL(file));
        setPreviews((prev) => [...prev, ...newPreviews]);
      }

      try {
        if (uploadType === "cover" && tourId) {
          if (files.length > 0) {
            await upload.uploadTourCover(files[0], tourId);
          }
        } else if (uploadType === "gallery" && tourId) {
          await upload.uploadTourGallery(files, tourId);
        } else if (uploadType === "document" && tourId) {
          if (files.length > 0) {
            await upload.uploadDocument(files[0], tourId, documentType);
          }
        } else {
          // General upload
          if (multiple) {
            await upload.uploadMultiple(files);
          } else if (files.length > 0) {
            await upload.uploadSingleFile(files[0]);
          }
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    },
    [
      tourId,
      uploadType,
      documentType,
      multiple,
      showPreview,
      upload,
      onUploadError,
    ]
  );

  const removeFile = useCallback(
    (index: number) => {
      const fileToRemove = uploadedFiles[index];
      if (fileToRemove?.data?.path) {
        upload.removeFile(fileToRemove.data.path);
      }

      setUploadedFiles((prev) => prev.filter((_, i) => i !== index));

      // Clean up preview URL
      if (previews[index]) {
        URL.revokeObjectURL(previews[index]);
        setPreviews((prev) => prev.filter((_, i) => i !== index));
      }
    },
    [uploadedFiles, previews, upload]
  );

  // ============================================================================
  // DROPZONE SETUP
  // ============================================================================

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections,
  } = useDropzone({
    onDrop: handleUpload,
    accept:
      accept === "image/*"
        ? { "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif"] }
        : accept === "document/*"
        ? {
            "application/pdf": [".pdf"],
            "application/msword": [".doc"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
              [".docx"],
            "text/plain": [".txt"],
          }
        : undefined,
    maxSize,
    maxFiles: multiple ? maxFiles : 1,
    multiple,
    disabled: disabled || upload.isUploading,
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <Image className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const getUploadText = () => {
    switch (uploadType) {
      case "cover":
        return "Drop tour cover image here, or click to select";
      case "gallery":
        return "Drop gallery images here, or click to select multiple";
      case "document":
        return "Drop document here, or click to select";
      default:
        return multiple
          ? "Drop files here, or click to select multiple"
          : "Drop file here, or click to select";
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragActive && !isDragReject && "border-blue-500 bg-blue-50",
          isDragReject && "border-red-500 bg-red-50",
          disabled && "opacity-50 cursor-not-allowed",
          upload.isUploading && "pointer-events-none"
        )}
      >
        <CardContent
          {...getRootProps()}
          className="flex flex-col items-center justify-center p-8 text-center"
        >
          <input {...getInputProps()} />

          {upload.isUploading ? (
            <div className="space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Uploading...</p>
                <Progress value={upload.progress} className="w-48" />
                <p className="text-xs text-muted-foreground">
                  {upload.progress}%
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-sm font-medium">{getUploadText()}</p>
                <p className="text-xs text-muted-foreground">
                  Max size: {formatFileSize(maxSize)}
                  {multiple && ` • Max files: ${maxFiles}`}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm">
                Choose Files
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Messages */}
      {upload.hasError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{upload.error}</AlertDescription>
        </Alert>
      )}

      {fileRejections.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {fileRejections.map(({ file, errors }) => (
              <div key={file.name}>
                {file.name}: {errors.map((e) => e.message).join(", ")}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Uploaded Files ({uploadedFiles.length})
          </h4>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <Card key={index}>
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    {showPreview && previews[index] ? (
                      <img
                        src={previews[index]}
                        alt="Preview"
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      getFileIcon(file.file?.type || "unknown")
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.data?.path?.split("/").pop() || "Uploaded file"}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {uploadType}
                        </Badge>
                        {file.data?.publicUrl && (
                          <a
                            href={file.data.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline"
                          >
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Success Message */}
      {upload.isComplete && !upload.hasError && uploadedFiles.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription>
            Successfully uploaded {uploadedFiles.length} file
            {uploadedFiles.length !== 1 ? "s" : ""}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ============================================================================
// SPECIALIZED COMPONENTS
// ============================================================================

export function TourCoverUpload({
  tourId,
  onUploadComplete,
  ...props
}: Omit<FileUploadProps, "uploadType" | "multiple"> & { tourId: string }) {
  return (
    <FileUpload
      {...props}
      tourId={tourId}
      uploadType="cover"
      multiple={false}
      accept="image/*"
      maxFiles={1}
      onUploadComplete={onUploadComplete}
    />
  );
}

export function TourGalleryUpload({
  tourId,
  onUploadComplete,
  ...props
}: Omit<FileUploadProps, "uploadType"> & { tourId: string }) {
  return (
    <FileUpload
      {...props}
      tourId={tourId}
      uploadType="gallery"
      multiple={true}
      accept="image/*"
      maxFiles={10}
      onUploadComplete={onUploadComplete}
    />
  );
}

export function TourDocumentUpload({
  tourId,
  documentType = "general",
  onUploadComplete,
  ...props
}: Omit<FileUploadProps, "uploadType" | "multiple" | "accept"> & {
  tourId: string;
  documentType?: string;
}) {
  return (
    <FileUpload
      {...props}
      tourId={tourId}
      uploadType="document"
      documentType={documentType}
      multiple={false}
      accept="document/*"
      maxFiles={1}
      maxSize={20 * 1024 * 1024} // 20MB
      onUploadComplete={onUploadComplete}
    />
  );
}
