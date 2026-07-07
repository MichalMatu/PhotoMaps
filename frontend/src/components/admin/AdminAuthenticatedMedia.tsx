import { useEffect, useState, type ComponentPropsWithoutRef } from "react";
import { Volume2 } from "lucide-react";

import { mediaUrl, requestBlob } from "../../api/http";
import type { AudioAttachment } from "../../api/types";

type AdminMediaImageProps = Omit<ComponentPropsWithoutRef<"img">, "src"> & {
  src: string;
};

function isAdminMediaPath(path: string) {
  return path.startsWith("/api/admin/");
}

function useAuthenticatedMediaUrl(path: string | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path || !isAdminMediaPath(path)) {
      setObjectUrl(null);
      return undefined;
    }

    let isActive = true;
    let nextObjectUrl: string | null = null;

    requestBlob(path)
      .then((blob) => {
        if (!isActive) {
          return;
        }
        nextObjectUrl = URL.createObjectURL(blob);
        setObjectUrl(nextObjectUrl);
      })
      .catch(() => {
        if (isActive) {
          setObjectUrl(null);
        }
      });

    return () => {
      isActive = false;
      if (nextObjectUrl) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [path]);

  if (!path) {
    return null;
  }
  return isAdminMediaPath(path) ? objectUrl : mediaUrl(path);
}

export function AdminMediaImage({ src, ...props }: AdminMediaImageProps) {
  const resolvedSrc = useAuthenticatedMediaUrl(src);

  if (!resolvedSrc) {
    return null;
  }

  return <img {...props} src={resolvedSrc} />;
}

export function AdminAudioPlayer({ audio }: { audio: AudioAttachment | null }) {
  const resolvedSrc = useAuthenticatedMediaUrl(audio?.public_path ?? null);

  if (!audio || !resolvedSrc) {
    return null;
  }

  return (
    <div className="audio-attachment-player audio-attachment-player--default">
      <Volume2 aria-hidden="true" size={16} />
      <audio controls preload="metadata" src={resolvedSrc}>
        Twoja przeglądarka nie obsługuje odtwarzania audio.
      </audio>
    </div>
  );
}
