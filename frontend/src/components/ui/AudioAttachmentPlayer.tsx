import { Volume2 } from "lucide-react";

import { mediaUrl } from "../../api/http";
import type { AudioAttachment } from "../../api/types";

type Props = {
  audio: AudioAttachment | null;
  variant?: "default" | "overlay";
};

export function AudioAttachmentPlayer({ audio, variant = "default" }: Props) {
  if (!audio) {
    return null;
  }

  return (
    <div className={`audio-attachment-player audio-attachment-player--${variant}`}>
      <Volume2 aria-hidden="true" size={16} />
      <audio controls preload="metadata" src={mediaUrl(audio.public_path)}>
        Twoja przeglądarka nie obsługuje odtwarzania audio.
      </audio>
    </div>
  );
}
