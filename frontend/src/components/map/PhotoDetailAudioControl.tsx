import { Play, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AudioAttachment } from "../../api/types";
import { AudioAttachmentPlayer } from "../ui/AudioAttachmentPlayer";

type AudioPlaybackEventType = "ended" | "pause" | "play";
type AudioPlaybackMode = "ambient" | "manual";

type AudioControlPlaybackState = {
  isExpanded: boolean;
  isPlaying: boolean;
  playbackMode?: AudioPlaybackMode;
};

const AMBIENT_AUDIO_FADE_IN_MS = 4000;
const AMBIENT_AUDIO_TARGET_VOLUME = 0.22;

function audioControlState(
  isExpanded: boolean,
  isPlaying: boolean,
  playbackMode?: AudioPlaybackMode,
): AudioControlPlaybackState {
  return playbackMode ? { isExpanded, isPlaying, playbackMode } : { isExpanded, isPlaying };
}

export function ambientAudioVolumeAtElapsedMs(
  elapsedMs: number,
  targetVolume = AMBIENT_AUDIO_TARGET_VOLUME,
  fadeInMs = AMBIENT_AUDIO_FADE_IN_MS,
) {
  const safeTargetVolume = Math.max(0, Math.min(1, targetVolume));
  if (fadeInMs <= 0) {
    return safeTargetVolume;
  }

  const progress = Math.max(0, Math.min(1, elapsedMs / fadeInMs));
  return safeTargetVolume * progress;
}

export function audioControlPlaybackStateAfterEvent(
  eventType: AudioPlaybackEventType,
  currentState: AudioControlPlaybackState,
): AudioControlPlaybackState {
  if (eventType === "ended") {
    return audioControlState(false, false);
  }

  if (eventType === "pause") {
    return audioControlState(currentState.isExpanded, false);
  }

  if (currentState.playbackMode === "ambient") {
    return audioControlState(currentState.isExpanded, true, "ambient");
  }

  return audioControlState(true, true, currentState.playbackMode);
}

export function PhotoDetailAudioControl({
  audio,
  isAutoplayEnabled,
}: {
  audio: AudioAttachment | null;
  isAutoplayEnabled: boolean;
}) {
  const controlRef = useRef<HTMLDivElement>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const playbackStateRef = useRef<AudioControlPlaybackState>(audioControlState(false, false));
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const setPlaybackState = useCallback((nextState: AudioControlPlaybackState) => {
    playbackStateRef.current = nextState;
    setIsExpanded(nextState.isExpanded);
    setIsPlaying(nextState.isPlaying);
  }, []);
  const stopAmbientFadeIn = useCallback(() => {
    if (fadeFrameRef.current !== null) {
      window.cancelAnimationFrame(fadeFrameRef.current);
      fadeFrameRef.current = null;
    }
  }, []);
  const resetAudioPlayer = useCallback(
    (player: HTMLAudioElement, resetTime = true) => {
      stopAmbientFadeIn();
      player.pause();
      player.loop = false;
      player.volume = 1;
      if (resetTime) {
        player.currentTime = 0;
      }
    },
    [stopAmbientFadeIn],
  );
  const startAmbientFadeIn = useCallback(
    (player: HTMLAudioElement) => {
      stopAmbientFadeIn();
      const startedAt = performance.now();
      player.volume = 0;

      const updateVolume = (timestamp: number) => {
        const elapsedMs = timestamp - startedAt;
        player.volume = ambientAudioVolumeAtElapsedMs(elapsedMs);
        if (elapsedMs < AMBIENT_AUDIO_FADE_IN_MS && !player.paused) {
          fadeFrameRef.current = window.requestAnimationFrame(updateVolume);
          return;
        }
        fadeFrameRef.current = null;
      };

      fadeFrameRef.current = window.requestAnimationFrame(updateVolume);
    },
    [stopAmbientFadeIn],
  );

  useEffect(() => {
    const player = controlRef.current?.querySelector("audio");
    if (player) {
      resetAudioPlayer(player);
    }
    setPlaybackState(audioControlState(false, false));

    return () => {
      if (player) {
        resetAudioPlayer(player);
      } else {
        stopAmbientFadeIn();
      }
    };
  }, [audio?.public_path, resetAudioPlayer, setPlaybackState, stopAmbientFadeIn]);

  useEffect(() => {
    const player = controlRef.current?.querySelector("audio");
    if (!audio || !player) {
      return;
    }

    if (!isAutoplayEnabled) {
      if (playbackStateRef.current.playbackMode === "ambient") {
        resetAudioPlayer(player);
        setPlaybackState(audioControlState(false, false));
      }
      return;
    }

    player.loop = true;
    player.volume = 0;
    let isActive = true;
    setPlaybackState(audioControlState(false, false, "ambient"));
    void player.play().then(
      () => {
        if (!isActive) {
          return;
        }
        startAmbientFadeIn(player);
        setPlaybackState(audioControlState(false, true, "ambient"));
      },
      () => {
        if (!isActive) {
          return;
        }
        resetAudioPlayer(player);
        setPlaybackState(audioControlState(false, false));
      },
    );

    return () => {
      isActive = false;
      if (playbackStateRef.current.playbackMode === "ambient") {
        resetAudioPlayer(player);
        setPlaybackState(audioControlState(false, false));
      }
    };
  }, [audio, audio?.public_path, isAutoplayEnabled, resetAudioPlayer, setPlaybackState, startAmbientFadeIn]);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (!target || controlRef.current?.contains(target)) {
        return;
      }

      setPlaybackState({ ...playbackStateRef.current, isExpanded: false });
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isExpanded, setPlaybackState]);

  useEffect(() => {
    const player = controlRef.current?.querySelector("audio");
    if (!player) {
      return;
    }

    const syncPlaybackState = (eventType: AudioPlaybackEventType) => {
      setPlaybackState(audioControlPlaybackStateAfterEvent(eventType, playbackStateRef.current));
    };

    const handleEnded = () => syncPlaybackState("ended");
    const handlePause = () => syncPlaybackState("pause");
    const handlePlay = () => syncPlaybackState("play");

    player.addEventListener("ended", handleEnded);
    player.addEventListener("pause", handlePause);
    player.addEventListener("play", handlePlay);

    return () => {
      player.removeEventListener("ended", handleEnded);
      player.removeEventListener("pause", handlePause);
      player.removeEventListener("play", handlePlay);
    };
  }, [audio?.public_path, setPlaybackState]);

  if (!audio) {
    return null;
  }

  const handleToggle = () => {
    const player = controlRef.current?.querySelector("audio");
    const currentState = playbackStateRef.current;

    if (currentState.isPlaying) {
      if (player) {
        resetAudioPlayer(player);
      }
      setPlaybackState(audioControlState(false, false));
      return;
    }

    if (player) {
      player.loop = false;
      player.volume = 1;
    }
    setPlaybackState(audioControlState(true, false, "manual"));
    void player?.play().then(
      () => setPlaybackState(audioControlState(true, true, "manual")),
      () => setPlaybackState(audioControlState(false, false)),
    );
  };

  return (
    <div className="photo-detail-audio-control" ref={controlRef}>
      <button
        className="system-modal-icon-action photo-detail-audio-toggle"
        type="button"
        aria-expanded={isExpanded}
        aria-label={isPlaying ? "Zatrzymaj audio" : "Pokaż audio"}
        title={isPlaying ? "Zatrzymaj audio" : "Pokaż audio"}
        onClick={handleToggle}
      >
        {isPlaying ? <Square aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={18} />}
      </button>
      <div className="photo-detail-audio-menu" hidden={!isExpanded}>
        <AudioAttachmentPlayer audio={audio} variant="overlay" />
      </div>
    </div>
  );
}
