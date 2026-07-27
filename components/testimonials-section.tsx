"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const testimonials = [
  {
    quote: "Absolutely stunning quality. The attention to detail is remarkable — every product feels considered.",
    author: "Sophia Chen",
    role: "Verified Buyer",
    initials: "SC",
  },
  {
    quote: "I've never been more impressed with a curated selection. Every product feels thoughtfully chosen.",
    author: "James Mitchell",
    role: "Verified Buyer",
    initials: "JM",
  },
  {
    quote: "The shopping experience itself is a pleasure. Beautiful design meets exceptional products.",
    author: "Emma Larsson",
    role: "Verified Buyer",
    initials: "EL",
  },
];

export function TestimonialsSection() {
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "start 30%"],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [60, 0]);

  return (
    <motion.section ref={ref} className="testimonials-section" style={{ opacity, y }}>
      <div className="section-container">
        <p className="eyebrow">Testimonials</p>
        <h2 className="testimonials-heading">Loved by our customers</h2>

        <div className="testimonials-grid">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              className="glass-card testimonials-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="testimonials-stars">
                {"★".repeat(5)}
              </div>
              <p className="testimonials-quote">&ldquo;{t.quote}&rdquo;</p>
              <div className="testimonials-author">
                <div className="testimonials-avatar" aria-hidden="true">
                  {t.initials}
                </div>
                <div>
                  <span className="testimonials-name">{t.author}</span>
                  <span className="testimonials-role">{t.role}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
