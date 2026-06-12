import { useEffect, useState } from "react";

import {
  ApiError,
  clearAdminToken,
  getAdminCategories,
  getAdminCities,
  getAdminGuides,
  getAdminMemories,
  getAdminPlaces,
  getAdminPhotos,
  getAdminReports,
  getStoredAdminToken,
  type Category,
  type City,
  type Guide,
  type Memory,
  type Photo,
  type Place,
  type Report,
} from "../../api/client";
import { errorDetails, type OperationError } from "../ui/ErrorModal";

type Result = {
  accessMessage: string | null;
  adminToken: string;
  categories: Category[];
  cities: City[];
  clearLoadError: () => void;
  clearSession: () => void;
  guides: Guide[];
  loadError: OperationError | null;
  memories: Memory[];
  photos: Photo[];
  places: Place[];
  refreshCities: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshGuides: () => Promise<void>;
  refreshMemories: () => Promise<void>;
  refreshPhotos: () => Promise<void>;
  refreshPlaces: () => Promise<void>;
  refreshReports: () => Promise<void>;
  reports: Report[];
  setAdminToken: (token: string) => void;
};

function adminLoadError(reason: unknown): OperationError {
  return {
    details: errorDetails(reason),
    message: "Nie udało się pobrać danych panelu admina. Sprawdź backend i spróbuj ponownie.",
    title: "Nie udało się pobrać danych",
  };
}

export function useAdminPanelData(): Result {
  const [adminToken, setAdminToken] = useState(() => getStoredAdminToken());
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loadError, setLoadError] = useState<OperationError | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  function resetData() {
    setCategories([]);
    setCities([]);
    setGuides([]);
    setMemories([]);
    setPhotos([]);
    setPlaces([]);
    setReports([]);
  }

  function clearSession() {
    clearAdminToken();
    setAdminToken("");
    setAccessMessage(null);
    setLoadError(null);
    resetData();
  }

  async function refreshAll() {
    const [nextCategories, nextCities, nextGuides, nextMemories, nextPlaces, nextPhotos, nextReports] =
      await Promise.all([
        getAdminCategories(),
        getAdminCities(),
        getAdminGuides(),
        getAdminMemories(),
        getAdminPlaces(),
        getAdminPhotos(),
        getAdminReports(),
      ]);
    setCategories(nextCategories);
    setCities(nextCities);
    setGuides(nextGuides);
    setMemories(nextMemories);
    setPlaces(nextPlaces);
    setPhotos(nextPhotos);
    setReports(nextReports);
    setAccessMessage(null);
    setLoadError(null);
  }

  async function refreshCategories() {
    setCategories(await getAdminCategories());
  }

  async function refreshCities() {
    setCities(await getAdminCities());
  }

  async function refreshGuides() {
    setGuides(await getAdminGuides());
  }

  async function refreshPlaces() {
    setPlaces(await getAdminPlaces());
  }

  async function refreshPhotos() {
    const [nextPhotos, nextPlaces] = await Promise.all([getAdminPhotos(), getAdminPlaces()]);
    setPhotos(nextPhotos);
    setPlaces(nextPlaces);
  }

  async function refreshMemories() {
    const [nextMemories, nextPlaces] = await Promise.all([getAdminMemories(), getAdminPlaces()]);
    setMemories(nextMemories);
    setPlaces(nextPlaces);
  }

  async function refreshReports() {
    setReports(await getAdminReports());
  }

  useEffect(() => {
    if (!adminToken) {
      return;
    }

    refreshAll().catch((reason: unknown) => {
      if (reason instanceof ApiError && (reason.status === 401 || reason.status === 503)) {
        clearAdminToken();
        setAdminToken("");
        setAccessMessage(reason.message);
        setLoadError(null);
        resetData();
        return;
      }
      setLoadError(adminLoadError(reason));
    });
  }, [adminToken]);

  return {
    accessMessage,
    adminToken,
    categories,
    cities,
    clearLoadError: () => setLoadError(null),
    clearSession,
    guides,
    loadError,
    memories,
    photos,
    places,
    refreshCities,
    refreshCategories,
    refreshGuides,
    refreshMemories,
    refreshPhotos,
    refreshPlaces,
    refreshReports,
    reports,
    setAdminToken: (token: string) => {
      setAccessMessage(null);
      setLoadError(null);
      setAdminToken(token);
    },
  };
}
