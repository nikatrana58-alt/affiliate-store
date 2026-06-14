import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getProducts, type Product } from "@/lib/products";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  let products: Product[] = [];
  let loadError = "";

  if (isSupabaseConfigured()) {
    try {
      products = await getProducts();
    } catch (error) {
      console.error("[products] Unable to load storefront products.", error);
      loadError = "Products could not be loaded. Please try again shortly.";
    }
  }

  return (
    <>
      <header className="store-header">
        <Link className="store-logo" href="/">
          Curated Finds
        </Link>
        <Link className="text-link" href="/admin">
          Admin
        </Link>
      </header>
      <main className="store-shell">
        <section className="hero">
          <p className="eyebrow">Thoughtfully selected</p>
          <h1>Useful products, chosen with care.</h1>
          <p>
            Browse a focused collection of affiliate recommendations. Each link
            takes you directly to the retailer.
          </p>
        </section>

        {loadError ? <p className="notification error">{loadError}</p> : null}

        {!isSupabaseConfigured() ? (
          <section className="empty-store">
            <h2>Connect Supabase to publish products</h2>
            <p>
              Add the required environment variables and run the included SQL setup,
              then use the admin panel to publish your first listing.
            </p>
          </section>
        ) : products.length ? (
          <section className="store-products" aria-label="Products">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </section>
        ) : (
          <section className="empty-store">
            <h2>New recommendations are on the way</h2>
            <p>The store is connected and ready for its first product.</p>
          </section>
        )}
      </main>
    </>
  );
}
