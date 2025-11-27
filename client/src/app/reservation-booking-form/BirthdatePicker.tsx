// BirthdatePickerModal.tsx — allow any age (no 17+ rule)
"use client";
import React from "react";
import { createPortal } from "react-dom";

type Props = {
  value: string;               // ISO yyyy-mm-dd or ""
  onChange: (iso: string) => void;
  label?: string;
  minYear?: number;            // default 1920
  maxYear?: number;
  disabled?: boolean;          // disable the picker
};

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function toISO(y: number, m: number, d: number) { return `${y}-${pad(m+1)}-${pad(d)}`; }
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function calcAge(iso: string | ""): number | null {
  if (!iso) return null;
  const [yy, mm, dd] = iso.split("-").map(Number);
  const b = new Date(yy, (mm ?? 1) - 1, dd ?? 1);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

export default function BirthdatePickerModal({
  value,
  onChange,
  label = "Birthdate",
  minYear = 1920,
  disabled = false,
}: Props) {
  // Allow any age, but never allow future dates
  const today = new Date();
  const maxDate = today;
  const maxYear = today.getFullYear();

  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  // initial view = selected date or today (capped by maxDate)
  const init = value ? new Date(value + "T00:00:00") : maxDate;
  const [viewYear, setViewYear]   = React.useState(init.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(init.getMonth());

  // popovers
  const [showMonthGrid, setShowMonthGrid] = React.useState(false);
  const [showYearGrid,  setShowYearGrid]  = React.useState(false);
  const [yearBase, setYearBase] = React.useState(() => Math.floor(init.getFullYear() / 12) * 12);

  // lock scroll when modal open + ESC to close
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open]);

  const selectedISO  = value || "";
  const selectedAge  = calcAge(selectedISO);
  const isFuture = (y: number, m: number, d: number) =>
    new Date(y, m, d, 23, 59, 59).getTime() > maxDate.getTime();

  // build grid
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const prevDays     = daysInMonth(viewYear, (viewMonth + 11) % 12);
  const thisDays     = daysInMonth(viewYear, viewMonth);

  const cells: Array<{ d: number; inMonth: boolean }> = [];
  for (let i = startWeekday - 1; i >= 0; i--) cells.push({ d: prevDays - i, inMonth: false });
  for (let d = 1; d <= thisDays; d++) cells.push({ d, inMonth: true });
  while (cells.length % 7 !== 0) cells.push({ d: cells.length - (startWeekday + thisDays) + 1, inMonth: false });

  const pick = (rowIndex: number, inMonth: boolean, d: number) => {
    let y = viewYear, m = viewMonth;
    const day = d;
    if (!inMonth) {
      if (rowIndex === 0) { m = viewMonth === 0 ? 11 : viewMonth - 1; y = viewMonth === 0 ? viewYear - 1 : viewYear; }
      else                { m = viewMonth === 11 ? 0  : viewMonth + 1; y = viewMonth === 11 ? viewYear + 1 : viewYear; }
    }
    if (isFuture(y, m, day)) return;
    onChange(toISO(y, m, day));
    setOpen(false);
    setShowMonthGrid(false); setShowYearGrid(false);
    setTimeout(() => triggerRef.current?.focus(), 0);
  };

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // year grid page (12 years)
  const visibleYears = React.useMemo(() => {
    const yrs: number[] = [];
    for (let i = 0; i < 12; i++) yrs.push(yearBase + i);
    return yrs.filter(y => y >= minYear && y <= maxYear);
  }, [yearBase, minYear, maxYear]);

  // Close popovers when clicking outside
  React.useEffect(() => {
    if (!showMonthGrid && !showYearGrid) return;
    const handler = () => { setShowMonthGrid(false); setShowYearGrid(false); };
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
        className="mt-1 block w-full px-4 py-3 rounded-md bg-input text-foreground placeholder:opacity-70 border border-border focus:outline-none focus:border-primary text-left disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selectedISO ? new Date(selectedISO + "T00:00:00").toLocaleDateString() : "mm/dd/yyyy"}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-[fadeIn_150ms_ease-out]" role="dialog" aria-modal="true" aria-label="Birthdate picker">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* card */}
          <div className="relative w-full max-w-md mx-4 rounded-2xl bg-card border border-border shadow-2xl overflow-visible animate-[scaleIn_200ms_ease-out]">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">{label}</h3>
              <div className="ml-auto mr-3 text-sm">
                <span className="px-2.5 py-1 rounded-md bg-input border border-border text-foreground font-medium">
                  Age: {selectedAge ?? "—"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-md bg-input border border-border flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* controls */}
            <div className="px-5 pt-4 pb-3">
              <div className="relative flex items-center gap-3">
                {/* Month button + popover grid */}
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowMonthGrid(v => !v); setShowYearGrid(false); }}
                    className="w-full h-11 px-4 rounded-lg bg-input border border-border flex items-center justify-between hover:bg-muted transition-all group"
                    aria-label="Select month"
                    aria-expanded={showMonthGrid}
                  >
                    <span className="font-medium">{monthNames[viewMonth]}</span>
                    <span className={`opacity-60 transition-transform duration-200 ${showMonthGrid ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  {showMonthGrid && (
                    <div
                      className="absolute z-20 top-full mt-2 left-0 w-full min-w-[16rem] rounded-xl border border-border bg-card shadow-2xl p-3 animate-[slideDown_150ms_ease-out]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="grid grid-cols-3 gap-2">
                        {monthNames.map((m, i) => {
                          const disabled = viewYear === maxYear && i > maxDate.getMonth();
                          return (
                            <button
                              key={m}
                              type="button"
                              disabled={disabled}
                              onClick={() => { setViewMonth(i); setShowMonthGrid(false); }}
                              className={[
                                "h-10 rounded-lg text-sm font-medium border transition-all",
                                disabled ? "opacity-40 cursor-not-allowed" : "hover:scale-105 active:scale-95",
                                i === viewMonth ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-input border-border hover:bg-muted"
                              ].join(" ")}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Year button + decade grid */}
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setYearBase(Math.floor(viewYear/12)*12); setShowYearGrid(v => !v); setShowMonthGrid(false); }}
                    className="w-full h-11 px-4 rounded-lg bg-input border border-border flex items-center justify-between hover:bg-muted transition-all group"
                    aria-label="Select year"
                    aria-expanded={showYearGrid}
                  >
                    <span className="font-medium">{viewYear}</span>
                    <span className={`opacity-60 transition-transform duration-200 ${showYearGrid ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  {showYearGrid && (
                    <div
                      className="absolute z-30 top-full mt-2 right-0 w-full min-w-[16rem] rounded-xl border border-border bg-card shadow-2xl p-3 animate-[slideDown_150ms_ease-out]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between px-2 pb-3 mb-3 border-b border-border">
                        <button
                          type="button"
                          onClick={() => setYearBase(y => Math.max(minYear, y - 12))}
                          disabled={yearBase <= minYear}
                          className="h-8 w-8 rounded-lg bg-input border border-border hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                          aria-label="Previous 12 years"
                        >←</button>
                        <div className="text-sm font-medium text-muted-foreground">
                          {Math.max(minYear, yearBase)}–{Math.min(maxYear, yearBase + 11)}
                        </div>
                        <button
                          type="button"
                          onClick={() => setYearBase(y => Math.min(maxYear - 11, y + 12))}
                          disabled={yearBase + 11 >= maxYear}
                          className="h-8 w-8 rounded-lg bg-input border border-border hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                          aria-label="Next 12 years"
                        >→</button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {visibleYears.map((y) => {
                          const disabled = y > maxYear;
                          return (
                            <button
                              key={y}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                let m = viewMonth;
                                if (y === maxYear && m > maxDate.getMonth()) m = maxDate.getMonth();
                                setViewYear(y); setViewMonth(m);
                                setShowYearGrid(false);
                              }}
                              className={[
                                "h-10 rounded-lg text-sm font-medium border transition-all",
                                disabled ? "opacity-40 cursor-not-allowed" : "hover:scale-105 active:scale-95",
                                y === viewYear ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-input border-border hover:bg-muted"
                              ].join(" ")}
                            >
                              {y}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* week header */}
            <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground px-5 pt-2 pb-1">
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d)=>(<div key={d} className="py-1.5">{d}</div>))}
            </div>

            {/* days grid */}
            <div className="grid grid-cols-7 gap-1.5 p-5 pt-2">
              {cells.map((c, idx) => {
                const row = Math.floor(idx / 7);
                let y = viewYear, m = viewMonth;
                const d = c.d;
                if (!c.inMonth) {
                  if (row === 0) { m = viewMonth === 0 ? 11 : viewMonth - 1; y = viewMonth === 0 ? viewYear - 1 : viewYear; }
                  else           { m = viewMonth === 11 ? 0  : viewMonth + 1; y = viewMonth === 11 ? viewYear + 1 : viewYear; }
                }
                const disabled =
                  y < minYear || y > maxYear ||
                  (y === maxYear && m > maxDate.getMonth()) ||
                  isFuture(y, m, d);

                const iso = toISO(y, m, d);
                const isSelected = iso === selectedISO;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(row, c.inMonth, d)}
                    className={[
                      "h-11 rounded-lg text-sm font-medium transition-all border",
                      disabled ? "opacity-30 cursor-not-allowed" : "hover:scale-110 active:scale-95",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-lg ring-2 ring-primary/20"
                        : c.inMonth
                          ? "bg-input border-border hover:bg-muted hover:border-muted-foreground/20"
                          : "bg-transparent border-transparent opacity-40 hover:opacity-60"
                    ].join(" ")}
                    aria-pressed={isSelected}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {/* footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-muted/30">
              <button
                type="button"
                className="text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                onClick={() => { onChange(""); setOpen(false); }}
              >
                Clear
              </button>
              {/* No age validation message anymore */}
              <div />
            </div>
          </div>
        </div>,
        document.body
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
