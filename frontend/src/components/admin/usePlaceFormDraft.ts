import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type {
  AdminPlace,
  AppConfigMap,
  Category,
  City,
  ContentBlock,
  ContentBlockType,
  PlaceCustomFieldDefinition,
  PlaceStatus,
} from "../../api/types";
import { DEFAULT_PLACE_PRIORITY } from "../../config/placePriority";
import { slugify } from "../../utils/slugify";
import { emptyContentBlock } from "../content/contentBlocks";
import { emptyPlaceArticleBlock, normalizePlaceArticleBlocks } from "../places/placeArticleBlocks";
import {
  placeCustomFieldFormValues,
  placeCustomFieldPayload,
  sortedPlaceCustomFieldDefinitions,
  type PlaceCustomFieldFormValues,
} from "../placeCustomFields";
import { validateAudioFile } from "../ui/audioAttachment";
import { EMPTY_PHOTO_ATTRIBUTION_DRAFT, type PhotoAttributionDraft } from "./placePhotoPanelState";
import type { PlaceFormPayload } from "./useAdminPlaceManagement";

type UsePlaceFormDraftOptions = {
  categories: Category[];
  cities: City[];
  mapFallback: AppConfigMap;
  onSubmit: (payload: PlaceFormPayload) => Promise<void>;
  place?: AdminPlace | null;
  placeCustomFieldDefinitions: PlaceCustomFieldDefinition[];
};

export function usePlaceFormDraft({
  categories,
  cities,
  mapFallback,
  onSubmit,
  place,
  placeCustomFieldDefinitions,
}: UsePlaceFormDraftOptions) {
  const [title, setTitle] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [location, setLocation] = useState(() => locationForCity(undefined, mapFallback));
  const [description, setDescription] = useState("");
  const [localComment, setLocalComment] = useState("");
  const [articleBlocks, setArticleBlocks] = useState<ContentBlock[]>([]);
  const [weight, setWeight] = useState(String(DEFAULT_PLACE_PRIORITY));
  const [status, setStatus] = useState<PlaceStatus>("draft");
  const [coverPhotoAudioFile, setCoverPhotoAudioFile] = useState<File | null>(null);
  const [coverPhotoAttributionDraft, setCoverPhotoAttributionDraft] = useState<PhotoAttributionDraft>({
    ...EMPTY_PHOTO_ATTRIBUTION_DRAFT,
  });
  const [coverPhotoCaption, setCoverPhotoCaption] = useState("");
  const [coverPhotoDescriptionBlocks, setCoverPhotoDescriptionBlocks] = useState<ContentBlock[]>([]);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoInputKey, setCoverPhotoInputKey] = useState(0);
  const [customFieldValues, setCustomFieldValues] = useState<PlaceCustomFieldFormValues>({});
  const [isSaving, setIsSaving] = useState(false);

  const generatedSlug = useMemo(() => slugify(title), [title]);
  const availableCities = useMemo(
    () => cities.filter((city) => city.status === "active" || city.id === place?.city_id),
    [cities, place?.city_id],
  );
  const availableCategories = useMemo(
    () => categories.filter((category) => category.status === "active" || categoryIds.includes(category.id)),
    [categories, categoryIds],
  );
  const sortedCustomFields = useMemo(
    () => sortedPlaceCustomFieldDefinitions(placeCustomFieldDefinitions),
    [placeCustomFieldDefinitions],
  );
  const defaultCityId = availableCities[0]?.id ?? "";
  const defaultLocation = useMemo(
    () =>
      locationForCity(
        availableCities.find((city) => city.id === defaultCityId),
        mapFallback,
      ),
    [availableCities, defaultCityId, mapFallback],
  );
  const selectedCityName = availableCities.find((city) => city.id === cityId)?.name ?? cityId;

  const resetCoverPhotoFields = useCallback(() => {
    setCoverPhotoCaption("");
    setCoverPhotoDescriptionBlocks([]);
    setCoverPhotoAttributionDraft({ ...EMPTY_PHOTO_ATTRIBUTION_DRAFT });
    setCoverPhotoAudioFile(null);
    setCoverPhotoFile(null);
    setCoverPhotoInputKey((currentKey) => currentKey + 1);
  }, []);

  const resetCreateDraft = useCallback(() => {
    setTitle("");
    setCityId(defaultCityId);
    setCategoryIds([]);
    setLocation(defaultLocation);
    setDescription("");
    setLocalComment("");
    setArticleBlocks([]);
    setWeight(String(DEFAULT_PLACE_PRIORITY));
    setStatus("draft");
    setCustomFieldValues(placeCustomFieldFormValues(sortedCustomFields, {}));
    resetCoverPhotoFields();
  }, [defaultCityId, defaultLocation, resetCoverPhotoFields, sortedCustomFields]);

  useEffect(() => {
    if (!place) {
      resetCreateDraft();
      return;
    }

    setTitle(place.title);
    setCityId(place.city_id);
    setCategoryIds(place.category_ids);
    setLocation({ lat: place.lat, lon: place.lon });
    setDescription(place.description ?? "");
    setLocalComment(place.local_comment ?? "");
    setArticleBlocks(place.article_blocks);
    setWeight(String(place.weight));
    setStatus(place.status);
    setCustomFieldValues(placeCustomFieldFormValues(sortedCustomFields, place.custom_fields));
    resetCoverPhotoFields();
  }, [place, resetCoverPhotoFields, resetCreateDraft, sortedCustomFields]);

  function toggleCategory(categoryId: string) {
    setCategoryIds((currentIds) =>
      currentIds.includes(categoryId)
        ? currentIds.filter((currentId) => currentId !== categoryId)
        : [...currentIds, categoryId],
    );
  }

  function handleCityChange(nextCityId: string) {
    setCityId(nextCityId);
    if (!place) {
      setLocation(
        locationForCity(
          availableCities.find((city) => city.id === nextCityId),
          mapFallback,
        ),
      );
    }
  }

  function addArticleBlock(type: ContentBlockType) {
    setArticleBlocks((currentBlocks) => [...currentBlocks, emptyPlaceArticleBlock(type)]);
  }

  function updateArticleBlock(index: number, nextBlock: ContentBlock) {
    setArticleBlocks((currentBlocks) =>
      currentBlocks.map((currentBlock, currentIndex) => (currentIndex === index ? nextBlock : currentBlock)),
    );
  }

  function updateArticleBlockType(index: number, type: ContentBlockType) {
    setArticleBlocks((currentBlocks) =>
      currentBlocks.map((currentBlock, currentIndex) => {
        if (currentIndex !== index) return currentBlock;
        const nextBlock = emptyPlaceArticleBlock(type);
        return { ...nextBlock, text: currentBlock.text };
      }),
    );
  }

  function removeArticleBlock(index: number) {
    setArticleBlocks((currentBlocks) => currentBlocks.filter((_block, currentIndex) => currentIndex !== index));
  }

  function addCoverPhotoDescriptionBlock(type: ContentBlockType) {
    setCoverPhotoDescriptionBlocks((currentBlocks) => [...currentBlocks, emptyContentBlock(type)]);
  }

  function updateCoverPhotoDescriptionBlock(index: number, nextBlock: ContentBlock) {
    setCoverPhotoDescriptionBlocks((currentBlocks) =>
      currentBlocks.map((currentBlock, currentIndex) => (currentIndex === index ? nextBlock : currentBlock)),
    );
  }

  function updateCoverPhotoDescriptionBlockType(index: number, type: ContentBlockType) {
    setCoverPhotoDescriptionBlocks((currentBlocks) =>
      currentBlocks.map((currentBlock, currentIndex) => {
        if (currentIndex !== index) return currentBlock;
        const nextBlock = emptyContentBlock(type);
        return { ...nextBlock, text: currentBlock.text };
      }),
    );
  }

  function removeCoverPhotoDescriptionBlock(index: number) {
    setCoverPhotoDescriptionBlocks((currentBlocks) =>
      currentBlocks.filter((_block, currentIndex) => currentIndex !== index),
    );
  }

  function handleCustomFieldChange(key: string, value: string | boolean) {
    setCustomFieldValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({
        city_id: cityId,
        slug: place?.slug ?? generatedSlug,
        title,
        category_ids: categoryIds,
        lat: location.lat,
        lon: location.lon,
        description: description.trim() || null,
        local_comment: localComment.trim() || null,
        article_blocks: normalizePlaceArticleBlocks(articleBlocks),
        weight: Number(weight),
        status,
        custom_fields: placeCustomFieldPayload(sortedCustomFields, customFieldValues),
        coverPhotoAudioFile,
        coverPhotoAttributionDraft,
        coverPhotoCaption,
        coverPhotoDescriptionBlocks,
        coverPhotoFile,
      });
      if (!place) {
        resetCreateDraft();
      }
    } finally {
      setIsSaving(false);
    }
  }

  const coverPhotoAudioError = coverPhotoAudioFile
    ? coverPhotoFile
      ? validateAudioFile(coverPhotoAudioFile)
      : "Dodaj zdjęcie główne, żeby dołączyć audio."
    : null;

  return {
    addCoverPhotoDescriptionBlock,
    addArticleBlock,
    articleBlocks,
    availableCategories,
    availableCities,
    categoryIds,
    cityId,
    coverPhotoAudioError,
    coverPhotoAudioFile,
    coverPhotoAttributionDraft,
    coverPhotoCaption,
    coverPhotoDescriptionBlocks,
    coverPhotoFile,
    coverPhotoInputKey,
    customFieldValues,
    description,
    generatedSlug,
    handleCityChange,
    handleCustomFieldChange,
    handleSubmit,
    isSaving,
    localComment,
    location,
    removeArticleBlock,
    removeCoverPhotoDescriptionBlock,
    selectedCityName,
    setCoverPhotoAudioFile,
    setCoverPhotoAttributionDraft,
    setCoverPhotoCaption,
    setCoverPhotoFile,
    setDescription,
    setLocalComment,
    setLocation,
    setStatus,
    setTitle,
    setWeight,
    sortedCustomFields,
    status,
    title,
    toggleCategory,
    updateArticleBlock,
    updateArticleBlockType,
    updateCoverPhotoDescriptionBlock,
    updateCoverPhotoDescriptionBlockType,
    weight,
  };
}

function locationForCity(city: City | undefined, mapFallback: AppConfigMap) {
  return city
    ? { lat: city.lat, lon: city.lon }
    : { lat: mapFallback.fallback_center.lat, lon: mapFallback.fallback_center.lon };
}
