import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type { PlaceMapItem } from "../../api/types";
import { isInteractiveDragTarget } from "../ui/useDraggableWindow";
import { PinnedMediaCard } from "./PinnedMediaCard";
import { PinnedMediaMapLink } from "./PinnedMediaMapLink";
import { measurePinnedMediaCardRects, rectRecordsEqual } from "./pinnedMediaBoardDom";
import {
  getPinnedMediaBounds,
  resizePinnedMediaLayoutFromPointer,
  snapPinnedMediaLayout,
  snapPinnedMediaResizeLayout,
} from "./pinnedMediaBoardLayout";
import { pinnedMediaConnectionGeometry } from "./pinnedMediaBoardLinkGeometry";
import type { PinnedMediaInteractionMode, PinnedMediaInteractionState } from "./pinnedMediaBoardInteraction";
import type {
  PinnedMediaLayout,
  PinnedMediaNaturalSize,
  PinnedMediaPoint,
  RectLike,
  ResolvedPinnedMediaCard,
} from "./pinnedMediaBoardTypes";

export type PinnedMediaPlaceProjector = (place: Pick<PlaceMapItem, "lat" | "lon">) => PinnedMediaPoint | null;

type PinnedMediaBoardProps = {
  cards: ResolvedPinnedMediaCard[];
  notice: string | null;
  onBringToFront: (id: string) => void;
  onLayoutChange: (id: string, layout: PinnedMediaLayout) => void;
  onMediaSizeChange: (id: string, naturalSize: PinnedMediaNaturalSize) => void;
  onRemove: (id: string) => void;
  projectPlacePoint?: PinnedMediaPlaceProjector | null;
};

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
  const interactionRef = useRef<PinnedMediaInteractionState | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [cardRects, setCardRects] = useState<Record<string, RectLike>>({});
  const [linkedCardId, setLinkedCardId] = useState<string | null>(null);

  const measureCardRects = useCallback(() => {
    const nextRects = measurePinnedMediaCardRects(cardsRef.current, cardElementsRef.current);

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
          : resizePinnedMediaLayoutFromPointer(interaction.startLayout, deltaX, deltaY, zIndex);

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
    (card: ResolvedPinnedMediaCard, mode: PinnedMediaInteractionMode, event: ReactPointerEvent<HTMLElement>) => {
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
