import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getGuide, getGuides } from "../api/client";
import { AppShell } from "../components/layout/AppShell";
import { ErrorModal, errorDetails } from "../components/ui/ErrorModal";

function currentGuideSlug() {
  const match = window.location.pathname.match(/^\/guides\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
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
  const activeError =
    guidesQuery.isError && slug === null
      ? {
          details: errorDetails(guidesQuery.error),
          message: "Nie udało się pobrać listy przewodników. Sprawdź połączenie i spróbuj ponownie.",
          title: "Nie udało się pobrać przewodników",
        }
      : guideQuery.isError && slug !== null
        ? {
            details: errorDetails(guideQuery.error),
            message: "Nie udało się pobrać tego przewodnika. Sprawdź połączenie i spróbuj ponownie.",
            title: "Nie udało się pobrać przewodnika",
          }
        : null;

  return (
    <AppShell activeSection="guides">
      <main className="page-shell guide-page">
        {slug === null ? (
          <section className="content-panel">
            <div className="section-heading">
              <h1>Przewodniki</h1>
              <span>{guidesQuery.data?.length ?? 0}</span>
            </div>
            {guidesQuery.isLoading ? <p className="notice">Ładowanie przewodników...</p> : null}
            <div className="simple-card-grid">
              {guidesQuery.data?.map((guide) => (
                <a className="simple-card" href={`/guides/${guide.slug}`} key={guide.id}>
                  <span className="eyebrow">Przewodnik</span>
                  <strong>{guide.title}</strong>
                  {guide.description ? <p>{guide.description}</p> : null}
                </a>
              ))}
            </div>
          </section>
        ) : (
          <section className="content-panel">
            {guideQuery.isLoading ? <p className="notice">Ładowanie przewodnika...</p> : null}
            {guideQuery.data ? (
              <>
                <a className="ghost-link" href="/guides">
                  Wszystkie przewodniki
                </a>
                <div className="section-heading">
                  <h1>{guideQuery.data.title}</h1>
                  <span>{guideQuery.data.places.length} miejsc</span>
                </div>
                {guideQuery.data.description ? <p className="lead-text">{guideQuery.data.description}</p> : null}
                <div className="simple-card-grid">
                  {guideQuery.data.places.map((place) => (
                    <article className="simple-card" key={place.id}>
                      <span className="eyebrow">{place.photo_count + place.memory_count} wpisów</span>
                      <strong>{place.title}</strong>
                      {place.local_comment ?? place.description ? <p>{place.local_comment ?? place.description}</p> : null}
                    </article>
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
