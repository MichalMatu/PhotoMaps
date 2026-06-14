import { X } from "lucide-react";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
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
  getViewportSize,
  readPinnedMediaCards,
  resolvePinnedMediaCards,
  safeAspectRatio,
  snapPinnedMediaLayout,
  type PinnedMediaLayout,
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

type UsePinnedMediaBoardResult = {
  cards: ResolvedPinnedMediaCard[];
  notice: string | null;
  onBringToFront: (id: string) => void;
  onLayoutChange: (id: string, layout: PinnedMediaLayout) => void;
  onRemove: (id: string) => void;
  pinMedia: (request: PinMediaRequest) => boolean;
};

type PinnedMediaBoardProps = {
  cards: ResolvedPinnedMediaCard[];
  notice: string | null;
  onBringToFront: (id: string) => void;
  onLayoutChange: (id: string, layout: PinnedMediaLayout) => void;
  onRemove: (id: string) => void;
};

type InteractionState = {
  cardId: string;
  mode: "drag" | "resize";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startLayout: PinnedMediaLayout;
};

export function usePinnedMediaBoard(places: PlaceMapItem[]): UsePinnedMediaBoardResult {
  const [storedCards, setStoredCards] = useState<StoredPinnedMediaCard[]>(() => readPinnedMediaCards());
  const [notice, setNotice] = useState<string | null>(null);
  const cardsRef = useRef(storedCards);

  useEffect(() => {
    cardsRef.current = storedCards;
    writePinnedMediaCards(storedCards);
  }, [storedCards]);

  useEffect(() => {
    if (places.length === 0) {
      return;
    }

    setStoredCards((currentCards) => {
      const resolvedCards = resolvePinnedMediaCards(currentCards, places).map(toStoredCard);
      if (storedCardListsEqual(currentCards, resolvedCards)) {
        return currentCards;
      }

      cardsRef.current = resolvedCards;
      return resolvedCards;
    });
  }, [places]);

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
        const viewport = getViewportSize();
        setStoredCards((currentCards) => {
          const nextCards = currentCards.map((card) => ({
            ...card,
            layout: clampPinnedMediaLayout(card.layout, viewport),
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
  }, []);

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
      getViewportSize(),
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

  const onLayoutChange = useCallback((id: string, layout: PinnedMediaLayout) => {
    setStoredCards((currentCards) => {
      const nextCards = updatePinnedMediaLayout(currentCards, id, layout, getViewportSize());
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
    onRemove,
    pinMedia,
  };
}

export function PinnedMediaBoard({ cards, notice, onBringToFront, onLayoutChange, onRemove }: PinnedMediaBoardProps) {
  const cardsRef = useRef(cards);
  const interactionRef = useRef<InteractionState | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction || event.pointerId !== interaction.pointerId) {
        return;
      }

      event.preventDefault();
      const currentCards = cardsRef.current;
      const currentCard = currentCards.find((card) => card.id === interaction.cardId);
      const zIndex = currentCard?.layout.zIndex ?? interaction.startLayout.zIndex;
      const otherLayouts = currentCards.filter((card) => card.id !== interaction.cardId).map((card) => card.layout);
      const deltaX = event.clientX - interaction.startClientX;
      const deltaY = event.clientY - interaction.startClientY;
      const viewport = getViewportSize();
      const nextLayout =
        interaction.mode === "drag"
          ? {
              ...interaction.startLayout,
              x: interaction.startLayout.x + deltaX,
              y: interaction.startLayout.y + deltaY,
              zIndex,
            }
          : resizeLayout(interaction.startLayout, deltaX, deltaY, zIndex);

      onLayoutChange(interaction.cardId, snapPinnedMediaLayout(nextLayout, otherLayouts, viewport));
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction || event.pointerId !== interaction.pointerId) {
        return;
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
        mode,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startLayout: card.layout,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [onBringToFront],
  );

  return (
    <div className="pinned-media-board" aria-live="polite">
      {cards.map((card) => (
        <PinnedMediaCard
          key={card.id}
          card={card}
          isActive={activeCardId === card.id}
          onBringToFront={onBringToFront}
          onRemove={onRemove}
          onStartInteraction={startInteraction}
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
  isActive,
  onBringToFront,
  onRemove,
  onStartInteraction,
}: {
  card: ResolvedPinnedMediaCard;
  isActive: boolean;
  onBringToFront: (id: string) => void;
  onRemove: (id: string) => void;
  onStartInteraction: (
    card: ResolvedPinnedMediaCard,
    mode: InteractionState["mode"],
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
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
      className={isActive ? "pinned-media-card is-active" : "pinned-media-card"}
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
      <div className="pinned-media-card-image-wrap" style={{ height: `${card.layout.height}px` }}>
        <img
          className="pinned-media-card-image"
          src={mediaUrl(card.item.public_path)}
          alt={card.item.caption ?? card.place.title}
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
