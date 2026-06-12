import { useMemo, useState } from "react";

import {
  archiveCity,
  createCity,
  deleteCityPermanently,
  updateCity,
  type City,
  type CityPayload,
  type CityStatus,
  type Place,
} from "../../api/client";
import { errorDetails, type OperationError } from "../ui/ErrorModal";

const INITIAL_STATUS: CityStatus = "active";
const INITIAL_LAT = "51.1079";
const INITIAL_LON = "17.0385";

type CityAction = {
  city: City;
  type: "archive" | "delete";
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseRequiredNumber(value: string): number | null {
  const normalizedValue = value.trim().replace(",", ".");
  if (!normalizedValue) {
    return null;
  }
  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : null;
}

type UseCityActionsArgs = {
  cities: City[];
  onChanged: () => Promise<void>;
  places: Place[];
};

export function useCityActions({ cities, onChanged, places }: UseCityActionsArgs) {
  const [cityAction, setCityAction] = useState<CityAction | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [id, setId] = useState("");
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [name, setName] = useState("");
  const [operationError, setOperationError] = useState<OperationError | null>(null);
  const [sortOrder, setSortOrder] = useState("0");
  const [status, setStatus] = useState<CityStatus>(INITIAL_STATUS);
  const [zoom, setZoom] = useState("13");
  const generatedId = useMemo(() => slugify(name), [name]);
  const cityId = editingCity ? editingCity.id : id || generatedId;
  const latitude = parseRequiredNumber(lat);
  const longitude = parseRequiredNumber(lon);
  const defaultZoom = parseRequiredNumber(zoom);
  const cityBlockers = cityAction ? places.filter((place) => place.city_id === cityAction.city.id) : [];
  const cityBlockerDetails = cityBlockers.length
    ? cityBlockers.map((place) => `- ${place.title} (${place.status})`).join("\n")
    : null;
  const cityStatusCounts = useMemo(
    () => ({
      active: cities.filter((city) => city.status === "active").length,
      archived: cities.filter((city) => city.status === "archived").length,
    }),
    [cities],
  );
  const canSave = Boolean(cityId && name.trim() && latitude !== null && longitude !== null && defaultZoom !== null);

  function resetForm() {
    setEditingCity(null);
    setId("");
    setLat(INITIAL_LAT);
    setLon(INITIAL_LON);
    setName("");
    setSortOrder("0");
    setStatus(INITIAL_STATUS);
    setZoom("13");
  }

  function openCreateCityModal() {
    resetForm();
    setIsCityModalOpen(true);
  }

  function openEditCityModal(city: City) {
    setEditingCity(city);
    setId(city.id);
    setLat(String(city.lat));
    setLon(String(city.lon));
    setName(city.name);
    setSortOrder(String(city.sort_order));
    setStatus(city.status);
    setZoom(String(city.default_zoom));
    setIsCityModalOpen(true);
  }

  function handleCloseCityModal() {
    if (isSaving) {
      return;
    }
    setIsCityModalOpen(false);
    resetForm();
  }

  async function handleSaveCity() {
    const nextLatitude = parseRequiredNumber(lat);
    const nextLongitude = parseRequiredNumber(lon);
    const nextZoom = parseRequiredNumber(zoom);

    if (!cityId || !name.trim() || nextLatitude === null || nextLongitude === null || nextZoom === null) {
      return;
    }

    const payload: CityPayload = {
      id: cityId,
      name: name.trim(),
      lat: nextLatitude,
      lon: nextLongitude,
      default_zoom: nextZoom,
      sort_order: Number(sortOrder),
      status,
    };

    setOperationError(null);
    setIsSaving(true);
    try {
      if (editingCity) {
        await updateCity(editingCity.id, {
          name: payload.name,
          lat: payload.lat,
          lon: payload.lon,
          default_zoom: payload.default_zoom,
          sort_order: payload.sort_order,
          status: payload.status,
        });
      } else {
        await createCity(payload);
      }
      setIsCityModalOpen(false);
      resetForm();
      await onChanged();
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się zapisać miasta. Sprawdź dane i spróbuj ponownie.",
        title: "Nie udało się zapisać miasta",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmCityAction() {
    if (!cityAction) {
      return;
    }

    setOperationError(null);
    setIsProcessingAction(true);
    try {
      if (cityAction.type === "archive") {
        await archiveCity(cityAction.city.id);
      } else {
        await deleteCityPermanently(cityAction.city.id);
      }
      if (editingCity?.id === cityAction.city.id) {
        setIsCityModalOpen(false);
        resetForm();
      }
      setCityAction(null);
      await onChanged();
    } catch (reason) {
      const failedAction = cityAction.type;
      setCityAction(null);
      setOperationError({
        details: cityBlockerDetails ?? errorDetails(reason),
        message:
          failedAction === "delete"
            ? "Nie można trwale usunąć tego miasta. Jeśli są do niego przypięte miejsca, najpierw przenieś je do innego miasta albo użyj archiwizacji."
            : "Nie udało się zarchiwizować miasta. Spróbuj ponownie.",
        title: failedAction === "delete" ? "Nie udało się usunąć miasta" : "Nie udało się zarchiwizować miasta",
      });
    } finally {
      setIsProcessingAction(false);
    }
  }

  return {
    canSave,
    cityAction,
    cityBlockerDetails,
    cityBlockers,
    cityId,
    cityStatusCounts,
    editingCity,
    handleCloseCityModal,
    handleConfirmCityAction,
    handleSaveCity,
    isCityModalOpen,
    isProcessingAction,
    isSaving,
    lat,
    lon,
    name,
    openCreateCityModal,
    openEditCityModal,
    operationError,
    setCityAction,
    setId: (value: string) => setId(slugify(value)),
    setLat,
    setLon,
    setName,
    setOperationError,
    setSortOrder,
    setStatus,
    setZoom,
    sortOrder,
    status,
    zoom,
  };
}
