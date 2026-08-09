"use client";

import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="footer">
      {/* Top gold gradient divider */}
      <div style={{
        height: "1px",
        background: "linear-gradient(90deg, transparent 0%, rgba(201, 168, 76, 0.35) 30%, rgba(201, 168, 76, 0.55) 50%, rgba(201, 168, 76, 0.35) 70%, transparent 100%)",
        marginBottom: 0,
      }} />

      <div className="footer-inner">
        {/* Trust badges row */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          padding: "28px 0",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          marginBottom: "56px",
          justifyContent: "center",
        }}>
          {[
            { icon: "🔒", text: "Secure Payments" },
            { icon: "📦", text: "Order Tracking" },
            { icon: "💬", text: "Customer Support" },
            { icon: "↩️", text: "Returns Policy" },
          ].map(({ icon, text }) => (
            <div
              key={text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--muted)",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: "14px" }}>{icon}</span>
              {text}
            </div>
          ))}
        </div>

        <div className="footer-grid">
          <div className="footer-brand">
            <Link className="footer-logo" href="/" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Image
                src="/logo-gold.png"
                alt="RA2Z Logo"
                width={36}
                height={46}
                style={{ objectFit: "contain" }}
              />
            </Link>
            <p className="footer-tagline">
              Handpicked masterpieces that redefine quality, perfection, and prestige. For those who demand only the finest.
            </p>

            {/* Task 12: Non-Intrusive Newsletter Subscription */}
            <div style={{ marginTop: "20px", marginBottom: "20px" }}>
              <p style={{ color: "var(--gold)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", margin: "0 0 6px" }}>
                RA2Z PRIVATE CIRCLE
              </p>
              <p style={{ color: "var(--muted)", fontSize: "13px", margin: "0 0 10px" }}>
                Subscribe for early access to limited luxury drops and private VIP offers.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert("Thank you for joining the RA2Z Private Circle. VIP access confirmed.");
                }}
                style={{ display: "flex", gap: "8px", maxWidth: "320px" }}
              >
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "999px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#FFFFFF",
                    fontSize: "12px",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "8px 18px",
                    borderRadius: "999px",
                    background: "var(--gold)",
                    color: "#000000",
                    fontWeight: 700,
                    fontSize: "11px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Join
                </button>
              </form>
            </div>
            {/* Social icons */}
            <div className="footer-social">
              <div
                className="footer-social-dot"
                title="Pinterest"
                role="presentation"
                style={{ transition: "transform 0.25s ease, background 0.25s ease, box-shadow 0.25s ease" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 16px rgba(201,168,76,0.2)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.08)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.25)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "";
                  (e.currentTarget as HTMLElement).style.boxShadow = "";
                  (e.currentTarget as HTMLElement).style.background = "";
                  (e.currentTarget as HTMLElement).style.borderColor = "";
                }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
                </svg>
              </div>
              <div
                className="footer-social-dot"
                title="Instagram"
                role="presentation"
                style={{ transition: "transform 0.25s ease, background 0.25s ease, box-shadow 0.25s ease" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 16px rgba(201,168,76,0.2)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.08)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.25)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "";
                  (e.currentTarget as HTMLElement).style.boxShadow = "";
                  (e.currentTarget as HTMLElement).style.background = "";
                  (e.currentTarget as HTMLElement).style.borderColor = "";
                }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Discover</h4>
            <Link href="/#products">All Products</Link>
            <Link href="/#products">Trending</Link>
            <Link href="/#new-arrivals">New Arrivals</Link>
            <Link href="/collections/luxury">Luxury</Link>
            <Link href="/collections/originals">Originals</Link>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Connect</h4>
            <Link href="/">About RA2Z</Link>
            <Link href="/">Contact Us</Link>
            <Link href="/admin">Admin Panel</Link>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Information</h4>
            <Link href="/">Shipping & Concierge</Link>
            <Link href="/">Returns Policy</Link>
            <Link href="/">Privacy Policy</Link>
            <Link href="/">Terms of Service</Link>
          </div>
        </div>

        {/* Bottom divider with gold line */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            <p style={{ color: "var(--muted-subtle)", fontSize: "12px", margin: 0 }}>
              © {new Date().getFullYear()} RA2Z Luxury. All rights reserved.
            </p>
            <p style={{ color: "var(--muted-subtle)", fontSize: "11px", margin: 0, opacity: 0.6, fontStyle: "italic" }}>
              RA2Z Store — Premium Quality & Direct Global Fulfillment.
            </p>
          </div>
          {/* Mini gold accent */}
          <div style={{
            width: "40px",
            height: "1px",
            background: "var(--gold)",
            opacity: 0.25,
            marginTop: "8px",
          }} />
        </div>
      </div>
    </footer>
  );
}
