"use client";

import Link from "next/link";
import { type FormEvent } from "react";

const productSearchEventName = "store-product-search";

export function StoreHeader() {
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const searchTerm = formData.get("q")?.toString() ?? "";

    if (window.location.pathname !== "/") {
      window.location.href = `/#products`;
      return;
    }

    window.dispatchEvent(
      new CustomEvent(productSearchEventName, {
        detail: searchTerm,
      }),
    );
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <header className="store-header">
      <Link className="store-logo" href="/">
        Curated Finds
      </Link>
      <form className="header-search" action="/#products" onSubmit={handleSearch}>
        <input aria-label="Search products" name="q" placeholder="Search products..." />
      </form>
      <nav className="store-nav" aria-label="Store navigation">
        <Link href="/">Home</Link>
        <Link href="/#products">Categories</Link>
        <Link href="/admin">Admin</Link>
      </nav>
    </header>
  );
}
