export const AUDIO_FILE_ACCEPT = "audio/flac,audio/mpeg,audio/mp4,audio/x-flac,audio/x-m4a,.flac,.mp3,.m4a";
export const MAX_AUDIO_FILE_BYTES = 12 * 1024 * 1024;

const SUPPORTED_AUDIO_MIME_TYPES = new Set(["audio/flac", "audio/mpeg", "audio/mp4", "audio/x-flac", "audio/x-m4a"]);
const SUPPORTED_AUDIO_SUFFIXES = [".flac", ".mp3", ".m4a"];

function hasSupportedAudioType(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return SUPPORTED_AUDIO_MIME_TYPES.has(type) || SUPPORTED_AUDIO_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

export function validateAudioFile(file: File | null): string | null {
  if (!file) {
    return null;
  }
  if (file.size === 0) {
    return "Plik audio jest pusty.";
  }
  if (file.size > MAX_AUDIO_FILE_BYTES) {
    return "Plik audio może mieć maksymalnie 12 MB.";
  }
  if (!hasSupportedAudioType(file)) {
    return "Dodaj plik MP3, M4A albo FLAC.";
  }
  return null;
}
