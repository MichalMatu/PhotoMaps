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
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import type { LatLng, Map as LeafletMap, ZoomAnimEvent } from "leaflet";

import { mediaUrl, type PlaceMapItem } from "../../api/client";
import { isInteractiveDragTarget, stopFloatingWindowEvent } from "../ui/useDraggableWindow";
import { mapMediaDisplay } from "./mediaDisplayText";
import {
  bringPinnedMediaCardToFront,
  clampPinnedMediaScreenLayout,
  getViewportSize,
  mapPositionLayoutFromScreen,
  type MapAnchor,
  type PinnedMediaScreenLayout,
  type PointLike,
  type ProjectedPinnedMediaCard,
  readPinnedMediaCards,
  resolvePinnedMediaCards,
  safeAspectRatio,
  screenLayoutFromMapPosition,
  snapPinnedMediaScreenLayout,
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
  cards: ProjectedPinnedMediaCard[];
  notice: string | null;
  onBringToFront: (id: string) => void;
  onLayoutChange: (id: string, screenLayout: PinnedMediaScreenLayout) => void;
  onRemove: (id: string) => void;
  pinMedia: (request: PinMediaRequest) => boolean;
};

type PinnedMediaBoardProps = {
  cards: ProjectedPinnedMediaCard[];
  notice: string | null;
  onBringToFront: (id: string) => void;
  onLayoutChange: (id: string, screenLayout: PinnedMediaScreenLayout) => void;
  onRemove: (id: string) => void;
};

type InteractionState = {
  cardId: string;
  mode: "drag" | "resize";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startLayout: PinnedMediaScreenLayout;
};

const PINNED_MEDIA_PANE_NAME = "pinned-media-pane";

type ZoomProjection = Pick<ZoomAnimEvent, "center" | "zoom">;

export function usePinnedMediaBoard(places: PlaceMapItem[]): UsePinnedMediaBoardResult {
  const map = useMap();
  const [storedCards, setStoredCards] = useState<StoredPinnedMediaCard[]>(() => readPinnedMediaCards());
  const [notice, setNotice] = useState<string | null>(null);
  const [mapRevision, setMapRevision] = useState(0);
  const [zoomProjection, setZoomProjection] = useState<ZoomProjection | null>(null);
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

    const scheduleProjectionUpdate = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        setZoomProjection(null);
        setMapRevision((revision) => revision + 1);
      });
    };

    const handleZoomAnimation = (event: ZoomAnimEvent) => {
      setZoomProjection({ center: event.center, zoom: event.zoom });
    };

    map.on("zoomanim", handleZoomAnimation);
    map.on("moveend zoomend resize", scheduleProjectionUpdate);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      map.off("zoomanim", handleZoomAnimation);
      map.off("moveend zoomend resize", scheduleProjectionUpdate);
    };
  }, [map]);

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
          const nextCards = currentCards.map((card) => {
            const projectedLayout = projectPinnedMediaLayouts(map, card.layout, null);
            const clampedScreenLayout = clampPinnedMediaScreenLayout(projectedLayout.screenLayout, viewport);

            return {
              ...card,
              layout: mapPositionLayoutFromScreen(card.layout, clampedScreenLayout, (point) =>
                projectScreenPointToMapPosition(map, point),
              ),
            };
          });

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
  }, [map]);

  const resolvedCards = useMemo(() => resolvePinnedMediaCards(storedCards, places), [places, storedCards]);
  const projectedCards = useMemo(() => {
    void mapRevision;
    return resolvedCards.map((card) => projectPinnedMediaCard(map, card, zoomProjection));
  }, [map, mapRevision, resolvedCards, zoomProjection]);

  const pinMedia = useCallback(
    (request: PinMediaRequest) => {
      const result = upsertPinnedMediaCard(
        cardsRef.current,
        resolvePinnedMediaCards(cardsRef.current, places).map((card) => projectPinnedMediaCard(map, card, null)),
        {
          aspectRatio: request.aspectRatio,
          itemId: request.item.id,
          kind: request.item.kind,
          placeId: request.place.id,
          screenToMapPosition: (point) => projectScreenPointToMapPosition(map, point),
          sourceRect: request.sourceRect,
        },
        getViewportSize(),
      );

      cardsRef.current = result.cards;
      setStoredCards(result.cards);
      setNotice(null);
      return true;
    },
    [map, places],
  );

  const onLayoutChange = useCallback(
    (id: string, screenLayout: PinnedMediaScreenLayout) => {
      setStoredCards((currentCards) => {
        const nextCards = updatePinnedMediaLayout(currentCards, id, screenLayout, (point) =>
          projectScreenPointToMapPosition(map, point),
        );
        cardsRef.current = nextCards;
        return nextCards;
      });
    },
    [map],
  );

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
    cards: projectedCards,
    notice,
    onBringToFront,
    onLayoutChange,
    onRemove,
    pinMedia,
  };
}

export function PinnedMediaBoard({ cards, notice, onBringToFront, onLayoutChange, onRemove }: PinnedMediaBoardProps) {
  const map = useMap();
  const paneRoot = usePinnedMediaPane(map);
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
      const zIndex = currentCard?.screenLayout.zIndex ?? interaction.startLayout.zIndex;
      const otherLayouts = currentCards
        .filter((card) => card.id !== interaction.cardId)
        .map((card) => card.screenLayout);
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

      onLayoutChange(interaction.cardId, snapPinnedMediaScreenLayout(nextLayout, otherLayouts, viewport));
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
    (card: ProjectedPinnedMediaCard, mode: InteractionState["mode"], event: ReactPointerEvent<HTMLElement>) => {
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
        startLayout: card.screenLayout,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [onBringToFront],
  );

  const board = (
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

  return paneRoot ? createPortal(board, paneRoot) : null;
}

function PinnedMediaCard({
  card,
  isActive,
  onBringToFront,
  onRemove,
  onStartInteraction,
}: {
  card: ProjectedPinnedMediaCard;
  isActive: boolean;
  onBringToFront: (id: string) => void;
  onRemove: (id: string) => void;
  onStartInteraction: (
    card: ProjectedPinnedMediaCard,
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
    transform: `translate3d(${card.layerLayout.x}px, ${card.layerLayout.y}px, 0)`,
    width: `${card.layerLayout.width}px`,
    zIndex: card.screenLayout.zIndex,
  } satisfies CSSProperties;

  return (
    <article
      className={
        isActive ? "pinned-media-card leaflet-zoom-animated is-active" : "pinned-media-card leaflet-zoom-animated"
      }
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
      <div className="pinned-media-card-image-wrap" style={{ height: `${card.layerLayout.height}px` }}>
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

function resizeLayout(
  layout: PinnedMediaScreenLayout,
  deltaX: number,
  deltaY: number,
  zIndex: number,
): PinnedMediaScreenLayout {
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

function usePinnedMediaPane(map: LeafletMap) {
  const [paneRoot, setPaneRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const existingPane = map.getPane(PINNED_MEDIA_PANE_NAME);
    const pane = existingPane ?? map.createPane(PINNED_MEDIA_PANE_NAME);
    pane.classList.add("pinned-media-pane");
    setPaneRoot(pane);

    return () => {
      setPaneRoot(null);
    };
  }, [map]);

  return paneRoot;
}

function projectPinnedMediaCard(
  map: LeafletMap,
  card: ResolvedPinnedMediaCard,
  zoomProjection: ZoomProjection | null,
): ProjectedPinnedMediaCard {
  const { layerLayout, screenLayout } = projectPinnedMediaLayouts(map, card.layout, zoomProjection);

  return {
    ...card,
    layerLayout,
    screenLayout,
  };
}

function projectPinnedMediaLayouts(
  map: LeafletMap,
  layout: StoredPinnedMediaCard["layout"],
  zoomProjection: ZoomProjection | null,
) {
  const layerLayout = screenLayoutFromMapPosition(
    layout,
    projectMapPositionLayer(map, layout.position, zoomProjection),
  );
  const screenPoint = projectLayerPointToScreen(map, {
    x: layerLayout.x,
    y: layerLayout.y,
  });

  return {
    layerLayout,
    screenLayout: {
      ...layerLayout,
      x: screenPoint.x,
      y: screenPoint.y,
    },
  };
}

function projectMapPositionLayer(
  map: LeafletMap,
  position: MapAnchor,
  zoomProjection: ZoomProjection | null,
): PointLike {
  const layerPoint = zoomProjection
    ? (map as LeafletMapWithNewLayerPoint)._latLngToNewLayerPoint(
        [position.lat, position.lng],
        zoomProjection.zoom,
        zoomProjection.center,
      )
    : map.latLngToLayerPoint([position.lat, position.lng]);

  return {
    x: layerPoint.x,
    y: layerPoint.y,
  };
}

function projectLayerPointToScreen(map: LeafletMap, point: PointLike): PointLike {
  const containerPoint = map.layerPointToContainerPoint([point.x, point.y]);
  const containerRect = map.getContainer().getBoundingClientRect();

  return {
    x: containerRect.left + containerPoint.x,
    y: containerRect.top + containerPoint.y,
  };
}

function projectScreenPointToMapPosition(map: LeafletMap, point: PointLike): MapAnchor {
  const containerRect = map.getContainer().getBoundingClientRect();
  const latLng = map.containerPointToLatLng([point.x - containerRect.left, point.y - containerRect.top]);

  return {
    lat: latLng.lat,
    lng: latLng.lng,
  };
}

type LeafletMapWithNewLayerPoint = LeafletMap & {
  _latLngToNewLayerPoint: (latLng: [number, number], zoom: number, center: LatLng) => PointLike;
};
