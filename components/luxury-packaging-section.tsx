"use client";

import { useState } from "react";

export function LuxuryPackagingSection() {
  const [showGiftInput, setShowGiftInput] = useState(false);
  const [giftNote, setGiftNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftNote.trim()) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 4000);
  };

  return (
    <div
      style={{
        marginTop: "36px",
        borderRadius: "24px",
        background: "linear-gradient(165deg, rgba(25, 25, 25, 0.85) 0%, rgba(12, 12, 12, 0.95) 100%)",
        border: "1px solid rgba(212, 175, 55, 0.25)",
        padding: "28px 24px",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.4)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <span style={{ fontSize: "11px", color: "var(--gold)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1.5px" }}>
            RA2Z LUXURY CONCIERGE
          </span>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", margin: "4px 0 0", color: "#FFFFFF" }}>
            Signature Packaging & Unboxing Experience
          </h3>
        </div>

        <span
          style={{
            background: "rgba(212, 175, 55, 0.12)",
            border: "1px solid rgba(212, 175, 55, 0.4)",
            color: "var(--gold)",
            borderRadius: "999px",
            padding: "4px 14px",
            fontSize: "12px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          🎁 Gift Ready Guaranteed
        </span>
      </div>

      <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: "1.6", margin: "0 0 24px" }}>
        Every RA2Z piece is presented in our rigid magnetic gift box lined with plush microfiber, accompanied by a Certificate of Authenticity and a velvet protective pouch.
      </p>

      {/* Luxury Packaging Pillars Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ padding: "16px", borderRadius: "16px", background: "rgba(255, 255, 255, 0.025)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <div style={{ fontSize: "22px", marginBottom: "6px" }}>🎁</div>
          <h4 style={{ color: "#FFFFFF", fontSize: "14px", fontWeight: 700, margin: "0 0 4px" }}>Signature Rigid Box</h4>
          <p style={{ color: "var(--muted)", fontSize: "12px", margin: 0, lineHeight: "1.5" }}>
            Heavyweight foil-stamped gold box with magnetic closure and satin ribbon pull.
          </p>
        </div>

        <div style={{ padding: "16px", borderRadius: "16px", background: "rgba(255, 255, 255, 0.025)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <div style={{ fontSize: "22px", marginBottom: "6px" }}>✨</div>
          <h4 style={{ color: "#FFFFFF", fontSize: "14px", fontWeight: 700, margin: "0 0 4px" }}>Authenticity Certificate</h4>
          <p style={{ color: "var(--muted)", fontSize: "12px", margin: 0, lineHeight: "1.5" }}>
            Includes serial-numbered verification card confirming RA2Z quality control.
          </p>
        </div>

        <div style={{ padding: "16px", borderRadius: "16px", background: "rgba(255, 255, 255, 0.025)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <div style={{ fontSize: "22px", marginBottom: "6px" }}>✉️</div>
          <h4 style={{ color: "#FFFFFF", fontSize: "14px", fontWeight: 700, margin: "0 0 4px" }}>Handwritten Gift Note</h4>
          <p style={{ color: "var(--muted)", fontSize: "12px", margin: 0, lineHeight: "1.5" }}>
            Add a personal message printed on thick cotton linen cardstock.
          </p>
        </div>
      </div>

      {/* Toggle Custom Gift Message */}
      {!showGiftInput ? (
        <button
          type="button"
          onClick={() => setShowGiftInput(true)}
          style={{
            background: "none",
            border: "1px dashed rgba(212, 175, 55, 0.5)",
            borderRadius: "12px",
            padding: "10px 20px",
            color: "var(--gold)",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            width: "100%",
            textAlign: "center",
          }}
        >
          + Add Complimentary Gift Message to This Order
        </button>
      ) : (
        <form onSubmit={handleSaveNote} style={{ display: "grid", gap: "10px" }}>
          <label htmlFor="gift-note-input" style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF" }}>
            Personal Gift Message <span style={{ color: "var(--muted)", fontWeight: 400 }}>(Included inside packaging cardstock)</span>
          </label>
          <textarea
            id="gift-note-input"
            rows={3}
            maxLength={250}
            placeholder="Write your custom gift message here..."
            value={giftNote}
            onChange={(e) => setGiftNote(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#FFFFFF",
              fontSize: "13px",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="submit"
              style={{
                padding: "8px 18px",
                borderRadius: "999px",
                background: "var(--gold)",
                color: "#000000",
                fontWeight: 700,
                fontSize: "12px",
                border: "none",
                cursor: "pointer",
              }}
            >
              {noteSaved ? "✓ Gift Message Attached" : "Save Gift Message"}
            </button>
            <button
              type="button"
              onClick={() => setShowGiftInput(false)}
              style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "12px", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default LuxuryPackagingSection;
