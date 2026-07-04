import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";

const GALLERY_MOTION_CONFIG = MAP_DISPLAY_CONFIG.placeGallery.motion;
const MARKER_TRANSITION_CONFIG = MAP_DISPLAY_CONFIG.markerTransition;

type GalleryOffset = {
  x: number;
  y: number;
};

export type GalleryMotionItem = {
  delayMs: number;
  height: number;
  offset: GalleryOffset;
  width: number;
};

type GalleryMotionOptions = {
  maxHeight?: number;
  maxWidth?: number;
};

type GalleryViewportOptions = {
  anchorX: number;
  anchorY: number;
  padding?: number;
  viewportHeight: number;
  viewportWidth: number;
};

type TileLayout = {
  height: number;
  offset: GalleryOffset;
  width: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function galleryMaxTileScale(itemCount: number) {
  const progress = clamp((Math.max(1, itemCount) - 4) / Math.max(1, GALLERY_MOTION_CONFIG.denseItemCount - 4), 0, 1);

  return (
    GALLERY_MOTION_CONFIG.maxTileScale -
    (GALLERY_MOTION_CONFIG.maxTileScale - GALLERY_MOTION_CONFIG.denseMaxTileScale) * progress
  );
}

function tileSizeFor(index: number, itemCount: number) {
  if (index === itemCount - 1) {
    return GALLERY_MOTION_CONFIG.addTileSize;
  }

  if (index === 0) {
    return GALLERY_MOTION_CONFIG.coverTileSize;
  }

  return GALLERY_MOTION_CONFIG.mediaTileSizes[index % GALLERY_MOTION_CONFIG.mediaTileSizes.length];
}

function tileRect(tile: TileLayout, offset: GalleryOffset = tile.offset) {
  return {
    bottom: offset.y + tile.height / 2,
    left: offset.x - tile.width / 2,
    right: offset.x + tile.width / 2,
    top: offset.y - tile.height / 2,
  };
}

function overlapsPlacedTiles(tile: TileLayout, offset: GalleryOffset, placedTiles: TileLayout[]) {
  const rect = tileRect(tile, offset);

  return placedTiles.some((placedTile) => {
    const placedRect = tileRect(placedTile);
    return (
      rect.left < placedRect.right + GALLERY_MOTION_CONFIG.gap &&
      rect.right > placedRect.left - GALLERY_MOTION_CONFIG.gap &&
      rect.top < placedRect.bottom + GALLERY_MOTION_CONFIG.gap &&
      rect.bottom > placedRect.top - GALLERY_MOTION_CONFIG.gap
    );
  });
}

function normalizeAngle(angle: number) {
  let normalized = angle;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  while (normalized < -Math.PI) normalized += Math.PI * 2;
  return normalized;
}

function preferredTileAngle(index: number) {
  return (index - 1) * GALLERY_MOTION_CONFIG.goldenAngle;
}

function polygonStartAngle(outerItemCount: number) {
  if (outerItemCount === 1 || outerItemCount === 2) {
    return 0;
  }

  if (outerItemCount === 4) {
    return -Math.PI / 4;
  }

  return -Math.PI / 2;
}

function polygonTileAngle(outerIndex: number, outerItemCount: number) {
  return polygonStartAngle(outerItemCount) + (outerIndex / outerItemCount) * Math.PI * 2;
}

function radiusToClearTileAtAngle(tile: TileLayout, placedTile: TileLayout, angle: number) {
  const requiredX = (tile.width + placedTile.width) / 2 + GALLERY_MOTION_CONFIG.gap;
  const requiredY = (tile.height + placedTile.height) / 2 + GALLERY_MOTION_CONFIG.gap;
  const angleCos = Math.abs(Math.cos(angle));
  const angleSin = Math.abs(Math.sin(angle));
  const radiusByX = angleCos > GALLERY_MOTION_CONFIG.minTrigSignal ? requiredX / angleCos : Number.POSITIVE_INFINITY;
  const radiusByY = angleSin > GALLERY_MOTION_CONFIG.minTrigSignal ? requiredY / angleSin : Number.POSITIVE_INFINITY;

  return Math.min(radiusByX, radiusByY);
}

function preferredRadiusFloor(tile: TileLayout, placedTiles: TileLayout[], angle: number) {
  const radius = Math.max(...placedTiles.map((placedTile) => radiusToClearTileAtAngle(tile, placedTile, angle)));

  return Math.ceil(radius / GALLERY_MOTION_CONFIG.radiusStep) * GALLERY_MOTION_CONFIG.radiusStep;
}

function findTileOffset(tile: TileLayout, placedTiles: TileLayout[], index: number): GalleryOffset {
  const preferredAngle = preferredTileAngle(index);
  const radiusFloor = preferredRadiusFloor(tile, placedTiles, preferredAngle);

  for (
    let radius = radiusFloor;
    radius <= GALLERY_MOTION_CONFIG.maxRadius;
    radius += GALLERY_MOTION_CONFIG.radiusStep
  ) {
    const slotCount = Math.max(
      GALLERY_MOTION_CONFIG.minCircularSlots,
      Math.ceil((Math.PI * 2 * Math.max(radius, 1)) / GALLERY_MOTION_CONFIG.slotSpacingPx),
    );
    let bestRadiusOffset: GalleryOffset | null = null;
    let bestRadiusScore = Number.POSITIVE_INFINITY;

    for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
      const angle = preferredAngle + (slotIndex / slotCount) * Math.PI * 2;
      const offset = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };

      if (overlapsPlacedTiles(tile, offset, placedTiles)) {
        continue;
      }

      const score = Math.abs(normalizeAngle(angle - preferredAngle));
      if (score < bestRadiusScore) {
        bestRadiusOffset = offset;
        bestRadiusScore = score;
      }
    }

    if (bestRadiusOffset) {
      return bestRadiusOffset;
    }
  }

  return {
    x: GALLERY_MOTION_CONFIG.maxRadius * Math.cos(preferredAngle),
    y: GALLERY_MOTION_CONFIG.maxRadius * Math.sin(preferredAngle),
  };
}

function hasTileOverlaps(tiles: TileLayout[]) {
  return tiles.some((tile, index) => overlapsPlacedTiles(tile, tile.offset, tiles.slice(0, index)));
}

function buildPolygonTiles(itemCount: number) {
  const outerItemCount = itemCount - 1;

  if (outerItemCount <= 0 || outerItemCount > GALLERY_MOTION_CONFIG.polygonMaxOuterItems) {
    return null;
  }

  const tiles = Array.from({ length: itemCount }, (_, index) => ({
    ...tileSizeFor(index, itemCount),
    offset: { x: 0, y: 0 },
  }));
  const angles = tiles.slice(1).map((_, index) => polygonTileAngle(index, outerItemCount));
  const radiusFloor = Math.max(
    ...tiles.slice(1).map((tile, index) => radiusToClearTileAtAngle(tile, tiles[0], angles[index])),
  );

  for (
    let radius = Math.ceil(radiusFloor / GALLERY_MOTION_CONFIG.radiusStep) * GALLERY_MOTION_CONFIG.radiusStep;
    radius <= GALLERY_MOTION_CONFIG.maxRadius;
    radius += GALLERY_MOTION_CONFIG.radiusStep
  ) {
    const polygonTiles = tiles.map((tile, index) => {
      if (index === 0) {
        return tile;
      }

      const angle = angles[index - 1];
      return {
        ...tile,
        offset: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        },
      };
    });

    if (!hasTileOverlaps(polygonTiles)) {
      return polygonTiles;
    }
  }

  return null;
}

function buildCircularTiles(itemCount: number): TileLayout[] {
  const polygonTiles = buildPolygonTiles(itemCount);
  if (polygonTiles) {
    return polygonTiles;
  }

  const placedTiles: TileLayout[] = [];

  for (let index = 0; index < itemCount; index += 1) {
    const tile = {
      ...tileSizeFor(index, itemCount),
      offset: { x: 0, y: 0 },
    };

    if (index > 0) {
      tile.offset = findTileOffset(tile, placedTiles, index);
    }

    placedTiles.push(tile);
  }

  return placedTiles;
}

function tileBounds(tiles: TileLayout[]) {
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const tile of tiles) {
    const rect = tileRect(tile);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    top = Math.min(top, rect.top);
    bottom = Math.max(bottom, rect.bottom);
  }

  return { bottom, left, right, top };
}

export function getPlaceGalleryMotionLayout(
  itemCount: number,
  options: GalleryMotionOptions = {},
): GalleryMotionItem[] {
  if (itemCount <= 0) {
    return [];
  }

  const tiles = buildCircularTiles(itemCount);
  const bounds = tileBounds(tiles);
  const baseWidth = Math.max(Math.abs(bounds.left), Math.abs(bounds.right)) * 2;
  const baseHeight = Math.max(Math.abs(bounds.top), Math.abs(bounds.bottom)) * 2;
  const maxWidth = Math.max(GALLERY_MOTION_CONFIG.minMaxWidth, options.maxWidth ?? baseWidth);
  const maxHeight = Math.max(GALLERY_MOTION_CONFIG.minMaxHeight, options.maxHeight ?? baseHeight);
  const scale = Math.min(galleryMaxTileScale(itemCount), maxWidth / baseWidth, maxHeight / baseHeight);

  return tiles.map((tile, index) => {
    const scaledWidth = Math.max(1, Math.round(tile.width * scale));
    const scaledHeight = Math.max(1, Math.round(tile.height * scale));

    return {
      delayMs: Math.min(index * GALLERY_MOTION_CONFIG.staggerMs, GALLERY_MOTION_CONFIG.maxDelayMs),
      height: scaledHeight,
      offset: {
        x: Math.round(tile.offset.x * scale),
        y: Math.round(tile.offset.y * scale),
      },
      width: scaledWidth,
    };
  });
}

export function galleryMotionStyle({ delayMs, height, offset, width }: GalleryMotionItem) {
  return `--gallery-x: ${offset.x}px; --gallery-y: ${offset.y}px; --gallery-width: ${width}px; --gallery-height: ${height}px; --gallery-delay: ${delayMs}ms;`;
}

export function isGalleryMotionItemInsideViewport(
  { height, offset, width }: GalleryMotionItem,
  { anchorX, anchorY, padding = 0, viewportHeight, viewportWidth }: GalleryViewportOptions,
) {
  if (
    !Number.isFinite(anchorX) ||
    !Number.isFinite(anchorY) ||
    !Number.isFinite(viewportHeight) ||
    !Number.isFinite(viewportWidth)
  ) {
    return false;
  }

  const centerX = anchorX + offset.x;
  const centerY = anchorY + offset.y;

  return (
    centerX - width / 2 >= padding &&
    centerX + width / 2 <= viewportWidth - padding &&
    centerY - height / 2 >= padding &&
    centerY + height / 2 <= viewportHeight - padding
  );
}

export function getPlaceMarkerEnterDelayMs(index: number) {
  return Math.min(
    Math.max(0, index) * MARKER_TRANSITION_CONFIG.enterStaggerMs,
    MARKER_TRANSITION_CONFIG.enterMaxDelayMs,
  );
}

export function placeMarkerEnterStyle(index: number) {
  return `--place-marker-enter-delay: ${getPlaceMarkerEnterDelayMs(index)}ms;`;
}
