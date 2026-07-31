import { describe, expect, it } from "vitest";
import {
  formatSrtTime,
  formatVttTime,
  parseSubtitleText,
  safeFilename,
  segmentsToSrt,
  segmentsToTxt,
  segmentsToVtt,
} from "./subtitleFormat";

const sample = [
  { start: 1, end: 3.5, text: "Hello" },
  { start: 4, end: 5, text: "World" },
];

describe("time formatters", () => {
  it("formats srt and vtt timestamps", () => {
    expect(formatSrtTime(1)).toBe("00:00:01,000");
    expect(formatVttTime(1)).toBe("00:00:01.000");
  });
});

describe("segment exporters", () => {
  it("builds srt / vtt / txt", () => {
    const srt = segmentsToSrt(sample);
    expect(srt).toContain("1\n00:00:01,000 --> 00:00:03,500\nHello");
    expect(srt).toContain("2\n00:00:04,000 --> 00:00:05,000\nWorld");

    const vtt = segmentsToVtt(sample);
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt).toContain("00:00:01.000 --> 00:00:03.500\nHello");

    const txt = segmentsToTxt(sample);
    expect(txt).toContain("[00:00:01.000] Hello");
    expect(txt).toContain("[00:00:04.000] World");
  });
});

describe("safeFilename", () => {
  it("strips unsafe characters", () => {
    expect(safeFilename('a/b:c*?.mp4')).toBe("a_b_c_.mp4");
    expect(safeFilename("   ", "fallback")).toBe("fallback");
  });
});

describe("parseSubtitleText", () => {
  it("parses bracket timestamps", () => {
    const segs = parseSubtitleText(
      "[01:05] first line\n[1:02:03] second line\nnoise"
    );
    expect(segs).toHaveLength(2);
    expect(segs[0].start).toBe(65);
    expect(segs[0].text).toBe("first line");
    expect(segs[1].start).toBe(3723);
    expect(segs[1].text).toBe("second line");
  });
});
