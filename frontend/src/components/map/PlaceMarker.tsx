import L from "leaflet";
import { useMemo } from "react";
import { Marker, useMap } from "react-leaflet";

import { mediaUrl, type PlaceMapItem } from "../../api/client";
import { getPlaceMarkerLayout, type PlaceMarkerLayout } from "./mapMarkerScale";
import { getPlaceFanItems, getPlacePreviewVisual, type PlaceMapVisualItem } from "./placePreview";

function markerIcon(place: PlaceMapItem, isSelected: boolean, layout: PlaceMarkerLayout) {
  const previewItem = getPlacePreviewVisual(place);
  if (!previewItem) {
    return L.divIcon({
      className: isSelected ? "place-marker-icon is-selected" : "place-marker-icon",
      html: "<span></span>",
      iconAnchor: [14, 34],
      iconSize: [28, 34],
    });
  }

  const imageUrl = escapeAttribute(mediaUrl(previewItem.thumb_path));
  return L.divIcon({
    className: [
      "place-photo-marker",
      previewItem.kind === "memory" ? "is-memory" : "is-photo",
      isSelected ? "is-selected" : null,
    ]
      .filter(Boolean)
      .join(" "),
    html: `<span style="--place-marker-width: ${layout.width}px; --place-marker-height: ${layout.height}px; background-image: url('${imageUrl}')"></span>`,
    iconAnchor: [Math.round(layout.width / 2), Math.round(layout.height / 2)],
    iconSize: [layout.width, layout.height],
  });
}

type FanOffset = {
  x: number;
  y: number;
};

function fanVisualIcon(item: PlaceMapVisualItem, offset: FanOffset, index: number) {
  return L.divIcon({
    className: `photo-fan-marker ${item.kind === "memory" ? "is-memory" : "is-photo"}`,
    html: `<span style="background-image: url('${escapeAttribute(mediaUrl(item.thumb_path))}'); ${fanAnimationStyle(offset, index)}"></span>`,
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
  const placeLayout = useMemo(
    () => getPlaceMarkerLayout({ editorialPriority: place.weight, zoom }),
    [place.weight, zoom],
  );
  const placeIcon = useMemo(() => markerIcon(place, isExpanded, placeLayout), [isExpanded, place, placeLayout]);

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
        title={place.title}
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
