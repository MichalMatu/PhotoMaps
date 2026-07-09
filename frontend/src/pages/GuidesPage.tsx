import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MapPinned } from "lucide-react";

import { getGuide, getGuides } from "../api/guides";
import { mediaUrl } from "../api/http";
import type { PublicGuide, PublicGuideDetail, PublicGuidePlacePreview } from "../api/types";
import { ContentBlocks } from "../components/content/ContentBlocks";
import { contentBlocksTextForTts } from "../components/content/contentBlocks";
import { GuideRouteMap } from "../components/guides/GuideRouteMap";
import { buildGoogleMapsWalkingRouteUrl } from "../components/guides/googleMapsRoute";
import { AppShell } from "../components/layout/AppShell";
import { ErrorModal, errorDetails } from "../components/ui/ErrorModal";
import { MediaImage } from "../components/ui/MediaImage";
import { polishCountLabel } from "../components/ui/polishCountLabel";
import { TtsButton } from "../components/ui/TtsButton";
import { SEOHead } from "../components/ui/SEOHead";
import { absoluteSeoUrl } from "../seo/pageSeo";

function currentGuideSlug() {
  const match = window.location.pathname.match(/^\/guides\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function guideCountLabel(count: number) {
  return polishCountLabel(count, {
    few: "pozycje",
    many: "pozycji",
    one: "pozycja",
  });
}

function placeCountLabel(count: number) {
  return polishCountLabel(count, {
    few: "miejsca",
    many: "miejsc",
    one: "miejsce",
  });
}

function guideCoverAlt(guide: PublicGuide) {
  return guide.preview_places[0]?.title ?? guide.title;
}

function GuideCover({ guide }: { guide: PublicGuide }) {
  if (!guide.cover_photo) {
    return <span className="guide-card-media guide-card-media--empty" aria-hidden="true" />;
  }

  return (
    <MediaImage
      alt={guideCoverAlt(guide)}
      className="guide-card-media"
      ratio="wide"
      src={mediaUrl(guide.cover_photo.thumb_path)}
    />
  );
}

function GuidePreviewPlaces({ guide }: { guide: PublicGuide }) {
  if (guide.preview_places.length === 0) return null;

  return (
    <span
      className="guide-card-preview-list"
      aria-label={guide.kind === "collection" ? "Miejsca w kolekcji" : "Miejsca w trasie"}
    >
      {guide.preview_places.slice(0, 4).map((place) => (
        <span className="guide-card-preview-item" key={place.id}>
          {place.title}
        </span>
      ))}
    </span>
  );
}

function GuidePlaceCard({ index, place }: { index: number; place: PublicGuidePlacePreview }) {
  return (
    <a className="ui-card guide-place-card" href={`/places/${place.slug}`}>
      <span className="guide-place-card-index">{index + 1}</span>
      {place.cover_photo ? (
        <MediaImage
          alt={place.title}
          className="guide-place-card-media"
          ratio="landscape"
          src={mediaUrl(place.cover_photo.thumb_path)}
        />
      ) : (
        <span className="guide-place-card-media guide-place-card-media--empty" aria-hidden="true" />
      )}
      <div className="guide-place-card-copy">
        <strong>{place.title}</strong>
        {place.description ? <p>{place.description}</p> : null}
      </div>
    </a>
  );
}

function GuideActions({ guide, narrationText }: { guide: PublicGuideDetail; narrationText: string | null }) {
  const googleMapsRouteUrl = guide.kind === "route" ? buildGoogleMapsWalkingRouteUrl(guide.places) : null;
  if (!narrationText && !googleMapsRouteUrl) {
    return null;
  }

  return (
    <div className="guide-detail-actions">
      {narrationText ? (
        <TtsButton className="guide-tts-button" text={narrationText} ttsKey={`guide:${guide.slug}:description`} />
      ) : null}
      {googleMapsRouteUrl ? (
        <a
          className="ui-button ui-button--primary guide-google-maps-link"
          href={googleMapsRouteUrl}
          rel="noreferrer noopener"
          target="_blank"
        >
          <MapPinned aria-hidden="true" size={16} />
          <span>Pokaż w Google Maps</span>
          <ExternalLink aria-hidden="true" size={14} />
        </a>
      ) : null}
    </div>
  );
}

export function GuidesPage() {
  const slug = currentGuideSlug();
  const [dismissedErrorKey, setDismissedErrorKey] = useState<string | null>(null);
  const guidesQuery = useQuery({
    queryKey: ["guides"],
    queryFn: getGuides,
    enabled: slug === null,
  });
  const guideQuery = useQuery({
    queryKey: ["guide", slug],
    queryFn: () => getGuide(slug ?? ""),
    enabled: slug !== null,
  });
  const errorKey = slug === null ? "guides" : `guide:${slug}`;
  const guides = guidesQuery.data ?? [];
  const guide = guideQuery.data ?? null;
  const guideIntroText = guide?.description ?? null;
  const guideNarrationText = guide ? contentBlocksTextForTts(guide.article_blocks, [guide.description]) : "";
  const seoDescription =
    guide?.description ?? "Gotowe trasy i kolekcje miejsc w Polsce: zdjęcia, opisy i punkty warte zobaczenia.";
  const seoTitle = guide ? `${guide.title} | PhotoMap` : "Trasy i kolekcje miejsc | PhotoMap";
  const seoPath = slug ? `/guides/${encodeURIComponent(slug)}` : "/guides";
  const seoUrl = absoluteSeoUrl(seoPath);
  const seoImage = guide?.cover_photo ? mediaUrl(guide.cover_photo.public_path) : undefined;

  const structuredData = guide
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: guide.title,
        itemListElement: guide.places.map((place, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteSeoUrl(`/places/${encodeURIComponent(place.slug)}`),
          name: place.title,
        })),
      }
    : undefined;
  const activeError =
    guidesQuery.isError && slug === null
      ? {
          details: errorDetails(guidesQuery.error),
          message: "Nie udało się pobrać listy tras. Sprawdź połączenie i spróbuj ponownie.",
          title: "Nie udało się pobrać tras",
        }
      : guideQuery.isError && slug !== null
        ? {
            details: errorDetails(guideQuery.error),
            message: "Nie udało się pobrać tej trasy. Sprawdź połączenie i spróbuj ponownie.",
            title: "Nie udało się pobrać trasy",
          }
        : null;

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        image={seoImage}
        url={seoUrl}
        schemaOrgJson={structuredData}
      />
      <AppShell activeSection="guides">
        <main className="page-shell guide-page">
          {slug === null ? (
            <section className="content-panel guide-list-view">
              <div className="guide-page-heading">
                <div className="guide-page-title">
                  <h1>Trasy i kolekcje</h1>
                  <p>Gotowe zestawy miejsc do przejścia, oglądania i zapisywania własnych kadrów.</p>
                </div>
                <span className="guide-page-count">{guideCountLabel(guidesQuery.data?.length ?? 0)}</span>
              </div>
              {guidesQuery.isLoading ? <p className="ui-empty">Ładowanie tras i kolekcji...</p> : null}
              <div className="guide-card-grid">
                {guides.map((guide) => (
                  <a className="ui-card guide-card" href={`/guides/${guide.slug}`} key={guide.id}>
                    <span className="guide-card-media-shell">
                      <GuideCover guide={guide} />
                      <span className="guide-card-count">{placeCountLabel(guide.place_count)}</span>
                    </span>
                    <span className="guide-card-copy">
                      <strong>{guide.title}</strong>
                      {guide.description ? <span>{guide.description}</span> : null}
                      <GuidePreviewPlaces guide={guide} />
                    </span>
                  </a>
                ))}
              </div>
              {!guidesQuery.isLoading && guides.length === 0 ? (
                <p className="ui-empty">Brak opublikowanych tras i kolekcji.</p>
              ) : null}
            </section>
          ) : (
            <section className="content-panel guide-detail-view">
              {guideQuery.isLoading ? <p className="ui-empty">Ładowanie...</p> : null}
              {guide ? (
                <>
                  <a className="ghost-link" href="/guides">
                    Wszystkie trasy i kolekcje
                  </a>
                  <div className="guide-detail-hero">
                    <div className="guide-detail-copy">
                      <div className="guide-page-heading guide-page-heading--detail">
                        <div className="guide-page-title">
                          <h1>{guide.title}</h1>
                        </div>
                        <span className="guide-page-count">{placeCountLabel(guide.places.length)}</span>
                      </div>
                      {guideIntroText ? (
                        <div className="guide-narration-block">
                          <p className="lead-text">{guideIntroText}</p>
                          <GuideActions guide={guide} narrationText={guideNarrationText || null} />
                        </div>
                      ) : (
                        <GuideActions guide={guide} narrationText={guideNarrationText || null} />
                      )}
                    </div>
                    <GuideRouteMap places={guide.places} routePoints={guide.route_points} title={guide.title} />
                  </div>
                  <ContentBlocks blocks={guide.article_blocks} className="place-article guide-article" />
                  <div className="guide-place-section-heading">
                    <h2>{guide.kind === "collection" ? "Miejsca w kolekcji" : "Miejsca na trasie"}</h2>
                  </div>
                  <div className="guide-place-grid">
                    {guide.places.map((place, index) => (
                      <GuidePlaceCard index={index} key={place.id} place={place} />
                    ))}
                  </div>
                  {guide.places.length === 0 ? (
                    <p className="ui-empty">
                      {guide.kind === "collection"
                        ? "Ta kolekcja nie ma jeszcze miejsc."
                        : "Ta trasa nie ma jeszcze miejsc."}
                    </p>
                  ) : null}
                </>
              ) : null}
            </section>
          )}
          {activeError && dismissedErrorKey !== errorKey ? (
            <ErrorModal {...activeError} onClose={() => setDismissedErrorKey(errorKey)} />
          ) : null}
        </main>
      </AppShell>
    </>
  );
}
