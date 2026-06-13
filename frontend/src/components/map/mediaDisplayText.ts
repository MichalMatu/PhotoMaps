const SOURCE_FILE_REFERENCE_PATTERN = /(?:^|\s+)Plik źródłowy:\s*[\w .()[\]-]+\.(?:jpe?g|png|webp|heic|heif)\.?/giu;

const SOURCE_FILE_CAPTION_PATTERN =
  /^(?:Dummy (?:zdjęcie|pamiątka):\s*)?[\w .()[\]-]+\.(?:jpe?g|png|webp|heic|heif)$/iu;

function mapMediaCaption(caption: string | null | undefined): string | null {
  const normalizedCaption = caption?.trim() ?? "";
  return normalizedCaption && !SOURCE_FILE_CAPTION_PATTERN.test(normalizedCaption) ? normalizedCaption : null;
}

function mapMemoryText(memoryText: string): string {
  return memoryText
    .replace(SOURCE_FILE_REFERENCE_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function mapMediaDescription(
  kind: "memory" | "photo",
  caption: string | null | undefined,
  memoryText = "",
): string | null {
  const displayCaption = mapMediaCaption(caption);
  if (kind === "photo") {
    return displayCaption;
  }

  return mapMemoryText(memoryText) || displayCaption;
}
