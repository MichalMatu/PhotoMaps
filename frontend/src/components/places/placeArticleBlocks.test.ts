import { describe, expect, it } from "vitest";

import { articleTextForTts, normalizePlaceArticleBlocks } from "./placeArticleBlocks";

describe("placeArticleBlocks", () => {
  it("trims blocks and drops empty text before saving", () => {
    expect(
      normalizePlaceArticleBlocks([
        { type: "heading", text: "  Tytuł  " },
        { type: "paragraph", text: "   " },
        { type: "paragraph", text: "Treść" },
        { type: "link", text: "  Materiał  ", url: " https://example.com/material " },
        { type: "link", text: "   ", url: "   " },
      ]),
    ).toEqual([
      { type: "heading", text: "Tytuł" },
      { type: "paragraph", text: "Treść" },
      { type: "link", text: "Materiał", url: "https://example.com/material" },
    ]);
  });

  it("builds TTS text from article blocks before using fallback copy", () => {
    expect(
      articleTextForTts(
        [
          { type: "paragraph", text: " Pełny opis " },
          { type: "link", text: " Materiał zewnętrzny ", url: "https://example.com" },
        ],
        ["Krótki opis"],
      ),
    ).toBe("Pełny opis\n\nMateriał zewnętrzny");
    expect(articleTextForTts([], [" Krótki opis ", null, "Komentarz"])).toBe("Krótki opis\n\nKomentarz");
  });
});
