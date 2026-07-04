type MarkerViewportPoint = {
  x: number;
  y: number;
};

export type MarkerViewportCandidate = {
  point: MarkerViewportPoint;
};

type MarkerViewportOptions = {
  padding?: number;
  viewportHeight: number;
  viewportWidth: number;
};

export function isMapMarkerAnchorInViewport(
  { point }: MarkerViewportCandidate,
  { padding = 0, viewportHeight, viewportWidth }: MarkerViewportOptions,
) {
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !Number.isFinite(viewportHeight) ||
    !Number.isFinite(viewportWidth)
  ) {
    return false;
  }

  return (
    point.x >= -padding &&
    point.x <= viewportWidth + padding &&
    point.y >= -padding &&
    point.y <= viewportHeight + padding
  );
}

export function filterMapMarkersByViewport<TCandidate extends MarkerViewportCandidate>(
  candidates: TCandidate[],
  options: MarkerViewportOptions,
) {
  return candidates.filter((candidate) => isMapMarkerAnchorInViewport(candidate, options));
}
