import type { ContentBlock, ContentBlockType } from "../../api/types";

export const CONTENT_BLOCK_TYPES: ContentBlockType[] = ["heading", "subheading", "paragraph", "link"];

export function normalizeContentBlocks(blocks: ContentBlock[]) {
  return blocks.flatMap((block): ContentBlock[] => {
    const text = block.text.trim();
    if (block.type === "link") {
      const url = block.url.trim();
      if (!text && !url) return [];
      return [{ type: "link", text, url }];
    }
    if (!text) return [];
    return [{ type: block.type, text }];
  });
}

export function contentBlocksTextForTts(blocks: ContentBlock[], fallbackParts: Array<string | null | undefined> = []) {
  const blockText = normalizeContentBlocks(blocks)
    .map((block) => block.text)
    .join("\n\n");
  if (blockText) return blockText;

  return fallbackParts
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n");
}

export function emptyContentBlock(type: ContentBlockType = "paragraph"): ContentBlock {
  if (type === "link") {
    return { type, text: "", url: "" };
  }
  return { type, text: "" };
}

export function safeContentBlockUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function contentBlockLabel(type: ContentBlockType) {
  if (type === "heading") return "Tytuł";
  if (type === "subheading") return "Sekcja";
  if (type === "link") return "Link";
  return "Akapit";
}
