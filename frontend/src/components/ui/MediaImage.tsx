import { type ReactNode, useEffect, useRef, useState } from "react";

type MediaFit = "contain" | "cover";
type MediaRatio = "landscape" | "natural" | "square" | "viewer" | "wide";

type Props = {
  alt: string;
  caption?: ReactNode;
  captionClassName?: string;
  className?: string;
  fit?: MediaFit;
  imageClassName?: string;
  loading?: "eager" | "lazy";
  ratio?: MediaRatio;
  src: string;
};

export function MediaImage({
  alt,
  caption,
  captionClassName,
  className,
  fit = "cover",
  imageClassName,
  loading = "lazy",
  ratio = "landscape",
  src,
}: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const isLoaded = loadedSrc === src;

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) {
      setLoadedSrc(src);
    }
  }, [src]);

  const frameClassName = [
    "media-frame",
    `media-frame--${ratio}`,
    fit === "contain" ? "media-frame--contain" : null,
    isLoaded ? "is-loaded" : "is-loading",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={frameClassName}>
      <img
        ref={imageRef}
        alt={alt}
        className={imageClassName}
        decoding="async"
        loading={loading}
        src={src}
        onLoad={() => setLoadedSrc(src)}
      />
      {caption ? (
        <span className={["media-frame__caption", captionClassName].filter(Boolean).join(" ")}>{caption}</span>
      ) : null}
    </span>
  );
}
