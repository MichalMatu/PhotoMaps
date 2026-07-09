import { useEffect } from "react";

export const DEFAULT_SEO_TITLE = "PhotoMap | Wizualna mapa Wrocławia";
export const DEFAULT_SEO_DESCRIPTION =
  "Odkrywaj Wrocław przez zdjęcia, pamiątki i krótkie trasy. PhotoMap pokazuje miejsca z klimatem jako wizualną mapę miniaturek.";

type PageSeo = {
  canonicalPath: string;
  description?: string | null;
  imageUrl?: string | null;
  robots?: string;
  title?: string | null;
};

function absoluteUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  return new URL(pathOrUrl, window.location.origin).toString();
}

function upsertMetaByName(name: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.append(element);
  }
  element.content = content;
}

function upsertMetaProperty(property: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.append(element);
  }
  element.content = content;
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.append(element);
  }
  element.href = href;
}

export function usePageSeo({
  canonicalPath,
  description = DEFAULT_SEO_DESCRIPTION,
  imageUrl = null,
  robots = "index,follow,max-image-preview:large",
  title = DEFAULT_SEO_TITLE,
}: PageSeo) {
  useEffect(() => {
    const pageTitle = title || DEFAULT_SEO_TITLE;
    const pageDescription = description || DEFAULT_SEO_DESCRIPTION;
    const canonicalUrl = absoluteUrl(canonicalPath);
    document.title = pageTitle;
    upsertMetaByName("description", pageDescription);
    upsertMetaByName("robots", robots);
    upsertMetaProperty("og:site_name", "PhotoMap");
    upsertMetaProperty("og:type", "website");
    upsertMetaProperty("og:title", pageTitle);
    upsertMetaProperty("og:description", pageDescription);
    upsertMetaProperty("og:url", canonicalUrl);
    upsertMetaByName("twitter:card", imageUrl ? "summary_large_image" : "summary");
    upsertMetaByName("twitter:title", pageTitle);
    upsertMetaByName("twitter:description", pageDescription);
    upsertCanonical(canonicalUrl);

    if (imageUrl) {
      const absoluteImageUrl = absoluteUrl(imageUrl);
      upsertMetaProperty("og:image", absoluteImageUrl);
      upsertMetaByName("twitter:image", absoluteImageUrl);
    }
  }, [canonicalPath, description, imageUrl, robots, title]);
}
