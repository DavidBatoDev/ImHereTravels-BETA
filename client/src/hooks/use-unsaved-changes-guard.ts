"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Warns before leaving a page that has unsaved changes. Covers the realistic
 * ways a user navigates away from an editor:
 *
 *  1. Hard unloads — refresh, tab close, or navigating to an external URL —
 *     via the native `beforeunload` prompt.
 *  2. In-app links — sidebar / breadcrumbs / menus — by intercepting clicks on
 *     internal `<a>` elements (Next `<Link>` renders anchors) and showing an
 *     in-app confirmation instead.
 *  3. The browser Back/Forward buttons — by seeding a history entry so the first
 *     Back fires `popstate` while we're still on the page, then prompting.
 *  4. Explicit in-app actions (e.g. a "Back" button) routed through `requestNav`.
 *
 * `isDirty` is read live at the moment of navigation, so it always reflects the
 * current edit state (no stale snapshot). When clean, navigation is never
 * blocked. The host renders a modal off `isPending` and calls `confirm`/`cancel`.
 */
export function useUnsavedChangesGuard({
  isDirty,
  onLeave,
}: {
  isDirty: () => boolean;
  /** Where to go when the user confirms leaving via the browser Back button. */
  onLeave: () => void;
}) {
  const router = useRouter();

  // Keep callbacks in refs so the listener effects never need to re-subscribe.
  const isDirtyRef = useRef(isDirty);
  const onLeaveRef = useRef(onLeave);
  isDirtyRef.current = isDirty;
  onLeaveRef.current = onLeave;

  const pendingRun = useRef<(() => void) | null>(null);
  const [isPending, setIsPending] = useState(false);

  const arm = useCallback((run: () => void) => {
    pendingRun.current = run;
    setIsPending(true);
  }, []);

  /** Run `run` immediately when clean, otherwise prompt first. */
  const requestNav = useCallback(
    (run: () => void) => {
      if (isDirtyRef.current()) arm(run);
      else run();
    },
    [arm]
  );

  const confirm = useCallback(() => {
    const run = pendingRun.current;
    pendingRun.current = null;
    setIsPending(false);
    run?.();
  }, []);

  const cancel = useCallback(() => {
    pendingRun.current = null;
    setIsPending(false);
  }, []);

  // 1. Hard unloads.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // 2. Internal link clicks.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Let modified / non-primary clicks (new tab, etc.) behave natively.
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;

      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (
        !href ||
        href.startsWith("#") ||
        (target && target !== "_self") ||
        anchor.hasAttribute("download")
      )
        return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same page (incl. query) — nothing to guard.
      if (
        url.pathname + url.search ===
        window.location.pathname + window.location.search
      )
        return;
      if (!isDirtyRef.current()) return;

      e.preventDefault();
      e.stopPropagation();
      const dest = url.pathname + url.search + url.hash;
      arm(() => router.push(dest));
    };

    // Capture phase so we win before Next's <Link> handler runs.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [arm, router]);

  // 3. Browser Back / Forward.
  const seeded = useRef(false);
  useEffect(() => {
    // Seed once (guarded so React StrictMode's double-invoke doesn't stack
    // entries) so the first Back press lands us here and fires popstate.
    if (!seeded.current) {
      window.history.pushState(null, "", window.location.href);
      seeded.current = true;
    }

    const onPopState = () => {
      if (isDirtyRef.current()) {
        // Re-seed to keep the user on the page, then prompt.
        window.history.pushState(null, "", window.location.href);
        arm(() => onLeaveRef.current());
      } else {
        // Clean — let them leave: drop our guard and continue back.
        window.removeEventListener("popstate", onPopState);
        window.history.back();
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [arm]);

  return { isPending, confirm, cancel, requestNav };
}
