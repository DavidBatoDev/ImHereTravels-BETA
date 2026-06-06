"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Generic snapshot-based undo/redo history.
 *
 * The caller provides `getSnapshot` (read the current state as a serializable
 * value) and `applySnapshot` (restore the state from a snapshot). Changes are
 * recorded via the debounced `record()`; a burst of edits within `debounceMs`
 * collapses into a single history entry, while discrete actions land as their
 * own steps as long as `record()` is called after each settles.
 *
 * Snapshots are compared with `isEqual` (default: JSON.stringify) so identical
 * states never create a redundant entry.
 */
export interface UseUndoRedoOptions<T> {
  getSnapshot: () => T;
  applySnapshot: (snapshot: T) => void;
  isEqual?: (a: T, b: T) => boolean;
  debounceMs?: number;
}

export interface UndoRedoControls<T> {
  /** Debounced — captures the current state into history if it changed. */
  record: () => void;
  undo: () => void;
  redo: () => void;
  /** Restore the baseline (e.g. the opened/last-saved state); clears history. */
  reset: () => void;
  /**
   * Make the given snapshot (or the current state) the new baseline + present
   * without adding history. Used on load and after a successful save.
   */
  rebase: (snapshot?: T) => void;
  canUndo: boolean;
  canRedo: boolean;
}

function defaultIsEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useUndoRedo<T>({
  getSnapshot,
  applySnapshot,
  isEqual = defaultIsEqual,
  debounceMs = 500,
}: UseUndoRedoOptions<T>): UndoRedoControls<T> {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const present = useRef<T | null>(null);
  const baseline = useRef<T | null>(null);

  // Guard so programmatic restores don't get re-recorded by change listeners.
  const isApplying = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Keep the latest callbacks without re-subscribing consumers on every render.
  const getSnapshotRef = useRef(getSnapshot);
  const applySnapshotRef = useRef(applySnapshot);
  const isEqualRef = useRef(isEqual);
  getSnapshotRef.current = getSnapshot;
  applySnapshotRef.current = applySnapshot;
  isEqualRef.current = isEqual;

  const syncFlags = useCallback(() => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  }, []);

  const cancelPending = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  const apply = useCallback((snapshot: T) => {
    isApplying.current = true;
    applySnapshotRef.current(snapshot);
    // Release the guard after the change listeners triggered by the restore
    // have flushed (RHF's watch / state updates fire synchronously + a tick).
    requestAnimationFrame(() => {
      isApplying.current = false;
    });
  }, []);

  const commit = useCallback(() => {
    if (isApplying.current) return;
    const candidate = getSnapshotRef.current();
    if (present.current === null) {
      present.current = candidate;
      baseline.current = candidate;
      return;
    }
    if (isEqualRef.current(candidate, present.current)) return;
    past.current.push(present.current);
    present.current = candidate;
    future.current = [];
    syncFlags();
  }, [syncFlags]);

  const record = useCallback(() => {
    if (isApplying.current) return;
    cancelPending();
    debounceTimer.current = setTimeout(commit, debounceMs);
  }, [cancelPending, commit, debounceMs]);

  const undo = useCallback(() => {
    cancelPending();
    // Fold any uncommitted in-flight change into present first.
    commit();
    if (past.current.length === 0 || present.current === null) return;
    future.current.push(present.current);
    const prev = past.current.pop()!;
    present.current = prev;
    syncFlags();
    apply(prev);
  }, [apply, cancelPending, commit, syncFlags]);

  const redo = useCallback(() => {
    cancelPending();
    if (future.current.length === 0 || present.current === null) return;
    past.current.push(present.current);
    const next = future.current.pop()!;
    present.current = next;
    syncFlags();
    apply(next);
  }, [apply, cancelPending, syncFlags]);

  const reset = useCallback(() => {
    cancelPending();
    if (baseline.current === null) return;
    past.current = [];
    future.current = [];
    present.current = baseline.current;
    syncFlags();
    apply(baseline.current);
  }, [apply, cancelPending, syncFlags]);

  const rebase = useCallback(
    (snapshot?: T) => {
      cancelPending();
      const snap = snapshot ?? getSnapshotRef.current();
      baseline.current = snap;
      present.current = snap;
      past.current = [];
      future.current = [];
      syncFlags();
    },
    [cancelPending, syncFlags]
  );

  useEffect(() => () => cancelPending(), [cancelPending]);

  return { record, undo, redo, reset, rebase, canUndo, canRedo };
}
