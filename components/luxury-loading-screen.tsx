"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

// Static deterministic particles to prevent SSR/Client hydration mismatch
const PARTICLES = [
  { left: "15%", top: "45%", size: 3, delay: 0.05, duration: 1.3 },
  { left: "28%", top: "60%", size: 4, delay: 0.12, duration: 1.5 },
  { left: "42%", top: "40%", size: 2.5, delay: 0.08, duration: 1.2 },
  { left: "55%", top: "65%", size: 3.5, delay: 0.15, duration: 1.6 },
  { left: "68%", top: "48%", size: 2, delay: 0.02, duration: 1.4 },
  { left: "82%", top: "58%", size: 4, delay: 0.18, duration: 1.7 },
  { left: "22%", top: "35%", size: 3, delay: 0.10, duration: 1.3 },
  { left: "35%", top: "72%", size: 2.5, delay: 0.22, duration: 1.5 },
  { left: "48%", top: "52%", size: 4, delay: 0.04, duration: 1.4 },
  { left: "62%", top: "38%", size: 3, delay: 0.16, duration: 1.2 },
  { left: "75%", top: "68%", size: 2, delay: 0.09, duration: 1.6 },
  { left: "88%", top: "42%", size: 3.5, delay: 0.20, duration: 1.5 },
];

export function LuxuryLoadingScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 850);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="luxury-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="luxury-loading-overlay"
          suppressHydrationWarning
        >
          {/* Ambient Gold Glow Radial */}
          <div className="luxury-loading-glow" />

          {/* Center Logo Container */}
          <div className="luxury-loading-center">
            {/* Logo Image */}
            <div className="luxury-loading-logo-box">
              <Image
                src="/logo-gold.png"
                alt="RA2Z Luxury Logo"
                width={110}
                height={135}
                style={{ width: "110px", height: "135px", objectFit: "contain" }}
                priority
              />
            </div>

            {/* Subtle Luxury Loading Line */}
            <div className="luxury-loading-bar" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LuxuryLoadingScreen;
