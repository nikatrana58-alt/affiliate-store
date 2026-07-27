"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MagneticButton } from "@/components/magnetic-button";
import { CartButton } from "@/components/cart-button";

const productSearchEventName = "store-product-search";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScroll = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const currentScroll = window.scrollY;
        setScrolled(currentScroll > 40);
        setHidden(currentScroll > 200 && currentScroll > lastScroll.current);
        lastScroll.current = currentScroll;
        ticking.current = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
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
    <header
      className={`navbar ${scrolled ? "navbar-scrolled" : ""} ${hidden ? "navbar-hidden" : ""}`}
    >
      <div className="navbar-inner">
        <Link className="navbar-logo" href="/">
          <span className="navbar-logo-icon gold-text">✦</span>
          <span>Curated Finds</span>
        </Link>

        <form className="navbar-search" action="/#products" onSubmit={handleSearch}>
          <input aria-label="Search products" name="q" placeholder="Search products…" />
        </form>

        <nav className="navbar-links" aria-label="Store navigation">
          <MagneticButton className="navbar-link-wrapper"><Link href="/">Home</Link></MagneticButton>
          <MagneticButton className="navbar-link-wrapper"><Link href="/#products">Products</Link></MagneticButton>
          <MagneticButton className="navbar-link-wrapper"><Link href="/account">Account</Link></MagneticButton>
          <MagneticButton className="navbar-link-wrapper"><Link href="/orders">Track Order</Link></MagneticButton>
          <MagneticButton className="navbar-link-wrapper"><Link href="/admin">Admin</Link></MagneticButton>
          <CartButton />
        </nav>
      </div>
    </header>
  );
}
