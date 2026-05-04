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
  Film,
  Trash2,
  Eye,
  MoreHorizontal,
  CheckSquare,
  Square,
  Copy,
  Edit3,
  Play,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImageItem } from "@/types/storage";
import storageService from "@/services/storage-service";
import VideoUpload from "./VideoUpload";

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export default function VideosTab() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"large" | "small" | "list">("large");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [videos, setVideos] = useState<ImageItem[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedVideoForModal, setSelectedVideoForModal] =
    useState<ImageItem | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("uploadedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const truncateFileName = (fileName: string, maxLength: number = 30) => {
    if (fileName.length <= maxLength) return fileName;

    const lastDotIndex = fileName.lastIndexOf(".");
    if (lastDotIndex === -1) {
      return fileName.substring(0, maxLength - 3) + "...";
    }

    const name = fileName.substring(0, lastDotIndex);
    const extension = fileName.substring(lastDotIndex);

    const maxNameLength = maxLength - extension.length - 3;
    if (maxNameLength <= 0) {
      return fileName.substring(0, maxLength - 3) + "...";
    }

    return name.substring(0, maxNameLength) + "..." + extension;
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const loaded = await storageService.getVideos();
      setLoadingVideos(new Set(loaded.map((v) => v.id)));
      setVideos(loaded);
    } catch (error) {
      console.error("Failed to load videos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (videos.length > 0) {
      applyFiltersAndSort();
    } else {
      setFilteredVideos([]);
    }
  }, [
    videos,
    searchQuery,
    fileTypeFilter,
    sizeFilter,
    dateFilter,
    tagFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowFilters(!showFilters);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector(
          'input[placeholder="Search videos..."]'
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
    let filtered = [...videos];

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (video) =>
          video.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    if (fileTypeFilter !== "all") {
      filtered = filtered.filter((video) => {
        const extension = video.name.split(".").pop()?.toLowerCase();
        switch (fileTypeFilter) {
          case "mp4":
            return extension === "mp4";
          case "mov":
            return extension === "mov";
          case "webm":
            return extension === "webm";
          case "avi":
            return extension === "avi";
          default:
            return true;
        }
      });
    }

    if (sizeFilter !== "all") {
      filtered = filtered.filter((video) => {
        const sizeInMB = parseFloat(video.size.replace(/[^\d.]/g, ""));
        switch (sizeFilter) {
          case "small":
            return sizeInMB < 5;
          case "medium":
            return sizeInMB >= 5 && sizeInMB < 15;
          case "large":
            return sizeInMB >= 15;
          default:
            return true;
        }
      });
    }

    if (dateFilter !== "all") {
      const now = new Date();
      const oneDay = 24 * 60 * 60 * 1000;
      const oneWeek = 7 * oneDay;
      const oneMonth = 30 * oneDay;

      filtered = filtered.filter((video) => {
        const uploadDate = new Date(video.uploadedAt);
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

    if (tagFilter !== "all") {
      filtered = filtered.filter((video) => video.tags.includes(tagFilter));
    }

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

    setFilteredVideos(filtered);
  };

  const handleVideoSelect = (videoId: string) => {
    if (selectMode) {
      setSelectedVideos((prev) =>
        prev.includes(videoId)
          ? prev.filter((id) => id !== videoId)
          : [...prev, videoId]
      );
    } else {
      const video = filteredVideos.find((v) => v.id === videoId);
      if (video) {
        setSelectedVideoForModal(video);
      }
    }
  };

  const [deletingVideos, setDeletingVideos] = useState<Set<string>>(new Set());
  const [loadingVideos, setLoadingVideos] = useState<Set<string>>(new Set());
  const [renamingVideo, setRenamingVideo] = useState<string | null>(null);
  const [newVideoName, setNewVideoName] = useState("");
  const [renamingProgress, setRenamingProgress] = useState<
    Record<string, boolean>
  >({});

  const handleDeleteVideo = async (videoId: string) => {
    try {
      setDeletingVideos((prev) => new Set(prev).add(videoId));
      const success = await storageService.deleteImage(videoId);
      if (success) {
        setVideos((prev) => prev.filter((v) => v.id !== videoId));
        if (selectedVideoForModal?.id === videoId) {
          setSelectedVideoForModal(null);
        }
        setSelectedVideos((prev) => prev.filter((id) => id !== videoId));
      }
    } catch (error) {
      console.error("Failed to delete video:", error);
    } finally {
      setDeletingVideos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      setDeletingVideos((prev) => new Set([...prev, ...selectedVideos]));
      const success = await storageService.bulkDeleteImages(selectedVideos);
      if (success) {
        setVideos((prev) =>
          prev.filter((v) => !selectedVideos.includes(v.id))
        );
        setSelectedVideos([]);
      }
    } catch (error) {
      console.error("Failed to delete videos:", error);
    } finally {
      setDeletingVideos((prev) => {
        const newSet = new Set(prev);
        selectedVideos.forEach((id) => newSet.delete(id));
        return newSet;
      });
    }
  };

  const handleUpload = () => {
    setShowUploadModal(true);
  };

  const handleVideoLoad = (videoId: string) => {
    setLoadingVideos((prev) => {
      const newSet = new Set(prev);
      newSet.delete(videoId);
      return newSet;
    });
  };

  const handleVideoError = (videoId: string) => {
    setLoadingVideos((prev) => {
      const newSet = new Set(prev);
      newSet.delete(videoId);
      return newSet;
    });
    console.error(`Failed to load video: ${videoId}`);
  };

  const handleUploadComplete = async (video: ImageItem) => {
    setVideos((prev) => [video, ...prev]);
    setLoadingVideos((prev) => new Set(prev).add(video.id));
    setShowUploadModal(false);
  };

  const handleChangeVideoName = async (videoId: string, newName: string) => {
    try {
      const video = videos.find((v) => v.id === videoId);
      if (!video) return;

      setRenamingProgress((prev) => ({ ...prev, [videoId]: true }));

      const updatedVideo = await storageService.renameImage(videoId, newName);

      if (updatedVideo) {
        setVideos((prev) =>
          prev.map((v) => (v.id === videoId ? updatedVideo : v))
        );

        if (selectedVideoForModal?.id === videoId) {
          setSelectedVideoForModal(updatedVideo);
        }

        toast({
          title: "Video name updated successfully!",
          description: `Display name changed to "${newName}"`,
          duration: 2000,
        });

        setRenamingVideo(null);
        setNewVideoName("");
      } else {
        throw new Error("Failed to rename video");
      }
    } catch (error) {
      console.error("Failed to rename video:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to rename video. Please try again.";
      toast({
        title: "Rename failed",
        description: errorMessage,
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setRenamingProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[videoId];
        return newProgress;
      });
    }
  };

  const startRename = (video: ImageItem) => {
    setRenamingVideo(video.id);
    const lastDotIndex = video.name.lastIndexOf(".");
    const nameWithoutExtension =
      lastDotIndex !== -1 ? video.name.substring(0, lastDotIndex) : video.name;
    setNewVideoName(nameWithoutExtension);
  };

  const cancelRename = () => {
    setRenamingVideo(null);
    setNewVideoName("");
  };

  const getUniqueTags = () => {
    const allTags = videos.flatMap((v) => v.tags);
    return [...new Set(allTags)].sort();
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFileTypeFilter("all");
    setSizeFilter("all");
    setDateFilter("all");
    setTagFilter("all");
    setSortBy("uploadedAt");
    setSortOrder("desc");
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (fileTypeFilter !== "all") count++;
    if (sizeFilter !== "all") count++;
    if (dateFilter !== "all") count++;
    if (tagFilter !== "all") count++;
    return count;
  };

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
      const videoFiles = files.filter((file) => file.type.startsWith("video/"));

      if (videoFiles.length === 0) return;

      try {
        for (const file of videoFiles) {
          if (file.size > MAX_VIDEO_BYTES) {
            toast({
              title: "Video exceeds 25 MB limit",
              description: `${file.name} is ${(
                file.size /
                1024 /
                1024
              ).toFixed(2)} MB and was skipped.`,
              variant: "destructive",
              duration: 4000,
            });
            continue;
          }
          const uploadedVideo = await storageService.uploadVideo(file);
          setVideos((prev) => [uploadedVideo, ...prev]);
          setLoadingVideos((prev) => new Set(prev).add(uploadedVideo.id));
        }
      } catch (error) {
        console.error("Failed to upload dropped files:", error);
      }
    },
    [toast]
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
            Upload Videos
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
          {selectedVideos.length > 0 && selectMode && (
            <button
              onClick={handleBulkDelete}
              disabled={selectedVideos.some((id) => deletingVideos.has(id))}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-crimson-red/20 text-crimson-red hover:bg-crimson-red/10 hover:border-crimson-red transition-all duration-200"
            >
              {selectedVideos.some((id) => deletingVideos.has(id)) ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <div className="text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  ({selectedVideos.length})
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-royal-purple/60" />
            <Input
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 border-royal-purple/20 dark:border-border focus:border-royal-purple focus:ring-royal-purple/20"
              title="Search videos (Ctrl+K)"
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
                <option value="mp4">MP4</option>
                <option value="mov">MOV</option>
                <option value="webm">WEBM</option>
                <option value="avi">AVI</option>
              </select>
            </div>

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
                <option value="small">Small (&lt; 5 MB)</option>
                <option value="medium">Medium (5-15 MB)</option>
                <option value="large">Large (&gt; 15 MB)</option>
              </select>
            </div>

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
            Showing {filteredVideos.length} of {videos.length} videos
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
          {filteredVideos.length !== videos.length && (
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

      {/* Videos Grid/List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading videos...</p>
        </div>
      ) : viewMode === "large" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {filteredVideos.map((video) => (
            <Card
              key={video.id}
              className={`relative group cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 ${
                selectMode && selectedVideos.includes(video.id)
                  ? "ring-2 ring-primary"
                  : ""
              } ${
                deletingVideos.has(video.id)
                  ? "opacity-50 pointer-events-none"
                  : ""
              }`}
              onClick={() => handleVideoSelect(video.id)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-square bg-black rounded overflow-hidden">
                  <video
                    src={video.url}
                    muted
                    preload="metadata"
                    className="w-full h-full object-cover"
                    onLoadedData={() => handleVideoLoad(video.id)}
                    onError={() => handleVideoError(video.id)}
                  />
                  {/* Play badge overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/50 rounded-full p-3 opacity-90 group-hover:opacity-100 transition-opacity">
                      <Play className="h-6 w-6 text-white fill-white" />
                    </div>
                  </div>
                  {/* Size badge */}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    {video.size}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-end justify-center pb-2">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center px-4">
                      <p
                        className="text-sm text-white max-w-[160px] drop-shadow-lg"
                        title={video.name}
                      >
                        {truncateFileName(video.name, 25)}
                      </p>
                    </div>
                  </div>
                  {selectMode && selectedVideos.includes(video.id) && (
                    <div className="absolute top-3 right-3 bg-primary text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-medium shadow-lg">
                      ✓
                    </div>
                  )}
                  {deletingVideos.has(video.id) && (
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
          {filteredVideos.map((video) => (
            <Card
              key={video.id}
              className={`relative group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                selectMode && selectedVideos.includes(video.id)
                  ? "ring-2 ring-blue-500"
                  : ""
              } ${
                deletingVideos.has(video.id)
                  ? "opacity-50 pointer-events-none"
                  : ""
              }`}
              onClick={() => handleVideoSelect(video.id)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-square bg-black rounded-t-lg overflow-hidden">
                  <video
                    src={video.url}
                    muted
                    preload="metadata"
                    className="w-full h-full object-cover"
                    onLoadedData={() => handleVideoLoad(video.id)}
                    onError={() => handleVideoError(video.id)}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/50 rounded-full p-2">
                      <Play className="h-4 w-4 text-white fill-white" />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all"></div>
                  {selectMode && selectedVideos.includes(video.id) && (
                    <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs shadow-md">
                      ✓
                    </div>
                  )}
                  {deletingVideos.has(video.id) && (
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
                    title={video.name}
                  >
                    {truncateFileName(video.name, 15)}
                  </p>
                  <p className="text-xs text-muted-foreground mb-1 text-center">
                    {video.size}
                  </p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {video.tags.slice(0, 1).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs px-1 py-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {video.tags.length > 1 && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        +{video.tags.length - 1}
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
          {filteredVideos.map((video) => (
            <Card
              key={video.id}
              className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                selectMode && selectedVideos.includes(video.id)
                  ? "bg-blue-50 ring-1 ring-blue-200"
                  : ""
              } ${
                deletingVideos.has(video.id)
                  ? "opacity-50 pointer-events-none"
                  : ""
              }`}
              onClick={() => handleVideoSelect(video.id)}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 relative w-16 h-16 bg-black rounded-lg overflow-hidden">
                  <video
                    src={video.url}
                    muted
                    preload="metadata"
                    className="w-full h-full object-cover"
                    onLoadedData={() => handleVideoLoad(video.id)}
                    onError={() => handleVideoError(video.id)}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Play className="h-5 w-5 text-white fill-white drop-shadow" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  {renamingVideo === video.id ? (
                    <div className="space-y-2">
                      <Input
                        value={newVideoName}
                        onChange={(e) => setNewVideoName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleChangeVideoName(video.id, newVideoName);
                          } else if (e.key === "Escape") {
                            cancelRename();
                          }
                        }}
                        className="text-sm"
                        autoFocus
                      />
                      {(() => {
                        const lastDotIndex = video.name.lastIndexOf(".");
                        const extension =
                          lastDotIndex !== -1
                            ? video.name.substring(lastDotIndex)
                            : "";
                        return (
                          <p className="text-xs text-gray-400">
                            Final: {newVideoName}
                            {extension}
                          </p>
                        );
                      })()}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleChangeVideoName(video.id, newVideoName)
                          }
                          disabled={
                            !newVideoName.trim() ||
                            newVideoName === video.name ||
                            renamingProgress[video.id]
                          }
                          className="h-6 px-2 text-xs"
                        >
                          {renamingProgress[video.id] ? (
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
                        {video.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {video.size} • {video.type} • {video.uploadedAt}
                      </p>
                    </>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {video.tags.map((tag) => (
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
                      <DropdownMenuItem onClick={() => startRename(video)}>
                        <Edit3 className="mr-2 h-4 w-4" />
                        Change Name
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteVideo(video.id)}
                        disabled={deletingVideos.has(video.id)}
                      >
                        {deletingVideos.has(video.id) ? (
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
      {!loading && filteredVideos.length === 0 && (
        <div className="text-center py-12">
          <Film className="mx-auto h-12 w-12 text-royal-purple mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {videos.length === 0
              ? "No videos uploaded yet"
              : "No videos match your filters"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {videos.length === 0
              ? "Start building your video library by uploading some clips (max 25 MB each)"
              : "Try adjusting your search or filters to see more results"}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {videos.length === 0 ? (
              <>
                <Button
                  onClick={handleUpload}
                  className="bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200"
                >
                  Upload Your First Video
                </Button>
                <span className="text-sm text-muted-foreground">
                  or drag and drop videos here
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

      {/* Video Preview Modal */}
      {selectedVideoForModal && (
        <div
          className="overlay-bg-storage fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 m-0 animate-in fade-in duration-300"
          onClick={() => setSelectedVideoForModal(null)}
        >
          <div
            className="bg-background rounded-lg w-[1200px] max-w-[95vw] h-[80vh] flex overflow-hidden relative animate-in zoom-in-95 duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-0 right-1 text-muted-foreground hover:text-red-800 w-8 h-8 p-0 z-10"
              onClick={() => setSelectedVideoForModal(null)}
            >
              ✕
            </Button>

            {/* Video Player - 70% */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black">
              <video
                src={selectedVideoForModal.url}
                controls
                autoPlay
                className="max-w-full max-h-full relative z-10"
              />
            </div>

            {/* Video Information - 30% */}
            <div className="w-[400px] p-6 overflow-y-auto overflow-x-hidden">
              <div className="space-y-6">
                <div>
                  {renamingVideo === selectedVideoForModal.id ? (
                    <div className="space-y-2">
                      <Input
                        value={newVideoName}
                        onChange={(e) => setNewVideoName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleChangeVideoName(
                              selectedVideoForModal.id,
                              newVideoName
                            );
                          } else if (e.key === "Escape") {
                            cancelRename();
                          }
                        }}
                        className="text-lg font-semibold"
                        autoFocus
                      />
                      {(() => {
                        const lastDotIndex =
                          selectedVideoForModal.name.lastIndexOf(".");
                        const extension =
                          lastDotIndex !== -1
                            ? selectedVideoForModal.name.substring(lastDotIndex)
                            : "";
                        return (
                          <p className="text-xs text-muted-foreground">
                            Final name: {newVideoName}
                            {extension}
                          </p>
                        );
                      })()}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleChangeVideoName(
                              selectedVideoForModal.id,
                              newVideoName
                            )
                          }
                          disabled={
                            !newVideoName.trim() ||
                            newVideoName === selectedVideoForModal.name ||
                            renamingProgress[selectedVideoForModal.id]
                          }
                        >
                          {renamingProgress[selectedVideoForModal.id] ? (
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
                      title={selectedVideoForModal.name}
                    >
                      {truncateFileName(selectedVideoForModal.name, 35)}
                    </h2>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Uploaded on {selectedVideoForModal.uploadedAt}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Original Name:
                    </span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {selectedVideoForModal.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-foreground">
                      File ID:
                    </span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {selectedVideoForModal.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Size:
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {selectedVideoForModal.size}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Type:
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {selectedVideoForModal.type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Uploaded By:
                    </span>
                    <span
                      className="text-sm text-muted-foreground font-mono max-w-[200px] truncate"
                      title={selectedVideoForModal.uploadedBy || "N/A"}
                    >
                      {selectedVideoForModal.uploadedBy || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Last Modified:
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {selectedVideoForModal.lastModified
                        ? new Date(
                            selectedVideoForModal.lastModified
                          ).toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {selectedVideoForModal.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2">
                      Tags:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedVideoForModal.tags.map((tag) => (
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

                {selectedVideoForModal.metadata?.description && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2">
                      Description:
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedVideoForModal.metadata.description}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-muted-foreground mb-3">
                    💡 Right-click the video and select "Save video as" to
                    download to your device.
                  </p>
                  <div className="space-y-2">
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => {
                        if (selectedVideoForModal.downloadURL) {
                          window.open(
                            selectedVideoForModal.downloadURL,
                            "_blank"
                          );
                        }
                      }}
                      disabled={!selectedVideoForModal.downloadURL}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            selectedVideoForModal.downloadURL || ""
                          );
                          toast({
                            title: "Link Copied!",
                            description: "Video link copied to clipboard",
                            duration: 2000,
                          });
                        } catch (error) {
                          console.error("Failed to copy link:", error);
                          const textArea = document.createElement("textarea");
                          textArea.value =
                            selectedVideoForModal.downloadURL || "";
                          document.body.appendChild(textArea);
                          textArea.select();
                          document.execCommand("copy");
                          document.body.removeChild(textArea);

                          toast({
                            title: "Link Copied!",
                            description: "Video link copied to clipboard",
                            duration: 2000,
                          });
                        }
                      }}
                      disabled={!selectedVideoForModal.downloadURL}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Video Link
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => startRename(selectedVideoForModal)}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Change Display Name
                    </Button>
                    <Button
                      className="w-full justify-start text-red-600 hover:text-red-700"
                      variant="outline"
                      onClick={() =>
                        handleDeleteVideo(selectedVideoForModal.id)
                      }
                      disabled={deletingVideos.has(selectedVideoForModal.id)}
                    >
                      {deletingVideos.has(selectedVideoForModal.id) ? (
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
                Drop videos to upload (max 25 MB each)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 mt-0 animate-in fade-in duration-300">
          <div className="animate-in zoom-in-95 duration-300 ease-out">
            <VideoUpload
              onUploadComplete={handleUploadComplete}
              onClose={() => setShowUploadModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
