export type LocationPickerPosition = {
  lat: number;
  lon: number;
};

export type ReverseLookupResult = {
  address?: {
    city?: string;
    city_district?: string;
    footway?: string;
    house_number?: string;
    municipality?: string;
    neighbourhood?: string;
    pedestrian?: string;
    road?: string;
    suburb?: string;
    town?: string;
    village?: string;
  };
  category?: string;
  display_name?: string;
  name?: string;
  type?: string;
};

export type LocationLookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: ReverseLookupResult }
  | { status: "error"; message: string };

export function roundedLocationPickerPosition(lat: number, lon: number): LocationPickerPosition {
  return {
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6)),
  };
}

export function getLocationPickerPositionLabel(position: LocationPickerPosition) {
  return `${position.lat.toFixed(6)}, ${position.lon.toFixed(6)}`;
}

function firstDisplayNamePart(displayName?: string) {
  return displayName?.split(",")[0]?.trim() || null;
}

function getLookupLocality(result: ReverseLookupResult) {
  return (
    result.address?.city ??
    result.address?.town ??
    result.address?.village ??
    result.address?.municipality ??
    result.address?.city_district ??
    result.address?.suburb ??
    null
  );
}

function getLookupStreet(result: ReverseLookupResult) {
  const street =
    result.address?.road ?? result.address?.pedestrian ?? result.address?.footway ?? result.address?.neighbourhood;
  return [street, result.address?.house_number].filter(Boolean).join(" ") || null;
}

export function getLocationLookupPreview(lookup: LocationLookupState) {
  if (lookup.status !== "success") {
    return null;
  }

  const title = lookup.result.name || firstDisplayNamePart(lookup.result.display_name) || "Miejsce z mapy";
  const locality = getLookupLocality(lookup.result);
  const details = [lookup.result.category, lookup.result.type].filter(Boolean).join(" / ");
  const street = getLookupStreet(lookup.result);

  return {
    details: [details, street].filter(Boolean).join(" · "),
    title: [title, locality].filter(Boolean).join(" · "),
  };
}

export async function reverseLookupLocation(position: LocationPickerPosition): Promise<ReverseLookupResult> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(position.lat));
  url.searchParams.set("lon", String(position.lon));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "pl,en");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Reverse lookup failed: ${response.status}`);
  }

  return (await response.json()) as ReverseLookupResult;
}
