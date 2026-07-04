import { describe, expect, it } from "vitest";

import { mapMediaDisplay } from "./mediaDisplayText";

describe("mapMediaDisplay", () => {
  it("uses a photo caption with the place description", () => {
    expect(
      mapMediaDisplay("photo", "Widok od strony rynku", "Historyczne centrum z ratuszem i bocznymi przejściami."),
    ).toEqual({
      body: "Historyczne centrum z ratuszem i bocznymi przejściami.",
      meta: null,
      title: "Widok od strony rynku",
    });
  });

  it("falls back from a technical photo caption to the place description", () => {
    expect(mapMediaDisplay("photo", "Dummy zdjęcie: IMG_1234.jpg", "Opis miejsca.")).toEqual({
      body: "Opis miejsca.",
      meta: null,
      title: null,
    });
  });

  it("uses memory caption, text and author metadata", () => {
    expect(
      mapMediaDisplay("memory", "Wieczorne światło", null, {
        author_city: "Wrocław",
        author_name: "Marta",
        caption: "Wieczorne światło",
        memory_text: "Krótki spacer po pracy.",
      }),
    ).toEqual({
      body: "Krótki spacer po pracy.",
      meta: "Marta, Wrocław",
      title: "Wieczorne światło",
    });
  });

  it("removes source file references from memory text and keeps the memory caption", () => {
    expect(
      mapMediaDisplay("memory", "Wieczorne światło", null, {
        author_city: null,
        author_name: null,
        caption: "Wieczorne światło",
        memory_text: "Plik źródłowy: IMG_1234.jpg.",
      }),
    ).toEqual({
      body: null,
      meta: null,
      title: "Wieczorne światło",
    });
  });
});
