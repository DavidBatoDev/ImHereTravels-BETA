import React from "react";
import { CommandItem } from "@/components/ui/command";
import { SearchResult } from "@/types/search";
import { cn } from "@/lib/utils";

interface SearchResultItemProps {
  result: SearchResult;
  onSelect: () => void;
}

const badgeColorMap: Record<string, string> = {
  "spring-green": "bg-spring-green/20 text-spring-green border-spring-green/30",
  "sunglow-yellow": "bg-sunglow-yellow/20 text-vivid-orange border-sunglow-yellow/30",
  "crimson-red": "bg-crimson-red/20 text-crimson-red border-crimson-red/30",
  "royal-purple": "bg-royal-purple/20 text-royal-purple border-royal-purple/30",
  grey: "bg-grey/20 text-grey border-grey/30",
};

export default function SearchResultItem({
  result,
  onSelect,
}: SearchResultItemProps) {
  const Icon = result.icon;
  const badgeColorClass =
    badgeColorMap[result.metadata?.badgeColor || "grey"] ||
    badgeColorMap.grey;

  return (
    <CommandItem
      value={`${result.category}-${result.id}-${result.title}`}
      onSelect={onSelect}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer aria-selected:bg-muted/50 hover:bg-muted/50 transition-colors"
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-foreground truncate">
            {result.title}
          </p>
          {result.metadata?.badge && (
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0",
                badgeColorClass
              )}
            >
              {result.metadata.badge}
            </span>
          )}
        </div>
        {result.subtitle && (
          <p className="text-xs text-muted-foreground truncate">
            {result.subtitle}
          </p>
        )}
      </div>

      {/* Optional date */}
      {result.metadata?.date && (
        <div className="flex-shrink-0 text-xs text-muted-foreground">
          {result.metadata.date}
        </div>
      )}
    </CommandItem>
  );
}
