import { describe, expect, it } from "vitest";

import { audioWaveformHtml, escapeAttribute } from "./mapHtml";

describe("mapHtml", () => {
  it("escapes attribute-sensitive characters", () => {
    expect(escapeAttribute(`a&b"c'd<e`)).toBe("a&amp;b&quot;c&#39;d&lt;e");
  });

  it("renders a background-free waveform only for media with audio", () => {
    expect(audioWaveformHtml(false)).toBe("");

    const html = audioWaveformHtml(true);
    expect(html).toContain('class="map-audio-waveform"');
    expect(html).toContain('class="map-audio-waveform-outline"');
    expect(html).toContain('class="map-audio-waveform-line"');
    expect(html).not.toContain("background");
  });

  it("marks only the actively playing waveform", () => {
    expect(audioWaveformHtml(true, true)).toContain('class="map-audio-waveform is-playing"');
    expect(audioWaveformHtml(true, false)).not.toContain("is-playing");
    expect(audioWaveformHtml(false, true)).toBe("");
  });
});
