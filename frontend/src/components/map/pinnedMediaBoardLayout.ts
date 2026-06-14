import type {
  PinnedMediaBounds,
  PinnedMediaLayout,
  PinnedMediaLayoutOptions,
  RectLike,
  StoredPinnedMediaCard,
} from "./pinnedMediaBoardTypes";

const PINNED_MEDIA_FRAME_MARGIN = 12;
const PINNED_MEDIA_SNAP_THRESHOLD = 12;
const PINNED_MEDIA_CARD_CHROME_HEIGHT = 72;

const DEFAULT_ASPECT_RATIO = 16 / 10;
const MIN_CARD_WIDTH = 180;

export function getPinnedMediaBounds(): PinnedMediaBounds {
  if (typeof window === "undefined") {
    return { height: 768, left: 0, top: 0, width: 1024 };
  }

  const mapFrameRect = document.querySelector<HTMLElement>(".map-frame")?.getBoundingClientRect() ?? null;
  const bounds =
    mapFrameRect && mapFrameRect.width > 0 && mapFrameRect.height > 0
      ? mapFrameRect
      : {
          height: window.innerHeight,
          left: 0,
          top: 0,
          width: window.innerWidth,
        };

  return {
    height: roundPixel(bounds.height),
    left: roundPixel(bounds.left),
    top: roundPixel(bounds.top),
    width: roundPixel(bounds.width),
  };
}

export function safeAspectRatio(value: number | null | undefined) {
  if (!Number.isFinite(value) || !value) {
    return DEFAULT_ASPECT_RATIO;
  }

  return clamp(value, 0.45, 2.4);
}

export function clampPinnedMediaLayout(
  layout: PinnedMediaLayout,
  bounds: PinnedMediaBounds,
  options: PinnedMediaLayoutOptions = {},
): PinnedMediaLayout {
  const aspectRatio = safeAspectRatio(layout.aspectRatio);
  const frameMaxWidth = Math.max(MIN_CARD_WIDTH, bounds.width - PINNED_MEDIA_FRAME_MARGIN * 2);
  const naturalMaxWidth =
    options.naturalSize && Number.isFinite(options.naturalSize.width) && options.naturalSize.width > 0
      ? options.naturalSize.width
      : frameMaxWidth;
  const maxWidth = Math.min(frameMaxWidth, Math.max(1, naturalMaxWidth));
  const minWidth = Math.min(MIN_CARD_WIDTH, maxWidth);
  const maxImageHeight = Math.max(96, bounds.height - PINNED_MEDIA_FRAME_MARGIN * 2 - PINNED_MEDIA_CARD_CHROME_HEIGHT);
  let width = clamp(layout.width, minWidth, maxWidth);
  let height = width / aspectRatio;

  if (height > maxImageHeight) {
    height = maxImageHeight;
    width = height * aspectRatio;
  }

  const minX = bounds.left + PINNED_MEDIA_FRAME_MARGIN;
  const minY = bounds.top + PINNED_MEDIA_FRAME_MARGIN;
  const maxX = Math.max(minX, bounds.left + bounds.width - width - PINNED_MEDIA_FRAME_MARGIN);
  const maxY = Math.max(
    minY,
    bounds.top + bounds.height - height - PINNED_MEDIA_CARD_CHROME_HEIGHT - PINNED_MEDIA_FRAME_MARGIN,
  );

  return {
    aspectRatio,
    height: roundPixel(height),
    width: roundPixel(width),
    x: roundPixel(clamp(layout.x, minX, maxX)),
    y: roundPixel(clamp(layout.y, minY, maxY)),
    zIndex: normalizeZIndex(layout.zIndex),
  };
}

export function snapPinnedMediaLayout(
  layout: PinnedMediaLayout,
  otherLayouts: PinnedMediaLayout[],
  bounds: PinnedMediaBounds,
  options: PinnedMediaLayoutOptions = {},
): PinnedMediaLayout {
  let next = clampPinnedMediaLayout(layout, bounds, options);
  const width = next.width;
  const totalHeight = cardTotalHeight(next);

  next = {
    ...next,
    x: snapToTargets(next.x, [
      bounds.left + PINNED_MEDIA_FRAME_MARGIN,
      bounds.left + bounds.width - width - PINNED_MEDIA_FRAME_MARGIN,
      ...otherLayouts.flatMap((other) => [
        other.x,
        other.x + other.width,
        other.x + other.width - width,
        other.x - width,
      ]),
    ]),
    y: snapToTargets(next.y, [
      bounds.top + PINNED_MEDIA_FRAME_MARGIN,
      bounds.top + bounds.height - totalHeight - PINNED_MEDIA_FRAME_MARGIN,
      ...otherLayouts.flatMap((other) => {
        const otherTotalHeight = cardTotalHeight(other);
        return [other.y, other.y + otherTotalHeight, other.y + otherTotalHeight - totalHeight, other.y - totalHeight];
      }),
    ]),
  };

  return clampPinnedMediaLayout(next, bounds, options);
}

export function snapPinnedMediaResizeLayout(
  layout: PinnedMediaLayout,
  otherLayouts: PinnedMediaLayout[],
  bounds: PinnedMediaBounds,
  options: PinnedMediaLayoutOptions = {},
): PinnedMediaLayout {
  const clampedLayout = clampPinnedMediaLayout(layout, bounds, options);
  const aspectRatio = safeAspectRatio(clampedLayout.aspectRatio);
  const intendedWidth = clampedLayout.width;
  const rightEdgeTargets = [
    bounds.left + bounds.width - PINNED_MEDIA_FRAME_MARGIN,
    ...otherLayouts.flatMap((other) => [other.x, other.x + other.width]),
  ];
  const bottomEdgeTargets = [
    bounds.top + bounds.height - PINNED_MEDIA_FRAME_MARGIN,
    ...otherLayouts.flatMap((other) => {
      const otherTotalHeight = cardTotalHeight(other);
      return [other.y, other.y + otherTotalHeight];
    }),
  ];
  const snapOptions: PinnedMediaLayout[] = [];

  for (const target of rightEdgeTargets) {
    const snapOption = snapResizeOption(
      target - clampedLayout.x,
      Math.abs(clampedLayout.x + clampedLayout.width - target),
      clampedLayout,
      intendedWidth,
      aspectRatio,
      bounds,
      options,
    );
    if (snapOption) {
      snapOptions.push(snapOption);
    }
  }

  for (const target of bottomEdgeTargets) {
    const imageHeight = target - clampedLayout.y - PINNED_MEDIA_CARD_CHROME_HEIGHT;
    const snapOption = snapResizeOption(
      imageHeight * aspectRatio,
      Math.abs(clampedLayout.y + cardTotalHeight(clampedLayout) - target),
      clampedLayout,
      intendedWidth,
      aspectRatio,
      bounds,
      options,
    );
    if (snapOption) {
      snapOptions.push(snapOption);
    }
  }

  if (snapOptions.length === 0) {
    return clampedLayout;
  }

  return snapOptions.reduce((bestOption, snapOption) =>
    Math.abs(snapOption.width - intendedWidth) < Math.abs(bestOption.width - intendedWidth) ? snapOption : bestOption,
  );
}

export function defaultPinnedMediaLayout({
  aspectRatio,
  bounds,
  existingCards,
  sourceRect = null,
}: {
  aspectRatio?: number | null;
  bounds: PinnedMediaBounds;
  existingCards: StoredPinnedMediaCard[];
  sourceRect?: RectLike | null;
}): PinnedMediaLayout {
  const normalizedAspectRatio = safeAspectRatio(aspectRatio);
  const defaultWidth =
    bounds.width <= 640
      ? clamp(Math.round(bounds.width * 0.58), MIN_CARD_WIDTH, 260)
      : clamp(Math.round(bounds.width * 0.18), 220, 320);
  const baseLayout = clampPinnedMediaLayout(
    {
      aspectRatio: normalizedAspectRatio,
      height: defaultWidth / normalizedAspectRatio,
      width: defaultWidth,
      x: sourceRect
        ? sourceRect.left + sourceRect.width - defaultWidth - PINNED_MEDIA_FRAME_MARGIN * 2
        : bounds.left + bounds.width - defaultWidth - PINNED_MEDIA_FRAME_MARGIN * 2,
      y: sourceRect ? sourceRect.top + PINNED_MEDIA_CARD_CHROME_HEIGHT : bounds.top + PINNED_MEDIA_FRAME_MARGIN * 5,
      zIndex: nextPinnedMediaZIndex(existingCards),
    },
    bounds,
  );
  const existingLayouts = existingCards.map((card) => card.layout);

  for (let index = 0; index < 14; index += 1) {
    const layoutOption = snapPinnedMediaLayout(
      {
        ...baseLayout,
        x: baseLayout.x - index * PINNED_MEDIA_FRAME_MARGIN,
        y: baseLayout.y + index * PINNED_MEDIA_FRAME_MARGIN,
      },
      existingLayouts,
      bounds,
    );

    if (!existingLayouts.some((layout) => layoutsOverlap(layoutOption, layout))) {
      return layoutOption;
    }
  }

  return baseLayout;
}

export function resizePinnedMediaLayoutFromPointer(
  layout: PinnedMediaLayout,
  deltaX: number,
  deltaY: number,
  zIndex: number,
): PinnedMediaLayout {
  const aspectRatio = safeAspectRatio(layout.aspectRatio);
  const widthFromPointerX = layout.width + deltaX;
  const widthFromPointerY = (layout.height + deltaY) * aspectRatio;
  const width = Math.abs(deltaX) >= Math.abs(deltaY) ? widthFromPointerX : widthFromPointerY;

  return {
    ...layout,
    aspectRatio,
    height: width / aspectRatio,
    width,
    zIndex,
  };
}

export function nextPinnedMediaZIndex(cards: Pick<StoredPinnedMediaCard, "layout">[]) {
  return cards.reduce((maxZIndex, card) => Math.max(maxZIndex, normalizeZIndex(card.layout.zIndex)), 0) + 1;
}

function cardTotalHeight(layout: Pick<PinnedMediaLayout, "height">) {
  return layout.height + PINNED_MEDIA_CARD_CHROME_HEIGHT;
}

function normalizeZIndex(value: number) {
  return Math.max(1, Math.round(Number.isFinite(value) ? value : 1));
}

function resizeFromWidth(layout: PinnedMediaLayout, width: number, aspectRatio: number): PinnedMediaLayout {
  return {
    ...layout,
    aspectRatio,
    height: roundPixel(width / aspectRatio),
    width: roundPixel(width),
  };
}

function snapResizeOption(
  width: number,
  edgeDistance: number,
  layout: PinnedMediaLayout,
  intendedWidth: number,
  aspectRatio: number,
  bounds: PinnedMediaBounds,
  options: PinnedMediaLayoutOptions,
) {
  if (!Number.isFinite(width) || edgeDistance > PINNED_MEDIA_SNAP_THRESHOLD) {
    return null;
  }

  const layoutOption = clampPinnedMediaLayout(resizeFromWidth(layout, width, aspectRatio), bounds, options);

  if (layoutOption.x !== layout.x || layoutOption.y !== layout.y) {
    return null;
  }

  return layoutOption;
}

function snapToTargets(value: number, targets: number[]) {
  let nextValue = value;
  let bestDistance = PINNED_MEDIA_SNAP_THRESHOLD + 1;

  for (const target of targets) {
    if (!Number.isFinite(target)) {
      continue;
    }

    const distance = Math.abs(value - target);
    if (distance <= PINNED_MEDIA_SNAP_THRESHOLD && distance < bestDistance) {
      bestDistance = distance;
      nextValue = target;
    }
  }

  return roundPixel(nextValue);
}

function layoutsOverlap(first: PinnedMediaLayout, second: PinnedMediaLayout) {
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + cardTotalHeight(first) <= second.y ||
    second.y + cardTotalHeight(second) <= first.y
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundPixel(value: number) {
  return Math.round(value);
}
