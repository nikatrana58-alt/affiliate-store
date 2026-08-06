import Image from "next/image";

const PARTICLES = [
  { left: "15%", top: "45%", size: 3 },
  { left: "28%", top: "60%", size: 4 },
  { left: "42%", top: "40%", size: 2.5 },
  { left: "55%", top: "65%", size: 3.5 },
  { left: "68%", top: "48%", size: 2 },
  { left: "82%", top: "58%", size: 4 },
  { left: "22%", top: "35%", size: 3 },
  { left: "35%", top: "72%", size: 2.5 },
  { left: "48%", top: "52%", size: 4 },
  { left: "62%", top: "38%", size: 3 },
  { left: "75%", top: "68%", size: 2 },
  { left: "88%", top: "42%", size: 3.5 },
];

export default function Loading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Ambient Gold Glow Radial */}
      <div
        style={{
          position: "absolute",
          width: "450px",
          height: "450px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212, 175, 55, 0.22) 0%, rgba(212, 175, 55, 0.05) 45%, transparent 70%)",
          filter: "blur(50px)",
          pointerEvents: "none",
        }}
      />

      {/* Tiny Ambient Golden Particles */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: "50%",
              backgroundColor: "#D4AF37",
              boxShadow: "0 0 8px rgba(212, 175, 55, 0.8)",
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      {/* Center Logo Container */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Logo Image */}
        <div style={{ position: "relative", width: "110px", height: "135px" }}>
          <Image
            src="/logo-gold.png"
            alt="RA2Z Luxury Loading"
            width={110}
            height={135}
            unoptimized
            priority
            style={{ width: "110px", height: "135px", objectFit: "contain" }}
            suppressHydrationWarning
          />
        </div>

        {/* Subtle Luxury Loading Line */}
        <div
          style={{
            width: "80px",
            height: "1.5px",
            marginTop: "24px",
            background: "linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%)",
            borderRadius: "2px",
            boxShadow: "0 0 10px rgba(212, 175, 55, 0.5)",
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
}
