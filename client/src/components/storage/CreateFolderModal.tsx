"use client";

import { useState } from "react";
import { FolderPlus, X, ChevronRight } from "lucide-react";

interface CreateFolderModalProps {
  currentPath: string;
  onConfirm: (name: string) => Promise<void>;
  onClose: () => void;
}

/** Converts a logical path like "images/tours" into breadcrumb labels ["Storage", "tours"] */
function pathToLabels(path: string): string[] {
  return path.split("/").map((seg, i) => (i === 0 ? "Storage" : seg));
}

function sanitize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export default function CreateFolderModal({
  currentPath,
  onConfirm,
  onClose,
}: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const sanitized = sanitize(name);
  const crumbs = pathToLabels(currentPath);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sanitized) { setError("Enter a folder name."); return; }
    setError("");
    setCreating(true);
    try {
      await onConfirm(sanitized);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create folder.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FolderPlus className="size-5 text-crimson-red" />
            <h2 className="text-base font-semibold text-midnight">New Folder</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full text-gray-400 hover:bg-light-grey hover:text-midnight transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Location preview */}
        <div className="mb-4 flex flex-wrap items-center gap-1 rounded-lg bg-light-grey px-3 py-2 text-xs text-gray-500">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3 text-gray-400" />}
              <span>{crumb}</span>
            </span>
          ))}
          {sanitized && (
            <>
              <ChevronRight className="size-3 text-gray-400" />
              <span className="font-semibold text-midnight">{sanitized}</span>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="folder-name"
              className="w-full rounded-lg border border-light-grey px-4 py-2.5 text-sm text-midnight outline-none focus:border-crimson-red transition-colors"
            />
            {name && sanitized !== name && (
              <p className="mt-1 text-xs text-gray-400">
                Will be saved as: <span className="font-medium text-midnight">{sanitized}</span>
              </p>
            )}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-light-grey px-4 py-2 text-sm font-medium text-midnight hover:bg-light-grey transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!sanitized || creating}
              className="rounded-lg bg-crimson-red px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {creating ? "Creating…" : "Create Folder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
