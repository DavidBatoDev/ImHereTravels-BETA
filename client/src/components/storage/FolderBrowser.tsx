"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Search, Grid3X3, List, Image as ImageIcon,
  Trash2, Eye, MoreHorizontal, CheckSquare, Square, Copy,
  Edit3, FolderOpen, Folder, ChevronRight, FolderPlus, Home,
  LayoutGrid, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import storageService from "@/services/storage-service";
import type { ImageItem, StorageFolder } from "@/types/storage";
import FileUpload from "./FileUpload";
import CreateFolderModal from "./CreateFolderModal";

const ROOT = "images";

/** Strip the leading "images" segment and label it "Storage" */
function pathToCrumbs(path: string): { label: string; path: string }[] {
  const segments = path.split("/");
  return segments.map((seg, i) => ({
    label: i === 0 ? "Storage" : seg,
    path: segments.slice(0, i + 1).join("/"),
  }));
}

export default function FolderBrowser() {
  const { toast } = useToast();

  // ── Navigation ────────────────────────────────────────────────────────────
  const [currentPath, setCurrentPath] = useState(ROOT);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [folders, setFolders] = useState<StorageFolder[]>([]);
  const [files, setFiles] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"large" | "small" | "list">("large");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [selectedForPreview, setSelectedForPreview] = useState<ImageItem | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // ── Load contents ─────────────────────────────────────────────────────────

  const loadContents = useCallback(async (path: string) => {
    setLoading(true);
    setSearchQuery("");
    setSelectMode(false);
    setSelectedImages([]);
    try {
      const [foldersData, filesData] = await Promise.all([
        storageService.getFolders(path),
        storageService.getFilesByFolder(path),
      ]);
      setFolders(foldersData);
      setFiles(filesData);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to load contents.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadContents(currentPath); }, [currentPath, loadContents]);

  // ── Navigation helpers ────────────────────────────────────────────────────

  function navigate(path: string) {
    setCurrentPath(path);
  }

  // ── Create folder ─────────────────────────────────────────────────────────

  async function handleCreateFolder(name: string) {
    const folder = await storageService.createFolder(name, currentPath);
    setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
    toast({ title: "Folder created", description: `"${name}" created.` });
  }

  // ── Delete folder ─────────────────────────────────────────────────────────

  async function handleDeleteFolder(folder: StorageFolder) {
    await storageService.deleteFolder(folder.id);
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    toast({ title: "Folder deleted", description: `"${folder.name}" removed.` });
  }

  // ── Image actions ─────────────────────────────────────────────────────────

  function handleUploadComplete(image: ImageItem) {
    setFiles((prev) => [image, ...prev]);
    toast({ title: "Uploaded", description: `${image.name} uploaded.` });
  }

  async function handleDeleteImage(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await storageService.deleteImage(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      if (selectedForPreview?.id === id) setSelectedForPreview(null);
      toast({ title: "Deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete image.", variant: "destructive" });
    } finally {
      setDeletingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function handleBulkDelete() {
    if (!selectedImages.length) return;
    try {
      await storageService.bulkDeleteImages(selectedImages);
      setFiles((prev) => prev.filter((f) => !selectedImages.includes(f.id)));
      setSelectedImages([]);
      setSelectMode(false);
      toast({ title: `${selectedImages.length} images deleted` });
    } catch {
      toast({ title: "Error", description: "Bulk delete failed.", variant: "destructive" });
    }
  }

  async function handleRenameSubmit(id: string) {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    try {
      const updated = await storageService.renameImage(id, renameValue.trim());
      if (updated) setFiles((prev) => prev.map((f) => (f.id === id ? updated : f)));
      toast({ title: "Renamed" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Rename failed.", variant: "destructive" });
    } finally {
      setRenamingId(null);
    }
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied" });
  }

  function toggleSelect(id: string) {
    setSelectedImages((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const crumbs = pathToCrumbs(currentPath);
  const isEmpty = !loading && filteredFolders.length === 0 && filteredFiles.length === 0;

  // ── Grid class helpers ────────────────────────────────────────────────────

  const gridClass =
    viewMode === "large"
      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      : viewMode === "small"
      ? "grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3"
      : "flex flex-col gap-2";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Breadcrumbs */}
        <nav className="flex flex-1 flex-wrap items-center gap-1 min-w-0">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={crumb.path} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5 text-gray-400 shrink-0" />}
                {isLast ? (
                  <span className="flex items-center gap-1 font-semibold text-midnight text-sm">
                    {i === 0 ? <Home className="size-3.5" /> : <FolderOpen className="size-3.5 text-crimson-red" />}
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(crumb.path)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-crimson-red transition-colors"
                  >
                    {i === 0 ? <Home className="size-3.5" /> : <Folder className="size-3.5" />}
                    {crumb.label}
                  </button>
                )}
              </span>
            );
          })}
        </nav>

        {/* Search */}
        <div className="relative w-48 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* View mode */}
        <div className="flex items-center gap-1 rounded-lg border border-light-grey p-0.5">
          <button type="button" onClick={() => setViewMode("large")}
            className={`rounded p-1.5 transition-colors ${viewMode === "large" ? "bg-midnight text-white" : "text-gray-500 hover:text-midnight"}`}>
            <LayoutGrid className="size-4" />
          </button>
          <button type="button" onClick={() => setViewMode("small")}
            className={`rounded p-1.5 transition-colors ${viewMode === "small" ? "bg-midnight text-white" : "text-gray-500 hover:text-midnight"}`}>
            <Grid3X3 className="size-4" />
          </button>
          <button type="button" onClick={() => setViewMode("list")}
            className={`rounded p-1.5 transition-colors ${viewMode === "list" ? "bg-midnight text-white" : "text-gray-500 hover:text-midnight"}`}>
            <List className="size-4" />
          </button>
        </div>

        {/* Actions */}
        {selectMode ? (
          <>
            <span className="text-sm text-gray-500">{selectedImages.length} selected</span>
            <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={selectedImages.length === 0}>
              <Trash2 className="size-4 mr-1.5" /> Delete
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setSelectMode(false); setSelectedImages([]); }}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => setSelectMode(true)}>
              <CheckSquare className="size-4 mr-1.5" /> Select
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCreateFolder(true)}>
              <FolderPlus className="size-4 mr-1.5" /> New Folder
            </Button>
            <Button size="sm" onClick={() => setShowUpload(true)} className="bg-crimson-red hover:bg-crimson-red/90 text-white">
              <Upload className="size-4 mr-1.5" /> Upload Images
            </Button>
          </>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="size-8 rounded-full border-4 border-gray-200 border-t-crimson-red animate-spin" />
        </div>
      ) : isEmpty ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 text-gray-400">
          <FolderOpen className="size-12" />
          <p className="text-sm">This folder is empty.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowCreateFolder(true)}>
              <FolderPlus className="size-4 mr-1.5" /> New Folder
            </Button>
            <Button size="sm" onClick={() => setShowUpload(true)} className="bg-crimson-red hover:bg-crimson-red/90 text-white">
              <Upload className="size-4 mr-1.5" /> Upload Images
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* ── Folders section — always on top ── */}
          {filteredFolders.length > 0 && (
            <div className="flex flex-col gap-3">
              {filteredFolders.length > 0 && filteredFiles.length > 0 && (
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Folders</p>
              )}
              <div className={gridClass}>
          {filteredFolders.map((folder) =>
            viewMode === "list" ? (
              <div key={folder.id}
                className="group flex items-center gap-3 rounded-xl border border-light-grey bg-white px-4 py-3 hover:border-crimson-red/30 hover:bg-crimson-red/5 transition-colors cursor-pointer"
                onClick={() => navigate(folder.path)}
              >
                <Folder className="size-5 text-crimson-red shrink-0" />
                <span className="flex-1 text-sm font-medium text-midnight truncate">{folder.name}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-light-grey transition-all">
                      <MoreHorizontal className="size-4 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(folder.path); }}>
                      <FolderOpen className="size-4 mr-2" /> Open
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                    >
                      <Trash2 className="size-4 mr-2" /> Delete Folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div key={folder.id}
                className="group relative flex flex-col items-center gap-2 rounded-xl border border-light-grey bg-white p-4 hover:border-crimson-red/30 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => navigate(folder.path)}
              >
                <Folder className={`text-crimson-red ${viewMode === "large" ? "size-12" : "size-8"}`} />
                <span className={`w-full truncate text-center font-medium text-midnight ${viewMode === "large" ? "text-sm" : "text-xs"}`}>
                  {folder.name}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded-full p-1 hover:bg-light-grey transition-all">
                      <MoreHorizontal className="size-3.5 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(folder.path); }}>
                      <FolderOpen className="size-4 mr-2" /> Open
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                    >
                      <Trash2 className="size-4 mr-2" /> Delete Folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          )}

              </div>
            </div>
          )}

          {/* ── Files section ── */}
          {filteredFiles.length > 0 && (
            <div className="flex flex-col gap-3">
              {filteredFolders.length > 0 && filteredFiles.length > 0 && (
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Images</p>
              )}
              <div className={gridClass}>
          {filteredFiles.map((img) => {
            const isSelected = selectedImages.includes(img.id);
            const isDeleting = deletingIds.has(img.id);

            if (viewMode === "list") {
              return (
                <div key={img.id}
                  className={`group flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition-colors ${
                    isSelected ? "border-crimson-red bg-crimson-red/5" : "border-light-grey hover:border-gray-300"
                  } ${isDeleting ? "opacity-40" : ""}`}
                  onClick={() => selectMode ? toggleSelect(img.id) : setSelectedForPreview(img)}
                >
                  {selectMode && (
                    <div className="shrink-0">
                      {isSelected ? <CheckSquare className="size-4 text-crimson-red" /> : <Square className="size-4 text-gray-400" />}
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.name} className="size-10 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    {renamingId === img.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameSubmit(img.id)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(img.id); if (e.key === "Escape") setRenamingId(null); }}
                        className="w-full rounded border px-2 py-0.5 text-sm outline-none focus:border-crimson-red"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <p className="text-sm font-medium text-midnight truncate">{img.name}</p>
                    )}
                    <p className="text-xs text-gray-400">{img.size} · {img.uploadedAt}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => copyLink(img.url)} className="rounded p-1 hover:bg-light-grey"><Copy className="size-4 text-gray-500" /></button>
                    <button onClick={() => { setRenamingId(img.id); setRenameValue(img.name); }} className="rounded p-1 hover:bg-light-grey"><Edit3 className="size-4 text-gray-500" /></button>
                    <button onClick={() => handleDeleteImage(img.id)} className="rounded p-1 hover:bg-red-50"><Trash2 className="size-4 text-red-500" /></button>
                  </div>
                </div>
              );
            }

            return (
              <div key={img.id}
                className={`group relative overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected ? "border-crimson-red" : "border-transparent hover:border-gray-200"
                } ${isDeleting ? "opacity-40" : ""}`}
                onClick={() => selectMode ? toggleSelect(img.id) : setSelectedForPreview(img)}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-light-grey">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                </div>

                {/* Selection indicator */}
                {selectMode && (
                  <div className={`absolute top-2 left-2 flex size-5 items-center justify-center rounded-full border-2 ${
                    isSelected ? "border-crimson-red bg-crimson-red" : "border-white bg-white/80"
                  }`}>
                    {isSelected && <div className="size-2 rounded-full bg-white" />}
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 via-transparent to-transparent">
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded-full bg-white/90 p-1 hover:bg-white shadow-sm">
                          <MoreHorizontal className="size-3.5 text-midnight" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedForPreview(img)}>
                          <Eye className="size-4 mr-2" /> Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyLink(img.url)}>
                          <Copy className="size-4 mr-2" /> Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setRenamingId(img.id); setRenameValue(img.name); }}>
                          <Edit3 className="size-4 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteImage(img.id)}>
                          <Trash2 className="size-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="truncate text-xs text-white font-medium">{img.name}</p>
                </div>
              </div>
            );
          })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Image preview modal ── */}
      {selectedForPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          onClick={() => setSelectedForPreview(null)}
        >
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <div
            className="relative z-10 flex w-full max-w-6xl max-h-[90vh] rounded-2xl overflow-hidden bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image — blurred copy as background, sharp copy on top */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden">
              {/* Blurred background — same image, scaled up and blurred */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedForPreview.url}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-75"
              />
              {/* Sharp foreground image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedForPreview.url}
                alt={selectedForPreview.name}
                className="relative z-10 max-h-[90vh] max-w-full object-contain"
              />
            </div>

            {/* Details sidebar */}
            <div className="w-72 shrink-0 border-l border-light-grey bg-white flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b border-light-grey px-5 py-4">
                <h3 className="text-sm font-semibold text-midnight break-all leading-snug">
                  {selectedForPreview.name}
                </h3>
                <button
                  onClick={() => setSelectedForPreview(null)}
                  className="shrink-0 flex size-7 items-center justify-center rounded-full text-gray-400 hover:bg-light-grey hover:text-midnight transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Metadata */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {[
                  ["Size", selectedForPreview.size],
                  ["Type", selectedForPreview.type],
                  ["Uploaded", selectedForPreview.uploadedAt],
                  ["Folder", selectedForPreview.folder ?? ROOT],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
                    <p className="text-sm text-midnight mt-0.5 break-all">{value}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="border-t border-light-grey px-5 py-4 flex flex-col gap-2">
                <Button variant="outline" onClick={() => copyLink(selectedForPreview.url)} className="w-full justify-start">
                  <Copy className="size-4 mr-2" /> Copy Link
                </Button>
                <Button variant="outline" onClick={() => window.open(selectedForPreview.url, "_blank")} className="w-full justify-start">
                  <Eye className="size-4 mr-2" /> Open Original
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteImage(selectedForPreview.id)}
                  className="w-full justify-start"
                >
                  <Trash2 className="size-4 mr-2" /> Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showUpload && (
        <FileUpload
          folder={currentPath}
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUpload(false)}
        />
      )}
      {showCreateFolder && (
        <CreateFolderModal
          currentPath={currentPath}
          onConfirm={handleCreateFolder}
          onClose={() => setShowCreateFolder(false)}
        />
      )}
    </div>
  );
}
