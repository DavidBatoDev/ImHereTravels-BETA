"use client";

import Link from "next/link";
import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  PATCH_NOTES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type PatchNoteCategory,
} from "@/data/patch-notes";
import { Search, ArrowRight, FileText, Tag } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

const ALL_CATEGORIES: PatchNoteCategory[] = [
  "feature",
  "improvement",
  "fix",
  "breaking",
];

export default function PatchNotesPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<PatchNoteCategory | null>(null);

  const sorted = [...PATCH_NOTES].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const filtered = sorted.filter((note) => {
    const matchesSearch =
      !search ||
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      note.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !activeCategory || note.categories.includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-hk-grotesk">
              Patch Notes
            </h1>
            <p className="text-muted-foreground mt-1">
              A record of changes, improvements, and policy updates to the
              system.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{PATCH_NOTES.length} entries</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patch notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                !activeCategory
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All
            </button>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  setActiveCategory(activeCategory === cat ? null : cat)
                }
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? CATEGORY_COLORS[cat]
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No patch notes found</p>
            <p className="text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((note) => (
              <Link
                key={note.slug}
                href={`/patch-notes/${note.slug}`}
                className="block group"
              >
                <Card className="border-border transition-all duration-200 hover:border-primary/50 hover:shadow-md cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <time
                            dateTime={note.date}
                            className="text-xs text-muted-foreground font-mono"
                          >
                            {formatDate(note.date)}
                          </time>
                          {note.version && (
                            <Badge variant="outline" className="text-xs font-mono">
                              v{note.version}
                            </Badge>
                          )}
                          {note.categories.map((cat) => (
                            <span
                              key={cat}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[cat]}`}
                            >
                              {CATEGORY_LABELS[cat]}
                            </span>
                          ))}
                        </div>
                        <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                          {note.title}
                        </CardTitle>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm leading-relaxed line-clamp-2">
                      {note.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
