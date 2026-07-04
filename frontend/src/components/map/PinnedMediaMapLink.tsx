import type { PinnedMediaConnectionGeometry } from "./pinnedMediaBoardLinkGeometry";

type PinnedMediaMapLinkProps = {
  geometry: PinnedMediaConnectionGeometry;
  zIndex: number;
};

export function PinnedMediaMapLink({ geometry, zIndex }: PinnedMediaMapLinkProps) {
  return (
    <svg className="pinned-media-link-layer" style={{ zIndex }} aria-hidden="true" data-testid="pinned-media-map-link">
      <path className="pinned-media-link-halo" d={geometry.path} />
      <path className="pinned-media-link-core" d={geometry.path} />
      <circle className="pinned-media-link-source" cx={geometry.source.x} cy={geometry.source.y} r="4" />
      <circle className="pinned-media-link-target-ring" cx={geometry.target.x} cy={geometry.target.y} r="15" />
      <circle className="pinned-media-link-target" cx={geometry.target.x} cy={geometry.target.y} r="5" />
    </svg>
  );
}
