import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";

const MARKER_COLLISION_CONFIG = MAP_DISPLAY_CONFIG.markerCollision;

type MarkerCollisionPoint = {
  x: number;
  y: number;
};

export type MarkerCollisionCandidate = {
  height: number;
  id: string;
  point: MarkerCollisionPoint;
  priority: number;
  width: number;
};

export type MarkerCollisionLayout = {
  height: number;
  id: string;
  isDisplaced: boolean;
  offset: MarkerCollisionPoint;
  point: MarkerCollisionPoint;
  width: number;
};

type MarkerCollisionOptions = {
  gap?: number;
  viewportHeight: number;
  viewportWidth: number;
  zoom: number;
};

type WorkingMarker = MarkerCollisionCandidate & {
  index: number;
  maxDrift: number;
  mobility: number;
  original: MarkerCollisionPoint;
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function maxMarkerCollisionDrift(zoom: number) {
  const safeZoom = Number.isFinite(zoom) ? zoom : MARKER_COLLISION_CONFIG.defaultZoom;
  const drift = MARKER_COLLISION_CONFIG.maxDriftByZoom.find((entry) => safeZoom <= entry.maxZoom);

  return drift?.distance ?? MARKER_COLLISION_CONFIG.fallbackDriftDistance;
}

function normalizedPriority(priority: number, minPriority: number, maxPriority: number) {
  if (!Number.isFinite(priority) || maxPriority <= minPriority) {
    return MARKER_COLLISION_CONFIG.fallbackPriorityProgress;
  }

  return (priority - minPriority) / (maxPriority - minPriority);
}

function nudgeForSamePoint(left: WorkingMarker, right: WorkingMarker) {
  const angle = (left.index + right.index + 1) * MARKER_COLLISION_CONFIG.nudgeAngle;
  return {
    x: Math.cos(angle) || 1,
    y: Math.sin(angle) || 0,
  };
}

function keepNearOriginal(marker: WorkingMarker) {
  const offsetX = marker.x - marker.original.x;
  const offsetY = marker.y - marker.original.y;
  const distance = Math.hypot(offsetX, offsetY);

  if (distance <= marker.maxDrift || distance === 0) {
    return;
  }

  const scale = marker.maxDrift / distance;
  marker.x = marker.original.x + offsetX * scale;
  marker.y = marker.original.y + offsetY * scale;
}

function keepInsideViewport(marker: WorkingMarker, viewportWidth: number, viewportHeight: number) {
  const halfWidth = marker.width / 2;
  const halfHeight = marker.height / 2;

  marker.x = clamp(
    marker.x,
    MARKER_COLLISION_CONFIG.viewportPadding + halfWidth,
    viewportWidth - MARKER_COLLISION_CONFIG.viewportPadding - halfWidth,
  );
  marker.y = clamp(
    marker.y,
    MARKER_COLLISION_CONFIG.viewportPadding + halfHeight,
    viewportHeight - MARKER_COLLISION_CONFIG.viewportPadding - halfHeight,
  );
}

function overlapsCandidate(left: MarkerCollisionCandidate, right: MarkerCollisionCandidate, gap: number) {
  return (
    Math.abs(right.point.x - left.point.x) < (left.width + right.width) / 2 + gap &&
    Math.abs(right.point.y - left.point.y) < (left.height + right.height) / 2 + gap
  );
}

function overlapsLayout(left: MarkerCollisionLayout, right: MarkerCollisionLayout, gap: number) {
  return (
    Math.abs(right.point.x - left.point.x) < (left.width + right.width) / 2 + gap &&
    Math.abs(right.point.y - left.point.y) < (left.height + right.height) / 2 + gap
  );
}

function overlapsEarlierCandidate(
  candidate: MarkerCollisionCandidate,
  index: number,
  candidates: MarkerCollisionCandidate[],
  gap: number,
) {
  for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
    if (overlapsCandidate(candidate, candidates[previousIndex], gap)) {
      return true;
    }
  }

  return false;
}

function separateOverlaps(markers: WorkingMarker[], gap: number) {
  for (let leftIndex = 0; leftIndex < markers.length; leftIndex += 1) {
    const left = markers[leftIndex];

    for (let rightIndex = leftIndex + 1; rightIndex < markers.length; rightIndex += 1) {
      const right = markers[rightIndex];
      let deltaX = right.x - left.x;
      let deltaY = right.y - left.y;

      if (deltaX === 0 && deltaY === 0) {
        const nudge = nudgeForSamePoint(left, right);
        deltaX = nudge.x;
        deltaY = nudge.y;
      }

      const overlapX = (left.width + right.width) / 2 + gap - Math.abs(deltaX);
      const overlapY = (left.height + right.height) / 2 + gap - Math.abs(deltaY);

      if (overlapX <= 0 || overlapY <= 0) {
        continue;
      }

      const totalMobility = left.mobility + right.mobility;
      const leftShare = left.mobility / totalMobility;
      const rightShare = right.mobility / totalMobility;

      if (overlapX < overlapY) {
        const direction = deltaX >= 0 ? 1 : -1;
        const separation = overlapX + MARKER_COLLISION_CONFIG.epsilon;
        left.x -= direction * separation * leftShare;
        right.x += direction * separation * rightShare;
      } else {
        const direction = deltaY >= 0 ? 1 : -1;
        const separation = overlapY + MARKER_COLLISION_CONFIG.epsilon;
        left.y -= direction * separation * leftShare;
        right.y += direction * separation * rightShare;
      }
    }
  }
}

export function resolveMapMarkerCollisions(
  candidates: MarkerCollisionCandidate[],
  options: MarkerCollisionOptions,
): MarkerCollisionLayout[] {
  if (candidates.length === 0) {
    return [];
  }

  const gap = options.gap ?? MARKER_COLLISION_CONFIG.defaultGap;
  const viewportWidth = Math.max(MARKER_COLLISION_CONFIG.minViewportSize, options.viewportWidth);
  const viewportHeight = Math.max(MARKER_COLLISION_CONFIG.minViewportSize, options.viewportHeight);

  let minPriority = Number.POSITIVE_INFINITY;
  let maxPriority = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    minPriority = Math.min(minPriority, candidate.priority);
    maxPriority = Math.max(maxPriority, candidate.priority);
  }

  const maxDrift = maxMarkerCollisionDrift(options.zoom);
  const markers = candidates.map<WorkingMarker>((candidate, index) => {
    const priorityProgress = normalizedPriority(candidate.priority, minPriority, maxPriority);
    const seedRadius = Math.min(
      MARKER_COLLISION_CONFIG.seedRadius.max,
      maxDrift * MARKER_COLLISION_CONFIG.seedRadius.maxDriftRatio,
    );
    const seedAngle = index * MARKER_COLLISION_CONFIG.nudgeAngle;
    const shouldSeed = overlapsEarlierCandidate(candidate, index, candidates, gap);
    return {
      ...candidate,
      height: Math.max(MARKER_COLLISION_CONFIG.minViewportSize, candidate.height),
      index,
      maxDrift,
      mobility: MARKER_COLLISION_CONFIG.startingMobility - priorityProgress,
      original: candidate.point,
      width: Math.max(MARKER_COLLISION_CONFIG.minViewportSize, candidate.width),
      x: candidate.point.x + (shouldSeed ? Math.cos(seedAngle) * seedRadius : 0),
      y: candidate.point.y + (shouldSeed ? Math.sin(seedAngle) * seedRadius : 0),
    };
  });

  for (let iteration = 0; iteration < MARKER_COLLISION_CONFIG.iterations; iteration += 1) {
    separateOverlaps(markers, gap);

    for (const marker of markers) {
      const priorityProgress = normalizedPriority(marker.priority, minPriority, maxPriority);
      const anchorStrength =
        MARKER_COLLISION_CONFIG.priorityAnchorStrength.base +
        priorityProgress * MARKER_COLLISION_CONFIG.priorityAnchorStrength.range;
      marker.x += (marker.original.x - marker.x) * anchorStrength;
      marker.y += (marker.original.y - marker.y) * anchorStrength;
      keepNearOriginal(marker);
      keepInsideViewport(marker, viewportWidth, viewportHeight);
    }
  }

  for (let iteration = 0; iteration < MARKER_COLLISION_CONFIG.iterations; iteration += 1) {
    separateOverlaps(markers, gap);
    for (const marker of markers) {
      keepNearOriginal(marker);
      keepInsideViewport(marker, viewportWidth, viewportHeight);
    }
  }

  return markers.map((marker) => {
    const offset = {
      x: marker.x - marker.original.x,
      y: marker.y - marker.original.y,
    };

    return {
      height: marker.height,
      id: marker.id,
      isDisplaced: Math.hypot(offset.x, offset.y) > MARKER_COLLISION_CONFIG.displacementThresholdPx,
      offset,
      point: {
        x: marker.x,
        y: marker.y,
      },
      width: marker.width,
    };
  });
}

export function hasMapMarkerCollisionOverlaps(layouts: MarkerCollisionLayout[], gap = 0) {
  return mapMarkerCollisionOverlapIds(layouts, gap).size > 0;
}

export function mapMarkerCollisionOverlapIds(layouts: MarkerCollisionLayout[], gap = 0) {
  const overlappingIds = new Set<string>();

  for (let leftIndex = 0; leftIndex < layouts.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < layouts.length; rightIndex += 1) {
      if (overlapsLayout(layouts[leftIndex], layouts[rightIndex], gap)) {
        overlappingIds.add(layouts[leftIndex].id);
        overlappingIds.add(layouts[rightIndex].id);
      }
    }
  }

  return overlappingIds;
}
