import { describe, expect, it } from "vitest";

import { mapMediaDescription } from "./mediaDisplayText";

describe("mapMediaDescription", () => {
  it("uses the caption for an editorial photo", () => {
    expect(mapMediaDescription("photo", "Widok od strony rynku")).toBe("Widok od strony rynku");
  });

  it("prefers memory text over the memory caption", () => {
    expect(mapMediaDescription("memory", "Wieczorne światło", "Krótki spacer po pracy.")).toBe(
      "Krótki spacer po pracy.",
    );
  });

  it("falls back to the memory caption and removes source file references", () => {
    expect(mapMediaDescription("memory", "Wieczorne światło", "Plik źródłowy: IMG_1234.jpg.")).toBe(
      "Wieczorne światło",
    );
  });

  it("does not expose technical dummy file captions", () => {
    expect(mapMediaDescription("photo", "Dummy zdjęcie: IMG_1234.jpg")).toBeNull();
  });
});
