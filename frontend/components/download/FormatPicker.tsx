"use client";

import { useTranslations } from "next-intl";
import { FormatInfo, formatFileSize } from "@/lib/api";

interface Props {
  formats: FormatInfo[];
  selected: string;
  onSelect: (formatId: string) => void;
}

export default function FormatPicker({ formats, selected, onSelect }: Props) {
  const t = useTranslations("download");
  const videoFormats = formats.filter((f) => f.vcodec !== "none");
  const fastestId =
    videoFormats.length > 0
      ? videoFormats.reduce((best, f) =>
          (f.filesize ?? Number.MAX_SAFE_INTEGER) <
          (best.filesize ?? Number.MAX_SAFE_INTEGER)
            ? f
            : best
        ).format_id
      : null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-[#0f172a]">{t("formatLabel")}</label>
      <p className="text-xs text-[#94a3b8]">{t("formatHint")}</p>
      <div className="space-y-2">
        {formats.map((f) => (
          <label
            key={f.format_id}
            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors ${
              selected === f.format_id
                ? "border-[#1677ff] bg-[#1677ff]/5"
                : "border-[#f0f1f2] hover:border-[#1677ff]/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="format"
                value={f.format_id}
                checked={selected === f.format_id}
                onChange={() => onSelect(f.format_id)}
                className="accent-[#1677ff]"
              />
              <div>
                <span className="text-sm font-medium text-[#0f172a]">
                  {f.label}
                </span>
                {f.format_id === fastestId && (
                  <span className="ml-2 rounded-full bg-[#1677ff]/10 px-2 py-0.5 text-[10px] font-medium text-[#1677ff]">
                    {t("recommendedFaster")}
                  </span>
                )}
                <span className="ml-2 text-xs text-[#94a3b8]">
                  {f.ext.toUpperCase()}
                </span>
              </div>
            </div>
            <span className="text-xs text-[#64748b]">
              {formatFileSize(f.filesize)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
