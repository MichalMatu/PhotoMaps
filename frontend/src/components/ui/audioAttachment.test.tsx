import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AudioAttachmentPlayer } from "./AudioAttachmentPlayer";
import { MAX_AUDIO_FILE_BYTES, validateAudioFile } from "./audioAttachment";
import { FileInputControl } from "./FileInputControl";

describe("audio attachment UI helpers", () => {
  it("validates optional audio files before upload", () => {
    expect(validateAudioFile(null)).toBeNull();
    expect(validateAudioFile(new File([], "empty.mp3", { type: "audio/mpeg" }))).toBe("Plik audio jest pusty.");
    expect(validateAudioFile(new File(["audio"], "clip.wav", { type: "audio/wav" }))).toBe("Dodaj plik MP3 albo M4A.");
    expect(
      validateAudioFile(new File(["x".repeat(MAX_AUDIO_FILE_BYTES + 1)], "clip.mp3", { type: "audio/mpeg" })),
    ).toBe("Plik audio może mieć maksymalnie 12 MB.");
  });

  it("renders no player without audio and a native player with audio", () => {
    expect(renderToStaticMarkup(<AudioAttachmentPlayer audio={null} />)).toBe("");

    const markup = renderToStaticMarkup(
      <AudioAttachmentPlayer
        audio={{
          duration_seconds: 1.4,
          mime_type: "audio/mpeg",
          public_path: "/media/photos/audio.mp3",
          size_bytes: 1200,
        }}
      />,
    );

    expect(markup).toContain("audio-attachment-player");
    expect(markup).toContain("controls");
    expect(markup).toContain("/media/photos/audio.mp3");
  });

  it("renders a stable custom file input label", () => {
    const emptyMarkup = renderToStaticMarkup(
      <FileInputControl accept="image/*" file={null} inputKey="image" onChange={() => undefined} />,
    );
    expect(emptyMarkup).toContain("file-input-control");
    expect(emptyMarkup).toContain("Wybierz plik");
    expect(emptyMarkup).toContain("Nie wybrano pliku");

    const selectedMarkup = renderToStaticMarkup(
      <FileInputControl
        accept="audio/mpeg"
        file={new File(["audio"], "audio.mp3", { type: "audio/mpeg" })}
        inputKey="audio"
        onChange={() => undefined}
      />,
    );
    expect(selectedMarkup).toContain("audio.mp3");
  });
});
