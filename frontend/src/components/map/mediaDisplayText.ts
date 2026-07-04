const SOURCE_FILE_REFERENCE_PATTERN = /(?:^|\s+)Plik źródłowy:\s*[\w .()[\]-]+\.(?:jpe?g|png|webp|heic|heif)\.?/giu;

const SOURCE_FILE_CAPTION_PATTERN =
  /^(?:Dummy (?:zdjęcie|pamiątka):\s*)?[\w .()[\]-]+\.(?:jpe?g|png|webp|heic|heif)$/iu;

type MemoryDisplaySource = {
  author_city: string | null;
  author_name: string | null;
  caption: string | null;
  memory_text: string;
};

export type MapMediaDisplay = {
  body: string | null;
  meta: string | null;
  title: string | null;
};

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

function mapPlaceDescription(description: string | null | undefined) {
  return description?.trim() || null;
}

function mapMemoryMeta(memory: MemoryDisplaySource | null | undefined) {
  if (!memory) {
    return null;
  }

  const authorParts = [memory.author_name?.trim(), memory.author_city?.trim()].filter(Boolean);
  return authorParts.length > 0 ? authorParts.join(", ") : null;
}

export function mapMediaDisplay(
  kind: "memory" | "photo",
  caption: string | null | undefined,
  placeDescription?: string | null,
  memory?: MemoryDisplaySource | null,
): MapMediaDisplay {
  const displayCaption = mapMediaCaption(caption);
  if (kind === "photo") {
    const displayBody = mapPlaceDescription(placeDescription);
    return {
      body: displayBody && displayBody !== displayCaption ? displayBody : null,
      meta: null,
      title: displayCaption,
    };
  }

  const memoryCaption = mapMediaCaption(memory?.caption ?? caption);
  const memoryBody = memory ? mapMemoryText(memory.memory_text) : null;
  return {
    body: memoryBody && memoryBody !== memoryCaption ? memoryBody : null,
    meta: mapMemoryMeta(memory),
    title: memoryCaption,
  };
}
