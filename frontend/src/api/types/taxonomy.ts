export type CategoryStatus = "active" | "archived";

export type Category = {
  id: string;
  label: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  status: CategoryStatus;
};

export type CategoryPayload = {
  id: string;
  label: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  status: CategoryStatus;
};

export type CategoryUpdatePayload = Partial<Omit<CategoryPayload, "id">>;

export type CityStatus = "active" | "archived";

export type City = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  default_zoom: number;
  sort_order: number;
  status: CityStatus;
};

export type CityPayload = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  default_zoom: number;
  sort_order: number;
  status: CityStatus;
};

export type CityUpdatePayload = Partial<Omit<CityPayload, "id">>;
