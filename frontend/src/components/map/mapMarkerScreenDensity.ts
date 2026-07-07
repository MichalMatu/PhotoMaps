import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";

const MARKER_DENSITY_CONFIG = MAP_DISPLAY_CONFIG.markerDensity;

type ScreenPoint = {
  x: number;
  y: number;
};

export type ScreenDensityCandidate = {
  cityId?: string;
  height: number;
  id: string;
  point: ScreenPoint;
  priority: number;
  width: number;
};

type RankedScreenDensityCandidate<TCandidate extends ScreenDensityCandidate> = {
  candidate: TCandidate;
  index: number;
};

type ScreenDensityOptions = {
  maxOverlapRatio?: number;
};

function overlapsTooMuchOnScreen(left: ScreenDensityCandidate, right: ScreenDensityCandidate, maxOverlapRatio: number) {
  const overlapX = (left.width + right.width) / 2 - Math.abs(right.point.x - left.point.x);
  const overlapY = (left.height + right.height) / 2 - Math.abs(right.point.y - left.point.y);

  if (overlapX <= 0 || overlapY <= 0) {
    return false;
  }

  return (
    overlapX > Math.min(left.width, right.width) * maxOverlapRatio &&
    overlapY > Math.min(left.height, right.height) * maxOverlapRatio
  );
}

function compareRankedCandidates<TCandidate extends ScreenDensityCandidate>(
  left: RankedScreenDensityCandidate<TCandidate>,
  right: RankedScreenDensityCandidate<TCandidate>,
) {
  return right.candidate.priority - left.candidate.priority || left.index - right.index;
}

export function limitMapMarkersByScreenDensity<TCandidate extends ScreenDensityCandidate>(
  candidates: TCandidate[],
  options: ScreenDensityOptions = {},
): TCandidate[] {
  if (candidates.length <= 1) {
    return candidates;
  }

  const maxOverlapRatio = options.maxOverlapRatio ?? MARKER_DENSITY_CONFIG.screenDensityMaxOverlapRatio;
  const selected: TCandidate[] = [];
  const selectedIds = new Set<string>();
  const selectedCityIds = new Set<string>();
  const rankedCandidates = candidates.map((candidate, index) => ({ candidate, index })).sort(compareRankedCandidates);

  for (const { candidate } of rankedCandidates) {
    const hasCityRepresentative = candidate.cityId ? selectedCityIds.has(candidate.cityId) : true;
    const overlapsSelectedCandidate = selected.some((selectedCandidate) =>
      overlapsTooMuchOnScreen(candidate, selectedCandidate, maxOverlapRatio),
    );

    if (overlapsSelectedCandidate && hasCityRepresentative) {
      continue;
    }

    selected.push(candidate);
    selectedIds.add(candidate.id);
    if (candidate.cityId) {
      selectedCityIds.add(candidate.cityId);
    }
  }

  return candidates.filter((candidate) => selectedIds.has(candidate.id));
}
