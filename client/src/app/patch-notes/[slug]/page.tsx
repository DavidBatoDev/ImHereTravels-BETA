"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getPatchNote,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from "@/data/patch-notes";
import { ArrowLeft, Calendar, Tag } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function PatchNoteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const note = getPatchNote(slug);

  if (!note) notFound();

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        {/* Back */}
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/patch-notes">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            All patch notes
          </Link>
        </Button>

        {/* Header */}
        <div className="space-y-3 pb-6 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <time dateTime={note.date}>{formatDate(note.date)}</time>
            </div>
            {note.version && (
              <Badge variant="outline" className="font-mono text-xs">
                v{note.version}
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground font-hk-grotesk">
            {note.title}
          </h1>

          <p className="text-muted-foreground text-base leading-relaxed">
            {note.description}
          </p>

          <div className="flex items-center gap-2 flex-wrap pt-1">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            {note.categories.map((cat) => (
              <span
                key={cat}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[cat]}`}
              >
                {CATEGORY_LABELS[cat]}
              </span>
            ))}
          </div>
        </div>

        {/* Markdown body */}
        <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-hk-grotesk prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h3:text-base prose-table:text-sm prose-td:py-2 prose-th:py-2 prose-code:text-xs prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-md prose-blockquote:not-italic prose-blockquote:text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {note.content}
          </ReactMarkdown>
        </article>

        {/* Footer nav */}
        <div className="pt-6 border-t border-border">
          <Button variant="outline" asChild>
            <Link href="/patch-notes">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to all patch notes
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
