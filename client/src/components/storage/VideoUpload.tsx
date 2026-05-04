"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Film } from "lucide-react";
import { ImageItem } from "@/types/storage";
import storageService from "@/services/storage-service";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface VideoUploadProps {
  onUploadComplete: (video: ImageItem) => void;
  onClose: () => void;
}

const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB

export default function VideoUpload({
  onUploadComplete,
  onClose,
}: VideoUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [fileInputKey, setFileInputKey] = useState(0);
  const isOpeningRef = useRef(false);

  const filterAndValidate = (files: File[]) => {
    const accepted: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith("video/")) {
        toast({
          title: "Not a video",
          description: `${file.name} is not a video file and was skipped.`,
          variant: "destructive",
          duration: 3000,
        });
        continue;
      }
      if (file.size > MAX_VIDEO_BYTES) {
        toast({
          title: "Video exceeds 25 MB limit",
          description: `${file.name} is ${(file.size / 1024 / 1024).toFixed(
            2
          )} MB and was skipped.`,
          variant: "destructive",
          duration: 4000,
        });
        continue;
      }
      accepted.push(file);
    }
    return accepted;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = filterAndValidate(files);
    setSelectedFiles((prev) => [...prev, ...validFiles]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setIsFilePickerOpen(false);
    setFileInputKey((prev) => prev + 1);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress({});

    if (selectedFiles.length > 1) {
      toast({
        title: `Starting bulk upload (${selectedFiles.length} videos in queue)`,
        description: `Preparing to upload ${selectedFiles.length} videos...`,
        duration: 3000,
      });
    } else {
      toast({
        title: "Starting upload",
        description: `Preparing to upload ${selectedFiles[0].name}...`,
        duration: 2000,
      });
    }

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileId = `${file.name}-${i}`;

        const toastRef = toast({
          title: `Uploading ${file.name} (${i + 1} of ${selectedFiles.length})`,
          description: (
            <div className="space-y-2">
              <div className="text-sm text-grey">Starting upload...</div>
              <Progress value={0} className="h-2" />
            </div>
          ),
          duration: Infinity,
          className: "upload-toast",
        });

        for (let progress = 0; progress <= 100; progress += 10) {
          setUploadProgress((prev) => ({ ...prev, [fileId]: progress }));

          toastRef.update({
            id: toastRef.id,
            title: `Uploading ${file.name} (${i + 1} of ${
              selectedFiles.length
            })`,
            description: (
              <div className="space-y-2">
                <div className="text-sm text-grey">{progress}% complete</div>
                <Progress value={progress} className="h-2" />
              </div>
            ),
          });

          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        const uploadedVideo = await storageService.uploadVideo(file);

        toastRef.update({
          id: toastRef.id,
          title: `${file.name} uploaded successfully!`,
          description: "Video has been added to your library",
          duration: 3000,
        });

        onUploadComplete(uploadedVideo);
      }

      setSelectedFiles([]);
      setUploadProgress({});

      if (selectedFiles.length > 1) {
        toast({
          title: "Bulk upload completed!",
          description: `Successfully uploaded ${selectedFiles.length} videos`,
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Upload failed:", error);

      toast({
        title: "Upload failed",
        description:
          "There was an error uploading your videos. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setUploading(false);
    }
  };

  const openFileDialog = () => {
    if (isOpeningRef.current || uploading) return;

    isOpeningRef.current = true;
    setIsFilePickerOpen(true);
    fileInputRef.current?.click();
    setTimeout(() => {
      isOpeningRef.current = false;
    }, 500);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border border-royal-purple/20 shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-creative-midnight">
            Upload Videos
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-royal-purple hover:text-royal-purple hover:bg-royal-purple/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
          key={`file-input-${fileInputKey}`}
        />

        <div
          className="border-2 border-dashed border-royal-purple/30 rounded-lg p-8 text-center hover:border-royal-purple/50 transition-colors cursor-pointer bg-light-grey/30"
          onClick={openFileDialog}
        >
          <Upload className="mx-auto h-12 w-12 text-royal-purple mb-4" />
          <h4 className="text-lg font-medium text-creative-midnight mb-2">
            Drop videos here or click to browse
          </h4>
          <p className="text-grey mb-4">
            Support for MP4, MOV, WEBM, AVI up to 25MB each
          </p>
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              openFileDialog();
            }}
            className="border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
          >
            Choose Files
          </Button>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-creative-midnight mb-3">
              Selected Files ({selectedFiles.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 p-3 bg-light-grey/30 rounded-lg border border-royal-purple/20"
                >
                  <Film className="h-8 w-8 text-royal-purple flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-creative-midnight truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-grey">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadProgress[`${file.name}-${index}`] !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-light-grey rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                uploadProgress[`${file.name}-${index}`]
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-grey">
                          {uploadProgress[`${file.name}-${index}`]}%
                        </span>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-crimson-red hover:text-crimson-red hover:bg-crimson-red/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedFiles([]);
                setIsFilePickerOpen(false);
              }}
              className="border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
            >
              Clear All
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {selectedFiles.length} Video
                  {selectedFiles.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
