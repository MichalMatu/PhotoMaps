import type { AdminPhoto } from "../../src/api/types";

const NOW = "2026-06-12T09:00:00.000Z";
type VisualAdminPhoto = AdminPhoto & { caption: string };

export const city = {
  default_zoom: 13,
  id: "wroclaw",
  lat: 51.1079,
  lon: 17.0385,
  name: "Wrocław",
  region: "Dolnośląskie",
  sort_order: 10,
  status: "active",
};

export const appConfig = {
  branding: {
    logo_url: null,
    primary_color: "#2563eb",
  },
  labels: {
    categories: "kategorie",
    category: "kategoria",
    guide: "kolekcja miejsc",
    guides: "kolekcje miejsc",
    place: "miejsce",
    places: "miejsca",
  },
  locale: "pl-PL",
  map: {
    fallback_center: {
      lat: city.lat,
      lon: city.lon,
    },
    fallback_zoom: city.default_zoom,
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
  },
  place_custom_fields: [
    {
      key: "opening_hours",
      label: "Godziny otwarcia",
      options: null,
      public: true,
      required: false,
      sort_order: 10,
      type: "text",
    },
  ],
  product_name: "PhotoMap",
};

export const categories = [
  {
    description: "Adresy znane i lubiane przez mieszkańców.",
    icon: "landmark",
    id: "local_classic",
    label: "Lokalny klasyk",
    sort_order: 1,
    status: "active",
  },
  {
    description: "Miejsca poza oczywistą trasą.",
    icon: "sparkles",
    id: "hidden_gem",
    label: "Hidden gem",
    sort_order: 2,
    status: "active",
  },
];

function photo(id: string, placeId: string, caption: string): VisualAdminPhoto {
  return {
    approved_at: NOW,
    audio: null,
    attribution_author: null,
    attribution_license: null,
    attribution_license_url: null,
    attribution_source_url: null,
    caption,
    consent_confirmed: true,
    created_at: NOW,
    description_blocks: [],
    id,
    place_id: placeId,
    public_path: `/media/visual/${id}.svg`,
    role: "gallery",
    source: "editorial",
    status: "approved",
    thumb_path: `/media/visual/${id}-thumb.svg`,
  };
}

export const rynekCover = photo("visual-rynek-cover", "visual-rynek", "Rynek od strony przejścia");
export const rynekSide = photo("visual-rynek-side", "visual-rynek", "Detal kamienic");
export const nadodrzeCover = photo("visual-nadodrze-cover", "visual-nadodrze", "Szyldy Nadodrza");
export const portraitCover = photo("visual-portrait-cover", "visual-portrait", "Pionowy kadr");

export const rynekMemory = {
  approved_at: NOW,
  audio: null,
  author_city: "Wrocław",
  author_name: "Marta",
  caption: "Wieczorne światło",
  consent_confirmed: true,
  created_at: NOW,
  id: "visual-rynek-memory",
  memory_text: "Krótki spacer po pracy.",
  paid: false,
  place_id: "visual-rynek",
  public_path: "/media/visual/visual-rynek-memory.svg",
  share_slug: "visual-memory",
  status: "approved",
  thumb_path: "/media/visual/visual-rynek-memory-thumb.svg",
};

const rynekMemoryPreview = {
  approved_at: rynekMemory.approved_at,
  audio: rynekMemory.audio,
  caption: rynekMemory.caption,
  created_at: rynekMemory.created_at,
  id: rynekMemory.id,
  kind: "memory",
  place_id: rynekMemory.place_id,
  public_path: rynekMemory.public_path,
  thumb_path: rynekMemory.thumb_path,
};

export const places = [
  {
    category_ids: ["local_classic"],
    categories: [categories[0]],
    city,
    city_id: city.id,
    cover_photo: rynekCover,
    custom_fields: {},
    description: "Historyczne centrum z ratuszem, detalami i bocznymi przejściami.",
    id: "visual-rynek",
    lat: 51.1097,
    lon: 17.0325,
    memory_count: 1,
    photo_count: 2,
    preview_items: [{ ...rynekCover, kind: "photo" }, { ...rynekSide, kind: "photo" }, rynekMemoryPreview],
    score: 8,
    slug: "visual-rynek",
    title: "Rynek Wrocław",
    weight: 2,
  },
  {
    category_ids: ["hidden_gem"],
    categories: [categories[1]],
    city,
    city_id: city.id,
    cover_photo: nadodrzeCover,
    custom_fields: {},
    description: "Murale, szyldy i drobne miejskie warstwy.",
    id: "visual-nadodrze",
    lat: 51.1208,
    lon: 17.0332,
    memory_count: 0,
    photo_count: 1,
    preview_items: [{ ...nadodrzeCover, kind: "photo" }],
    score: 4,
    slug: "visual-nadodrze",
    title: "Nadodrze: murale",
    weight: 1.4,
  },
];

export const portraitPlace = {
  category_ids: ["hidden_gem"],
  categories: [categories[1]],
  city,
  city_id: city.id,
  cover_photo: portraitCover,
  custom_fields: {},
  description: "Pionowy kadr testowy do sprawdzenia skalowania przypiętej karty.",
  id: "visual-portrait",
  lat: 51.118,
  lon: 17.041,
  memory_count: 0,
  photo_count: 1,
  preview_items: [{ ...portraitCover, kind: "photo" }],
  score: 3,
  slug: "visual-portrait",
  title: "Pionowy kadr",
  weight: 1,
};

export const placeDetail = {
  ...places[0],
  article_blocks: [
    { type: "heading", text: "Mały pasaż, duża zmiana rytmu" },
    {
      type: "link",
      text: "Roger Molls - The Listener",
      url: "https://www.youtube.com/watch?v=aUPa4IyWNSo&list=RD6GljHsxfErk&index=27",
    },
    {
      type: "paragraph",
      text: "Przejście Garncarskie jest krótkie, ale właśnie dlatego dobrze pokazuje, jak działa PhotoMap.",
    },
  ],
  cover_photo_id: rynekCover.id,
  created_at: NOW,
  updated_at: NOW,
};

export const adminPlaces = [
  {
    ...places[0],
    article_blocks: [],
    cover_photo_id: rynekCover.id,
    created_at: NOW,
    local_comment: "Najlepsze kadry są tuż obok głównego placu.",
    status: "published",
    updated_at: NOW,
  },
  {
    ...places[1],
    article_blocks: [],
    cover_photo_id: nadodrzeCover.id,
    created_at: NOW,
    local_comment: "Miejsce do spokojnego łapania detali.",
    status: "published",
    updated_at: NOW,
  },
];

const guidePreviewPlaces = [
  {
    cover_photo: rynekCover,
    city_id: places[0].city_id,
    description: places[0].description,
    id: places[0].id,
    lat: places[0].lat,
    lon: places[0].lon,
    memory_count: places[0].memory_count,
    photo_count: places[0].photo_count,
    slug: places[0].slug,
    title: places[0].title,
  },
  {
    cover_photo: nadodrzeCover,
    city_id: places[1].city_id,
    description: places[1].description,
    id: places[1].id,
    lat: places[1].lat,
    lon: places[1].lon,
    memory_count: places[1].memory_count,
    photo_count: places[1].photo_count,
    slug: places[1].slug,
    title: places[1].title,
  },
];

const adminGuidePreviewPlaces = [
  {
    ...guidePreviewPlaces[0],
    local_comment: adminPlaces[0].local_comment,
    status: adminPlaces[0].status,
  },
  {
    ...guidePreviewPlaces[1],
    local_comment: adminPlaces[1].local_comment,
    status: adminPlaces[1].status,
  },
];

export const guides = [
  {
    article_blocks: [],
    cover_photo: rynekCover,
    description: "Krótka trasa przez centrum i boczne przejścia z dobrymi kadrami.",
    id: "visual-guide",
    kind: "route",
    place_count: 2,
    preview_places: guidePreviewPlaces,
    route_points: [
      { lat: 51.1097, lon: 17.0325 },
      { lat: 51.1144, lon: 17.035 },
      { lat: 51.1208, lon: 17.0332 },
    ],
    slug: "wizualny-spacer",
    title: "Wizualny spacer po centrum",
  },
  {
    article_blocks: [],
    cover_photo: nadodrzeCover,
    description: "Miejsca, gdzie woda, mosty i panoramy robią najwięcej pracy w kadrze.",
    id: "visual-guide-river",
    kind: "collection",
    place_count: 2,
    preview_places: [...guidePreviewPlaces].reverse(),
    route_points: [],
    slug: "kadry-nad-odra",
    title: "Kadry nad Odrą",
  },
  {
    article_blocks: [],
    cover_photo: rynekSide,
    description: "Zestaw ciaśniejszych przejść, szyldów i detali do sprawdzania miejskiego rytmu.",
    id: "visual-guide-details",
    kind: "collection",
    place_count: 2,
    preview_places: guidePreviewPlaces,
    route_points: [],
    slug: "detale-i-przejscia",
    title: "Detale i przejścia",
  },
];

export const adminGuides = guides.map((guide) => ({
  ...guide,
  created_at: NOW,
  preview_places: guide.slug === "kadry-nad-odra" ? [...adminGuidePreviewPlaces].reverse() : adminGuidePreviewPlaces,
  status: "published",
  updated_at: NOW,
}));

export const guideDetail = {
  ...guides[0],
  places: guides[0].preview_places,
};

export const wideGuideList = Array.from({ length: 6 }, (_, index) => {
  const guide = guides[index % guides.length];
  return {
    ...guide,
    id: `${guide.id}-${index}`,
    slug: `${guide.slug}-${index}`,
    title: `${guide.title} ${index + 1}`,
  };
});
