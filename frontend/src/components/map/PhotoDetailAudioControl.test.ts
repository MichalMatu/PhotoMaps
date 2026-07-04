import { describe, expect, it } from "vitest";

import { audioControlPlaybackStateAfterEvent } from "./PhotoDetailAudioControl";

describe("audioControlPlaybackStateAfterEvent", () => {
  it("keeps the audio menu visible when playback is paused by native controls", () => {
    expect(audioControlPlaybackStateAfterEvent("pause", { isExpanded: true, isPlaying: true })).toEqual({
      isExpanded: true,
      isPlaying: false,
    });
  });

  it("keeps the audio menu hidden when a late pause event follows an explicit stop", () => {
    expect(audioControlPlaybackStateAfterEvent("pause", { isExpanded: false, isPlaying: false })).toEqual({
      isExpanded: false,
      isPlaying: false,
    });
  });

  it("closes the audio menu after the attachment ends", () => {
    expect(audioControlPlaybackStateAfterEvent("ended", { isExpanded: true, isPlaying: true })).toEqual({
      isExpanded: false,
      isPlaying: false,
    });
  });

  it("shows the audio menu when playback starts", () => {
    expect(audioControlPlaybackStateAfterEvent("play", { isExpanded: false, isPlaying: false })).toEqual({
      isExpanded: true,
      isPlaying: true,
    });
  });
});
