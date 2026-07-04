import { describe, expect, it } from "vitest";

import type { PlaceCustomFieldDefinition } from "../api/types";
import {
  placeCustomFieldFormValues,
  placeCustomFieldPayload,
  publicPlaceCustomFieldDisplayItems,
} from "./placeCustomFields";

const definitions: PlaceCustomFieldDefinition[] = [
  {
    key: "booking_url",
    label: "Rezerwacja",
    options: null,
    public: true,
    required: false,
    sort_order: 30,
    type: "url",
  },
  {
    key: "opening_hours",
    label: "Godziny",
    options: null,
    public: true,
    required: false,
    sort_order: 10,
    type: "text",
  },
  {
    key: "internal_note",
    label: "Notatka",
    options: null,
    public: false,
    required: false,
    sort_order: 20,
    type: "textarea",
  },
];

describe("place custom fields", () => {
  it("builds compact form payloads without empty optional values", () => {
    expect(
      placeCustomFieldPayload(definitions, {
        booking_url: " https://example.com ",
        internal_note: "",
        opening_hours: " 10-18 ",
      }),
    ).toEqual({
      booking_url: "https://example.com",
      opening_hours: "10-18",
    });
  });

  it("hydrates form values and displays only public fields in configured order", () => {
    const fields = {
      booking_url: "https://example.com",
      internal_note: "Ukryte",
      opening_hours: "10-18",
    };

    expect(placeCustomFieldFormValues(definitions, fields)).toEqual({
      booking_url: "https://example.com",
      internal_note: "Ukryte",
      opening_hours: "10-18",
    });
    expect(publicPlaceCustomFieldDisplayItems(definitions, fields)).toEqual([
      { href: null, key: "opening_hours", label: "Godziny", text: "10-18", type: "text" },
      {
        href: "https://example.com/",
        key: "booking_url",
        label: "Rezerwacja",
        text: "https://example.com",
        type: "url",
      },
    ]);
  });
});
