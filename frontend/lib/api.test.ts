import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatFileSize,
  normalizeVideoUrl,
} from "./api";

describe("normalizeVideoUrl", () => {
  it("adds https for bare domains", () => {
    expect(normalizeVideoUrl("bilibili.com/video/BV1xx")).toBe(
      "https://bilibili.com/video/BV1xx"
    );
  });

  it("keeps existing scheme", () => {
    expect(normalizeVideoUrl("https://example.com/a")).toBe(
      "https://example.com/a"
    );
  });

  it("trims quotes and whitespace", () => {
    expect(normalizeVideoUrl("  'https://example.com/x'  ")).toBe(
      "https://example.com/x"
    );
  });
});

describe("formatFileSize", () => {
  it("handles empty and units", () => {
    expect(formatFileSize(null)).toBe("未知大小");
    expect(formatFileSize(0)).toBe("未知大小");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });
});

describe("formatDuration", () => {
  it("formats mm:ss", () => {
    expect(formatDuration(null)).toBe("");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3600)).toBe("60:00");
  });
});
