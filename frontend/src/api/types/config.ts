export type PlaceCustomFieldType = "text" | "textarea" | "number" | "select" | "url" | "boolean" | "date";
export type PlaceCustomFieldValue = string | number | boolean | null;
export type PlaceCustomFields = Record<string, PlaceCustomFieldValue>;

export type PlaceCustomFieldDefinition = {
  key: string;
  label: string;
  type: PlaceCustomFieldType;
  required: boolean;
  public: boolean;
  options: string[] | null;
  sort_order: number;
};

type AppConfigMapMarkerSize = {
  width: number;
  height: number;
};

type AppConfigMapMarkerPriorityScale = {
  min_scale: number;
  max_scale: number;
  curve: number;
};

export type AppConfigMapMarkerScale = {
  base_size: AppConfigMapMarkerSize;
  min_render_scale: number;
  max_render_scale: number;
  priority: AppConfigMapMarkerPriorityScale;
};

export type AppConfigMapMarkerDensity = {
  marker_viewport_area: number;
  min_zoom: number;
  full_density_zoom: number;
  min_zoom_fill_ratio: number;
  max_zoom_fill_ratio: number;
  zoom_curve: number;
};

export type AppConfigMapMarkerPriority = {
  editorial_weight_multiplier: number;
  photo_count_sqrt_multiplier: number;
  memory_count_multiplier: number;
  score_multiplier: number;
};

export type AppConfigMap = {
  fallback_center: {
    lat: number;
    lon: number;
  };
  fallback_zoom: number;
  marker_scale: AppConfigMapMarkerScale;
  marker_density: AppConfigMapMarkerDensity;
  marker_priority: AppConfigMapMarkerPriority;
};

export type AppConfig = {
  product_name: string;
  locale: string;
  labels: Record<string, string>;
  branding: {
    primary_color: string;
    logo_url: string | null;
  };
  map: AppConfigMap;
  place_custom_fields: PlaceCustomFieldDefinition[];
};
