"use client";
import React from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  value: string; // ISO yyyy-mm-dd or ""
  onChange: (iso: string) => void;
  label?: string;
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
  isValid?: boolean;
};

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function toISO(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

export default function TourDatePicker({
  value,
  onChange,
  label = "Tour Date",
  minYear = 2020,
  maxYear = 2050,
  disabled = false,
  isValid = false,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  // initial view = selected date or today
  const init = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = React.useState(init.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(init.getMonth());

  // popovers
  const [showMonthGrid, setShowMonthGrid] = React.useState(false);
  const [showYearGrid, setShowYearGrid] = React.useState(false);
  const [yearBase, setYearBase] = React.useState(
    () => Math.floor(init.getFullYear() / 12) * 12
  );

  // Handle close with animation
  const handleClose = React.useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
    }, 200);
  }, []);

  // Handle ESC key - stop propagation to prevent closing parent modal
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener("keydown", onKey, true); // Use capture phase
    return () => {
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, handleClose]);

  const selectedISO = value || "";

  // build grid
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const prevDays = daysInMonth(viewYear, (viewMonth + 11) % 12);
  const thisDays = daysInMonth(viewYear, viewMonth);

  const cells: Array<{ d: number; inMonth: boolean }> = [];
  for (let i = startWeekday - 1; i >= 0; i--)
    cells.push({ d: prevDays - i, inMonth: false });
  for (let d = 1; d <= thisDays; d++) cells.push({ d, inMonth: true });
  while (cells.length % 7 !== 0)
    cells.push({
      d: cells.length - (startWeekday + thisDays) + 1,
      inMonth: false,
    });

  const pick = (rowIndex: number, inMonth: boolean, d: number) => {
    let y = viewYear,
      m = viewMonth;
    const day = d;
    if (!inMonth) {
      if (rowIndex === 0) {
        m = viewMonth === 0 ? 11 : viewMonth - 1;
        y = viewMonth === 0 ? viewYear - 1 : viewYear;
      } else {
        m = viewMonth === 11 ? 0 : viewMonth + 1;
        y = viewMonth === 11 ? viewYear + 1 : viewYear;
      }
    }
    onChange(toISO(y, m, day));
    setShowMonthGrid(false);
    setShowYearGrid(false);
    handleClose();
    setTimeout(() => triggerRef.current?.focus(), 250);
  };

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // year grid page (12 years)
  const visibleYears = React.useMemo(() => {
    const yrs: number[] = [];
    for (let i = 0; i < 12; i++) yrs.push(yearBase + i);
    return yrs.filter((y) => y >= minYear && y <= maxYear);
  }, [yearBase, minYear, maxYear]);

  // Close popovers when clicking outside
  React.useEffect(() => {
    if (!showMonthGrid && !showYearGrid) return;
    const handler = () => {
      setShowMonthGrid(false);
      setShowYearGrid(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showMonthGrid, showYearGrid]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={`mt-1 block w-full px-3 py-2 rounded-md bg-input text-foreground placeholder:opacity-70 border-2 focus:outline-none text-left disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 h-9 text-sm ${
          open
            ? "border-spring-green"
            : isValid
              ? "border-spring-green pr-12 hover:border-spring-green"
              : "border-border hover:border-primary/50"
        } focus:border-primary focus:ring-2 focus:ring-primary/20`}
      >
        {selectedISO
          ? new Date(selectedISO + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Select date"}
      </button>
      {isValid && !open && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-spring-green">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {open &&
        createPortal(
          <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center ${
              isClosing
                ? "animate-[fadeOut_150ms_ease-in]"
                : "animate-[fadeIn_150ms_ease-out]"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Tour date picker"
            onClick={handleClose}
          >
            {/* backdrop */}
            <div className="absolute inset-0 bg-black/50" />

            {/* modal */}
            <div 
              className="relative bg-white rounded-lg shadow-lg p-6 max-w-sm w-96 z-[10000]"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {/* header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {label}
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* month/year selector */}
              <div className="flex gap-2 mb-4">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(parseInt(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
                >
                  {monthNames.map((m, i) => (
                    <option key={i} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(parseInt(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
                >
                  {Array.from({ length: maxYear - minYear + 1 }).map((_, i) => {
                    const year = minYear + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* calendar grid */}
              <div className="mb-4">
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d} className="text-xs font-semibold text-gray-500">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((cell, idx) => {
                    const rowIndex = Math.floor(idx / 7);
                    const isSelected =
                      cell.inMonth &&
                      selectedISO ===
                        toISO(viewYear, viewMonth, cell.d);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          pick(rowIndex, cell.inMonth, cell.d);
                        }}
                        className={`py-2 rounded text-sm transition ${
                          !cell.inMonth
                            ? "text-gray-300 cursor-default"
                            : isSelected
                              ? "bg-spring-green text-white font-semibold"
                              : "hover:bg-gray-100 text-foreground"
                        }`}
                      >
                        {cell.d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* footer */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowMonthGrid(false);
                    setShowYearGrid(false);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-foreground hover:bg-gray-100 rounded transition"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-spring-green text-white rounded hover:bg-spring-green/90 transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
