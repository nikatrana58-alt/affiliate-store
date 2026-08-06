import type { Product } from "@/lib/products";
import { getProductDisplayPrice } from "@/lib/pricing-engine";

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
    "@type": "Organization",
    name,
    url,
    logo,
    sameAs: [
      "https://twitter.com/ra2zshop",
      "https://instagram.com/ra2zshop",
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
      url: `https://ra2z.shop/products/${product.slug}`,
      priceCurrency: "USD",
      price: getProductDisplayPrice(product).price,
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
