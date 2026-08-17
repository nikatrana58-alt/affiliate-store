import type { Product } from "@/lib/products";
import { getProductDisplayPrice } from "@/lib/pricing-engine";
import { sanitizeProductDescription } from "@/lib/utils/product-formatter";

type OrganizationSchemaProps = {
  name?: string;
  url?: string;
  logo?: string;
};

export function OrganizationSchema({
  name = "RA2Z",
  url = "https://ra2z.shop",
  logo = "https://ra2z.shop/logo-gold.png",
}: OrganizationSchemaProps) {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": ["Organization", "OnlineStore"],
    name,
    legalName: "RA2Z",
    url,
    logo,
    description: "RA2Z — Handpicked products, apparel, accessories, and curated essentials.",
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer concierge",
      availableLanguage: ["English"],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}

export function WebSiteSchema() {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "RA2Z",
    url: "https://ra2z.shop",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://ra2z.shop/#products?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}

export function ProductSchema({ product }: { product: Product }) {
  const displayPrice = getProductDisplayPrice(product).price;
  const cleanDescription = sanitizeProductDescription(product.description);
  const images = product.images && product.images.length > 0
    ? product.images
    : product.image
    ? [product.image]
    : [];

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: images,
    description: cleanDescription,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: product.brand || "RA2Z",
    },
    category: product.category || "Luxury",
    offers: {
      "@type": "Offer",
      url: `https://ra2z.shop/products/${product.slug}`,
      priceCurrency: "USD",
      price: displayPrice,
      priceValidUntil: "2027-12-31",
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "RA2Z",
      },
    },
    ...((product as any).review_count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: (product as any).rating || 5,
            reviewCount: (product as any).review_count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}

export function BreadcrumbSchema({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}

export function CollectionSchema({
  name,
  description,
  products,
}: {
  name: string;
  description: string;
  products: Product[];
}) {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 10).map((p, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `https://ra2z.shop/products/${p.slug}`,
        name: p.title,
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
