import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  place: Place;
  photos: Photo[];
  isExpanded: boolean;
  onCloseFan: () => void;
  onPhotoUploaded?: () => void;
  onToggleFan: () => void;
};

type PhotoViewerProps = {
  onClose: () => void;
  photo: Photo;
  place: Place;
};

function MapPhotoViewer({ onClose, photo, place }: PhotoViewerProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="map-photo-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`Zdjęcie: ${place.title}`}
      onClick={onClose}
    >
      <div className="map-photo-viewer-image-wrap" onClick={(event) => event.stopPropagation()}>
        <img src={mediaUrl(photo.public_path)} alt={photo.caption ?? place.title} />
        <button className="map-photo-viewer-close" type="button" onClick={onClose} aria-label="Zamknij">
          x
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function PlaceMarker({ place, photos, isExpanded, onCloseFan, onPhotoUploaded, onToggleFan }: Props) {
  const map = useMap();
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fanItemCount = photos.length + 1;

  useEffect(() => {
    if (!isExpanded) {
      setSelectedPhoto(null);
    }
  }, [isExpanded]);

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
              icon={fanPhotoIcon(photo, fanLayout[index].offset, index)}
              key={photo.id}
              position={fanLayout[index].position}
              riseOnHover
              title={photo.caption ?? place.title}
              zIndexOffset={1300 + index}
              eventHandlers={{
                click: (event) => {
                  stopMarkerClick(event);
                  setSelectedPhoto(photo);
                },
              }}
            />
          ))
        : null}

      {isExpanded ? (
        <Marker
          icon={fanAddIcon(fanLayout[photos.length].offset, photos.length)}
          position={fanLayout[photos.length].position}
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

      {selectedPhoto ? <MapPhotoViewer photo={selectedPhoto} place={place} onClose={() => setSelectedPhoto(null)} /> : null}
    </>
  );
}
