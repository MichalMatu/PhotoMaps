export const DEFAULT_SEO_TITLE = "PhotoMap | Wizualna mapa miejsc w Polsce";
export const DEFAULT_SEO_DESCRIPTION =
  "Odkrywaj miejsca w Polsce przez zdjęcia, pamiątki i krótkie trasy. PhotoMap pokazuje lokalne atrakcje jako wizualną mapę miniaturek.";
export const DEFAULT_SEO_ROBOTS = "index,follow,max-image-preview:large";

export function absoluteSeoUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  if (typeof window === "undefined") {
    return pathOrUrl;
  }
  return new URL(pathOrUrl, window.location.origin).toString();
}
