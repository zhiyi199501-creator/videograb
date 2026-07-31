import { describe, expect, it } from "vitest";
import { mergeJobProgress } from "./jobProgress";

describe("mergeJobProgress", () => {
  it("allows download phase to reset after extract finished at 100%", () => {
    expect(mergeJobProgress(1, 0.05, "downloading")).toBe(0.05);
  });

  it("still only increases within a download", () => {
    expect(mergeJobProgress(0.2, 0.45, "downloading")).toBe(0.45);
    expect(mergeJobProgress(0.45, 0.3, "downloading")).toBe(0.45);
  });

  it("keeps max during extract/ready", () => {
    expect(mergeJobProgress(0.1, 1, "ready")).toBe(1);
    expect(mergeJobProgress(0.5, 0.2, "extracting")).toBe(0.5);
  });
});
