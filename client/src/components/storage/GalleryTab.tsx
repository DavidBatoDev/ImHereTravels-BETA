"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Search,
  Grid3X3,
  List,
  Filter,
  Image as ImageIcon,
  Trash2,
  Eye,
  MoreHorizontal,
  CheckSquare,
  Square,
  Copy,
  Edit3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImageItem } from "@/types/storage";
import storageService from "@/services/storage-service";
import FileUpload from "./FileUpload";

export default function GalleryTab() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"large" | "small" | "list">("large");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [filteredImages, setFilteredImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedImageForModal, setSelectedImageForModal] =
    useState<ImageItem | null>(null);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("uploadedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Utility function to truncate filename while preserving extension
  const truncateFileName = (fileName: string, maxLength: number = 30) => {
    if (fileName.length <= maxLength) return fileName;

    const lastDotIndex = fileName.lastIndexOf(".");
    if (lastDotIndex === -1) {
      // No extension, just truncate
      return fileName.substring(0, maxLength - 3) + "...";
    }

    const name = fileName.substring(0, lastDotIndex);
    const extension = fileName.substring(lastDotIndex);

    const maxNameLength = maxLength - extension.length - 3; // 3 for '...'
    if (maxNameLength <= 0) {
      // Extension is too long, show as much as possible
      return fileName.substring(0, maxLength - 3) + "...";
    }

    return name.substring(0, maxNameLength) + "..." + extension;
  };

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      const loadedImages = await storageService.getImages();

      // Set all images to loading state initially
      setLoadingImages(new Set(loadedImages.map((img) => img.id)));
      setImages(loadedImages);
    } catch (error) {
      console.error("Failed to load images:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting whenever images or filters change
  useEffect(() => {
    if (images.length > 0) {
      applyFiltersAndSort();
    }
  }, [
    images,
    searchQuery,
    fileTypeFilter,
    sizeFilter,
    dateFilter,
    tagFilter,
    sortBy,
    sortOrder,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowFilters(!showFilters);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector(
          'input[placeholder="Search images..."]'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showFilters]);

  const applyFiltersAndSort = () => {
    let filtered = [...images];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (image) =>
          image.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          image.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    // Apply file type filter
    if (fileTypeFilter !== "all") {
      filtered = filtered.filter((image) => {
        const extension = image.name.split(".").pop()?.toLowerCase();
        switch (fileTypeFilter) {
          case "images":
            return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(
              extension || ""
            );
          case "documents":
            return ["pdf", "doc", "docx", "txt"].includes(extension || "");
          case "videos":
            return ["mp4", "avi", "mov", "wmv"].includes(extension || "");
          default:
            return true;
        }
      });
    }

    // Apply size filter
    if (sizeFilter !== "all") {
      filtered = filtered.filter((image) => {
        const sizeInMB = parseFloat(image.size.replace(/[^\d.]/g, ""));
        switch (sizeFilter) {
          case "small":
            return sizeInMB < 1;
          case "medium":
            return sizeInMB >= 1 && sizeInMB < 10;
          case "large":
            return sizeInMB >= 10;
          default:
            return true;
        }
      });
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const oneDay = 24 * 60 * 60 * 1000;
      const oneWeek = 7 * oneDay;
      const oneMonth = 30 * oneDay;

      filtered = filtered.filter((image) => {
        const uploadDate = new Date(image.uploadedAt);
        switch (dateFilter) {
          case "today":
            return now.getTime() - uploadDate.getTime() < oneDay;
          case "week":
            return now.getTime() - uploadDate.getTime() < oneWeek;
          case "month":
            return now.getTime() - uploadDate.getTime() < oneMonth;
          default:
            return true;
        }
      });
    }

    // Apply tag filter
    if (tagFilter !== "all") {
      filtered = filtered.filter((image) => image.tags.includes(tagFilter));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "size":
          aValue = parseFloat(a.size.replace(/[^\d.]/g, ""));
          bValue = parseFloat(b.size.replace(/[^\d.]/g, ""));
          break;
        case "uploadedAt":
          aValue = new Date(a.uploadedAt);
          bValue = new Date(b.uploadedAt);
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredImages(filtered);
  };

  const handleImageSelect = (imageId: string) => {
    if (selectMode) {
      // Selection mode - toggle image selection
      setSelectedImages((prev) =>
        prev.includes(imageId)
          ? prev.filter((id) => id !== imageId)
          : [...prev, imageId]
      );
    } else {
      // Preview mode - show image modal
      const image = filteredImages.find((img) => img.id === imageId);
      if (image) {
        setSelectedImageForModal(image);
      }
    }
  };

  const [deletingImages, setDeletingImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [renamingImage, setRenamingImage] = useState<string | null>(null);
  const [newImageName, setNewImageName] = useState("");
  const [renamingProgress, setRenamingProgress] = useState<
    Record<string, boolean>
  >({});

  const handleDeleteImage = async (imageId: string) => {
    try {
      setDeletingImages((prev) => new Set(prev).add(imageId));
      const success = await storageService.deleteImage(imageId);
      if (success) {
        // Remove from images list immediately
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        // Close modal if this image was being viewed
        if (selectedImageForModal?.id === imageId) {
          setSelectedImageForModal(null);
        }
        // Remove from selected images if in select mode
        setSelectedImages((prev) => prev.filter((id) => id !== imageId));
        // Show success feedback (you can add toast here if you have a toast system)
        console.log("Image deleted successfully");
      }
    } catch (error) {
      console.error("Failed to delete image:", error);
      // Show error feedback
    } finally {
      setDeletingImages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      setDeletingImages((prev) => new Set([...prev, ...selectedImages]));
      const success = await storageService.bulkDeleteImages(selectedImages);
      if (success) {
        // Remove deleted images from the list immediately
        setImages((prev) =>
          prev.filter((img) => !selectedImages.includes(img.id))
        );
        setSelectedImages([]);
        // Show success feedback
        console.log("Images deleted successfully");
      }
    } catch (error) {
      console.error("Failed to delete images:", error);
      // Show error feedback
    } finally {
      setDeletingImages((prev) => {
        const newSet = new Set(prev);
        selectedImages.forEach((id) => newSet.delete(id));
        return newSet;
      });
    }
  };

  const handleUpload = () => {
    setShowUploadModal(true);
  };

  const handleImageLoad = (imageId: string) => {
    setLoadingImages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
  };

  const handleImageError = (imageId: string) => {
    setLoadingImages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
    console.error(`Failed to load image: ${imageId}`);
  };

  const handleUploadComplete = async (image: ImageItem) => {
    // Add the new image to the list and set it to loading state
    setImages((prev) => [image, ...prev]);
    setLoadingImages((prev) => new Set(prev).add(image.id));
    setShowUploadModal(false);
  };

  const handleChangeImageName = async (imageId: string, newName: string) => {
    try {
      const image = images.find((img) => img.id === imageId);
      if (!image) return;

      // Set renaming progress
      setRenamingProgress((prev) => ({ ...prev, [imageId]: true }));

      // Call the storage service to update the image display name
      const updatedImage = await storageService.renameImage(imageId, newName);

      console.log("Updated image from service:", updatedImage);
      console.log("Current images state:", images);

      if (updatedImage) {
        // Update the image name in the local state
        setImages((prev) => {
          const newImages = prev.map((img) =>
            img.id === imageId ? updatedImage : img
          );
          console.log("New images state:", newImages);
          return newImages;
        });

        // Update the modal if it's open
        if (selectedImageForModal?.id === imageId) {
          console.log("Updating modal with:", updatedImage);
          setSelectedImageForModal(updatedImage);
        }

        // Show success feedback
        toast({
          title: "Image name updated successfully!",
          description: `Display name changed to "${newName}"`,
          duration: 2000,
        });

        // Reset rename state
        setRenamingImage(null);
        setNewImageName("");
      } else {
        throw new Error("Failed to rename image");
      }
    } catch (error) {
      console.error("Failed to rename image:", error);

      // Show error feedback
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to rename image. Please try again.";
      toast({
        title: "Rename failed",
        description: errorMessage,
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      // Clear renaming progress
      setRenamingProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[imageId];
        return newProgress;
      });
    }
  };

  const startRename = (image: ImageItem) => {
    setRenamingImage(image.id);
    // Extract name without extension for editing
    const lastDotIndex = image.name.lastIndexOf(".");
    const nameWithoutExtension =
      lastDotIndex !== -1 ? image.name.substring(0, lastDotIndex) : image.name;
    setNewImageName(nameWithoutExtension);
  };

  const cancelRename = () => {
    setRenamingImage(null);
    setNewImageName("");
  };

  // Get unique tags from all images
  const getUniqueTags = () => {
    const allTags = images.flatMap((img) => img.tags);
    return [...new Set(allTags)].sort();
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setFileTypeFilter("all");
    setSizeFilter("all");
    setDateFilter("all");
    setTagFilter("all");
    setSortBy("uploadedAt");
    setSortOrder("desc");
  };

  // Get count of active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (fileTypeFilter !== "all") count++;
    if (sizeFilter !== "all") count++;
    if (dateFilter !== "all") count++;
    if (tagFilter !== "all") count++;
    return count;
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));

      if (imageFiles.length > 0) {
        try {
          for (const file of imageFiles) {
            const uploadedImage = await storageService.uploadImage(file);
            console.log("Uploaded:", uploadedImage.name);
            // Add the new image to the list and set it to loading state
            setImages((prev) => [uploadedImage, ...prev]);
            setLoadingImages((prev) => new Set(prev).add(uploadedImage.id));
          }
        } catch (error) {
          console.error("Failed to upload dropped files:", error);
        }
      }
    },
    [loadImages]
  );

  return (
    <div
      className={`space-y-6 min-h-screen transition-all duration-200 ${
        isDragOver ? "bg-royal-purple/10" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200"
          >
            <Upload className="h-4 w-4" />
            Upload Images
          </Button>
          <button
            onClick={() => setSelectMode(!selectMode)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
          >
            {selectMode ? (
              <>
                <div className="text-secondary flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                </div>
                Select Mode
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Square className="h-4 w-4" />
                </div>
                Select Mode
              </>
            )}
          </button>
          {selectedImages.length > 0 && selectMode && (
            <button
              onClick={handleBulkDelete}
              disabled={selectedImages.some((id) => deletingImages.has(id))}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-crimson-red/20 text-crimson-red hover:bg-crimson-red/10 hover:border-crimson-red transition-all duration-200"
            >
              {selectedImages.some((id) => deletingImages.has(id)) ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <div className="text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  ({selectedImages.length})
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-royal-purple/60" />
            <Input
              placeholder="Search images... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 border-royal-purple/20 dark:border-border focus:border-royal-purple focus:ring-royal-purple/20"
              title="Search images (Ctrl+K)"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            title="Toggle filters (Ctrl+F)"
            className={
              showFilters
                ? "bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25"
                : "border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple"
            }
          >
            <Filter className="h-4 w-4" />
            {getActiveFilterCount() > 0 && (
              <span className="ml-2 text-xs bg-royal-purple/20 text-royal-purple px-1.5 py-0.5 rounded-full border border-royal-purple/30">
                {getActiveFilterCount()}
              </span>
            )}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              View:
            </span>
            <div className="flex border border-royal-purple/20 dark:border-border rounded-md bg-background shadow-sm">
              <Button
                variant={viewMode === "large" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("large")}
                className={`rounded-r-none border-r border-royal-purple/20 dark:border-border transition-colors ${
                  viewMode === "large"
                    ? "bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25"
                    : "hover:bg-royal-purple/10"
                }`}
                title="Large icons"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "small" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("small")}
                className={`rounded-none border-r border-royal-purple/20 dark:border-border transition-colors ${
                  viewMode === "small"
                    ? "bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25"
                    : "hover:bg-royal-purple/10"
                }`}
                title="Small icons"
              >
                <Grid3X3 className="h-3 w-3" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`rounded-l-none transition-colors ${
                  viewMode === "list"
                    ? "bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25"
                    : "hover:bg-royal-purple/10"
                }`}
                title="List"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <div className="bg-muted/50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">
              Filters & Sorting
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* File Type Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                File Type
              </label>
              <select
                value={fileTypeFilter}
                onChange={(e) => setFileTypeFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="images">Images (JPG, PNG, GIF, WebP)</option>
                <option value="documents">Documents (PDF, DOC, TXT)</option>
                <option value="videos">Videos (MP4, AVI, MOV)</option>
              </select>
            </div>

            {/* Size Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                File Size
              </label>
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Sizes</option>
                <option value="small">Small (&lt; 1 MB)</option>
                <option value="medium">Medium (1-10 MB)</option>
                <option value="large">Large (&gt; 10 MB)</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Upload Date
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Tag Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Tags
              </label>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Tags</option>
                {getUniqueTags().map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sorting Controls */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="uploadedAt">Upload Date</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Order:
              </label>
              <div className="flex border rounded-md bg-background shadow-sm">
                <Button
                  variant={sortOrder === "asc" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSortOrder("asc")}
                  className="rounded-r-none border-r border-gray-200 hover:bg-muted/50 transition-colors"
                  title="Ascending"
                >
                  ↑
                </Button>
                <Button
                  variant={sortOrder === "desc" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSortOrder("desc")}
                  className="rounded-l-none hover:bg-muted/50 transition-colors"
                  title="Descending"
                >
                  ↓
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filter Tags */}
          {getActiveFilterCount() > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {fileTypeFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Type: {fileTypeFilter}
                  <button
                    onClick={() => setFileTypeFilter("all")}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {sizeFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Size: {sizeFilter}
                  <button
                    onClick={() => setSizeFilter("all")}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {dateFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Date: {dateFilter}
                  <button
                    onClick={() => setDateFilter("all")}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {tagFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Tag: {tagFilter}
                  <button
                    onClick={() => setTagFilter("all")}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results Counter */}
      {!loading && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredImages.length} of {images.length} images
            {searchQuery && (
              <span className="ml-2 text-royal-purple">
                for "{searchQuery}"
              </span>
            )}
            {getActiveFilterCount() > 0 && (
              <span className="ml-2 text-muted-foreground">
                • {getActiveFilterCount()} filter
                {getActiveFilterCount() !== 1 ? "s" : ""} active
              </span>
            )}
          </div>
          {filteredImages.length !== images.length && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-royal-purple hover:text-royal-purple hover:bg-royal-purple/10"
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Images Grid/List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading images...</p>
        </div>
      ) : viewMode === "large" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {filteredImages.map((image) => (
            <Card
              key={image.id}
              className={`relative group cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 ${
                selectMode && selectedImages.includes(image.id)
                  ? "ring-2 ring-primary"
                  : ""
              } ${
                deletingImages.has(image.id)
                  ? "opacity-50 pointer-events-none"
                  : ""
              }`}
              onClick={() => handleImageSelect(image.id)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  {/* Loading placeholder */}
                  {loadingImages.has(image.id) && (
                    <div className="absolute inset-0 bg-gray-100 rounded overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse">
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <div className="text-muted-foreground text-xs">
                              Loading...
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Image */}
                  <img
                    src={image.url}
                    alt={image.name}
                    className={`w-full h-full object-cover rounded transition-opacity duration-300 ${
                      loadingImages.has(image.id) ? "opacity-0" : "opacity-100"
                    }`}
                    onLoad={() => handleImageLoad(image.id)}
                    onError={() => handleImageError(image.id)}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center px-4">
                      <p
                        className="text-sm text-white max-w-[160px] drop-shadow-lg"
                        title={image.name}
                      >
                        {truncateFileName(image.name, 25)}
                      </p>
                    </div>
                  </div>
                  {selectMode && selectedImages.includes(image.id) && (
                    <div className="absolute top-3 right-3 bg-primary text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-medium shadow-lg">
                      ✓
                    </div>
                  )}
                  {deletingImages.has(image.id) && (
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center rounded-t-lg">
                      <div className="bg-background rounded-lg px-3 py-2 shadow-lg">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                          <span className="text-sm font-medium text-foreground">
                            Deleting...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === "small" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {filteredImages.map((image) => (
            <Card
              key={image.id}
              className={`relative group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                selectMode && selectedImages.includes(image.id)
                  ? "ring-2 ring-blue-500"
                  : ""
              } ${
                deletingImages.has(image.id)
                  ? "opacity-50 pointer-events-none"
                  : ""
              }`}
              onClick={() => handleImageSelect(image.id)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  {/* Loading placeholder */}
                  {loadingImages.has(image.id) && (
                    <div className="absolute inset-0 bg-gray-100 rounded-t-lg overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse">
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                            <div className="text-muted-foreground text-xs">
                              Loading...
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Image */}
                  <img
                    src={image.url}
                    alt={image.name}
                    className={`w-full h-full object-cover rounded-t-lg transition-opacity duration-300 ${
                      loadingImages.has(image.id) ? "opacity-0" : "opacity-100"
                    }`}
                    onLoad={() => handleImageLoad(image.id)}
                    onError={() => handleImageError(image.id)}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all"></div>
                  {selectMode && selectedImages.includes(image.id) && (
                    <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs shadow-md">
                      ✓
                    </div>
                  )}
                  {deletingImages.has(image.id) && (
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center rounded-t-lg">
                      <div className="bg-background rounded-lg px-2 py-1 shadow-lg">
                        <div className="flex items-center gap-1">
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                          <span className="text-xs font-medium text-foreground">
                            Deleting...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p
                    className="text-xs font-medium text-foreground mb-1 text-center"
                    title={image.name}
                  >
                    {truncateFileName(image.name, 15)}
                  </p>
                  <p className="text-xs text-muted-foreground mb-1 text-center">
                    {image.size}
                  </p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {image.tags.slice(0, 1).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs px-1 py-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {image.tags.length > 1 && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        +{image.tags.length - 1}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredImages.map((image) => (
            <Card
              key={image.id}
              className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                selectMode && selectedImages.includes(image.id)
                  ? "bg-blue-50 ring-1 ring-blue-200"
                  : ""
              } ${
                deletingImages.has(image.id)
                  ? "opacity-50 pointer-events-none"
                  : ""
              }`}
              onClick={() => handleImageSelect(image.id)}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 relative">
                  {/* Loading placeholder */}
                  {loadingImages.has(image.id) && (
                    <div className="absolute inset-0 bg-gray-100 rounded-lg overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse">
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                            <div className="text-muted-foreground text-xs">
                              Loading...
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Image */}
                  <img
                    src={image.url}
                    alt={image.name}
                    className={`w-16 h-16 object-cover rounded-lg transition-opacity duration-300 ${
                      loadingImages.has(image.id) ? "opacity-0" : "opacity-100"
                    }`}
                    onLoad={() => handleImageLoad(image.id)}
                    onError={() => handleImageError(image.id)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  {renamingImage === image.id ? (
                    <div className="space-y-2">
                      <Input
                        value={newImageName}
                        onChange={(e) => setNewImageName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleChangeImageName(image.id, newImageName);
                          } else if (e.key === "Escape") {
                            cancelRename();
                          }
                        }}
                        className="text-sm"
                        autoFocus
                      />
                      {/* Show what the final name will be */}
                      {(() => {
                        const lastDotIndex = image.name.lastIndexOf(".");
                        const extension =
                          lastDotIndex !== -1
                            ? image.name.substring(lastDotIndex)
                            : "";
                        return (
                          <p className="text-xs text-gray-400">
                            Final: {newImageName}
                            {extension}
                          </p>
                        );
                      })()}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleChangeImageName(image.id, newImageName)
                          }
                          disabled={
                            !newImageName.trim() ||
                            newImageName === image.name ||
                            renamingProgress[image.id]
                          }
                          className="h-6 px-2 text-xs"
                        >
                          {renamingProgress[image.id] ? (
                            <>
                              <div className="mr-1 h-2 w-2 animate-spin rounded-full border border-white border-t-transparent"></div>
                              Saving...
                            </>
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelRename}
                          className="h-6 px-2 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground truncate">
                        {image.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {image.size} • {image.type} • {image.uploadedAt}
                      </p>
                    </>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {image.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => startRename(image)}>
                        <Edit3 className="mr-2 h-4 w-4" />
                        Change Name
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteImage(image.id)}
                        disabled={deletingImages.has(image.id)}
                      >
                        {deletingImages.has(image.id) ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredImages.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="mx-auto h-12 w-12 text-royal-purple mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {images.length === 0
              ? "No images uploaded yet"
              : "No images match your filters"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {images.length === 0
              ? "Start building your image collection by uploading some photos"
              : "Try adjusting your search or filters to see more results"}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {images.length === 0 ? (
              <>
                <Button
                  onClick={handleUpload}
                  className="bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200"
                >
                  Upload Your First Image
                </Button>
                <span className="text-sm text-muted-foreground">
                  or drag and drop images here
                </span>
              </>
            ) : (
              <>
                <Button
                  onClick={clearAllFilters}
                  variant="outline"
                  className="border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
                >
                  Clear All Filters
                </Button>
                <span className="text-sm text-muted-foreground">
                  or adjust your search criteria
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImageForModal && (
        <div
          className="overlay-bg-storage fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 m-0 animate-in fade-in duration-300"
          onClick={() => setSelectedImageForModal(null)}
        >
          <div
            className="bg-background rounded-lg w-[1200px] max-w-[95vw] h-[80vh] flex overflow-hidden relative animate-in zoom-in-95 duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - positioned on the right upper side of the modal */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-0 right-1 text-muted-foreground hover:text-red-800 w-8 h-8 p-0 z-10"
              onClick={() => setSelectedImageForModal(null)}
            >
              ✕
            </Button>

            {/* Image Content - 70% */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
              {/* Blurred background image */}
              <div
                className="absolute inset-0 bg-cover bg-center filter blur-xl scale-110 opacity-70"
                style={{
                  backgroundImage: `url(${selectedImageForModal.url})`,
                }}
              />
              {/* Main image */}
              <img
                src={selectedImageForModal.url}
                alt={selectedImageForModal.name}
                className="max-w-full max-h-full object-contain relative z-10"
              />
            </div>

            {/* Image Information - 30% */}
            <div className="w-[400px] p-6 overflow-y-auto overflow-x-hidden">
              <div className="space-y-6">
                {/* Header */}
                <div>
                  {renamingImage === selectedImageForModal.id ? (
                    <div className="space-y-2">
                      <Input
                        value={newImageName}
                        onChange={(e) => setNewImageName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleChangeImageName(
                              selectedImageForModal.id,
                              newImageName
                            );
                          } else if (e.key === "Escape") {
                            cancelRename();
                          }
                        }}
                        className="text-lg font-semibold"
                        autoFocus
                      />
                      {/* Show what the final name will be */}
                      {(() => {
                        const lastDotIndex =
                          selectedImageForModal.name.lastIndexOf(".");
                        const extension =
                          lastDotIndex !== -1
                            ? selectedImageForModal.name.substring(lastDotIndex)
                            : "";
                        return (
                          <p className="text-xs text-muted-foreground">
                            Final name: {newImageName}
                            {extension}
                          </p>
                        );
                      })()}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleChangeImageName(
                              selectedImageForModal.id,
                              newImageName
                            )
                          }
                          disabled={
                            !newImageName.trim() ||
                            newImageName === selectedImageForModal.name ||
                            renamingProgress[selectedImageForModal.id]
                          }
                        >
                          {renamingProgress[selectedImageForModal.id] ? (
                            <>
                              <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                              Renaming...
                            </>
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelRename}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <h2
                      className="text-xl font-semibold text-foreground mb-2"
                      title={selectedImageForModal.name}
                    >
                      {truncateFileName(selectedImageForModal.name, 35)}
                    </h2>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Uploaded on {selectedImageForModal.uploadedAt}
                  </p>
                </div>

                {/* Image Details */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Original Name:
                    </span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {selectedImageForModal.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-foreground">
                      File ID:
                    </span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {selectedImageForModal.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Size:
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {selectedImageForModal.size}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Type:
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {selectedImageForModal.type}
                    </span>
                  </div>
                  {selectedImageForModal.metadata?.width && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-foreground">
                        Dimensions:
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {selectedImageForModal.metadata.width} ×{" "}
                        {selectedImageForModal.metadata.height}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Uploaded By:
                    </span>
                    <span
                      className="text-sm text-muted-foreground font-mono max-w-[200px] truncate"
                      title={selectedImageForModal.uploadedBy || "N/A"}
                    >
                      {selectedImageForModal.uploadedBy || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Last Modified:
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {selectedImageForModal.lastModified
                        ? new Date(
                            selectedImageForModal.lastModified
                          ).toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {selectedImageForModal.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2">
                      Tags:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedImageForModal.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedImageForModal.metadata?.description && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2">
                      Description:
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedImageForModal.metadata.description}
                    </p>
                  </div>
                )}

                {/* Location */}
                {selectedImageForModal.metadata?.location && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2">
                      Location:
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedImageForModal.metadata.location}
                    </p>
                  </div>
                )}

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
                      onClick={() => {
                        if (selectedImageForModal.downloadURL) {
                          window.open(
                            selectedImageForModal.downloadURL,
                            "_blank"
                          );
                        }
                      }}
                      disabled={!selectedImageForModal.downloadURL}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Size
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            selectedImageForModal.downloadURL || ""
                          );
                          toast({
                            title: "Link Copied!",
                            description: "Image link copied to clipboard",
                            duration: 2000,
                          });
                        } catch (error) {
                          console.error("Failed to copy link:", error);
                          // Fallback for older browsers
                          const textArea = document.createElement("textarea");
                          textArea.value =
                            selectedImageForModal.downloadURL || "";
                          document.body.appendChild(textArea);
                          textArea.select();
                          document.execCommand("copy");
                          document.body.removeChild(textArea);

                          toast({
                            title: "Link Copied!",
                            description: "Image link copied to clipboard",
                            duration: 2000,
                          });
                        }
                      }}
                      disabled={!selectedImageForModal.downloadURL}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Image Link
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => startRename(selectedImageForModal)}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Change Display Name
                    </Button>
                    <Button
                      className="w-full justify-start text-red-600 hover:text-red-700"
                      variant="outline"
                      onClick={() =>
                        handleDeleteImage(selectedImageForModal.id)
                      }
                      disabled={deletingImages.has(selectedImageForModal.id)}
                    >
                      {deletingImages.has(selectedImageForModal.id) ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      {isDragOver && (
        <div className="fixed inset-0 bg-royal-purple/10 border-2 border-dashed border-royal-purple/40 flex items-center justify-center z-40 pointer-events-none animate-in fade-in duration-200">
          <div className="bg-background rounded-lg px-6 py-4 shadow-lg animate-in zoom-in-95 duration-200 ease-out border border-royal-purple/20 dark:border-border">
            <div className="flex items-center gap-3">
              <Upload className="h-6 w-6 text-royal-purple" />
              <span className="text-royal-purple font-medium">
                Drop images to upload
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 mt-0 animate-in fade-in duration-300">
          <div className="animate-in zoom-in-95 duration-300 ease-out">
            <FileUpload
              onUploadComplete={handleUploadComplete}
              onClose={() => setShowUploadModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
