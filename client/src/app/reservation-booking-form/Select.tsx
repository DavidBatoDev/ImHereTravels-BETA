"use client";
import React from "react";
import { createPortal } from "react-dom";

export type Option = {
  label: string;
  value: string;
  disabled?: boolean;
  description?: string; // small helper text under label
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
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  const selected = options.find(o => o.value === value) ?? null;
  const filtered = searchable
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
      document.body.style.overflow = prev;
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
        className={`w-full text-left px-4 py-3 rounded-md bg-input border border-border text-foreground
                    focus:outline-none focus:border-primary disabled:opacity-50`}
      >
        {selected ? selected.label : <span className="text-muted-foreground">{placeholder}</span>}
      </button>

      {open && anchor && createPortal(
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          style={{
            position: "fixed",
            top: placement === "down" ? anchor.bottom + 8 : anchor.top - 8,
            left: anchor.left,
            width: anchor.width,
            zIndex: 9999,
            transformOrigin: placement === "down" ? "top" : "bottom",
          }}
          className={[
            "rounded-md border border-border bg-card text-foreground shadow-xl",
            "transition-all duration-150 transform",
            "scale-95 opacity-0 data-[show=true]:scale-100 data-[show=true]:opacity-100"
          ].join(" ")}
          data-show={open}
        >
          {searchable && (
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:border-primary"
              />
            </div>
          )}

          <div className="max-h-60 overflow-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
            )}
            {filtered.map((opt, idx) => {
              const isSelected = value === opt.value;
              const isActive = idx === activeIndex;
              const base =
                "px-3 py-2 cursor-pointer text-sm flex flex-col gap-0.5";
              const enabled =
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isActive
                  ? "bg-input"
                  : "";
              const disabledCls =
                "opacity-60 cursor-not-allowed";

              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={!!opt.disabled}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => !opt.disabled && commitIndex(idx)}
                  className={[base, opt.disabled ? disabledCls : enabled].join(" ")}
                >
                  <span>{opt.label}</span>
                  {opt.description && (
                    <span className="text-xs text-muted-foreground">
                      {opt.description}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
