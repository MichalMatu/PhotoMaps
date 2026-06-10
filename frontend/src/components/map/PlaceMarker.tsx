import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { Marker, useMap } from "react-leaflet";

import { mediaUrl, type Photo, type PlaceMapItem } from "../../api/client";
import { getPlacePreviewPhoto } from "./placePreview";

function markerIcon(place: PlaceMapItem, isSelected: boolean) {
  const coverPhoto = getPlacePreviewPhoto(place);
  if (!coverPhoto) {
    return L.divIcon({
      className: isSelected ? "place-marker-icon is-selected" : "place-marker-icon",
      html: "<span></span>",
      iconAnchor: [14, 34],
      iconSize: [28, 34],
    });
  }

  const imageUrl = escapeAttribute(mediaUrl(coverPhoto.thumb_path));
  return L.divIcon({
    className: isSelected ? "place-photo-marker is-selected" : "place-photo-marker",
    html: `<span><img src="${imageUrl}" alt="" width="64" height="52" decoding="async" /></span>`,
    iconAnchor: [32, 26],
    iconSize: [64, 52],
  });
}

type FanOffset = {
  x: number;
  y: number;
};

function fanPhotoIcon(photo: Photo, offset: FanOffset, index: number) {
  return L.divIcon({
    className: "photo-fan-marker",
    html: `<span style="background-image: url('${escapeAttribute(mediaUrl(photo.thumb_path))}'); ${fanAnimationStyle(offset, index)}"></span>`,
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
  photos: Photo[];
  isExpanded: boolean;
  onMemoryOpen: (place: PlaceMapItem) => void;
  onPhotoPreview: (place: PlaceMapItem, photo: Photo) => void;
  onToggleFan: () => void;
};

export function PlaceMarker({ place, photos, isExpanded, onMemoryOpen, onPhotoPreview, onToggleFan }: Props) {
  const map = useMap();
  const [layoutVersion, setLayoutVersion] = useState(0);
  const fanItemCount = photos.length + 1;
  const placeIcon = useMemo(() => markerIcon(place, isExpanded), [isExpanded, place]);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const refreshLayout = () => setLayoutVersion((version) => version + 1);

    refreshLayout();
    map.on("zoomend moveend resize", refreshLayout);

    return () => {
      map.off("zoomend moveend resize", refreshLayout);
    };
  }, [isExpanded, map]);

  const fanLayout = useMemo(() => {
    const origin = map.project([place.lat, place.lon], map.getZoom());

    return fanOffsets(fanItemCount).map((offset) => ({
      offset,
      position: map.unproject(origin.add([offset.x, offset.y]), map.getZoom()),
    }));
  }, [fanItemCount, layoutVersion, map, place.lat, place.lon]);
  const fanPhotoIcons = useMemo(
    () => photos.map((photo, index) => fanPhotoIcon(photo, fanLayout[index].offset, index)),
    [fanLayout, photos],
  );
  const fanAddMarkerIcon = useMemo(
    () => fanAddIcon(fanLayout[photos.length].offset, photos.length),
    [fanLayout, photos.length],
  );

  return (
    <>
      <Marker
        icon={placeIcon}
        position={[place.lat, place.lon]}
        riseOnHover
        title={place.title}
        zIndexOffset={isExpanded ? 1200 : 500}
        eventHandlers={{
          click: (event) => {
            stopMarkerClick(event);
            onToggleFan();
          },
        }}
      />

      {isExpanded
        ? photos.map((photo, index) => (
            <Marker
              icon={fanPhotoIcons[index]}
              key={photo.id}
              position={fanLayout[index].position}
              riseOnHover
              title={photo.caption ?? place.title}
              zIndexOffset={1300 + index}
              eventHandlers={{
                click: (event) => {
                  stopMarkerClick(event);
                  onPhotoPreview(place, photo);
                },
              }}
            />
          ))
        : null}

      {isExpanded ? (
        <Marker
          icon={fanAddMarkerIcon}
          position={fanLayout[photos.length].position}
          riseOnHover
          title={`Byłem tutaj: ${place.title}`}
          zIndexOffset={1400 + photos.length}
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
