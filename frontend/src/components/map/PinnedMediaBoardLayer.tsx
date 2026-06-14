import { X } from "lucide-react";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefCallback,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { mediaUrl, type PlaceMapItem } from "../../api/client";
import { isInteractiveDragTarget, stopFloatingWindowEvent } from "../ui/useDraggableWindow";
import { mapMediaDisplay } from "./mediaDisplayText";
import {
  bringPinnedMediaCardToFront,
  clampPinnedMediaLayout,
  getPinnedMediaBounds,
  pinnedMediaConnectionGeometry,
  readPinnedMediaCards,
  resolvePinnedMediaCards,
  safeAspectRatio,
  snapPinnedMediaLayout,
  snapPinnedMediaResizeLayout,
  type PinnedMediaLayout,
  type PinnedMediaNaturalSize,
  type PinnedMediaPoint,
  type RectLike,
  type ResolvedPinnedMediaCard,
  type StoredPinnedMediaCard,
  updatePinnedMediaLayout,
  upsertPinnedMediaCard,
  writePinnedMediaCards,
} from "./pinnedMediaBoard";
import type { PlaceMapVisualItem } from "./placePreview";

export type PinMediaRequest = {
  aspectRatio?: number | null;
  item: PlaceMapVisualItem;
  place: PlaceMapItem;
  sourceRect?: RectLike | null;
};

export type PinnedMediaPlaceProjector = (place: Pick<PlaceMapItem, "lat" | "lon">) => PinnedMediaPoint | null;

type UsePinnedMediaBoardResult = {
  cards: ResolvedPinnedMediaCard[];
  notice: string | null;
  onBringToFront: (id: string) => void;
  onLayoutChange: (id: string, layout: PinnedMediaLayout) => void;
  onMediaSizeChange: (id: string, naturalSize: PinnedMediaNaturalSize) => void;
  onRemove: (id: string) => void;
  pinMedia: (request: PinMediaRequest) => boolean;
};

type PinnedMediaBoardProps = {
  cards: ResolvedPinnedMediaCard[];
  notice: string | null;
  onBringToFront: (id: string) => void;
  onLayoutChange: (id: string, layout: PinnedMediaLayout) => void;
  onMediaSizeChange: (id: string, naturalSize: PinnedMediaNaturalSize) => void;
  onRemove: (id: string) => void;
  projectPlacePoint?: PinnedMediaPlaceProjector | null;
};

type InteractionState = {
  cardId: string;
  captureTarget: HTMLElement;
  hasPointerCapture: boolean;
  mode: "drag" | "resize";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startLayout: PinnedMediaLayout;
};

export function usePinnedMediaBoard(places: PlaceMapItem[]): UsePinnedMediaBoardResult {
  const [storedCards, setStoredCards] = useState<StoredPinnedMediaCard[]>(() => readPinnedMediaCards());
  const [mediaSizes, setMediaSizes] = useState<Record<string, PinnedMediaNaturalSize>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const cardsRef = useRef(storedCards);
  const mediaSizesRef = useRef(mediaSizes);

  useEffect(() => {
    cardsRef.current = storedCards;
    writePinnedMediaCards(storedCards);
  }, [storedCards]);

  useEffect(() => {
    mediaSizesRef.current = mediaSizes;
  }, [mediaSizes]);

  const layoutOptionsForCard = useCallback((cardId: string) => {
    return { naturalSize: mediaSizesRef.current[cardId] ?? null };
  }, []);

  useEffect(() => {
    if (places.length === 0) {
      return;
    }

    setStoredCards((currentCards) => {
      const bounds = getPinnedMediaBounds();
      const resolvedCards = resolvePinnedMediaCards(currentCards, places).map((card) =>
        toStoredCard({
          ...card,
          layout: clampPinnedMediaLayout(card.layout, bounds, layoutOptionsForCard(card.id)),
        }),
      );
      if (storedCardListsEqual(currentCards, resolvedCards)) {
        return currentCards;
      }

      cardsRef.current = resolvedCards;
      return resolvedCards;
    });
  }, [layoutOptionsForCard, places]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setNotice(null), 2400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notice]);

  useEffect(() => {
    let frameId: number | null = null;

    const handleResize = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const bounds = getPinnedMediaBounds();
        setStoredCards((currentCards) => {
          const nextCards = currentCards.map((card) => ({
            ...card,
            layout: clampPinnedMediaLayout(card.layout, bounds, layoutOptionsForCard(card.id)),
          }));

          if (storedCardListsEqual(currentCards, nextCards)) {
            return currentCards;
          }

          cardsRef.current = nextCards;
          return nextCards;
        });
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [layoutOptionsForCard]);

  const resolvedCards = useMemo(() => resolvePinnedMediaCards(storedCards, places), [places, storedCards]);

  const pinMedia = useCallback((request: PinMediaRequest) => {
    const result = upsertPinnedMediaCard(
      cardsRef.current,
      {
        aspectRatio: request.aspectRatio,
        itemId: request.item.id,
        kind: request.item.kind,
        placeId: request.place.id,
        sourceRect: request.sourceRect,
      },
      getPinnedMediaBounds(),
    );

    if (result.status === "limit") {
      setNotice("Limit 8 przypiętych zdjęć.");
      return false;
    }

    cardsRef.current = result.cards;
    setStoredCards(result.cards);
    setNotice(null);
    return true;
  }, []);

  const onLayoutChange = useCallback(
    (id: string, layout: PinnedMediaLayout) => {
      setStoredCards((currentCards) => {
        const nextCards = updatePinnedMediaLayout(
          currentCards,
          id,
          layout,
          getPinnedMediaBounds(),
          layoutOptionsForCard(id),
        );
        cardsRef.current = nextCards;
        return nextCards;
      });
    },
    [layoutOptionsForCard],
  );

  const onMediaSizeChange = useCallback((id: string, naturalSize: PinnedMediaNaturalSize) => {
    if (
      !Number.isFinite(naturalSize.width) ||
      !Number.isFinite(naturalSize.height) ||
      naturalSize.width <= 0 ||
      naturalSize.height <= 0
    ) {
      return;
    }

    const normalizedSize = {
      height: Math.round(naturalSize.height),
      width: Math.round(naturalSize.width),
    };

    setMediaSizes((currentSizes) => {
      const currentSize = currentSizes[id] ?? null;
      if (currentSize?.width === normalizedSize.width && currentSize.height === normalizedSize.height) {
        return currentSizes;
      }

      mediaSizesRef.current = {
        ...currentSizes,
        [id]: normalizedSize,
      };
      return mediaSizesRef.current;
    });

    setStoredCards((currentCards) => {
      const bounds = getPinnedMediaBounds();
      const nextCards = currentCards.map((card) =>
        card.id === id
          ? {
              ...card,
              layout: clampPinnedMediaLayout(
                {
                  ...card.layout,
                  aspectRatio: safeAspectRatio(normalizedSize.width / normalizedSize.height),
                },
                bounds,
                { naturalSize: normalizedSize },
              ),
            }
          : card,
      );

      if (storedCardListsEqual(currentCards, nextCards)) {
        return currentCards;
      }

      cardsRef.current = nextCards;
      return nextCards;
    });
  }, []);

  const onBringToFront = useCallback((id: string) => {
    setStoredCards((currentCards) => {
      const nextCards = bringPinnedMediaCardToFront(currentCards, id);
      if (storedCardListsEqual(currentCards, nextCards)) {
        return currentCards;
      }

      cardsRef.current = nextCards;
      return nextCards;
    });
  }, []);

  const onRemove = useCallback((id: string) => {
    setStoredCards((currentCards) => {
      const nextCards = currentCards.filter((card) => card.id !== id);
      cardsRef.current = nextCards;
      return nextCards;
    });
  }, []);

  return {
    cards: resolvedCards,
    notice,
    onBringToFront,
    onLayoutChange,
    onMediaSizeChange,
    onRemove,
    pinMedia,
  };
}

export function PinnedMediaBoard({
  cards,
  notice,
  onBringToFront,
  onLayoutChange,
  onMediaSizeChange,
  onRemove,
  projectPlacePoint = null,
}: PinnedMediaBoardProps) {
  const cardsRef = useRef(cards);
  const cardElementsRef = useRef(new Map<string, HTMLElement>());
  const interactionRef = useRef<InteractionState | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [cardRects, setCardRects] = useState<Record<string, RectLike>>({});
  const [linkedCardId, setLinkedCardId] = useState<string | null>(null);

  const measureCardRects = useCallback(() => {
    const nextRects: Record<string, RectLike> = {};

    for (const card of cardsRef.current) {
      const element = cardElementsRef.current.get(card.id);
      if (!element) {
        continue;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        continue;
      }

      nextRects[card.id] = {
        height: Math.round(rect.height),
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
      };
    }

    setCardRects((currentRects) => (rectRecordsEqual(currentRects, nextRects) ? currentRects : nextRects));
  }, []);

  const setCardElement = useCallback((cardId: string, element: HTMLElement | null) => {
    if (element) {
      cardElementsRef.current.set(cardId, element);
      return;
    }

    cardElementsRef.current.delete(cardId);
  }, []);

  useLayoutEffect(() => {
    cardsRef.current = cards;
    measureCardRects();
  }, [cards, measureCardRects]);

  useEffect(() => {
    window.addEventListener("resize", measureCardRects);

    return () => {
      window.removeEventListener("resize", measureCardRects);
    };
  }, [measureCardRects]);

  useEffect(() => {
    if (linkedCardId && !cards.some((card) => card.id === linkedCardId)) {
      setLinkedCardId(null);
    }
  }, [cards, linkedCardId]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction || event.pointerId !== interaction.pointerId) {
        return;
      }

      event.preventDefault();
      if (!interaction.hasPointerCapture) {
        interaction.captureTarget.setPointerCapture(interaction.pointerId);
        interaction.hasPointerCapture = true;
      }
      const currentCards = cardsRef.current;
      const currentCard = currentCards.find((card) => card.id === interaction.cardId);
      const zIndex = currentCard?.layout.zIndex ?? interaction.startLayout.zIndex;
      const otherLayouts = currentCards.filter((card) => card.id !== interaction.cardId).map((card) => card.layout);
      const deltaX = event.clientX - interaction.startClientX;
      const deltaY = event.clientY - interaction.startClientY;
      const bounds = getPinnedMediaBounds();
      const nextLayout =
        interaction.mode === "drag"
          ? {
              ...interaction.startLayout,
              x: interaction.startLayout.x + deltaX,
              y: interaction.startLayout.y + deltaY,
              zIndex,
            }
          : resizeLayout(interaction.startLayout, deltaX, deltaY, zIndex);

      onLayoutChange(
        interaction.cardId,
        interaction.mode === "resize"
          ? snapPinnedMediaResizeLayout(nextLayout, otherLayouts, bounds)
          : snapPinnedMediaLayout(nextLayout, otherLayouts, bounds),
      );
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction || event.pointerId !== interaction.pointerId) {
        return;
      }

      if (interaction.hasPointerCapture && interaction.captureTarget.hasPointerCapture(interaction.pointerId)) {
        interaction.captureTarget.releasePointerCapture(interaction.pointerId);
      }
      interactionRef.current = null;
      setActiveCardId(null);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerEnd);
    document.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerEnd);
      document.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [onLayoutChange]);

  const startInteraction = useCallback(
    (card: ResolvedPinnedMediaCard, mode: InteractionState["mode"], event: ReactPointerEvent<HTMLElement>) => {
      event.stopPropagation();

      if (event.button !== 0 || (mode === "drag" && isInteractiveDragTarget(event.target))) {
        return;
      }

      onBringToFront(card.id);
      setActiveCardId(card.id);
      interactionRef.current = {
        cardId: card.id,
        captureTarget: event.currentTarget,
        hasPointerCapture: mode === "resize",
        mode,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startLayout: card.layout,
      };
      if (mode === "resize") {
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      }
    },
    [onBringToFront],
  );
  const linkedCard = linkedCardId ? (cards.find((card) => card.id === linkedCardId) ?? null) : null;
  const linkedTarget = linkedCard && projectPlacePoint ? projectPlacePoint(linkedCard.place) : null;
  const linkedFrame = linkedCard ? (cardRects[linkedCard.id] ?? null) : null;
  const linkGeometry =
    linkedCard && linkedTarget && linkedFrame ? pinnedMediaConnectionGeometry(linkedFrame, linkedTarget) : null;
  const toggleMapLink = useCallback((cardId: string) => {
    setLinkedCardId((currentCardId) => (currentCardId === cardId ? null : cardId));
  }, []);

  return (
    <div className="pinned-media-board" aria-live="polite">
      {linkedCard && linkGeometry ? (
        <PinnedMediaMapLink geometry={linkGeometry} zIndex={linkedCard.layout.zIndex + 1} />
      ) : null}
      {cards.map((card) => (
        <PinnedMediaCard
          key={card.id}
          card={card}
          cardRef={(element) => setCardElement(card.id, element)}
          isActive={activeCardId === card.id}
          isLinked={linkedCardId === card.id}
          onBringToFront={onBringToFront}
          onMediaSizeChange={onMediaSizeChange}
          onRemove={onRemove}
          onStartInteraction={startInteraction}
          onToggleMapLink={toggleMapLink}
        />
      ))}
      {notice ? (
        <div className="pinned-media-notice" role="status">
          {notice}
        </div>
      ) : null}
    </div>
  );
}

function PinnedMediaCard({
  card,
  cardRef,
  isActive,
  isLinked,
  onBringToFront,
  onMediaSizeChange,
  onRemove,
  onStartInteraction,
  onToggleMapLink,
}: {
  card: ResolvedPinnedMediaCard;
  cardRef: RefCallback<HTMLElement>;
  isActive: boolean;
  isLinked: boolean;
  onBringToFront: (id: string) => void;
  onMediaSizeChange: (id: string, naturalSize: PinnedMediaNaturalSize) => void;
  onRemove: (id: string) => void;
  onStartInteraction: (
    card: ResolvedPinnedMediaCard,
    mode: InteractionState["mode"],
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  onToggleMapLink: (id: string) => void;
}) {
  const display = mapMediaDisplay(
    card.item.kind,
    card.item.caption,
    card.place.description,
    card.place.local_comment,
    null,
  );
  const categoryLabel = card.place.categories[0]?.label ?? (card.item.kind === "memory" ? "Pamiątka" : "Zdjęcie");
  const style = {
    left: `${card.layout.x}px`,
    top: `${card.layout.y}px`,
    width: `${card.layout.width}px`,
    zIndex: card.layout.zIndex,
  } satisfies CSSProperties;

  return (
    <article
      className={["pinned-media-card", isActive ? "is-active" : null, isLinked ? "has-map-link" : null]
        .filter(Boolean)
        .join(" ")}
      ref={cardRef}
      style={style}
      tabIndex={0}
      aria-label={`Przypięte medium: ${card.place.title}`}
      data-media-card-id={card.id}
      data-testid="pinned-media-card"
      onClick={stopFloatingWindowEvent}
      onContextMenu={stopFloatingWindowEvent}
      onDoubleClick={stopFloatingWindowEvent}
      onFocus={() => onBringToFront(card.id)}
      onMouseDown={stopFloatingWindowEvent}
      onPointerDown={(event) => onStartInteraction(card, "drag", event)}
      onTouchStart={stopFloatingWindowEvent}
      onWheel={stopFloatingWindowEvent}
    >
      <div
        className="pinned-media-card-image-wrap"
        style={{ height: `${card.layout.height}px` }}
        title="Kliknij dwukrotnie, żeby pokazać miejsce na mapie"
        onDoubleClick={(event) => {
          event.stopPropagation();
          onToggleMapLink(card.id);
        }}
      >
        <img
          className="pinned-media-card-image"
          src={mediaUrl(card.item.public_path)}
          alt={card.item.caption ?? card.place.title}
          onLoad={(event) => {
            const image = event.currentTarget;
            onMediaSizeChange(card.id, {
              height: image.naturalHeight,
              width: image.naturalWidth,
            });
          }}
        />
        <button
          className="pinned-media-card-remove"
          type="button"
          aria-label="Odepnij medium"
          title="Odepnij"
          data-drag-ignore
          onClick={(event) => {
            event.stopPropagation();
            onRemove(card.id);
          }}
        >
          <X aria-hidden="true" size={14} />
        </button>
      </div>
      <div className="pinned-media-card-copy">
        <span className="pinned-media-card-eyebrow">{categoryLabel}</span>
        <span className="pinned-media-card-title">{card.place.title}</span>
        {display.title ? <span className="pinned-media-card-caption">{display.title}</span> : null}
      </div>
      <button
        className="pinned-media-card-resize"
        type="button"
        aria-label="Zmień rozmiar karty"
        title="Zmień rozmiar"
        data-drag-ignore
        onPointerDown={(event) => onStartInteraction(card, "resize", event)}
      />
    </article>
  );
}

function PinnedMediaMapLink({
  geometry,
  zIndex,
}: {
  geometry: ReturnType<typeof pinnedMediaConnectionGeometry>;
  zIndex: number;
}) {
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

function resizeLayout(layout: PinnedMediaLayout, deltaX: number, deltaY: number, zIndex: number): PinnedMediaLayout {
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

function toStoredCard(card: ResolvedPinnedMediaCard): StoredPinnedMediaCard {
  return {
    createdAt: card.createdAt,
    id: card.id,
    itemId: card.itemId,
    kind: card.kind,
    layout: card.layout,
    placeId: card.placeId,
  };
}

function storedCardListsEqual(first: StoredPinnedMediaCard[], second: StoredPinnedMediaCard[]) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function rectRecordsEqual(first: Record<string, RectLike>, second: Record<string, RectLike>) {
  return JSON.stringify(first) === JSON.stringify(second);
}
