import { renderToString } from "react-dom/server";
import type { ReactElement } from "react";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SEOHead } from "./SEOHead";

type HelmetContext = {
  helmet?: HelmetServerState;
};

function renderSeoHead(element: ReactElement) {
  const helmetContext: HelmetContext = {};

  renderToString(<HelmetProvider context={helmetContext}>{element}</HelmetProvider>);

  if (!helmetContext.helmet) {
    throw new Error("Helmet context was not filled.");
  }

  return {
    link: helmetContext.helmet.link.toString(),
    meta: helmetContext.helmet.meta.toString(),
    script: helmetContext.helmet.script.toString(),
    title: helmetContext.helmet.title.toString(),
  };
}

describe("SEOHead", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders public metadata with absolute canonical and image URLs", () => {
    vi.stubGlobal("window", { location: { origin: "https://photomap.pl" } });

    const head = renderSeoHead(
      <SEOHead
        title="Rynek"
        description="Centralny plac miasta."
        image="/media/photos/rynek.jpg"
        url="/places/rynek"
        schemaOrgJson={{
          "@context": "https://schema.org",
          "@type": "Place",
          name: "Rynek <Wrocław>",
        }}
      />,
    );

    expect(head.title).toContain(">Rynek | PhotoMap<");
    expect(head.meta).toContain('name="robots" content="index,follow,max-image-preview:large"');
    expect(head.meta).toContain('property="og:url" content="https://photomap.pl/places/rynek"');
    expect(head.meta).toContain('property="og:image" content="https://photomap.pl/media/photos/rynek.jpg"');
    expect(head.meta).toContain('name="twitter:card" content="summary_large_image"');
    expect(head.meta).toContain('name="twitter:image" content="https://photomap.pl/media/photos/rynek.jpg"');
    expect(head.link).toContain('rel="canonical" href="https://photomap.pl/places/rynek"');
    expect(head.script).toContain("\\u003cWrocław>");
  });

  it("keeps admin routes noindexed and does not invent a fallback social image", () => {
    vi.stubGlobal("window", { location: { origin: "https://photomap.pl" } });

    const head = renderSeoHead(
      <SEOHead
        title="Panel admina | PhotoMap"
        description="Prywatny panel korekt, moderacji i konfiguracji PhotoMap."
        robots="noindex,nofollow"
        url="/admin"
      />,
    );

    expect(head.title).toContain(">Panel admina | PhotoMap<");
    expect(head.title).not.toContain("PhotoMap | PhotoMap");
    expect(head.meta).toContain('name="robots" content="noindex,nofollow"');
    expect(head.meta).toContain('name="twitter:card" content="summary"');
    expect(head.meta).not.toContain("og:image");
    expect(head.meta).not.toContain("twitter:image");
    expect(head.link).toContain('rel="canonical" href="https://photomap.pl/admin"');
  });
});
