import { Play, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AudioAttachment } from "../../api/types";
import { AudioAttachmentPlayer } from "../ui/AudioAttachmentPlayer";

type AudioPlaybackEventType = "ended" | "pause" | "play";

type AudioControlPlaybackState = {
  isExpanded: boolean;
  isPlaying: boolean;
};

export function audioControlPlaybackStateAfterEvent(
  eventType: AudioPlaybackEventType,
  currentState: AudioControlPlaybackState,
): AudioControlPlaybackState {
  if (eventType === "ended") {
    return { isExpanded: false, isPlaying: false };
  }

  if (eventType === "pause") {
    return { ...currentState, isPlaying: false };
  }

  return { isExpanded: true, isPlaying: true };
}

export function PhotoDetailAudioControl({ audio }: { audio: AudioAttachment | null }) {
  const controlRef = useRef<HTMLDivElement>(null);
  const playbackStateRef = useRef<AudioControlPlaybackState>({ isExpanded: false, isPlaying: false });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const setPlaybackState = useCallback((nextState: AudioControlPlaybackState) => {
    playbackStateRef.current = nextState;
    setIsExpanded(nextState.isExpanded);
    setIsPlaying(nextState.isPlaying);
  }, []);

  useEffect(() => {
    const player = controlRef.current?.querySelector("audio");
    if (player) {
      player.pause();
      player.currentTime = 0;
    }
    setPlaybackState({ isExpanded: false, isPlaying: false });
  }, [audio?.public_path, setPlaybackState]);

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
        player.pause();
        player.currentTime = 0;
      }
      setPlaybackState({ isExpanded: false, isPlaying: false });
      return;
    }

    setPlaybackState({ ...currentState, isExpanded: true });
    void player?.play().then(
      () => setPlaybackState({ isExpanded: true, isPlaying: true }),
      () => setPlaybackState({ isExpanded: false, isPlaying: false }),
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
