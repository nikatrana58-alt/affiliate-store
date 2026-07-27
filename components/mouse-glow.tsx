"use client";

import { useEffect, useRef } from "react";

export function MouseGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -200, y: -200 });
  const raf = useRef(0);

  useEffect(() => {
    function update() {
      if (!ref.current) return;
      ref.current.style.background = `radial-gradient(500px circle at ${pos.current.x}px ${pos.current.y}px, rgba(232, 180, 184, 0.06), transparent 60%)`;
    }

    function onMouse(e: MouseEvent) {
      pos.current = { x: e.clientX, y: e.clientY };
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(update);
    }

    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="mouse-glow"
      aria-hidden="true"
    />
  );
}
