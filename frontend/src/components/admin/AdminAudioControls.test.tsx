import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminAudioControls } from "./AdminAudioControls";

const noop = async () => undefined;

describe("AdminAudioControls", () => {
  it("renders add audio actions without an attachment", () => {
    const markup = renderToStaticMarkup(
      <AdminAudioControls
        audio={null}
        inputKeyPrefix="photo-audio"
        onDeleteAudio={noop}
        onError={() => undefined}
        onSaveAudio={noop}
      />,
    );

    expect(markup).toContain("Dodaj audio");
    expect(markup).toContain("Wybierz plik");
    expect(markup).not.toContain("Usuń audio");
  });

  it("keeps compact media controls free of field help chrome", () => {
    const markup = renderToStaticMarkup(
      <AdminAudioControls
        audio={null}
        inputKeyPrefix="photo-audio"
        mode="compact"
        onDeleteAudio={noop}
        onError={() => undefined}
        onSaveAudio={noop}
      />,
    );

    expect(markup).toContain("admin-audio-controls--compact");
    expect(markup).toContain("Dodaj audio");
    expect(markup).not.toContain("Pokaż opis pola: Audio");
    expect(markup).not.toContain("Audio do medium");
  });

  it("renders replace and delete actions for an existing attachment", () => {
    const markup = renderToStaticMarkup(
      <AdminAudioControls
        audio={{
          duration_seconds: 1.25,
          mime_type: "audio/mpeg",
          public_path: "/media/photos/audio.mp3",
          size_bytes: 1234,
        }}
        inputKeyPrefix="photo-audio"
        onDeleteAudio={noop}
        onError={() => undefined}
        onSaveAudio={noop}
      />,
    );

    expect(markup).toContain("Podmień audio");
    expect(markup).toContain("Usuń audio");
    expect(markup).toContain("/media/photos/audio.mp3");
  });
});
