"use client";

import { useMemo } from "react";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const PROSE =
  "prose prose-sm max-w-none " +
  "prose-headings:scroll-mt-4 prose-headings:font-bold prose-headings:text-[#0f172a] " +
  "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base " +
  "prose-p:my-2 prose-p:leading-relaxed prose-p:text-[#334155] " +
  "prose-a:text-[#1677ff] prose-a:no-underline hover:prose-a:underline " +
  "prose-strong:font-semibold prose-strong:text-[#0f172a] " +
  "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-[#334155] " +
  "prose-blockquote:border-[#1677ff]/40 prose-blockquote:text-[#64748b] " +
  "prose-code:rounded prose-code:bg-[#f1f5f9] prose-code:px-1 prose-code:py-0.5 " +
  "prose-code:font-normal prose-code:text-[#1677ff] prose-code:before:content-none prose-code:after:content-none " +
  "prose-pre:bg-[#f8fafc] prose-pre:text-[#0f172a] " +
  "prose-hr:border-[#e2e8f0]";

export default function MarkdownContent({
  content,
  className = "",
}: MarkdownContentProps) {
  const html = useMemo(() => {
    if (!content.trim()) return "";
    return marked.parse(content, { async: false }) as string;
  }, [content]);

  if (!html) return null;

  return (
    <article
      className={`${PROSE} ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
