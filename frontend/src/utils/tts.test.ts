import { describe, expect, it } from "vitest";

import { normalizeSpeechText, splitSpeechText } from "./tts";

describe("tts helpers", () => {
  it("normalizes repeated whitespace", () => {
    expect(normalizeSpeechText("  Trasa\n\nz   detalami\tpo deszczu. ")).toBe("Trasa z detalami po deszczu.");
  });

  it("returns no chunks for empty text", () => {
    expect(splitSpeechText(" \n\t ")).toEqual([]);
  });

  it("keeps short text in one chunk", () => {
    expect(splitSpeechText("Pierwsze zdanie. Drugie zdanie.", 120)).toEqual([
      { id: 0, text: "Pierwsze zdanie. Drugie zdanie." },
    ]);
  });

  it("splits longer text on sentence boundaries", () => {
    expect(splitSpeechText("Pierwsze krótkie zdanie. Drugie krótkie zdanie. Trzecie krótkie zdanie.", 34)).toEqual([
      { id: 0, text: "Pierwsze krótkie zdanie." },
      { id: 1, text: "Drugie krótkie zdanie." },
      { id: 2, text: "Trzecie krótkie zdanie." },
    ]);
  });
});
