import { describe, expect, it } from "vitest";

import { ambientAudioVolumeAtElapsedMs, audioControlPlaybackStateAfterEvent } from "./PhotoDetailAudioControl";

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

  it("keeps ambient autoplay hidden when playback starts", () => {
    expect(
      audioControlPlaybackStateAfterEvent("play", {
        isExpanded: false,
        isPlaying: false,
        playbackMode: "ambient",
      }),
    ).toEqual({
      isExpanded: false,
      isPlaying: true,
      playbackMode: "ambient",
    });
  });
});

describe("ambientAudioVolumeAtElapsedMs", () => {
  it("ramps volume from silence to the ambient target", () => {
    expect(ambientAudioVolumeAtElapsedMs(-100)).toBe(0);
    expect(ambientAudioVolumeAtElapsedMs(2000)).toBeCloseTo(0.11);
    expect(ambientAudioVolumeAtElapsedMs(4000)).toBeCloseTo(0.22);
    expect(ambientAudioVolumeAtElapsedMs(8000)).toBeCloseTo(0.22);
  });
});
