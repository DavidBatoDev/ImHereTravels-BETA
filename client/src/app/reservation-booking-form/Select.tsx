"use client";
import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export type Option = {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
  description?: string;
  searchValue?: string; // custom search text for robust matching
};

type Props = {
  value: string | null;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  searchable?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  isValid?: boolean;
};

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className = "",
  searchable = false,
  disabled = false,
  ariaLabel,
  isValid = false,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  const selected = options.find(o => o.value === value) ?? null;
  const filtered = searchable
    ? options.filter(o => {
        const searchText = o.searchValue ?? (typeof o.label === "string" ? o.label : "");
        return searchText.toLowerCase().includes(query.toLowerCase());
      })
    : options;

  const [placement, setPlacement] = React.useState<"down" | "up">("down");
  const [anchor, setAnchor] = React.useState<DOMRect | null>(null);

  React.useEffect(() => {
    if (!open || !btnRef.current) return;
    const compute = () => {
      const r = btnRef.current!.getBoundingClientRect();
      setAnchor(r);
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceAbove = r.top;
      const needed = 260;
      setPlacement(spaceBelow >= needed || spaceBelow >= spaceAbove ? "down" : "up");
    };
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    const prev = document.body.style.overflowY;
    document.body.style.overflowY = "scroll";
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
      document.body.style.overflowY = prev;
    };
  }, [open]);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      if (listRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  // keyboard nav
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  React.useEffect(() => { if (!open) setActiveIndex(-1); }, [open, query]);

  const nextEnabled = (start: number, dir: 1 | -1) => {
    let i = start;
    for (;;) {
      i += dir;
      if (i < 0 || i >= filtered.length) return start;
      if (!filtered[i].disabled) return i;
    }
  };

  const commitIndex = (idx: number) => {
    const opt = filtered[idx];
    if (!opt || opt.disabled) return; // ignore disabled
    onChange(opt.value);
    setOpen(false);
    setQuery("");
    btnRef.current?.focus();
  };

  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault(); setOpen(true);
      // focus first enabled item
      const first = filtered.findIndex(o => !o.disabled);
      setTimeout(() => setActiveIndex(first === -1 ? 0 : first), 0);
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault(); setActiveIndex(i => nextEnabled(i, +1 as 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); setActiveIndex(i => nextEnabled(i, -1 as -1));
    } else if (e.key === "Enter") {
      e.preventDefault(); commitIndex(activeIndex);
    } else if (e.key === "Escape") {
      e.preventDefault(); setOpen(false); btnRef.current?.focus();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen(o => !o)}
        onKeyDown={onButtonKeyDown}
        disabled={disabled}
        className={`w-full text-left px-4 py-3 rounded-md bg-input border-2 text-foreground focus:outline-none disabled:opacity-50 transition-all duration-200 hover:shadow-sm ${
          open ? 'border-crimson-red' : isValid ? 'border-green-500 pr-12 hover:border-green-500' : 'border-border hover:border-primary/50'
        } focus:border-primary focus:ring-2 focus:ring-primary/20`}
      >
        {selected ? selected.label : <span className="text-muted-foreground">{placeholder}</span>}
      </button>
      {isValid && !open && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      {open && anchor && createPortal(
        <AnimatePresence>
          <motion.div
            key="dropdown"
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            onKeyDown={onListKeyDown}
            initial={{ 
              opacity: 0, 
              scale: 0.95,
              y: placement === "down" ? -10 : 10
            }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              y: 0
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.95,
              y: placement === "down" ? -10 : 10
            }}
            transition={{ 
              duration: 0.2,
              ease: [0.4, 0, 0.2, 1]
            }}
            style={{
              position: "fixed",
              top: placement === "down" ? anchor.bottom + 8 : anchor.top - 8,
              left: anchor.left,
              width: anchor.width,
              zIndex: 9999,
              transformOrigin: placement === "down" ? "top" : "bottom",
            }}
            className="rounded-md border-2 border-border bg-card text-foreground shadow-xl"
          >
          {searchable && (
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full px-3 py-2 rounded-md bg-input border-2 border-border text-sm focus:outline-none focus:border-primary"
              />
            </div>
          )}

          <div className="max-h-60 overflow-y-auto overflow-x-hidden py-1">
            {filtered.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-3 py-2 text-sm text-muted-foreground"
              >
                No results
              </motion.div>
            )}
            {filtered.map((opt, idx) => {
              const isSelected = value === opt.value;
              const isActive = idx === activeIndex;
              const base =
                "px-3 py-2 cursor-pointer text-sm flex flex-col gap-0.5 transition-colors duration-150";
              const enabled =
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isActive
                  ? "bg-input"
                  : "";
              const disabledCls =
                "opacity-60 cursor-not-allowed";

              return (
                <motion.div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={!!opt.disabled}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => !opt.disabled && commitIndex(idx)}
                  className={[base, opt.disabled ? disabledCls : enabled].join(" ")}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ 
                    duration: 0.15,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  whileHover={!opt.disabled ? { x: 4 } : {}}
                >
                  <span>{opt.label}</span>
                  {opt.description && (
                    <span className="text-xs text-muted-foreground">
                      {opt.description}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
