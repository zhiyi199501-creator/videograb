/** Strip common Markdown markers into plain TXT suitable for clipboard paste. */
export function markdownToPlainText(markdown: string): string {
  let text = markdown.replace(/\r\n/g, "\n");

  // fenced code blocks → keep inner text
  text = text.replace(/```[\w-]*\n?([\s\S]*?)```/g, (_, code: string) =>
    code.replace(/\n+$/, "\n")
  );
  // inline code
  text = text.replace(/`([^`]+)`/g, "$1");
  // images ![alt](url) → alt
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
  // links [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // headings
  text = text.replace(/^#{1,6}\s+/gm, "");
  // blockquotes
  text = text.replace(/^>\s?/gm, "");
  // bold / italic / strike
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/~~(.*?)~~/g, "$1");
  // unordered / ordered list markers
  text = text.replace(/^\s*[-*+]\s+/gm, "• ");
  text = text.replace(/^\s*\d+\.\s+/gm, (m) => m.replace(/^\s*/, ""));
  // horizontal rules
  text = text.replace(/^(-{3,}|\*{3,}|_{3,})\s*$/gm, "");
  // collapse excess blank lines
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}
