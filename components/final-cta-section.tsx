import Link from "next/link";
import { MagneticButton } from "@/components/magnetic-button";

export function FinalCTASection() {
  return (
    <section className="final-cta-section">
      <div className="final-cta-card">
        <p className="eyebrow" style={{ color: "rgba(201, 168, 76, 0.7)", position: "relative" }}>
          Start exploring
        </p>
        <h2 className="final-cta-heading">
          Find your perfect product
        </h2>
        <p className="final-cta-text">
          Browse our curated collection of premium products handpicked for quality, design, and lasting value.
        </p>
        <MagneticButton className="final-cta-button-wrapper">
          <Link className="final-cta-button" href="/#products">
            Browse collection
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </Link>
        </MagneticButton>
      </div>
    </section>
  );
}
