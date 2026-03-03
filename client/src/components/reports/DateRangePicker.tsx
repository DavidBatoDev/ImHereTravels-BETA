"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, DateRangePreset } from "@/types/financial-reports";
import { financialReportsService } from "@/services/financial-reports-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DateRangePickerProps {
  value: DateRangeFilter;
  onChange: (range: DateRangeFilter) => void;
}

interface Preset {
  label: string;
  value: DateRangePreset;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIDEBAR_PRESETS: Preset[] = [
  { label: "All time", value: "all_time" },
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "last_7_days" },
  { label: "Last 30 days", value: "last_30_days" },
  { label: "Last 90 days", value: "last_90_days" },
  { label: "Last 12 months", value: "last_12_months" },
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "Custom", value: "custom" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseISO(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function parseTypedDate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = parseISO(raw);
    if (!isNaN(d.getTime())) return toLocalISO(d);
  }

  const mmddyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const month = Number(mmddyyyy[1]);
    const day = Number(mmddyyyy[2]);
    const year = Number(mmddyyyy[3]);
    const d = new Date(year, month - 1, day);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return toLocalISO(d);
    }
  }

  return null;
}

/** Format a DateRangeFilter into its human label for the trigger button */
function formatRangeLabel(range: DateRangeFilter): string {
  if (range.preset === "all_time") return "All time";
  if (range.preset !== "custom") {
    const found = SIDEBAR_PRESETS.find((p) => p.value === range.preset);
    if (found && found.value !== "custom") return found.label;
  }
  // Format as "Feb 1 – Mar 2, 2026" or cross-year
  const start = parseISO(range.startDate);
  const end = parseISO(range.endDate);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (start.getFullYear() === end.getFullYear()) {
    return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
  }
  return `${fmt(start)}, ${start.getFullYear()} – ${fmt(end)}, ${end.getFullYear()}`;
}

/** Build a 6-row calendar grid for a given year/month (0-indexed month) */
function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function addMonths(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

// ---------------------------------------------------------------------------
// Mini Calendar
// ---------------------------------------------------------------------------

interface MiniCalendarProps {
  year: number;
  month: number;
  selecting: string | null; // first selected date (ISO), null if none
  start: string | null;     // committed start ISO
  end: string | null;       // committed end ISO
  hovered: string | null;   // hovered date ISO
  onDayClick: (iso: string) => void;
  onDayHover: (iso: string | null) => void;
  onPrev?: () => void;
  onNext?: () => void;
  showPrev?: boolean;
  showNext?: boolean;
}

function MiniCalendar({
  year,
  month,
  selecting,
  start,
  end,
  hovered,
  onDayClick,
  onDayHover,
  onPrev,
  onNext,
  showPrev = true,
  showNext = true,
}: MiniCalendarProps) {
  const cells = buildCalendarDays(year, month);
  const today = toLocalISO(new Date());

  // Determine visible range for highlighting
  const rangeStart = selecting ?? start;
  const rangeEnd = selecting
    ? hovered ?? selecting
    : end;

  const lo = rangeStart && rangeEnd
    ? rangeStart <= rangeEnd ? rangeStart : rangeEnd
    : rangeStart;
  const hi = rangeStart && rangeEnd
    ? rangeStart <= rangeEnd ? rangeEnd : rangeStart
    : rangeEnd;

  return (
    <div className="w-64 select-none">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        {showPrev ? (
          <button
            onClick={onPrev}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <div className="w-6" />
        )}
        <span className="text-sm font-semibold text-gray-800">
          {MONTHS[month]} {year}
        </span>
        {showNext ? (
          <button
            onClick={onNext}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="w-6" />
        )}
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;

          const iso = toLocalISO(date);
          const isStart = iso === lo;
          const isEnd = iso === hi;
          const inRange = lo && hi && iso > lo && iso < hi;
          const isToday = iso === today;
          const isSelected = isStart || isEnd;

          let cellCls =
            "relative flex items-center justify-center h-8 text-sm cursor-pointer transition-colors ";

          // Range highlight background (the band)
          let bgCls = "";
          if (inRange) bgCls = "bg-[#f0f4ff]";
          if (isStart && hi && lo !== hi) bgCls = "bg-gradient-to-r from-transparent to-[#f0f4ff]";
          if (isEnd && lo && lo !== hi) bgCls = "bg-gradient-to-l from-transparent to-[#f0f4ff]";

          // Dot/circle for selected days
          let innerCls =
            "w-8 h-8 flex items-center justify-center rounded-full z-10 relative ";
          if (isSelected) {
            innerCls += "bg-gray-900 text-white font-semibold";
          } else if (isToday) {
            innerCls += "text-gray-900 font-semibold border border-gray-300";
          } else {
            innerCls += "text-gray-700 hover:bg-gray-100 rounded-full";
          }

          return (
            <div
              key={iso}
              className={cellCls + bgCls}
              onClick={() => onDayClick(iso)}
              onMouseEnter={() => onDayHover(iso)}
              onMouseLeave={() => onDayHover(null)}
            >
              <span className={innerCls}>{date.getDate()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main DateRangePicker
// ---------------------------------------------------------------------------

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  // Working state inside the popover (not committed until Apply)
  const [draftPreset, setDraftPreset] = useState<DateRangePreset>(value.preset);
  const [draftStart, setDraftStart] = useState<string | null>(value.startDate);
  const [draftEnd, setDraftEnd] = useState<string | null>(value.endDate);

  // Calendar navigation: left calendar shows leftYear/leftMonth
  const initLeft = () => {
    const d = parseISO(value.startDate);
    return { year: d.getFullYear(), month: d.getMonth() };
  };
  const [leftCal, setLeftCal] = useState(initLeft);
  const rightCal = addMonths(leftCal.year, leftCal.month, 1);

  // Selection state: clicking picks start, then end
  const [pickingEnd, setPickingEnd] = useState(false); // true = next click is endDate
  const [hovered, setHovered] = useState<string | null>(null);

  // Manual typed input fields
  const [inputStart, setInputStart] = useState(value.startDate);
  const [inputEnd, setInputEnd] = useState(value.endDate);

  // Loading state while fetching "All time" data bounds
  const [loadingBounds, setLoadingBounds] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const openPicker = () => {
    // Reset draft to current value
    setDraftPreset(value.preset);
    setDraftStart(value.startDate);
    setDraftEnd(value.endDate);
    setInputStart(value.startDate);
    setInputEnd(value.endDate);
    setPickingEnd(false);
    setHovered(null);
    const d = parseISO(value.startDate);
    setLeftCal({ year: d.getFullYear(), month: d.getMonth() });
    // If currently showing all_time with sentinel values, refetch real bounds
    if (value.preset === "all_time") {
      setLoadingBounds(true);
      financialReportsService.getDataBounds().then((bounds) => {
        setDraftStart(bounds.startDate);
        setDraftEnd(bounds.endDate);
        setInputStart(bounds.startDate);
        setInputEnd(bounds.endDate);
        const d2 = parseISO(bounds.startDate);
        setLeftCal({ year: d2.getFullYear(), month: d2.getMonth() });
      }).finally(() => setLoadingBounds(false));
    }
    setOpen(true);
  };

  const selectPreset = (preset: DateRangePreset) => {
    if (preset === "custom") {
      setDraftPreset("custom");
      return;
    }
    if (preset === "all_time") {
      setDraftPreset("all_time");
      setLoadingBounds(true);
      financialReportsService.getDataBounds().then((bounds) => {
        setDraftStart(bounds.startDate);
        setDraftEnd(bounds.endDate);
        setInputStart(bounds.startDate);
        setInputEnd(bounds.endDate);
        const d = parseISO(bounds.startDate);
        setLeftCal({ year: d.getFullYear(), month: d.getMonth() });
      }).finally(() => setLoadingBounds(false));
      return;
    }
    const resolved = financialReportsService.resolveDateRange(preset);
    setDraftPreset(preset);
    setDraftStart(resolved.startDate);
    setDraftEnd(resolved.endDate);
    setInputStart(resolved.startDate);
    setInputEnd(resolved.endDate);
    setPickingEnd(false);
    // Navigate calendar to show the start date
    const d = parseISO(resolved.startDate);
    setLeftCal({ year: d.getFullYear(), month: d.getMonth() });
  };

  const handleDayClick = (iso: string) => {
    if (!pickingEnd) {
      // First click: set start, clear end
      setDraftStart(iso);
      setDraftEnd(null);
      setInputStart(iso);
      setInputEnd("");
      setPickingEnd(true);
      setDraftPreset("custom");
    } else {
      // Second click: set end (swap if needed)
      const start = draftStart!;
      const [lo, hi] = iso >= start ? [start, iso] : [iso, start];
      setDraftStart(lo);
      setDraftEnd(hi);
      setInputStart(lo);
      setInputEnd(hi);
      setPickingEnd(false);
      setDraftPreset("custom");
    }
  };

  const handleInputStartBlur = () => {
    const parsed = parseTypedDate(inputStart);
    if (!parsed) return;
    setInputStart(parsed);
    setDraftStart(parsed);
    setDraftPreset("custom");
    const d = parseISO(parsed);
    setLeftCal({ year: d.getFullYear(), month: d.getMonth() });
  };

  const handleInputEndBlur = () => {
    const parsed = parseTypedDate(inputEnd);
    if (!parsed) return;
    setInputEnd(parsed);
    setDraftEnd(parsed);
    setDraftPreset("custom");
  };

  const handleApply = () => {
    if (!draftStart || !draftEnd) return;
    if (draftPreset === "all_time") {
      onChange({ preset: "all_time", startDate: draftStart, endDate: draftEnd });
      setOpen(false);
      return;
    }
    const resolved = financialReportsService.resolveDateRange(
      draftPreset,
      draftStart,
      draftEnd
    );
    onChange(resolved);
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const canApply = !!draftStart && !!draftEnd && !loadingBounds;

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={openPicker}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        <Calendar className="h-4 w-4 text-gray-500" />
        <span className="text-gray-700">{formatRangeLabel(value)}</span>
        <svg className="h-4 w-4 text-gray-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl flex overflow-hidden"
          style={{ minWidth: "640px" }}
        >
          {/* Left sidebar: presets */}
          <div className="w-44 border-r border-gray-100 py-3 flex-shrink-0">
            {SIDEBAR_PRESETS.map((preset) => {
              const isActive =
                draftPreset === preset.value &&
                (preset.value !== "custom" || draftPreset === "custom");
              return (
                <button
                  key={preset.value}
                  onClick={() => selectPreset(preset.value)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors text-left ${
                    isActive
                      ? "text-gray-900 font-medium bg-gray-50"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span>{preset.label}</span>
                  {isActive && <Check className="h-4 w-4 text-gray-700" />}
                </button>
              );
            })}
          </div>

          {/* Right side: calendar */}
          <div className="flex flex-col flex-1">
            {/* Date input row */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Start date</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY-MM-DD"
                  value={inputStart}
                  onChange={(e) => setInputStart(e.target.value)}
                  onBlur={handleInputStartBlur}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              <div className="mt-4 text-gray-400">→</div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">End date</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY-MM-DD"
                  value={inputEnd}
                  onChange={(e) => setInputEnd(e.target.value)}
                  onBlur={handleInputEndBlur}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
            </div>

            {/* Dual calendar */}
            <div
              className="flex gap-6 px-5 py-4 min-h-[240px]"
              onMouseLeave={() => setHovered(null)}
            >
              {loadingBounds ? (
                <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                  Loading date range…
                </div>
              ) : (
                <>
              <MiniCalendar
                year={leftCal.year}
                month={leftCal.month}
                selecting={pickingEnd ? draftStart : null}
                start={!pickingEnd ? draftStart : null}
                end={!pickingEnd ? draftEnd : null}
                hovered={pickingEnd ? hovered : null}
                onDayClick={handleDayClick}
                onDayHover={setHovered}
                onPrev={() => setLeftCal((c) => addMonths(c.year, c.month, -1))}
                showPrev={true}
                showNext={false}
              />
              <div className="w-px bg-gray-100 self-stretch" />
              <MiniCalendar
                year={rightCal.year}
                month={rightCal.month}
                selecting={pickingEnd ? draftStart : null}
                start={!pickingEnd ? draftStart : null}
                end={!pickingEnd ? draftEnd : null}
                hovered={pickingEnd ? hovered : null}
                onDayClick={handleDayClick}
                onDayHover={setHovered}
                onNext={() => setLeftCal((c) => addMonths(c.year, c.month, 1))}
                showPrev={false}
                showNext={true}
              />
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!canApply}
                className="bg-gray-900 text-white hover:bg-gray-800"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
