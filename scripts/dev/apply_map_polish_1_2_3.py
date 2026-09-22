from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(relative_path: str, old: str, new: str) -> None:
    path = ROOT / relative_path
    text = path.read_text()
    if old not in text:
        raise RuntimeError(f"Expected snippet not found in {relative_path}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1))


def write(relative_path: str, content: str) -> None:
    path = ROOT / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)


write(
    "frontend/src/components/map/mapAudioPlayback.ts",
    '''import type { PlaceMapVisualItem } from "./placePreview";

export type MapAudioTarget = {
  id: string;
  kind: PlaceMapVisualItem["kind"];
  placeId: string;
};

export function isMapAudioTarget(
  target: MapAudioTarget | null,
  placeId: string,
  item: Pick<PlaceMapVisualItem, "id" | "kind">,
) {
  return target?.placeId === placeId && target.id === item.id && target.kind === item.kind;
}

export function isSameMapAudioTarget(left: MapAudioTarget | null, right: MapAudioTarget) {
  return left?.placeId === right.placeId && left.id === right.id && left.kind === right.kind;
}
''',
)

write(
    "frontend/src/components/map/mapAudioPlayback.test.ts",
    '''import { describe, expect, it } from "vitest";

import { isMapAudioTarget, isSameMapAudioTarget, type MapAudioTarget } from "./mapAudioPlayback";

const target: MapAudioTarget = { id: "photo-1", kind: "photo", placeId: "place-1" };

describe("mapAudioPlayback", () => {
  it("matches only the exact playing visual", () => {
    expect(isMapAudioTarget(target, "place-1", { id: "photo-1", kind: "photo" })).toBe(true);
    expect(isMapAudioTarget(target, "place-2", { id: "photo-1", kind: "photo" })).toBe(false);
    expect(isMapAudioTarget(target, "place-1", { id: "photo-2", kind: "photo" })).toBe(false);
    expect(isMapAudioTarget(target, "place-1", { id: "photo-1", kind: "memory" })).toBe(false);
  });

  it("compares playback targets structurally", () => {
    expect(isSameMapAudioTarget(target, { ...target })).toBe(true);
    expect(isSameMapAudioTarget(null, target)).toBe(false);
  });
});
''',
)

write(
    "frontend/src/components/map/placeGalleryQuery.ts",
    '''import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { getPlacePhotos } from "../../api/media";

export const PLACE_GALLERY_STALE_TIME_MS = 60_000;

export function placeGalleryQueryOptions(placeId: string) {
  return {
    queryKey: ["place", placeId, "photos"] as const,
    queryFn: () => getPlacePhotos(placeId),
    staleTime: PLACE_GALLERY_STALE_TIME_MS,
  };
}

export function usePlaceGalleryPrefetch() {
  const queryClient = useQueryClient();

  return useCallback(
    (placeId: string) => {
      void queryClient.prefetchQuery(placeGalleryQueryOptions(placeId));
    },
    [queryClient],
  );
}
''',
)

write(
    "frontend/src/components/map/placeGalleryQuery.test.ts",
    '''import { describe, expect, it } from "vitest";

import { PLACE_GALLERY_STALE_TIME_MS, placeGalleryQueryOptions } from "./placeGalleryQuery";

describe("placeGalleryQueryOptions", () => {
  it("uses the canonical gallery cache key and stale time", () => {
    const options = placeGalleryQueryOptions("place-7");

    expect(options.queryKey).toEqual(["place", "place-7", "photos"]);
    expect(options.staleTime).toBe(PLACE_GALLERY_STALE_TIME_MS);
  });
});
''',
)

write(
    "frontend/src/components/map/mapHtml.ts",
    '''export function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");
}

const AUDIO_WAVEFORM_PATH = "M2 9h2l1.2-2.5L7 11l2.2-5L12 12l1.7-3H16";

export function audioWaveformHtml(hasAudio: boolean, isPlaying = false) {
  if (!hasAudio) {
    return "";
  }

  const className = isPlaying ? "map-audio-waveform is-playing" : "map-audio-waveform";
  return [
    `<svg class="${className}" viewBox="0 0 18 18" aria-hidden="true" focusable="false">`,
    `<path class="map-audio-waveform-outline" d="${AUDIO_WAVEFORM_PATH}" />`,
    `<path class="map-audio-waveform-line" d="${AUDIO_WAVEFORM_PATH}" />`,
    "</svg>",
  ].join("");
}
''',
)

write(
    "frontend/src/components/map/mapHtml.test.ts",
    '''import { describe, expect, it } from "vitest";

import { audioWaveformHtml, escapeAttribute } from "./mapHtml";

describe("mapHtml", () => {
  it("escapes attribute-sensitive characters", () => {
    expect(escapeAttribute(`a&b"c'd<e`)).toBe("a&amp;b&quot;c&#39;d&lt;e");
  });

  it("renders a background-free waveform only for media with audio", () => {
    expect(audioWaveformHtml(false)).toBe("");

    const html = audioWaveformHtml(true);
    expect(html).toContain('class="map-audio-waveform"');
    expect(html).toContain('class="map-audio-waveform-outline"');
    expect(html).toContain('class="map-audio-waveform-line"');
    expect(html).not.toContain("background");
  });

  it("marks only the actively playing waveform", () => {
    expect(audioWaveformHtml(true, true)).toContain('class="map-audio-waveform is-playing"');
    expect(audioWaveformHtml(true, false)).not.toContain("is-playing");
    expect(audioWaveformHtml(false, true)).toBe("");
  });
});
''',
)

replace_once(
    "frontend/src/components/map/usePlaceGalleryData.ts",
    'import { findPlaceGalleryItem, getPlaceGalleryItems, type PlaceMapVisualItem } from "./placePreview";\n',
    'import { placeGalleryQueryOptions } from "./placeGalleryQuery";\nimport { findPlaceGalleryItem, getPlaceGalleryItems, type PlaceMapVisualItem } from "./placePreview";\n',
)
replace_once(
    "frontend/src/components/map/usePlaceGalleryData.ts",
    '''  const expandedPlacePhotosQuery = useQuery({
    queryKey: ["place", expandedPlace?.id, "photos"],
    queryFn: () => getPlacePhotos(expandedPlace?.id ?? ""),
    enabled: expandedPlace !== null,
    staleTime: 60_000,
  });
''',
    '''  const expandedPlacePhotosQuery = useQuery({
    ...placeGalleryQueryOptions(expandedPlace?.id ?? ""),
    enabled: expandedPlace !== null,
  });
''',
)
replace_once(
    "frontend/src/components/map/usePlaceGalleryData.ts",
    'import { getPlacePhotos } from "../../api/media";\n',
    '',
)

replace_once(
    "frontend/src/components/map/photo-detail/PhotoDetailAudioControl.tsx",
    '''export function PhotoDetailAudioControl({
  audio,
  isAutoplayEnabled,
}: {
  audio: AudioAttachment | null;
  isAutoplayEnabled: boolean;
}) {
  const controlRef = useRef<HTMLDivElement>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const playbackStateRef = useRef<AudioControlPlaybackState>(audioControlState(false, false));
''',
    '''export function PhotoDetailAudioControl({
  audio,
  isAutoplayEnabled,
  onPlaybackChange,
}: {
  audio: AudioAttachment | null;
  isAutoplayEnabled: boolean;
  onPlaybackChange?: (isPlaying: boolean) => void;
}) {
  const controlRef = useRef<HTMLDivElement>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const onPlaybackChangeRef = useRef(onPlaybackChange);
  const playbackStateRef = useRef<AudioControlPlaybackState>(audioControlState(false, false));
''',
)
replace_once(
    "frontend/src/components/map/photo-detail/PhotoDetailAudioControl.tsx",
    '''  const setPlaybackState = useCallback((nextState: AudioControlPlaybackState) => {
    playbackStateRef.current = nextState;
    setIsExpanded(nextState.isExpanded);
    setIsPlaying(nextState.isPlaying);
  }, []);
''',
    '''  useEffect(() => {
    onPlaybackChangeRef.current = onPlaybackChange;
  }, [onPlaybackChange]);

  const setPlaybackState = useCallback((nextState: AudioControlPlaybackState) => {
    const wasPlaying = playbackStateRef.current.isPlaying;
    playbackStateRef.current = nextState;
    setIsExpanded(nextState.isExpanded);
    setIsPlaying(nextState.isPlaying);
    if (wasPlaying !== nextState.isPlaying) {
      onPlaybackChangeRef.current?.(nextState.isPlaying);
    }
  }, []);

  useEffect(
    () => () => {
      if (playbackStateRef.current.isPlaying) {
        onPlaybackChangeRef.current?.(false);
      }
    },
    [],
  );
''',
)

replace_once(
    "frontend/src/components/map/photo-detail/PhotoDetailModal.tsx",
    '''  onClose: () => void;
  onNavigate?: (item: PlaceMapVisualItem) => void;
''',
    '''  onAudioPlaybackChange?: (isPlaying: boolean) => void;
  onClose: () => void;
  onNavigate?: (item: PlaceMapVisualItem) => void;
''',
)
replace_once(
    "frontend/src/components/map/photo-detail/PhotoDetailModal.tsx",
    '''  navigationItems = [],
  onClose,
''',
    '''  navigationItems = [],
  onAudioPlaybackChange,
  onClose,
''',
)
replace_once(
    "frontend/src/components/map/photo-detail/PhotoDetailModal.tsx",
    '          <PhotoDetailAudioControl audio={audio} isAutoplayEnabled={isAudioAutoplayEnabled} />\n',
    '''          <PhotoDetailAudioControl
            audio={audio}
            isAutoplayEnabled={isAudioAutoplayEnabled}
            onPlaybackChange={onAudioPlaybackChange}
          />
''',
)

replace_once(
    "frontend/src/components/map/PlaceMarker.tsx",
    'import { Marker, useMap } from "react-leaflet";\n',
    'import { Marker, Tooltip, useMap } from "react-leaflet";\n',
)
replace_once(
    "frontend/src/components/map/PlaceMarker.tsx",
    'import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";\n',
    'import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";\nimport { isMapAudioTarget, type MapAudioTarget } from "./mapAudioPlayback";\n',
)
replace_once(
    "frontend/src/components/map/PlaceMarker.tsx",
    '''  isEntering: boolean,
  displayOffset: MarkerDisplayOffset | null | undefined,
) {
''',
    '''  isEntering: boolean,
  displayOffset: MarkerDisplayOffset | null | undefined,
  isAudioPlaying: boolean,
) {
''',
)
replace_once(
    "frontend/src/components/map/PlaceMarker.tsx",
    '''    html: `<span style="--place-marker-width: ${layout.width}px; --place-marker-height: ${layout.height}px; --place-marker-image: url('${imageUrl}'); ${markerOffsetStyle} ${markerEnterStyle}">${audioWaveformHtml(Boolean(previewItem.audio))}</span>`,
''',
    '''    html: `<span style="--place-marker-width: ${layout.width}px; --place-marker-height: ${layout.height}px; --place-marker-image: url('${imageUrl}'); ${markerOffsetStyle} ${markerEnterStyle}">${audioWaveformHtml(Boolean(previewItem.audio), isAudioPlaying)}</span>`,
''',
)
replace_once(
    "frontend/src/components/map/PlaceMarker.tsx",
    'function galleryVisualIcon(item: PlaceMapVisualItem, motion: GalleryMotionItem) {\n',
    'function galleryVisualIcon(item: PlaceMapVisualItem, motion: GalleryMotionItem, isAudioPlaying: boolean) {\n',
)
replace_once(
    "frontend/src/components/map/PlaceMarker.tsx",
    '''    html: `<span style="--photo-gallery-image: url('${imageUrl}'); ${galleryMotionStyle(motion)}">${audioWaveformHtml(Boolean(item.audio))}</span>`,
''',
    '''    html: `<span style="--photo-gallery-image: url('${imageUrl}'); ${galleryMotionStyle(motion)}">${audioWaveformHtml(Boolean(item.audio), isAudioPlaying)}</span>`,
''',
)
replace_once(
    "frontend/src/components/map/PlaceMarker.tsx",
    '''type Props = {
  displayOffset?: MarkerDisplayOffset;
  place: PlaceMapItem;
''',
    '''type Props = {
  activeAudioTarget: MapAudioTarget | null;
  displayOffset?: MarkerDisplayOffset;
  place: PlaceMapItem;
''',
)
replace_once(
    "frontend/src/components/map/PlaceMarker.tsx",
    '''  onMemoryOpen: (place: PlaceMapItem) => void;
  onToggleGallery: () => void;
''',
    '''  onMemoryOpen: (place: PlaceMapItem) => void;
  onPrefetchGallery: () => void;
  onToggleGallery: () => void;
''',
)
replace_once(
    "frontend/src/components/map/PlaceMarker.tsx",
    '''export function PlaceMarker({
  displayOffset,
  place,
''',
    '''export function PlaceMarker({
  activeAudioTarget,
  displayOffset,
  place,
''',
)
replace_once(
    "frontend/src/components/map/PlaceMarker.tsx",
    '''  onMediaOpen,
  onMemoryOpen,
  onToggleGallery,
''',
    '''  onMediaOpen,
  onMemoryOpen,
  onPrefetchGallery,
  onToggleGallery,
''',
)
replace_once(
    "frontend/src/components/map/PlaceMarker.tsx",
    '''  const markerVisualOffset = isExpanded ? null : displayOffset;
  const placeIcon = useMemo(
    () =>
      previewItem ? markerIcon(previewItem, isExpanded, placeLayout, enterIndex, isEntering, markerVisualOffset) : null,
    [enterIndex, isEntering, isExpanded, markerVisualOffset, placeLayout, previewItem],
  );
''',
    '''  const markerVisualOffset = isExpanded ? null : displayOffset;
  const isPreviewAudioPlaying = previewItem ? isMapAudioTarget(activeAudioTarget, place.id, previewItem) : false;
  const placeIcon = useMemo(
    () =>
      previewItem
        ? markerIcon(
            previewItem,
            isExpanded,
            placeLayout,
            enterIndex,
            isEntering,
            markerVisualOffset,
            isPreviewAudioPlaying,
          )
        : null,
    [enterIndex, isEntering, isExpanded, isPreviewAudioPlaying, markerVisualOffset, placeLayout, previewItem],
  );
''',
)
replace_once(
    "frontend/src/components/map/PlaceMarker.tsx",
    '''      galleryItems.map((item, index) =>
        galleryLayout[index] ? galleryVisualIcon(item, galleryLayout[index].motion) : null,
      ),
    [galleryItems, galleryLayout],
''',
    '''      galleryItems.map((item, index) =>
        galleryLayout[index]
          ? galleryVisualIcon(item, galleryLayout[index].motion, isMapAudioTarget(activeAudioTarget, place.id, item))
          : null,
      ),
    [activeAudioTarget, galleryItems, galleryLayout, place.id],
''',
)
replace_once(
    "frontend/src/components/map/PlaceMarker.tsx",
    '''        eventHandlers={{
          click: (event) => {
            stopMarkerClick(event);
            onToggleGallery();
          },
          keydown: (event) => activateMarkerFromKeyboard(event, onToggleGallery),
        }}
      />
''',
    '''        eventHandlers={{
          blur: (event) => (event.target as L.Marker).closeTooltip(),
          click: (event) => {
            stopMarkerClick(event);
            onToggleGallery();
          },
          focus: (event) => {
            onPrefetchGallery();
            (event.target as L.Marker).openTooltip();
          },
          keydown: (event) => activateMarkerFromKeyboard(event, onToggleGallery),
          mousedown: onPrefetchGallery,
          mouseover: onPrefetchGallery,
        }}
      >
        {!isExpanded ? (
          <Tooltip
            className="place-marker-hover-tooltip"
            direction="top"
            offset={[0, -Math.round(placeLayout.height / 2) - 6]}
            opacity={1}
          >
            {place.title}
          </Tooltip>
        ) : null}
      </Marker>
''',
)

replace_once(
    "frontend/src/components/map/PlaceLayer.tsx",
    'import { MapInteractionLock } from "./mapInteractionLock";\n',
    'import { MapInteractionLock } from "./mapInteractionLock";\nimport { isSameMapAudioTarget, type MapAudioTarget } from "./mapAudioPlayback";\n',
)
replace_once(
    "frontend/src/components/map/PlaceLayer.tsx",
    'import { useCenteredPlaceGallery } from "./useCenteredPlaceGallery";\n',
    'import { useCenteredPlaceGallery } from "./useCenteredPlaceGallery";\nimport { usePlaceGalleryPrefetch } from "./placeGalleryQuery";\n',
)
replace_once(
    "frontend/src/components/map/PlaceLayer.tsx",
    '''  const [memoryPlace, setMemoryPlace] = useState<PlaceMapItem | null>(null);
  const [visualDetail, setVisualDetail] = useState<PlaceVisualTarget | null>(null);
''',
    '''  const [memoryPlace, setMemoryPlace] = useState<PlaceMapItem | null>(null);
  const [activeAudioTarget, setActiveAudioTarget] = useState<MapAudioTarget | null>(null);
  const [visualDetail, setVisualDetail] = useState<PlaceVisualTarget | null>(null);
''',
)
replace_once(
    "frontend/src/components/map/PlaceLayer.tsx",
    '''  const zoom = mapViewport.zoom;
  const { markerDisplayOffsets, markerPlaces } = useMapMarkerLayout({
''',
    '''  const zoom = mapViewport.zoom;
  const prefetchPlaceGallery = usePlaceGalleryPrefetch();
  const { markerDisplayOffsets, markerPlaces } = useMapMarkerLayout({
''',
)
replace_once(
    "frontend/src/components/map/PlaceLayer.tsx",
    '''    if (visualDetail && !places.some((place) => place.id === visualDetail.placeId)) {
      setVisualDetail(null);
    }
''',
    '''    if (visualDetail && !places.some((place) => place.id === visualDetail.placeId)) {
      setVisualDetail(null);
      setActiveAudioTarget(null);
    }
''',
)
replace_once(
    "frontend/src/components/map/PlaceLayer.tsx",
    '''          <PlaceMarker
            key={`${placeMotionSignature}:${place.id}`}
            place={place}
''',
    '''          <PlaceMarker
            key={`${placeMotionSignature}:${place.id}`}
            activeAudioTarget={activeAudioTarget}
            place={place}
''',
)
replace_once(
    "frontend/src/components/map/PlaceLayer.tsx",
    '''            onMemoryOpen={setMemoryPlace}
            onMediaOpen={(nextPlace, nextItem) => {
''',
    '''            onMemoryOpen={setMemoryPlace}
            onPrefetchGallery={() => prefetchPlaceGallery(place.id)}
            onMediaOpen={(nextPlace, nextItem) => {
''',
)
replace_once(
    "frontend/src/components/map/PlaceLayer.tsx",
    '''          navigationItems={detailNavigationItems}
          place={detailPlace}
          onPin={(pinRequest) => {
''',
    '''          navigationItems={detailNavigationItems}
          place={detailPlace}
          onAudioPlaybackChange={(isPlaying) => {
            const nextTarget: MapAudioTarget = {
              id: detailItem.id,
              kind: detailItem.kind,
              placeId: detailPlace.id,
            };
            setActiveAudioTarget((currentTarget) => {
              if (isPlaying) {
                return nextTarget;
              }
              return isSameMapAudioTarget(currentTarget, nextTarget) ? null : currentTarget;
            });
          }}
          onPin={(pinRequest) => {
''',
)
replace_once(
    "frontend/src/components/map/PlaceLayer.tsx",
    '''          onNavigate={(nextItem) => {
            setVisualDetail({ id: nextItem.id, kind: nextItem.kind, placeId: detailPlace.id });
          }}
''',
    '''          onNavigate={(nextItem) => {
            setActiveAudioTarget(null);
            setVisualDetail({ id: nextItem.id, kind: nextItem.kind, placeId: detailPlace.id });
          }}
''',
)
replace_once(
    "frontend/src/components/map/PlaceLayer.tsx",
    '''          onClose={() => {
            setVisualDetail(null);
          }}
''',
    '''          onClose={() => {
            setActiveAudioTarget(null);
            setVisualDetail(null);
          }}
''',
)

replace_once(
    "frontend/src/styles/map.css",
    '''.map-audio-waveform {
  bottom: var(--space-1);
  height: var(--space-3);
  left: var(--space-1);
  pointer-events: none;
  position: absolute;
  width: var(--space-4);
}
''',
    '''.map-audio-waveform {
  bottom: var(--space-1);
  height: var(--space-3);
  left: var(--space-1);
  pointer-events: none;
  position: absolute;
  transform-origin: center;
  width: var(--space-4);
}

.map-audio-waveform.is-playing {
  animation: map-audio-waveform-playing var(--motion-duration-slow) var(--motion-ease-standard) infinite alternate;
}
''',
)
replace_once(
    "frontend/src/styles/map.css",
    '''.map-audio-waveform-line {
  stroke: var(--content-on-media);
  stroke-width: 1.8;
}

@media (hover: hover) and (pointer: fine) {
''',
    '''.map-audio-waveform-line {
  stroke: var(--content-on-media);
  stroke-width: 1.8;
}

.place-map .place-marker-hover-tooltip {
  background: var(--surface-media-glass-action);
  backdrop-filter: var(--blur-glass);
  border: 1px solid var(--border-on-media-subtle);
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-media-glass-action);
  color: var(--content-on-media);
  font-size: var(--text-caption);
  font-weight: 650;
  line-height: 1.15;
  padding: var(--space-1) var(--space-2);
  pointer-events: none;
  white-space: nowrap;
}

.place-map .leaflet-tooltip-top.place-marker-hover-tooltip::before {
  border-top-color: var(--surface-media-glass-action);
}

@keyframes map-audio-waveform-playing {
  from {
    opacity: 0.76;
    transform: scaleY(0.78);
  }

  to {
    opacity: 1;
    transform: scaleY(1.12);
  }
}

@media (hover: hover) and (pointer: fine) {
''',
)
replace_once(
    "frontend/src/styles/map.css",
    '''@media (prefers-reduced-motion: reduce) {
  .place-photo-marker {
    transition: none;
  }
''',
    '''@media (prefers-reduced-motion: reduce) {
  .map-audio-waveform.is-playing {
    animation: none;
  }

  .place-photo-marker {
    transition: none;
  }
''',
)

print("Applied PhotoMap polish changes: label, gallery prefetch, playing waveform.")
