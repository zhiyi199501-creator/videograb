import { describe, expect, it, vi } from "vitest";
import {
  formatDuration,
  formatFileSize,
  normalizeVideoUrl,
  startDownload,
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
    expect(formatFileSize(null)).toBe("Unknown size");
    expect(formatFileSize(0)).toBe("Unknown size");
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

describe("startDownload", () => {
  it("sends bearer token when logged in", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: () => "token-123" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ job_id: "job-1", status: "downloading" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      await startDownload("job-1", "fmt-1");
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/jobs/job-1/download");
      expect(init.headers.Authorization).toBe("Bearer token-123");
      expect(init.headers["Content-Type"]).toBe("application/json");
      expect(init.headers["Accept-Language"]).toBe("zh");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
