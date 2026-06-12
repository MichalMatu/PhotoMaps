import { type ReactNode, useEffect, useState } from "react";

type MediaFit = "contain" | "cover";
type MediaRatio = "landscape" | "square" | "viewer" | "wide";

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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
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
        alt={alt}
        className={imageClassName}
        decoding="async"
        loading={loading}
        src={src}
        onLoad={() => setIsLoaded(true)}
      />
      {caption ? (
        <span className={["media-frame__caption", captionClassName].filter(Boolean).join(" ")}>{caption}</span>
      ) : null}
    </span>
  );
}
