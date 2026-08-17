"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";

type PremiumProductGalleryProps = {
  images: string[];
  title: string;
  activeVariantImage?: string | null;
};

export function PremiumProductGallery({
  images,
  title,
  activeVariantImage,
}: PremiumProductGalleryProps) {
  // Normalize and deduplicate gallery images
  const galleryList = useMemo(() => {
    const list: string[] = [];
    if (activeVariantImage) list.push(activeVariantImage);
    if (Array.isArray(images)) {
      for (const img of images) {
        if (img && typeof img === "string" && !list.includes(img)) {
          list.push(img);
        }
      }
    }
    return list.length > 0
      ? list
      : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80"];
  }, [images, activeVariantImage]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number; show: boolean }>({
    x: 0,
    y: 0,
    show: false,
  });

  // Touch swipe ref for mobile navigation
  const touchStartX = useRef<number | null>(null);

  // Sync index when activeVariantImage changes
  useEffect(() => {
    if (activeVariantImage) {
      const idx = galleryList.indexOf(activeVariantImage);
      if (idx !== -1) setSelectedIndex(idx);
    }
  }, [activeVariantImage, galleryList]);

  const handlePrev = useCallback(() => {
    setZoom({ x: 0, y: 0, show: false });
    setSelectedIndex((prev) => (prev === 0 ? galleryList.length - 1 : prev - 1));
  }, [galleryList.length]);

  const handleNext = useCallback(() => {
    setZoom({ x: 0, y: 0, show: false });
    setSelectedIndex((prev) => (prev === galleryList.length - 1 ? 0 : prev + 1));
  }, [galleryList.length]);

  // Keyboard left/right arrow navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape" && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext, isLightboxOpen]);

  // Desktop Hover Zoom (Magnifying Glass Lens)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoom({ x, y, show: true });
  };

  const handleMouseLeave = () => {
    setZoom({ x: 0, y: 0, show: false });
  };

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  const currentImage = galleryList[selectedIndex] || galleryList[0];

  return (
    <div className="premium-gallery-wrapper" style={{ position: "relative", width: "100%" }}>
      {/* ── Main Hero Image Container ── */}
      <div
        className="premium-gallery-main"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setIsLightboxOpen(true)}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          maxHeight: "460px",
          borderRadius: "16px",
          overflow: "hidden",
          background: "linear-gradient(180deg, rgba(20, 20, 26, 0.95) 0%, rgba(10, 10, 14, 0.98) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          cursor: "zoom-in",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Primary Image - Contain mode preserves 100% full source image (size charts, edges, text) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage}
          alt={`${title} - View ${selectedIndex + 1}`}
          loading={selectedIndex === 0 ? "eager" : "lazy"}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transition: "opacity 0.25s ease-in-out",
          }}
        />

        {/* Desktop Hover Zoom Lens Overlay */}
        {zoom.show && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundImage: `url(${currentImage})`,
              backgroundPosition: `${zoom.x}% ${zoom.y}%`,
              backgroundSize: "220%",
              backgroundRepeat: "no-repeat",
              pointerEvents: "none",
              borderRadius: "16px",
              zIndex: 3,
            }}
          />
        )}

        {/* Overlay Badges & Counter */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
            color: "var(--gold)",
            fontSize: "11px",
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: "999px",
            border: "1px solid rgba(201, 168, 76, 0.3)",
            zIndex: 4,
            pointerEvents: "none",
          }}
        >
          {selectedIndex + 1} / {galleryList.length}
        </div>

        {/* Previous / Next Arrow Overlay Buttons */}
        {galleryList.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous Image"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                setZoom({ x: 0, y: 0, show: false });
                e.currentTarget.style.background = "rgba(201, 168, 76, 0.8)";
              }}
              onMouseMove={(e) => {
                e.stopPropagation();
                setZoom({ x: 0, y: 0, show: false });
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0, 0, 0, 0.6)";
              }}
              style={{
                position: "absolute",
                top: "50%",
                left: "12px",
                transform: "translateY(-50%)",
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "rgba(0, 0, 0, 0.6)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontSize: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 5,
                transition: "all 0.2s ease",
              }}
            >
              ‹
            </button>

            <button
              type="button"
              aria-label="Next Image"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                setZoom({ x: 0, y: 0, show: false });
                e.currentTarget.style.background = "rgba(201, 168, 76, 0.8)";
              }}
              onMouseMove={(e) => {
                e.stopPropagation();
                setZoom({ x: 0, y: 0, show: false });
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0, 0, 0, 0.6)";
              }}
              style={{
                position: "absolute",
                top: "50%",
                right: "12px",
                transform: "translateY(-50%)",
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "rgba(0, 0, 0, 0.6)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontSize: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 5,
                transition: "all 0.2s ease",
              }}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* ── Thumbnail Strip Below ── */}
      {galleryList.length > 1 && (
        <div
          className="premium-gallery-thumbnails"
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "14px",
            overflowX: "auto",
            paddingBottom: "6px",
            scrollbarWidth: "thin",
          }}
        >
          {galleryList.map((img, idx) => {
            const isActive = idx === selectedIndex;
            return (
              <button
                key={idx}
                type="button"
                aria-label={`Select Image ${idx + 1}`}
                onClick={() => {
                  setZoom({ x: 0, y: 0, show: false });
                  setSelectedIndex(idx);
                }}
                style={{
                  position: "relative",
                  width: "68px",
                  height: "68px",
                  flexShrink: 0,
                  borderRadius: "10px",
                  overflow: "hidden",
                  padding: 0,
                  border: isActive ? "2px solid var(--gold)" : "1px solid rgba(255, 255, 255, 0.1)",
                  boxShadow: isActive ? "0 0 12px rgba(201, 168, 76, 0.4)" : "none",
                  background: "rgba(255, 255, 255, 0.02)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: isActive ? 1 : 0.6,
                    transition: "opacity 0.2s ease",
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* ── Fullscreen Lightbox Modal ── */}
      {isLightboxOpen && (
        <div
          className="premium-lightbox-backdrop"
          onClick={() => setIsLightboxOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(5, 5, 10, 0.95)",
            backdropFilter: "blur(12px)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            animation: "fadeIn 0.2s ease",
          }}
        >
          {/* Lightbox Header */}
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "24px",
              right: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 100000,
            }}
          >
            <span style={{ color: "var(--foreground)", fontSize: "14px", fontWeight: 600 }}>
              {title} ({selectedIndex + 1} / {galleryList.length})
            </span>

            <button
              type="button"
              aria-label="Close Lightbox"
              onClick={() => setIsLightboxOpen(false)}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "none",
                color: "#ffffff",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                fontSize: "18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          {/* Lightbox Main Image */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "75vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImage}
              alt={title}
              style={{
                maxWidth: "100%",
                maxHeight: "75vh",
                objectFit: "contain",
                borderRadius: "12px",
                boxShadow: "0 25px 50px rgba(0,0,0,0.8)",
              }}
            />

            {/* Lightbox Prev/Next Navigation */}
            {galleryList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  style={{
                    position: "absolute",
                    left: "-50px",
                    background: "rgba(255, 255, 255, 0.15)",
                    border: "none",
                    color: "#ffffff",
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    fontSize: "24px",
                    cursor: "pointer",
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    position: "absolute",
                    right: "-50px",
                    background: "rgba(255, 255, 255, 0.15)",
                    border: "none",
                    color: "#ffffff",
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    fontSize: "24px",
                    cursor: "pointer",
                  }}
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Lightbox Bottom Strip */}
          {galleryList.length > 1 && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "20px",
                overflowX: "auto",
                maxWidth: "90vw",
              }}
            >
              {galleryList.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  style={{
                    width: "54px",
                    height: "54px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: idx === selectedIndex ? "2px solid var(--gold)" : "1px solid rgba(255,255,255,0.2)",
                    background: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Thumb ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
