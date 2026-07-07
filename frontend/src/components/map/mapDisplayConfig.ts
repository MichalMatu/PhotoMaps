import type { PanOptions } from "leaflet";

import type { AppConfigMap } from "../../api/types";

const emptyCountryMapFallback: AppConfigMap = {
  fallback_center: {
    lat: 52.0693,
    lon: 19.4803,
  },
  fallback_zoom: 6,
  marker_density: {
    full_density_zoom: 15,
    marker_viewport_area: 18_000,
    max_zoom_fill_ratio: 1,
    min_zoom: 6,
    min_zoom_fill_ratio: 0.12,
    zoom_curve: 1.35,
  },
  marker_priority: {
    editorial_weight_multiplier: 12,
    memory_count_multiplier: 2,
    photo_count_sqrt_multiplier: 3.2,
    score_multiplier: 0.28,
  },
  marker_scale: {
    base_size: {
      height: 58,
      width: 72,
    },
    max_render_scale: 1.9,
    min_render_scale: 0.55,
    priority: {
      curve: 1.12,
      max_scale: 1.9,
      min_scale: 0.72,
    },
  },
};

const placeCenterPanOptions: PanOptions = {
  animate: true,
  duration: 0.38,
  easeLinearity: 0.2,
};

const placeCenterSnapOptions: PanOptions = {
  animate: false,
};

export const MAP_DISPLAY_CONFIG = {
  closeGesture: {
    dragTolerancePx: 8,
  },
  fallback: {
    emptyCountryMap: emptyCountryMapFallback,
  },
  layers: {
    featuredPlaceWeight: 4,
  },
  markerCollision: {
    defaultGap: 18,
    defaultZoom: 13,
    displacementThresholdPx: 1,
    epsilon: 0.5,
    fallbackPriorityProgress: 0.5,
    iterations: 72,
    maxDriftByZoom: [
      { maxZoom: 9.5, distance: 24 },
      { maxZoom: 10.5, distance: 40 },
      { maxZoom: 11.5, distance: 88 },
      { maxZoom: 12.5, distance: 132 },
      { maxZoom: 13.5, distance: 168 },
      { maxZoom: 14.5, distance: 184 },
    ],
    fallbackDriftDistance: 204,
    minViewportSize: 1,
    nudgeAngle: Math.PI * (3 - Math.sqrt(5)),
    priorityAnchorStrength: {
      base: 0.018,
      range: 0.03,
    },
    seedRadius: {
      max: 18,
      maxDriftRatio: 0.25,
    },
    startingMobility: 1.4,
    viewportPadding: 16,
  },
  mapContainer: {
    scrollWheelZoom: true,
    zoomDelta: 0.25,
    zoomControl: false,
    zoomSnap: 0.25,
  },
  mapControls: {
    zoomControlPosition: "bottomright",
  },
  markerDensity: {
    cityDetailZoomCurve: 1.15,
    cityDetailZoomStart: 11.5,
    cityRepresentativeViewportArea: 90_000,
    defaultZoom: 13,
    fullCityDetailZoom: 15,
    fullDensityZoom: 15,
    markerViewportArea: 18_000,
    maxZoomFillRatio: 1,
    minViewportSize: 1,
    minZoom: 6,
    screenDensityMaxOverlapRatio: 0.55,
    minZoomFillRatio: 0.12,
    zoomCurve: 1.35,
  },
  markerPriority: {
    editorialWeightMultiplier: 12,
    memoryCountMultiplier: 2,
    photoCountSqrtMultiplier: 3.2,
    scoreMultiplier: 0.28,
  },
  markerScale: {
    baseSize: {
      height: 58,
      width: 72,
    },
    defaultPriority: 1,
    defaultZoom: 13,
    maxScale: 1.9,
    minScale: 0.55,
    priority: {
      curve: 1.12,
      maxScale: 1.9,
      minScale: 0.72,
    },
    zoom: {
      baseScale: 0.72,
      baseZoom: 11,
      maxScale: 1.18,
      minScale: 0.68,
      scalePerZoom: 0.11,
    },
    zIndexOffset: {
      base: 500,
      range: 520,
    },
  },
  markerTransition: {
    enterMaxDelayMs: 144,
    enterStaggerMs: 16,
  },
  panes: {
    gallery: "photoGalleryPane",
    galleryZIndex: 720,
    marker: "markerPane",
  },
  placeCenter: {
    fallbackMs: 650,
    panOptions: placeCenterPanOptions,
    pixelTolerance: 4,
    snapOptions: placeCenterSnapOptions,
  },
  placeGallery: {
    display: {
      compactViewportRatio: 0.68,
      denseItemCount: 42,
      denseViewportRatio: 0.9,
      edgePadding: 56,
      maxDiameter: 1_320,
      minDiameter: 180,
    },
    motion: {
      addTileSize: { width: 70, height: 70 },
      coverTileSize: { width: 196, height: 152 },
      denseItemCount: 56,
      denseMaxTileScale: 1.28,
      gap: 12,
      goldenAngle: Math.PI * (3 - Math.sqrt(5)),
      minCircularSlots: 24,
      minTrigSignal: 0.001,
      maxDelayMs: 156,
      maxRadius: 1_200,
      maxTileScale: 1.72,
      mediaTileSizes: [
        { width: 146, height: 114 },
        { width: 136, height: 108 },
        { width: 126, height: 100 },
        { width: 116, height: 92 },
        { width: 108, height: 86 },
        { width: 100, height: 80 },
      ],
      minMaxHeight: 140,
      minMaxWidth: 160,
      polygonMaxOuterItems: 8,
      radiusStep: 6,
      slotSpacingPx: 18,
      staggerMs: 26,
    },
  },
  tileLayer: {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  },
} as const;
