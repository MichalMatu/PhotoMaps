export function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
}

const AUDIO_WAVEFORM_PATH = "M2 9h2l1.2-2.5L7 11l2.2-5L12 12l1.7-3H16";

export function audioWaveformHtml(hasAudio: boolean, isPlaying = false) {
  if (!hasAudio) {
    return "";
  }

  const className = isPlaying ? "map-audio-waveform is-playing" : "map-audio-waveform";
  return [
    `<svg class="${className}" viewBox="0 0 18 18" aria-hidden="true" focusable="false">`,
    `<path class="map-audio-waveform-outline" d="${AUDIO_WAVEFORM_PATH}" />`,
    `<path class="map-audio-waveform-line" d="${AUDIO_WAVEFORM_PATH}" />`,
    "</svg>",
  ].join("");
}
