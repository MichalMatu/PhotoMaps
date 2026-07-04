import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { AppConfigMap, Category, City, Guide, Place } from "../../api/types";
import { CategoryFormModal } from "./CategoryFormModal";
import { CityFormModal } from "./CityFormModal";
import { GuideFormModal } from "./GuideFormModal";
import { PhotoUploadModal } from "./PhotoUploadModal";

vi.mock("./SystemModal", () => ({
  SystemModal: (props: { children?: import("react").ReactNode; confirmFormId?: string; title: string }) => (
    <div data-title={props.title}>
      {props.children}
      {props.confirmFormId ? <button form={props.confirmFormId} type="submit" /> : null}
    </div>
  ),
}));

vi.mock("./LocationPicker", () => ({
  LocationPicker: () => <div data-testid="location-picker" />,
}));

vi.mock("./GuideRoutePointEditor", () => ({
  GuideRoutePointEditor: () => <div data-testid="guide-route-point-editor" />,
}));

const noop = () => undefined;

function category(overrides: Partial<Category> = {}): Category {
  return {
    description: null,
    icon: null,
    id: "coffee",
    label: "Kawa",
    sort_order: 1,
    status: "active",
    ...overrides,
  };
}

function city(overrides: Partial<City> = {}): City {
  return {
    default_zoom: 13,
    id: "wroclaw",
    lat: 51.1079,
    lon: 17.0385,
    name: "Wrocław",
    sort_order: 1,
    status: "active",
    ...overrides,
  };
}

function guide(overrides: Partial<Guide> = {}): Guide {
  return {
    cover_photo: null,
    created_at: "",
    description: "Opis",
    article_blocks: [],
    id: "guide-1",
    place_count: 0,
    preview_places: [],
    route_points: [],
    slug: "na-deszcz",
    status: "published",
    title: "Na deszcz",
    updated_at: "",
    ...overrides,
  };
}

function place(overrides: Partial<Place> = {}): Place {
  return {
    category_ids: [],
    city_id: "wroclaw",
    cover_photo_id: null,
    created_at: "",
    custom_fields: {},
    description: "Opis",
    id: "place-1",
    lat: 51.1079,
    local_comment: null,
    lon: 17.0385,
    memory_count: 0,
    photo_count: 0,
    score: 1,
    slug: "hala-targowa",
    status: "published",
    title: "Hala Targowa",
    updated_at: "",
    weight: 1,
    ...overrides,
  };
}

describe("admin modal forms", () => {
  it("renders category modal fields in a real submit form", () => {
    const markup = renderToStaticMarkup(
      <CategoryFormModal
        categoryId="coffee"
        description=""
        editingCategory={category()}
        icon="coffee"
        isSaving={false}
        label="Kawa"
        onCategoryIdChange={noop}
        onClose={noop}
        onConfirm={noop}
        onDescriptionChange={noop}
        onIconChange={noop}
        onLabelChange={noop}
        onSortOrderChange={noop}
        onStatusChange={noop}
        sortOrder="1"
        status="active"
      />,
    );

    expect(markup).toContain('<form id="category-form-modal"');
    expect(markup).toContain('form="category-form-modal" type="submit"');
  });

  it("renders city modal fields in a real submit form", () => {
    const mapFallback: AppConfigMap = { fallback_center: { lat: 51.1079, lon: 17.0385 }, fallback_zoom: 13 };
    const markup = renderToStaticMarkup(
      <CityFormModal
        canSave
        cityId="wroclaw"
        editingCity={city()}
        isSaving={false}
        lat="51.1079"
        lon="17.0385"
        mapFallback={mapFallback}
        name="Wrocław"
        onCityIdChange={noop}
        onClose={noop}
        onConfirm={noop}
        onLatChange={noop}
        onLonChange={noop}
        onNameChange={noop}
        onSortOrderChange={noop}
        onStatusChange={noop}
        onZoomChange={noop}
        sortOrder="1"
        status="active"
        zoom="13"
      />,
    );

    expect(markup).toContain('<form id="city-form-modal"');
    expect(markup).toContain('form="city-form-modal" type="submit"');
  });

  it("renders guide modal fields in a real submit form", () => {
    const markup = renderToStaticMarkup(
      <GuideFormModal
        description="Opis"
        articleBlocks={[]}
        editingGuide={guide()}
        generatedSlug="na-deszcz"
        isSaving={false}
        isRoutePlacesLoading={false}
        onAddArticleBlock={noop}
        onClose={noop}
        onConfirm={noop}
        onDescriptionChange={noop}
        onRemoveArticleBlock={noop}
        onRoutePointsChange={noop}
        onStatusChange={noop}
        onTitleChange={noop}
        onUpdateArticleBlock={noop}
        onUpdateArticleBlockType={noop}
        routePlaces={[]}
        routePoints={[]}
        status="published"
        title="Na deszcz"
      />,
    );

    expect(markup).toContain('<form id="guide-form-modal"');
    expect(markup).toContain('form="guide-form-modal" type="submit"');
    expect(markup).toContain('data-testid="guide-route-point-editor"');
  });

  it("renders photo upload modal fields in a real submit form", () => {
    const markup = renderToStaticMarkup(
      <PhotoUploadModal
        audioError={null}
        audioFile={null}
        attributionDraft={{
          attributionAuthor: "",
          attributionLicense: "",
          attributionLicenseUrl: "",
          attributionSourceUrl: "",
        }}
        canSubmit
        caption=""
        cities={[city()]}
        cityId="wroclaw"
        descriptionBlocks={[]}
        file={null}
        inputKey={1}
        isUploading={false}
        onAudioFileChange={noop}
        onAddDescriptionBlock={noop}
        onAttributionDraftChange={noop}
        onCaptionChange={noop}
        onCityChange={noop}
        onClose={noop}
        onConfirm={noop}
        onFileChange={noop}
        onRemoveDescriptionBlock={noop}
        onUpdateDescriptionBlock={noop}
        onUpdateDescriptionBlockType={noop}
        onPlaceChange={noop}
        placeId="place-1"
        places={[place()]}
      />,
    );

    expect(markup).toContain('<form id="photo-upload-form-modal"');
    expect(markup).toContain('form="photo-upload-form-modal" type="submit"');
  });
});
