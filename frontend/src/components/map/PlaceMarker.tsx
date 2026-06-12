import L from "leaflet";
import { useMemo } from "react";
import { Marker, useMap } from "react-leaflet";

import { mediaUrl, type PlaceMapItem } from "../../api/client";
import { getPlaceMarkerLayout, getSquarePlaceMarkerLayout, type PlaceMarkerLayout } from "./mapMarkerScale";
import { getPlaceFanItems, getPlacePreviewVisual, isMapIconVisualItem, type PlaceMapVisualItem } from "./placePreview";

function markerIcon(previewItem: PlaceMapVisualItem | null, isSelected: boolean, layout: PlaceMarkerLayout) {
  if (!previewItem) {
    return L.divIcon({
      className: isSelected ? "place-marker-icon is-selected" : "place-marker-icon",
      html: "<span></span>",
      iconAnchor: [14, 34],
      iconSize: [28, 34],
    });
  }

  const markerLayout = isMapIconVisualItem(previewItem) ? getSquarePlaceMarkerLayout(layout) : layout;
  const imageUrl = escapeAttribute(mediaUrl(previewItem.thumb_path));
  return L.divIcon({
    className: [
      "place-photo-marker",
      previewItem.kind === "memory" ? "is-memory" : "is-photo",
      isMapIconVisualItem(previewItem) ? "is-map-icon" : null,
      isSelected ? "is-selected" : null,
    ]
      .filter(Boolean)
      .join(" "),
    html: `<span style="--place-marker-width: ${markerLayout.width}px; --place-marker-height: ${markerLayout.height}px; --place-marker-image: url('${imageUrl}')"></span>`,
    iconAnchor: [Math.round(markerLayout.width / 2), Math.round(markerLayout.height / 2)],
    iconSize: [markerLayout.width, markerLayout.height],
  });
}

type FanOffset = {
  x: number;
  y: number;
};

function fanVisualIcon(item: PlaceMapVisualItem, offset: FanOffset, index: number) {
  const imageUrl = escapeAttribute(mediaUrl(item.thumb_path));
  return L.divIcon({
    className: [
      "photo-fan-marker",
      item.kind === "memory" ? "is-memory" : "is-photo",
      isMapIconVisualItem(item) ? "is-map-icon" : null,
    ]
      .filter(Boolean)
      .join(" "),
    html: `<span style="--photo-fan-image: url('${imageUrl}'); ${fanAnimationStyle(offset, index)}"></span>`,
    iconAnchor: [31, 31],
    iconSize: [62, 62],
  });
}

function fanAddIcon(offset: FanOffset, index: number) {
  return L.divIcon({
    className: "photo-fan-add-marker",
    html: `<span style="${fanAnimationStyle(offset, index)}">+</span>`,
    iconAnchor: [21, 21],
    iconSize: [42, 42],
  });
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
}

function stopMarkerClick(event: L.LeafletMouseEvent) {
  L.DomEvent.stop(event.originalEvent);
}

function fanAnimationStyle(offset: FanOffset, index: number) {
  const delay = Math.min(index * 32, 180);

  return `--fan-from-x: ${-offset.x}px; --fan-from-y: ${-offset.y}px; --fan-delay: ${delay}ms;`;
}

function fanOffsets(itemCount: number) {
  const radius = Math.min(130, Math.max(76, 58 + itemCount * 8));
  const startAngle = -Math.PI / 2;

  return Array.from({ length: itemCount }, (_, index) => {
    const angle = startAngle + (index / itemCount) * Math.PI * 2;

    return {
      x: Math.round(Math.cos(angle) * radius),
      y: Math.round(Math.sin(angle) * radius),
    };
  });
}

type Props = {
  place: PlaceMapItem;
  isExpanded: boolean;
  onMemoryOpen: (place: PlaceMapItem) => void;
  onVisualPreview: (place: PlaceMapItem, item: PlaceMapVisualItem) => void;
  onToggleFan: () => void;
  zoom: number;
};

export function PlaceMarker({ place, isExpanded, onMemoryOpen, onToggleFan, onVisualPreview, zoom }: Props) {
  const map = useMap();
  const fanItems = useMemo(() => getPlaceFanItems(place), [place]);
  const fanItemCount = fanItems.length + 1;
  const previewItem = useMemo(() => getPlacePreviewVisual(place), [place]);
  const placeLayout = useMemo(
    () => getPlaceMarkerLayout({ editorialPriority: place.weight, zoom }),
    [place.weight, zoom],
  );
  const placeIcon = useMemo(
    () => markerIcon(previewItem, isExpanded, placeLayout),
    [isExpanded, placeLayout, previewItem],
  );
  const markerTitle = previewItem && isMapIconVisualItem(previewItem) ? undefined : place.title;

  const fanLayout = useMemo(() => {
    const origin = map.project([place.lat, place.lon], zoom);

    return fanOffsets(fanItemCount).map((offset) => ({
      offset,
      position: map.unproject(origin.add([offset.x, offset.y]), zoom),
    }));
  }, [fanItemCount, map, place.lat, place.lon, zoom]);
  const fanVisualIcons = useMemo(
    () => fanItems.map((item, index) => fanVisualIcon(item, fanLayout[index].offset, index)),
    [fanItems, fanLayout],
  );
  const fanAddMarkerIcon = useMemo(
    () => fanAddIcon(fanLayout[fanItems.length].offset, fanItems.length),
    [fanItems.length, fanLayout],
  );

  return (
    <>
      <Marker
        icon={placeIcon}
        position={[place.lat, place.lon]}
        riseOnHover
        title={markerTitle}
        zIndexOffset={isExpanded ? 1200 : placeLayout.zIndexOffset}
        eventHandlers={{
          click: (event) => {
            stopMarkerClick(event);
            onToggleFan();
          },
        }}
      />

      {isExpanded
        ? fanItems.map((item, index) => (
            <Marker
              icon={fanVisualIcons[index]}
              key={`${item.kind}:${item.id}`}
              position={fanLayout[index].position}
              riseOnHover
              title={item.caption ?? place.title}
              zIndexOffset={1300 + index}
              eventHandlers={{
                click: (event) => {
                  stopMarkerClick(event);
                  onVisualPreview(place, item);
                },
              }}
            />
          ))
        : null}

      {isExpanded ? (
        <Marker
          icon={fanAddMarkerIcon}
          position={fanLayout[fanItems.length].position}
          riseOnHover
          title={`Byłem tutaj: ${place.title}`}
          zIndexOffset={1400 + fanItems.length}
          eventHandlers={{
            click: (event) => {
              stopMarkerClick(event);
              onMemoryOpen(place);
            },
          }}
        />
      ) : null}
    </>
  );
}
