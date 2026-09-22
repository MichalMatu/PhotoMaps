from pathlib import Path


def replace_once(text: str, old: str, new: str) -> str:
    if old not in text:
        raise RuntimeError(f"expected text not found: {old[:80]!r}")
    return text.replace(old, new, 1)


map_html = Path("frontend/src/components/map/mapHtml.ts")
text = map_html.read_text()
text += '''

const AUDIO_WAVEFORM_HTML = [
  '<svg class="map-audio-waveform" viewBox="0 0 18 18" aria-hidden="true" focusable="false">',
  '<path class="map-audio-waveform-outline" d="M2 9h2l1.2-2.5L7 11l2.2-5L12 12l1.7-3H16" />',
  '<path class="map-audio-waveform-line" d="M2 9h2l1.2-2.5L7 11l2.2-5L12 12l1.7-3H16" />',
  '</svg>',
].join("");

export function audioWaveformHtml(hasAudio: boolean) {
  return hasAudio ? AUDIO_WAVEFORM_HTML : "";
}
'''
map_html.write_text(text)

marker = Path("frontend/src/components/map/PlaceMarker.tsx")
text = marker.read_text()
text = replace_once(text, 'import { escapeAttribute } from "./mapHtml";', 'import { audioWaveformHtml, escapeAttribute } from "./mapHtml";')
text = replace_once(text, '      previewItem.audio ? "has-audio" : null,\n', '')
text = replace_once(text, '      item.audio ? "has-audio" : null,\n', '')
text = replace_once(
    text,
    'html: `<span style="--place-marker-width: ${layout.width}px; --place-marker-height: ${layout.height}px; --place-marker-image: url(\'${imageUrl}\'); ${markerOffsetStyle} ${markerEnterStyle}"></span>`,',
    'html: `<span style="--place-marker-width: ${layout.width}px; --place-marker-height: ${layout.height}px; --place-marker-image: url(\'${imageUrl}\'); ${markerOffsetStyle} ${markerEnterStyle}">${audioWaveformHtml(Boolean(previewItem.audio))}</span>`,',
)
text = replace_once(
    text,
    'html: `<span style="--photo-gallery-image: url(\'${imageUrl}\'); ${galleryMotionStyle(motion)}"></span>`,',
    'html: `<span style="--photo-gallery-image: url(\'${imageUrl}\'); ${galleryMotionStyle(motion)}">${audioWaveformHtml(Boolean(item.audio))}</span>`,',
)
marker.write_text(text)

css = Path("frontend/src/styles/map.css")
text = css.read_text()
old = '''.place-photo-marker.has-audio span::after,
.photo-gallery-marker.has-audio span::after {
  background: var(--surface-media-glass-action);
  border: 1px solid var(--border-on-media-subtle);
  border-radius: var(--radius-full);
  bottom: var(--space-1);
  box-shadow: var(--shadow-media-glass-action);
  content: "";
  height: var(--space-3);
  position: absolute;
  right: var(--space-1);
  width: var(--space-3);
}
'''
new = '''.map-audio-waveform {
  bottom: var(--space-1);
  height: var(--space-3);
  left: var(--space-1);
  pointer-events: none;
  position: absolute;
  width: var(--space-4);
}

.map-audio-waveform path {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.map-audio-waveform-outline {
  stroke: var(--content-on-media-glass-note);
  stroke-width: 3.8;
}

.map-audio-waveform-line {
  stroke: var(--content-on-media);
  stroke-width: 1.8;
}
'''
text = replace_once(text, old, new)
css.write_text(text)

Path("frontend/src/components/map/mapHtml.test.ts").write_text('''import { describe, expect, it } from "vitest";

import { audioWaveformHtml, escapeAttribute } from "./mapHtml";

describe("mapHtml", () => {
  it("escapes attribute-sensitive characters", () => {
    expect(escapeAttribute(`a&b\\"c'd<e`)).toBe("a&amp;b&quot;c&#39;d&lt;e");
  });

  it("renders a background-free waveform only for media with audio", () => {
    expect(audioWaveformHtml(false)).toBe("");

    const html = audioWaveformHtml(true);
    expect(html).toContain('class="map-audio-waveform"');
    expect(html).toContain('class="map-audio-waveform-outline"');
    expect(html).toContain('class="map-audio-waveform-line"');
    expect(html).not.toContain("background");
  });
});
''')

product = Path("docs/product-direction.md")
text = product.read_text()
todo = "- wskaznik audio na miniaturkach mapy: zastapic obecna kropke malym symbolem fali dzwiekowej bez tla; ma informowac o warstwie audio, a nie udawac osobny przycisk play.\n"
text = replace_once(text, todo, "")
product.write_text(text)
