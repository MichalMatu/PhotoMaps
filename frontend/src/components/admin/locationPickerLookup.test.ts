import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getLocationLookupPreview,
  getLocationPickerPositionLabel,
  reverseLookupLocation,
  roundedLocationPickerPosition,
} from "./locationPickerLookup";

describe("location picker lookup helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the existing six-decimal coordinate contract", () => {
    expect(roundedLocationPickerPosition(51.10998765, 17.03245678)).toEqual({
      lat: 51.109988,
      lon: 17.032457,
    });
    expect(getLocationPickerPositionLabel({ lat: 51.1, lon: 17.03 })).toBe("51.100000, 17.030000");
  });

  it("builds the same compact preview from reverse lookup data", () => {
    expect(
      getLocationLookupPreview({
        status: "success",
        result: {
          address: { city: "Wrocław", house_number: "1", road: "Rynek" },
          category: "tourism",
          display_name: "Ratusz, Rynek, Wrocław",
          type: "attraction",
        },
      }),
    ).toEqual({
      details: "tourism / attraction · Rynek 1",
      title: "Ratusz · Wrocław",
    });
  });

  it("calls Nominatim with the existing reverse lookup parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ name: "Ratusz" }),
      ok: true,
      status: 200,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(reverseLookupLocation({ lat: 51.1, lon: 17.03 })).resolves.toEqual({ name: "Ratusz" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    const url = new URL(requestUrl as string);
    expect(url.origin + url.pathname).toBe("https://nominatim.openstreetmap.org/reverse");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      "accept-language": "pl,en",
      addressdetails: "1",
      format: "jsonv2",
      lat: "51.1",
      lon: "17.03",
      zoom: "18",
    });
    expect(requestInit).toEqual({ headers: { Accept: "application/json" } });
  });
});
