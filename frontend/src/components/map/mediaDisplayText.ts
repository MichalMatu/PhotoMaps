const SOURCE_FILE_REFERENCE_PATTERN = /(?:^|\s+)Plik źródłowy:\s*[\w .()[\]-]+\.(?:jpe?g|png|webp|heic|heif)\.?/giu;

const SOURCE_FILE_CAPTION_PATTERN =
  /^(?:Dummy (?:zdjęcie|pamiątka):\s*)?[\w .()[\]-]+\.(?:jpe?g|png|webp|heic|heif)$/iu;

export function mapMediaCaption(caption: string | null | undefined): string | null {
  const normalizedCaption = caption?.trim() ?? "";
  return normalizedCaption && !SOURCE_FILE_CAPTION_PATTERN.test(normalizedCaption) ? normalizedCaption : null;
}

export function mapMemoryText(memoryText: string): string {
  return memoryText
    .replace(SOURCE_FILE_REFERENCE_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
