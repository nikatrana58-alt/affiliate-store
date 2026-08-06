"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
        {/* Far Left Symbol Logo Only - No Text */}
        <Link className="navbar-logo-symbol" href="/" aria-label="RA2Z Home" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <Image
            src="/logo-gold.png"
            alt="RA2Z Symbol"
            width={34}
            height={44}
            style={{ objectFit: "contain" }}
            priority
          />
        </Link>

        {/* Premium Glass Search Bar */}
        <form className="navbar-search" action="/#products" onSubmit={handleSearch} style={{ position: "relative" }}>
          <input
            aria-label="Search luxury products"
            name="q"
            placeholder="Search luxury collection…"
            style={{
              paddingLeft: "36px",
            }}
          />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "15px",
              height: "15px",
              color: "var(--gold)",
              opacity: 0.8,
              pointerEvents: "none",
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </form>

        <nav className="navbar-links" aria-label="Store navigation">
          <MagneticButton className="navbar-link-wrapper"><Link href="/" prefetch={true}>Home</Link></MagneticButton>
          <MagneticButton className="navbar-link-wrapper"><Link href="/categories" prefetch={true}>Categories</Link></MagneticButton>
          <MagneticButton className="navbar-link-wrapper"><Link href="/collections/luxury" prefetch={true}>Luxury</Link></MagneticButton>
          <MagneticButton className="navbar-link-wrapper"><Link href="/collections/originals" prefetch={true}>Originals</Link></MagneticButton>
          <MagneticButton className="navbar-link-wrapper"><Link href="/#new-arrivals" prefetch={true}>New Arrivals</Link></MagneticButton>
          <MagneticButton className="navbar-link-wrapper"><Link href="/orders" prefetch={true}>Track Order</Link></MagneticButton>
          <MagneticButton className="navbar-link-wrapper"><Link href="/account" prefetch={true}>Account</Link></MagneticButton>
          <CartButton />
        </nav>
      </div>
    </header>
  );
}
