export function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
}


const AUDIO_WAVEFORM_HTML = [
  '<svg class="map-audio-waveform" viewBox="0 0 18 18" aria-hidden="true" focusable="false">',
  '<path class="map-audio-waveform-outline" d="M2 9h2l1.2-2.5L7 11l2.2-5L12 12l1.7-3H16" />',
  '<path class="map-audio-waveform-line" d="M2 9h2l1.2-2.5L7 11l2.2-5L12 12l1.7-3H16" />',
  '</svg>',
].join("");

export function audioWaveformHtml(hasAudio: boolean) {
  return hasAudio ? AUDIO_WAVEFORM_HTML : "";
}
