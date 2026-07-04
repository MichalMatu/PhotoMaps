import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { TtsButton } from "./TtsButton";
import { TtsProvider } from "./TtsProvider";

function renderTtsButton(text: string | null, props: Partial<Parameters<typeof TtsButton>[0]> = {}) {
  return renderToStaticMarkup(
    <TtsProvider>
      <TtsButton text={text} ttsKey="route:test" {...props} />
    </TtsProvider>,
  );
}

function speechSynthesisStub(
  voices: Partial<SpeechSynthesisVoice>[] = [{ default: true, lang: "pl-PL", name: "Polski" }],
) {
  return {
    addEventListener: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => voices),
    removeEventListener: vi.fn(),
    resume: vi.fn(),
    speak: vi.fn(),
  };
}

describe("TtsButton", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not render when speech synthesis is unsupported", () => {
    expect(renderTtsButton("Tekst trasy")).toBe("");
  });

  it("does not render for empty text", () => {
    vi.stubGlobal("window", {
      SpeechSynthesisUtterance: function SpeechSynthesisUtterance() {
        return {};
      },
      speechSynthesis: speechSynthesisStub(),
    });

    expect(renderTtsButton("  ")).toBe("");
  });

  it("does not render when speech synthesis has no available voices", () => {
    vi.stubGlobal("window", {
      SpeechSynthesisUtterance: function SpeechSynthesisUtterance() {
        return {};
      },
      speechSynthesis: speechSynthesisStub([]),
    });

    expect(renderTtsButton("Tekst trasy")).toBe("");
  });

  it("renders an accessible read action when text and speech synthesis are available", () => {
    vi.stubGlobal("window", {
      SpeechSynthesisUtterance: function SpeechSynthesisUtterance() {
        return {};
      },
      speechSynthesis: speechSynthesisStub(),
    });

    const markup = renderTtsButton("Tekst trasy");

    expect(markup).toContain("tts-button");
    expect(markup).toContain('aria-label="Odczytaj tekst"');
    expect(markup).toContain("Odczytaj tekst");
  });

  it("renders an icon-only action without visible label text", () => {
    vi.stubGlobal("window", {
      SpeechSynthesisUtterance: function SpeechSynthesisUtterance() {
        return {};
      },
      speechSynthesis: speechSynthesisStub(),
    });

    const markup = renderTtsButton("Opis zdjęcia", {
      className: "system-modal-icon-action",
      iconOnly: true,
      label: "Odczytaj opis zdjęcia",
    });

    expect(markup).toContain("tts-button--icon");
    expect(markup).toContain("system-modal-icon-action");
    expect(markup).toContain('aria-label="Odczytaj opis zdjęcia"');
    expect(markup).not.toContain(">Odczytaj opis zdjęcia<");
  });
});
