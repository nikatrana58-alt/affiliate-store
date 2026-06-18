import Link from "next/link";
import { ProductBrowser } from "@/components/product-browser";
import { StoreHeader } from "@/components/store-header";
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
      <StoreHeader />
      <main className="store-shell">
        <section className="hero">
          <p className="eyebrow">Handpicked affiliate finds</p>
          <h1>Discover Viral Products Worth Buying</h1>
          <p>
            Handpicked Amazon finds for your home, beauty, gadgets and lifestyle.
          </p>
          <Link className="hero-cta" href="#products">
            Browse Products
          </Link>
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
        ) : (
          <ProductBrowser products={products} />
        )}
      </main>
    </>
  );
}
