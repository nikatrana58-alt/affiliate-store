import type { Product } from "@/lib/products";

type OrganizationSchemaProps = {
  name?: string;
  url?: string;
  logo?: string;
};

export function OrganizationSchema({
  name = "Curated Finds",
  url = "https://curatedfinds.store",
  logo = "https://curatedfinds.store/icon.png",
}: OrganizationSchemaProps) {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    logo,
    sameAs: [
      "https://twitter.com/curatedfinds",
      "https://facebook.com/curatedfinds",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}

export function ProductSchema({ product }: { product: Product }) {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.image ? [product.image] : [],
    description: product.description || product.title,
    sku: product.id,
    offers: {
      "@type": "Offer",
      url: `https://curatedfinds.store/products/${product.slug}`,
      priceCurrency: "USD",
      price: product.price ?? 0,
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
