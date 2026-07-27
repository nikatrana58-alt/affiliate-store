"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { HeroScene3D } from "@/components/hero-scene-3d";
import { MagneticButton } from "@/components/magnetic-button";
import type { Product } from "@/lib/products";

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
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

export function HeroSection({ product }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)) {
      setIsTouch(true);
    }
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroBlur = useTransform(scrollYProgress, [0, 0.8], [0, 6]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const opacityScale = useTransform(scrollYProgress, [0, 0.85], [1, 0.3]);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const showcaseX = useTransform(springX, [0, 1], [-8, 8]);
  const showcaseY = useTransform(springY, [0, 1], [8, -8]);

  useEffect(() => {
    if (isTouch) return;

    function handleMouse(e: MouseEvent) {
      const x = (e.clientX - window.innerWidth / 2) / window.innerWidth + 0.5;
      const y = (e.clientY - window.innerHeight / 2) / window.innerHeight + 0.5;
      mouseX.set(x);
      mouseY.set(y);
    }

    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [isTouch, mouseX, mouseY]);

  return (
    <motion.section
      ref={sectionRef}
      className="hero-immersive"
      style={{
        scale: heroScale,
        y: heroY,
        filter: `blur(${heroBlur.get()}px)`,
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
          initial="hidden"
          animate="visible"
        >
          <motion.p className="hero-eyebrow" variants={itemVariants}>
            <span className="eyebrow-dot" />
            Premium curated collection
          </motion.p>

          <motion.h1 className="hero-headline" variants={itemVariants}>
            Discover Your
            <br />
            <span className="hero-headline-accent">Next Obsession</span>
          </motion.h1>

          <motion.p className="hero-subtitle" variants={itemVariants}>
            Handpicked products that redefine quality. Curated for those who
            demand more from every purchase.
          </motion.p>

          <motion.div className="hero-actions" variants={itemVariants}>
            <MagneticButton className="hero-cta-wrapper">
              <Link className="hero-cta" href="#products">
                Explore collection
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
            </MagneticButton>
            <MagneticButton className="hero-cta-secondary-wrapper">
              <Link className="hero-cta-secondary" href="#products">
                View all products
              </Link>
            </MagneticButton>
          </motion.div>

          <motion.div className="hero-stats" variants={itemVariants}>
            <div className="hero-stat">
              <span className="hero-stat-number">500+</span>
              <span className="hero-stat-label">Curated products</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">10K+</span>
              <span className="hero-stat-label">Happy customers</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">4.9★</span>
              <span className="hero-stat-label">Average rating</span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-showcase-col"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="product-showcase-card"
            style={{
              x: showcaseX,
              y: showcaseY,
            }}
            animate={{
              y: [0, -6, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="showcase-ring showcase-ring-1" />
            <div className="showcase-ring showcase-ring-2" />
            <div className="showcase-ring showcase-ring-3" />

            {product?.image ? (
              <div className="showcase-image-wrapper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={product.title}
                  src={product.image}
                  className="showcase-image"
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
                <p>Featured product</p>
              </div>
            )}

            {product && (
              <div className="showcase-meta">
                <span className="showcase-price">{formatPrice(product.price)}</span>
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
        <span>Scroll</span>
      </div>
    </motion.section>
  );
}
