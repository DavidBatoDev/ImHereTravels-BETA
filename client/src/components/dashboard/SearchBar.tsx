"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { FiSearch, FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = "Search bookings, customers...",
  className = "",
}: SearchBarProps) {
  return (
    <div className={cn("relative w-full max-w-xl", className)}>
      <span className="absolute inset-y-0 left-0 flex items-center pl-3">
        <FiSearch className="h-4 w-4 text-muted-foreground" />
      </span>

      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="bg-muted pl-10 pr-10 md:pl-10 md:pr-10 rounded-full"
      />

      {value && (
        <button
          aria-label="Clear search"
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Clear"
        >
          <FiX className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
