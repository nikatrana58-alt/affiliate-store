import type { Metadata } from "next";

export const SITE_CONFIG = {
  name: "RA2Z",
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || "https://ra2z.shop",
  defaultTitle: "RA2Z – Premium Luxury Collection",
  titleTemplate: "%s | RA2Z",
  description:
    "RA2Z Luxury Collection — Handpicked masterpieces redefining modern luxury, fine apparel, executive accessories, and RA2Z Originals. Enjoy fast worldwide delivery & secure shopping.",
  logoUrl: "https://ra2z.shop/logo-gold.png",
  ogImage: "https://ra2z.shop/logo-gold.png",
  twitterHandle: "@ra2zshop",
};

interface ConstructMetadataInput {
  title?: string;
  description?: string;
  image?: string | null;
  path?: string;
  noIndex?: boolean;
  type?: "website" | "article";
}

/**
 * Constructs production-grade Next.js Metadata objects with clean canonical URLs,
 * OpenGraph tags, Twitter Cards, and search engine directives.
 */
export function constructMetadata({
  title,
  description,
  image,
  path = "",
  noIndex = false,
  type = "website",
}: ConstructMetadataInput = {}): Metadata {
  const fullTitle = title ? `${title} | RA2Z` : SITE_CONFIG.defaultTitle;
  const metaDescription = description || SITE_CONFIG.description;
  const canonicalUrl = `${SITE_CONFIG.siteUrl}${path}`;
  const metaImage = image || SITE_CONFIG.ogImage;

  return {
    title: title ? title : { default: SITE_CONFIG.defaultTitle, template: SITE_CONFIG.titleTemplate },
    description: metaDescription,
    verification: {
      google: "AlLuVyHM5_NoT8afJlU5-YTYB0F-he3sMm_w5yc0vEM",
    },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description: metaDescription,
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: metaImage,
          width: 1200,
          height: 630,
          alt: title || SITE_CONFIG.name,
        },
      ],
      type,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: metaDescription,
      images: [metaImage],
      creator: SITE_CONFIG.twitterHandle,
      site: SITE_CONFIG.twitterHandle,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon.png", type: "image/png", sizes: "512x512" },
        { url: "/logo-icon.png", type: "image/png", sizes: "512x512" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
      shortcut: ["/favicon.ico"],
    },
    manifest: "/manifest.webmanifest",
    metadataBase: new URL(SITE_CONFIG.siteUrl),
  };
}
