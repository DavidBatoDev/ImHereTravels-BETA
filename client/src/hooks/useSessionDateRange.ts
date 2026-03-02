"use client";

import { useState, useCallback } from "react";
import { DateRangeFilter } from "@/types/financial-reports";
import { financialReportsService } from "@/services/financial-reports-service";

const SESSION_KEY = "reports_dateRange";

function getDefault(): DateRangeFilter {
  return financialReportsService.resolveDateRange("last_30_days");
}

function readSession(): DateRangeFilter | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DateRangeFilter;
    // Basic validation
    if (parsed?.startDate && parsed?.endDate) return parsed;
  } catch {
    // ignore
  }
  return null;
}

function writeSession(range: DateRangeFilter) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(range));
  } catch {
    // ignore
  }
}

/**
 * Persists the selected date range in sessionStorage so it survives
 * in-session navigation. Resets to the default (last 30 days) when
 * the browser tab is closed and a new session starts.
 *
 * Pass `initialFromUrl` to override with a URL-provided range (e.g.
 * when arriving on the transactions page via a deep-link).
 */
export function useSessionDateRange(initialFromUrl?: DateRangeFilter) {
  const [dateRange, setDateRangeState] = useState<DateRangeFilter>(() => {
    if (initialFromUrl) {
      writeSession(initialFromUrl);
      return initialFromUrl;
    }
    return readSession() ?? getDefault();
  });

  const setDateRange = useCallback((range: DateRangeFilter) => {
    writeSession(range);
    setDateRangeState(range);
  }, []);

  return [dateRange, setDateRange] as const;
}
