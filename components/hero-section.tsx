"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { MagneticButton } from "@/components/magnetic-button";
import type { Product } from "@/lib/products";
import { getProductDisplayPrice } from "@/lib/pricing-engine";

const HeroScene3D = dynamic(
  () => import("@/components/hero-scene-3d").then((mod) => mod.HeroScene3D),
  { ssr: false }
);

type HeroSectionProps = {
  product?: Product | null;
};

function formatPrice(price: number | null) {
  if (price === null) return "";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(price);
}

const containerVariants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

const itemVariants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

export function HeroSection({ product }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const opacityScale = useTransform(scrollYProgress, [0, 0.85], [1, 0.3]);

  return (
    <motion.section
      ref={sectionRef}
      className="hero-immersive"
      style={{
        scale: heroScale,
        y: heroY,
      }}
    >
      <HeroScene3D />

      <motion.div
        className="hero-immersive-content"
        style={{ y: contentY, opacity: opacityScale }}
      >
        <motion.div
          className="hero-text-col"
          variants={containerVariants}
          initial="visible"
          animate="visible"
        >
          <motion.p className="hero-eyebrow" variants={itemVariants}>
            <span className="eyebrow-dot" />
            RA2Z LUXURY CURATION
          </motion.p>

          <motion.h1 className="hero-headline" variants={itemVariants}>
            Redefining Modern
            <br />
            <span className="hero-headline-accent">Luxury & Prestige</span>
          </motion.h1>

          <motion.p className="hero-subtitle" variants={itemVariants}>
            Handpicked masterpieces that embody perfection, quality, and timeless distinction.
          </motion.p>

          <motion.div className="hero-actions" variants={itemVariants}>
            <MagneticButton className="hero-cta-wrapper">
              <Link className="hero-cta" href="#products">
                Explore Collection
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
            </MagneticButton>
            <MagneticButton className="hero-cta-secondary-wrapper">
              <Link className="hero-cta-secondary" href="#products">
                View All Creations
              </Link>
            </MagneticButton>
          </motion.div>

          <motion.div className="hero-stats" variants={itemVariants}>
            <div className="hero-stat">
              <span className="hero-stat-number">100%</span>
              <span className="hero-stat-label">Authentic Luxury</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">10K+</span>
              <span className="hero-stat-label">Elite Clients</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">4.95★</span>
              <span className="hero-stat-label">Excellence Rating</span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-showcase-col"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="product-showcase-card"
            style={{
              x: 0,
              y: 0,
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(212, 175, 55, 0.03) 100%)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderRadius: "28px",
              border: "1px solid rgba(212, 175, 55, 0.35)",
              boxShadow: "0 32px 80px rgba(0, 0, 0, 0.85), 0 0 40px rgba(212, 175, 55, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
              padding: "24px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div className="showcase-ring showcase-ring-1" />
            <div className="showcase-ring showcase-ring-2" />
            <div className="showcase-ring showcase-ring-3" />

            {product?.image ? (
              <div className="showcase-image-wrapper">
                <Image
                  alt={product.title}
                  src={product.image}
                  className="showcase-image"
                  width={360}
                  height={360}
                  sizes="(max-width: 768px) 100vw, 360px"
                  priority
                />
                <div className="showcase-image-shimmer" />
              </div>
            ) : (
              <div className="showcase-placeholder">
                <div className="showcase-placeholder-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                </div>
                <p>Featured Creation</p>
              </div>
            )}

            {product && (
              <div className="showcase-meta">
                <span className="showcase-price">{formatPrice(getProductDisplayPrice(product).price)}</span>
                <span className="showcase-badge">Featured</span>
              </div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>

      <div className="hero-scroll-indicator" aria-hidden="true">
        <div className="scroll-mouse">
          <div className="scroll-dot" />
        </div>
        <span>Discover</span>
      </div>
    </motion.section>
  );
}
