import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";

import { getGuide, getGuides, mediaUrl, type Guide, type GuidePlacePreview } from "../api/client";
import { AppShell } from "../components/layout/AppShell";
import { ErrorModal, errorDetails } from "../components/ui/ErrorModal";
import { MediaImage } from "../components/ui/MediaImage";
import { polishCountLabel } from "../components/ui/polishCountLabel";

function currentGuideSlug() {
  const match = window.location.pathname.match(/^\/guides\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function guideCountLabel(count: number) {
  return polishCountLabel(count, {
    few: "trasy",
    many: "tras",
    one: "trasa",
  });
}

function placeCountLabel(count: number) {
  return polishCountLabel(count, {
    few: "miejsca",
    many: "miejsc",
    one: "miejsce",
  });
}

const GUIDE_CARD_MAX_WIDTH = 420;
const GUIDE_CARD_GAP = 16;

function guideGridColumnLimit(availableWidth: number) {
  if (availableWidth >= 2520) return 6;
  if (availableWidth >= 2160) return 5;
  if (availableWidth >= 1480) return 4;
  if (availableWidth >= 900) return 3;
  if (availableWidth >= 600) return 2;
  return 1;
}

function guideGridColumns(availableWidth: number, cardCount: number) {
  if (cardCount < 1) return 1;
  return Math.min(cardCount, guideGridColumnLimit(availableWidth));
}

function guideGridMaxWidth(columnCount: number) {
  return columnCount * GUIDE_CARD_MAX_WIDTH + Math.max(0, columnCount - 1) * GUIDE_CARD_GAP;
}

function contentWidth(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const horizontalPadding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
  return element.getBoundingClientRect().width - horizontalPadding;
}

function useGuideGrid(cardCount: number) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [columnCount, setColumnCount] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const updateColumnCount = () => {
      const nextColumnCount = guideGridColumns(contentWidth(container), cardCount);
      setColumnCount((currentColumnCount) =>
        currentColumnCount === nextColumnCount ? currentColumnCount : nextColumnCount,
      );
    };

    updateColumnCount();

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => updateColumnCount());
    resizeObserver?.observe(container);
    window.addEventListener("resize", updateColumnCount);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateColumnCount);
    };
  }, [cardCount]);

  return {
    containerRef,
    gridStyle: {
      "--guide-grid-columns": columnCount,
      "--guide-grid-max-width": `${guideGridMaxWidth(columnCount)}px`,
    } as CSSProperties,
  };
}

function guideCoverAlt(guide: Guide) {
  return guide.preview_places[0]?.title ?? guide.title;
}

function GuideCover({ guide }: { guide: Guide }) {
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

function GuidePlaceCard({ place }: { place: GuidePlacePreview }) {
  return (
    <article className="guide-place-card">
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
        {(place.local_comment ?? place.description) ? <p>{place.local_comment ?? place.description}</p> : null}
      </div>
    </article>
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
  const guideGrid = useGuideGrid(guides.length);
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
    <AppShell activeSection="guides">
      <main className="page-shell guide-page">
        {slug === null ? (
          <section className="content-panel guide-list-view" ref={guideGrid.containerRef}>
            <div className="guide-page-heading">
              <h1>Trasy</h1>
              <span className="guide-page-count">{guideCountLabel(guidesQuery.data?.length ?? 0)}</span>
            </div>
            {guidesQuery.isLoading ? <p className="notice">Ładowanie tras...</p> : null}
            <div className="guide-card-grid" style={guideGrid.gridStyle}>
              {guides.map((guide) => (
                <a className="guide-card" href={`/guides/${guide.slug}`} key={guide.id}>
                  <GuideCover guide={guide} />
                  <span className="guide-card-count">{placeCountLabel(guide.place_count)}</span>
                  <span className="guide-card-copy">
                    <strong>{guide.title}</strong>
                    {guide.description ? <span>{guide.description}</span> : null}
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : (
          <section className="content-panel guide-detail-view">
            {guideQuery.isLoading ? <p className="notice">Ładowanie trasy...</p> : null}
            {guideQuery.data ? (
              <>
                <a className="ghost-link" href="/guides">
                  Wszystkie trasy
                </a>
                <div className="guide-page-heading">
                  <h1>{guideQuery.data.title}</h1>
                  <span className="guide-page-count">{placeCountLabel(guideQuery.data.places.length)}</span>
                </div>
                {guideQuery.data.description ? <p className="lead-text">{guideQuery.data.description}</p> : null}
                <div className="guide-place-grid">
                  {guideQuery.data.places.map((place) => (
                    <GuidePlaceCard key={place.id} place={place} />
                  ))}
                </div>
              </>
            ) : null}
          </section>
        )}
        {activeError && dismissedErrorKey !== errorKey ? (
          <ErrorModal {...activeError} onClose={() => setDismissedErrorKey(errorKey)} />
        ) : null}
      </main>
    </AppShell>
  );
}
