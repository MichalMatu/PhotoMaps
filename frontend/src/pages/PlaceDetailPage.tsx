import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { mediaUrl } from "../api/http";
import { getPlacePhotos } from "../api/media";
import { getPlace } from "../api/places";
import type { Photo, PlaceDetail } from "../api/types";
import { AppShell } from "../components/layout/AppShell";
import { articleTextForTts } from "../components/places/placeArticleBlocks";
import { PlaceArticle } from "../components/places/PlaceArticle";
import { ErrorModal, errorDetails } from "../components/ui/ErrorModal";
import { MediaImage } from "../components/ui/MediaImage";
import { polishCountLabel } from "../components/ui/polishCountLabel";
import { TtsButton } from "../components/ui/TtsButton";
import { SEOHead } from "../components/ui/SEOHead";
import { absoluteSeoUrl, DEFAULT_SEO_DESCRIPTION } from "../seo/pageSeo";

function currentPlaceSlug() {
  const match = window.location.pathname.match(/^\/places\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function photoCountLabel(count: number) {
  return polishCountLabel(count, {
    few: "zdjęcia",
    many: "zdjęć",
    one: "zdjęcie",
  });
}

function memoryCountLabel(count: number) {
  return polishCountLabel(count, {
    few: "pamiątki",
    many: "pamiątek",
    one: "pamiątka",
  });
}

function placeStructuredData(place: PlaceDetail, photo: Photo | null) {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: place.title,
    description: place.description ?? undefined,
    url: absoluteSeoUrl(`/places/${encodeURIComponent(place.slug)}`),
    geo: {
      "@type": "GeoCoordinates",
      latitude: place.lat,
      longitude: place.lon,
    },
    image: photo ? absoluteSeoUrl(mediaUrl(photo.public_path)) : undefined,
  };
}

function PlaceHeroMedia({ photo, place }: { photo: Photo | null; place: PlaceDetail }) {
  if (!photo) {
    return <span className="place-detail-media place-detail-media--empty" aria-hidden="true" />;
  }

  return (
    <MediaImage
      alt={place.title}
      className="place-detail-media"
      loading="eager"
      ratio="wide"
      src={mediaUrl(photo.public_path)}
    />
  );
}

export function PlaceDetailPage() {
  const slug = currentPlaceSlug();
  const [dismissedErrorKey, setDismissedErrorKey] = useState<string | null>(null);
  const placeQuery = useQuery({
    queryKey: ["place", slug],
    queryFn: () => getPlace(slug ?? ""),
    enabled: slug !== null,
  });
  const place = placeQuery.data ?? null;
  const photosQuery = useQuery({
    queryKey: ["place", place?.id, "photos"],
    queryFn: () => getPlacePhotos(place?.id ?? ""),
    enabled: Boolean(place?.id),
  });
  const photos = photosQuery.data ?? [];
  const heroPhoto = photos[0] ?? null;
  const structuredData = useMemo(() => (place ? placeStructuredData(place, heroPhoto) : null), [heroPhoto, place]);
  const canonicalPath = slug ? `/places/${encodeURIComponent(slug)}` : "/";
  const leadText = place?.description ?? null;
  const ttsText = place ? articleTextForTts(place.article_blocks, [place.description]) : "";
  const activeError =
    slug === null
      ? {
          details: null,
          message: "Nie udało się rozpoznać adresu miejsca.",
          title: "Nieprawidłowy adres",
        }
      : placeQuery.isError
        ? {
            details: errorDetails(placeQuery.error),
            message: "Nie udało się pobrać tego miejsca. Sprawdź połączenie i spróbuj ponownie.",
            title: "Nie udało się pobrać miejsca",
          }
        : photosQuery.isError
          ? {
              details: errorDetails(photosQuery.error),
              message: "Opis miejsca jest dostępny, ale nie udało się pobrać zdjęć.",
              title: "Nie udało się pobrać zdjęć",
            }
          : null;
  const errorKey =
    slug === null
      ? "place:route"
      : placeQuery.isError
        ? `place:${slug}`
        : photosQuery.isError
          ? `place:${slug}:photos`
          : null;

  return (
    <>
      <SEOHead
        title={place ? place.title : "Miejsce"}
        description={place?.description ?? DEFAULT_SEO_DESCRIPTION}
        image={heroPhoto ? mediaUrl(heroPhoto.public_path) : undefined}
        url={canonicalPath}
        schemaOrgJson={structuredData}
      />
      <AppShell activeSection="places">
        <main className="page-shell place-page">
          <section className="content-panel place-detail-shell place-detail-view">
            <nav className="place-detail-links" aria-label="Nawigacja miejsca">
              <a className="ghost-link" href="/">
                Mapa
              </a>
              <a className="ghost-link" href="/guides">
                Trasy
              </a>
            </nav>

            {placeQuery.isLoading ? <p className="ui-empty">Ładowanie miejsca...</p> : null}

            {place ? (
              <>
                <div className="place-detail-hero">
                  <div className="place-detail-copy">
                    <div className="place-detail-title-block">
                      <h1>{place.title}</h1>
                      <div className="place-detail-meta" aria-label="Zawartość miejsca">
                        <span>{photoCountLabel(place.photo_count)}</span>
                        <span>{memoryCountLabel(place.memory_count)}</span>
                      </div>
                    </div>
                    {leadText ? <p className="lead-text">{leadText}</p> : null}
                    <TtsButton
                      className="place-detail-tts-button"
                      text={ttsText}
                      ttsKey={`place:${place.slug}:article`}
                    />
                  </div>
                  <PlaceHeroMedia photo={heroPhoto} place={place} />
                </div>

                <PlaceArticle blocks={place.article_blocks} />
              </>
            ) : null}

            {activeError && dismissedErrorKey !== errorKey ? (
              <ErrorModal {...activeError} onClose={() => setDismissedErrorKey(errorKey)} />
            ) : null}
          </section>
        </main>
      </AppShell>
    </>
  );
}
