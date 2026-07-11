import React from "react";
import { Helmet } from "react-helmet-async";

import { absoluteSeoUrl, DEFAULT_SEO_ROBOTS } from "../../seo/pageSeo";

interface SEOHeadProps {
  title: string;
  description: string;
  image?: string | null;
  url?: string | null;
  type?: "website" | "article";
  robots?: string;
  schemaOrgJson?: Record<string, unknown> | null;
}

const SITE_NAME = "PhotoMap";

function titleWithSiteName(title: string): string {
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}

function safeJsonForScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function cspNonce(): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  return document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content || undefined;
}

export function SEOHead({
  title,
  description,
  image = null,
  url = null,
  type = "website",
  robots = DEFAULT_SEO_ROBOTS,
  schemaOrgJson = null,
}: SEOHeadProps) {
  const fullTitle = titleWithSiteName(title);
  const canonicalUrl = url ? absoluteSeoUrl(url) : null;
  const imageUrl = image ? absoluteSeoUrl(image) : null;
  const twitterCard = imageUrl ? "summary_large_image" : "summary";
  const nonce = cspNonce();

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
      {imageUrl ? <meta property="og:image" content={imageUrl} /> : null}
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {imageUrl ? <meta name="twitter:image" content={imageUrl} /> : null}

      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}

      {schemaOrgJson ? (
        <script type="application/ld+json" nonce={nonce}>
          {safeJsonForScript(schemaOrgJson)}
        </script>
      ) : null}
    </Helmet>
  );
}
