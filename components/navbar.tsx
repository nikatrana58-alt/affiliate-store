"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MagneticButton } from "@/components/magnetic-button";
import { CartButton } from "@/components/cart-button";

import { useAuth } from "@/components/auth-context";

const productSearchEventName = "store-product-search";

export function Navbar() {
  const { user, role, openAuthModal, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const lastScroll = useRef(0);
  const ticking = useRef(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const currentScroll = window.scrollY;
        const nextScrolled = currentScroll > 40;
        const nextHidden = currentScroll > 200 && currentScroll > lastScroll.current;

        setScrolled((prev) => (prev !== nextScrolled ? nextScrolled : prev));
        setHidden((prev) => (prev !== nextHidden ? nextHidden : prev));

        lastScroll.current = currentScroll;
        ticking.current = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close profile menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        {/* Desktop Navbar Layout (>= 768px) - 100% Original Desktop Design */}
        <div className="navbar-desktop-layout">
          {/* Logo Symbol */}
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
              aria-label="Search products"
              name="q"
              placeholder="Search collection…"
              onChange={(e) => {
                const val = e.target.value;
                if (window.location.pathname === "/") {
                  window.dispatchEvent(
                    new CustomEvent(productSearchEventName, { detail: val })
                  );
                }
              }}
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

          {/* Desktop Nav Links */}
          <nav className="navbar-links" aria-label="Store navigation">
            <MagneticButton className="navbar-link-wrapper"><Link href="/" prefetch={true}>Home</Link></MagneticButton>
            <MagneticButton className="navbar-link-wrapper"><Link href="/categories" prefetch={true}>Categories</Link></MagneticButton>
            <MagneticButton className="navbar-link-wrapper"><Link href="/collections/luxury" prefetch={true}>Luxury</Link></MagneticButton>
            <MagneticButton className="navbar-link-wrapper"><Link href="/collections/originals" prefetch={true}>Originals</Link></MagneticButton>
            <MagneticButton className="navbar-link-wrapper"><Link href="/orders" prefetch={true}>Track Order</Link></MagneticButton>

            {role === "GUEST" ? (
              <MagneticButton className="navbar-link-wrapper">
                <button
                  type="button"
                  onClick={() => openAuthModal("signin")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--gold)",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: 0,
                  }}
                >
                  Sign In
                </button>
              </MagneticButton>
            ) : (
              <>
                <MagneticButton className="navbar-link-wrapper">
                  <Link href="/account" prefetch={true} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        style={{ width: "22px", height: "22px", borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      <span>Account</span>
                    )}
                  </Link>
                </MagneticButton>
                <MagneticButton className="navbar-link-wrapper">
                  <Link href="/account?tab=wishlist" prefetch={true}>Wishlist</Link>
                </MagneticButton>
              </>
            )}

            {role === "ADMIN" && (
              <MagneticButton className="navbar-link-wrapper">
                <Link href="/admin" prefetch={true}>Admin</Link>
              </MagneticButton>
            )}

            <CartButton />
          </nav>
        </div>

        {/* Mobile Navbar Layout (< 768px) - Approved Mobile Experience */}
        <div className="navbar-mobile-layout">
          <div className="navbar-top-row">
            <Link className="navbar-logo-symbol" href="/" aria-label="RA2Z Home">
              <Image
                src="/logo-gold.png"
                alt="RA2Z Symbol"
                width={34}
                height={44}
                style={{ objectFit: "contain" }}
                priority
              />
            </Link>

            <form className="navbar-search" action="/#products" onSubmit={handleSearch} style={{ position: "relative" }}>
              <input
                aria-label="Search products"
                name="q"
                placeholder="Search collection…"
                onChange={(e) => {
                  const val = e.target.value;
                  if (window.location.pathname === "/") {
                    window.dispatchEvent(
                      new CustomEvent(productSearchEventName, { detail: val })
                    );
                  }
                }}
              />
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="navbar-search-icon"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </form>

            <div className="navbar-mobile-actions">
              {role === "GUEST" ? (
                <button
                  type="button"
                  className="mobile-auth-btn"
                  onClick={() => openAuthModal("signin")}
                >
                  Sign In
                </button>
              ) : (
                <div className="mobile-profile-container" ref={profileMenuRef}>
                  <button
                    type="button"
                    className="mobile-avatar-btn"
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    aria-label="Open Profile Menu"
                  >
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="mobile-avatar-img" />
                    ) : (
                      <span className="mobile-avatar-initial">
                        {(user?.displayName || user?.email || "U")[0].toUpperCase()}
                      </span>
                    )}
                  </button>

                  {isProfileMenuOpen && (
                    <div className="mobile-profile-dropdown">
                      <div className="mobile-profile-dropdown-header">
                        <strong>{user?.displayName || "Member"}</strong>
                        <span>{user?.email}</span>
                      </div>
                      <hr className="mobile-profile-divider" />
                      <Link href="/account" onClick={() => setIsProfileMenuOpen(false)}>My Account</Link>
                      <Link href="/account?tab=orders" onClick={() => setIsProfileMenuOpen(false)}>My Orders</Link>
                      <Link href="/account?tab=wishlist" onClick={() => setIsProfileMenuOpen(false)}>Wishlist</Link>
                      <Link href="/account?tab=addresses" onClick={() => setIsProfileMenuOpen(false)}>Saved Addresses</Link>
                      <Link href="/account?tab=notifications" onClick={() => setIsProfileMenuOpen(false)}>Notifications</Link>
                      <Link href="/account?tab=settings" onClick={() => setIsProfileMenuOpen(false)}>Settings</Link>
                      {role === "ADMIN" && (
                        <Link href="/admin" onClick={() => setIsProfileMenuOpen(false)} style={{ color: "var(--gold)" }}>Admin Dashboard</Link>
                      )}
                      <hr className="mobile-profile-divider" />
                      <button
                        type="button"
                        className="mobile-profile-logout"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          signOut();
                        }}
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="mobile-cart-wrapper">
                <CartButton />
              </div>
            </div>
          </div>

          <nav className="navbar-links" aria-label="Store navigation">
            <MagneticButton className="navbar-link-wrapper"><Link href="/" prefetch={true}>Home</Link></MagneticButton>
            <MagneticButton className="navbar-link-wrapper"><Link href="/categories" prefetch={true}>Categories</Link></MagneticButton>
            <MagneticButton className="navbar-link-wrapper"><Link href="/collections/luxury" prefetch={true}>Luxury</Link></MagneticButton>
            <MagneticButton className="navbar-link-wrapper"><Link href="/collections/originals" prefetch={true}>Originals</Link></MagneticButton>
            <MagneticButton className="navbar-link-wrapper"><Link href="/orders" prefetch={true}>Track Order</Link></MagneticButton>
          </nav>
        </div>
      </div>
    </header>
  );
}
