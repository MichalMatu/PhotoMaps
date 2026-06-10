import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { Marker, Popup, useMap } from "react-leaflet";

import { mediaUrl, type Photo, type Place } from "../../api/client";
import { PhotoUploadForm } from "../places/PhotoUploadForm";

function markerIcon(photos: Photo[]) {
  const coverPhoto = photos[0];
  if (!coverPhoto) {
    return L.divIcon({
      className: "place-marker-icon",
      html: "<span></span>",
      iconAnchor: [14, 34],
      iconSize: [28, 34],
      popupAnchor: [0, -30],
    });
  }

  return L.divIcon({
    className: "place-photo-marker",
    html: `<span style="background-image: url('${escapeAttribute(mediaUrl(coverPhoto.thumb_path))}')"></span>`,
    iconAnchor: [32, 26],
    iconSize: [64, 52],
  });
}

function fanPhotoIcon(photo: Photo) {
  return L.divIcon({
    className: "photo-fan-marker",
    html: `<span style="background-image: url('${escapeAttribute(mediaUrl(photo.thumb_path))}')"></span>`,
    iconAnchor: [31, 31],
    iconSize: [62, 62],
  });
}

function fanAddIcon() {
  return L.divIcon({
    className: "photo-fan-add-marker",
    html: "<span>+</span>",
    iconAnchor: [25, 25],
    iconSize: [50, 50],
    popupAnchor: [0, -22],
  });
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
}

function stopMarkerClick(event: L.LeafletMouseEvent) {
  L.DomEvent.stop(event.originalEvent);
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
  place: Place;
  photos: Photo[];
  isExpanded: boolean;
  onCloseFan: () => void;
  onPhotoUploaded?: () => void;
  onToggleFan: () => void;
};

export function PlaceMarker({ place, photos, isExpanded, onCloseFan, onPhotoUploaded, onToggleFan }: Props) {
  const map = useMap();
  const [layoutVersion, setLayoutVersion] = useState(0);
  const fanItemCount = photos.length + 1;

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

  const fanPositions = useMemo(() => {
    const origin = map.project([place.lat, place.lon], map.getZoom());

    return fanOffsets(fanItemCount).map((offset) => map.unproject(origin.add([offset.x, offset.y]), map.getZoom()));
  }, [fanItemCount, layoutVersion, map, place.lat, place.lon]);

  return (
    <>
      <Marker
        icon={markerIcon(photos)}
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
              icon={fanPhotoIcon(photo)}
              key={photo.id}
              position={fanPositions[index]}
              riseOnHover
              title={photo.caption ?? place.title}
              zIndexOffset={1300 + index}
              eventHandlers={{
                click: (event) => {
                  stopMarkerClick(event);
                  window.open(mediaUrl(photo.public_path), "_blank", "noopener,noreferrer");
                },
              }}
            />
          ))
        : null}

      {isExpanded ? (
        <Marker
          icon={fanAddIcon()}
          position={fanPositions[photos.length]}
          riseOnHover
          title={`Dodaj zdjęcie: ${place.title}`}
          zIndexOffset={1400 + photos.length}
          eventHandlers={{
            click: stopMarkerClick,
          }}
        >
          <Popup className="map-photo-upload-popup" closeButton>
            <div className="map-upload-popover">
              <span className="eyebrow">Nowe zdjęcie</span>
              <strong>{place.title}</strong>
              <PhotoUploadForm
                placeId={place.id}
                onUploaded={() => {
                  onPhotoUploaded?.();
                  onCloseFan();
                }}
              />
            </div>
          </Popup>
        </Marker>
      ) : null}
    </>
  );
}
