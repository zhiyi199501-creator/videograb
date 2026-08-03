"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { askAboutVideo } from "@/lib/api";
import MarkdownContent from "./MarkdownContent";

interface ChatBoxProps {
  jobId: string;
  disabled?: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatBox({ jobId, disabled }: ChatBoxProps) {
  const t = useTranslations("summary");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || streaming || disabled) return;

    setError("");
    setQuestion("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: q },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);

    try {
      await askAboutVideo(jobId, q, (ev) => {
        if (ev.event === "content" && ev.data.delta) {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = {
                ...last,
                content: last.content + ev.data.delta,
              };
            }
            return next;
          });
        } else if (ev.event === "error") {
          setError(ev.data.message || t("chatFailed"));
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("chatFailed"));
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-72 min-h-[120px] space-y-3 overflow-y-auto rounded-xl bg-[#f8fafc] p-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-[#94a3b8]">
            {t("chatPlaceholderHint")}
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-8 bg-[#1677ff] text-white"
                : "mr-8 bg-white text-[#0f172a] shadow-sm"
            }`}
          >
            {m.role === "assistant" ? (
              m.content ? (
                <MarkdownContent content={m.content} />
              ) : (
                <span className="text-[#94a3b8]">
                  {streaming && i === messages.length - 1 ? "…" : ""}
                </span>
              )
            ) : (
              <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={disabled || streaming}
          placeholder={t("chatPlaceholder")}
          className="flex-1 rounded-full border border-[#e2e8f0] px-4 py-2 text-sm outline-none focus:border-[#1677ff]"
        />
        <button
          type="submit"
          disabled={disabled || streaming || !question.trim()}
          className="shrink-0 rounded-full bg-[#1677ff] px-5 py-2 text-sm font-medium text-white hover:bg-[#4096ff] disabled:opacity-50"
        >
          {streaming ? t("answering") : t("ask")}
        </button>
      </form>
    </div>
  );
}
