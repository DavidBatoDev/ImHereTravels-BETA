"use client";

import { useState } from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import type { StorageFolder } from "@/types/storage";

interface ConfirmDeleteFolderModalProps {
  folder: StorageFolder;
  /** True while the delete request is in flight. */
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Word the user must type to confirm a folder delete. */
const CONFIRM_WORD = "Delete";

/**
 * Confirmation for deleting a Storage folder. Deleting permanently removes the
 * folder and every file inside it (nested subfolders included) from Cloud
 * Storage, so the Delete button stays disabled until the user types "Delete".
 */
export default function ConfirmDeleteFolderModal({
  folder,
  deleting,
  onConfirm,
  onClose,
}: ConfirmDeleteFolderModalProps) {
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim() === CONFIRM_WORD;
  const canDelete = confirmed && !deleting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={deleting ? undefined : onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="size-4 text-red-600" />
            </span>
            <h2 className="text-base font-semibold text-midnight">Delete folder</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex size-7 items-center justify-center rounded-full text-gray-400 hover:bg-light-grey hover:text-midnight transition-colors disabled:opacity-40"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 text-sm text-dark-gray">
          <p>
            You're about to delete{" "}
            <span className="font-semibold text-midnight">"{folder.name}"</span>.
          </p>
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            This permanently removes the folder and every file inside it from
            Cloud Storage and can't be undone.
          </p>

          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Type{" "}
              <span className="font-semibold text-midnight">{CONFIRM_WORD}</span>{" "}
              to confirm:
            </label>
            <input
              type="text"
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canDelete) onConfirm();
              }}
              placeholder={CONFIRM_WORD}
              disabled={deleting}
              className="w-full rounded-lg border border-light-grey px-4 py-2.5 text-sm text-midnight outline-none focus:border-red-500 transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg border border-light-grey px-4 py-2 text-sm font-medium text-midnight hover:bg-light-grey transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canDelete}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
          >
            {deleting && <Loader2 className="size-4 animate-spin" />}
            {deleting ? "Deleting…" : "Delete folder"}
          </button>
        </div>
      </div>
    </div>
  );
}
