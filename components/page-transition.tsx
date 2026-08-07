"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ backgroundColor: "#0A0A0A", minHeight: "100vh" }}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

