import L from "leaflet";
import { useMemo } from "react";
import { Marker } from "react-leaflet";

import { mediaUrl, type PlaceMapItem } from "../../api/client";
import { escapeAttribute } from "./mapHtml";
import { getPlaceMarkerLayout, getSquarePlaceMarkerLayout, type PlaceMarkerLayout } from "./mapMarkerScale";
import { fanMotionStyle, getPlaceFanMotionLayout, placeMarkerEnterStyle, type FanMotionItem } from "./mapMotion";
import { getPlaceFanItems, getPlacePreviewVisual, isMapIconVisualItem, type PlaceMapVisualItem } from "./placePreview";

function markerIcon(
  previewItem: PlaceMapVisualItem | null,
  isSelected: boolean,
  layout: PlaceMarkerLayout,
  enterIndex: number,
  isEntering: boolean,
) {
  const markerEnterStyle = placeMarkerEnterStyle(enterIndex);
  const enterClassName = isEntering ? "is-entering" : null;
  if (!previewItem) {
    return L.divIcon({
      className: ["place-marker-icon", enterClassName, isSelected ? "is-selected" : null].filter(Boolean).join(" "),
      html: `<span style="${markerEnterStyle}"></span>`,
      iconAnchor: [14, 34],
      iconSize: [28, 34],
    });
  }

  const markerLayout = isMapIconVisualItem(previewItem) ? getSquarePlaceMarkerLayout(layout) : layout;
  const imageUrl = escapeAttribute(mediaUrl(previewItem.thumb_path));
  return L.divIcon({
    className: [
      "place-photo-marker",
      enterClassName,
      previewItem.kind === "memory" ? "is-memory" : "is-photo",
      isMapIconVisualItem(previewItem) ? "is-map-icon" : null,
      isSelected ? "is-selected" : null,
    ]
      .filter(Boolean)
      .join(" "),
    html: `<span style="--place-marker-width: ${markerLayout.width}px; --place-marker-height: ${markerLayout.height}px; --place-marker-image: url('${imageUrl}'); ${markerEnterStyle}"></span>`,
    iconAnchor: [Math.round(markerLayout.width / 2), Math.round(markerLayout.height / 2)],
    iconSize: [markerLayout.width, markerLayout.height],
  });
}

function fanVisualIcon(item: PlaceMapVisualItem, motion: FanMotionItem) {
  const imageUrl = escapeAttribute(mediaUrl(item.thumb_path));
  return L.divIcon({
    className: [
      "photo-fan-marker",
      item.kind === "memory" ? "is-memory" : "is-photo",
      isMapIconVisualItem(item) ? "is-map-icon" : null,
    ]
      .filter(Boolean)
      .join(" "),
    html: `<span style="--photo-fan-image: url('${imageUrl}'); ${fanMotionStyle(motion)}"></span>`,
    iconAnchor: [0, 0],
    iconSize: [1, 1],
  });
}

function fanAddIcon(motion: FanMotionItem) {
  return L.divIcon({
    className: "photo-fan-add-marker",
    html: `<span style="${fanMotionStyle(motion)}">+</span>`,
    iconAnchor: [0, 0],
    iconSize: [1, 1],
  });
}

function stopMarkerClick(event: L.LeafletMouseEvent) {
  L.DomEvent.stop(event.originalEvent);
}

type Props = {
  place: PlaceMapItem;
  isExpanded: boolean;
  isEntering: boolean;
  onMemoryOpen: (place: PlaceMapItem) => void;
  onVisualPreview: (place: PlaceMapItem, item: PlaceMapVisualItem) => void;
  onToggleFan: () => void;
  enterIndex: number;
  zoom: number;
};

export function PlaceMarker({
  place,
  isExpanded,
  isEntering,
  onMemoryOpen,
  onToggleFan,
  onVisualPreview,
  enterIndex,
  zoom,
}: Props) {
  const fanItems = useMemo(() => getPlaceFanItems(place), [place]);
  const fanItemCount = fanItems.length + 1;
  const previewItem = useMemo(() => getPlacePreviewVisual(place), [place]);
  const placeLayout = useMemo(
    () => getPlaceMarkerLayout({ editorialPriority: place.weight, zoom }),
    [place.weight, zoom],
  );
  const placeIcon = useMemo(
    () => markerIcon(previewItem, isExpanded, placeLayout, enterIndex, isEntering),
    [enterIndex, isEntering, isExpanded, placeLayout, previewItem],
  );
  const markerTitle = previewItem && isMapIconVisualItem(previewItem) ? undefined : place.title;

  const fanLayout = useMemo(() => {
    return getPlaceFanMotionLayout(fanItemCount).map((motion) => ({
      motion,
      position: L.latLng(place.lat, place.lon),
    }));
  }, [fanItemCount, place.lat, place.lon]);
  const fanVisualIcons = useMemo(
    () => fanItems.map((item, index) => fanVisualIcon(item, fanLayout[index].motion)),
    [fanItems, fanLayout],
  );
  const fanAddMarkerIcon = useMemo(() => fanAddIcon(fanLayout[fanItems.length].motion), [fanItems.length, fanLayout]);

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
