import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MemoryUploadForm } from "./MemoryUploadForm";

const noop = () => undefined;

describe("MemoryUploadForm", () => {
  it("renders inline help and keeps validation descriptions wired", () => {
    const markup = renderToStaticMarkup(
      <MemoryUploadForm
        audioFile={null}
        authorCity=""
        authorName=""
        caption=""
        fieldErrors={{ caption: "Podpis jest wymagany.", file: "Dodaj zdjęcie pamiątki." }}
        file={null}
        fileInputKey={1}
        hasConsent={false}
        isSaving={false}
        isSubmitDisabled={false}
        memoryText=""
        onAudioFileChange={noop}
        onAuthorCityChange={noop}
        onAuthorNameChange={noop}
        onCaptionChange={noop}
        onConsentChange={noop}
        onFileChange={noop}
        onMemoryTextChange={noop}
        onSubmit={noop}
      />,
    );

    expect(markup).toContain("ui-setting-field-inline-help");
    expect(markup).toContain('id="memory-photo-file-hint"');
    expect(markup).toContain('id="memory-caption-hint"');
    expect(markup).toContain('aria-describedby="memory-caption-error memory-caption-hint"');
    expect(markup).toContain('aria-describedby="memory-file-error memory-photo-file-hint"');
  });
});
