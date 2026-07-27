"use client";

import { useEffect, useState } from "react";
import type { ProductReview } from "@/lib/growth";

type Props = {
  productId: string;
};

export function ProductReviewsSection({ productId }: Props) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_email: email,
          customer_name: name,
          rating,
          title,
          comment,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit review");
      setMsg("Thank you! Your review has been submitted.");
      setShowForm(false);
      setTitle("");
      setComment("");
      fetchReviews();
    } catch {
      setMsg("Unable to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoteHelpful = async (reviewId: string) => {
    try {
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, helpful_votes: r.helpful_votes + 1 } : r))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : "5.0";

  return (
    <div style={{ marginTop: "40px", borderTop: "1px solid var(--glass-border)", paddingTop: "32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "24px", margin: "0 0 4px" }}>
            Customer Reviews & Ratings
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--gold)", fontSize: "18px", fontWeight: "700" }}>
              ★ {averageRating}
            </span>
            <span style={{ color: "var(--muted)", fontSize: "13px" }}>
              ({reviews.length} verified review{reviews.length === 1 ? "" : "s"})
            </span>
          </div>
        </div>

        <button className="button primary" onClick={() => setShowForm(!showForm)} type="button" style={{ padding: "8px 18px", fontSize: "12px" }}>
          {showForm ? "Cancel Review" : "Write a Review"}
        </button>
      </div>

      {msg && <p style={{ color: "var(--gold)", fontSize: "13px", marginBottom: "16px" }}>{msg}</p>}

      {/* Review Submission Form */}
      {showForm && (
        <form onSubmit={handleSubmitReview} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: "16px", padding: "20px", marginBottom: "24px", display: "grid", gap: "12px" }}>
          <h4 style={{ margin: 0, fontSize: "15px" }}>Write a Product Review</h4>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <input required type="email" placeholder="Your Email Address *" value={email} onChange={(e) => setEmail(e.target.value)} style={{ fontSize: "13px" }} />
            <input required type="text" placeholder="Your Full Name *" value={name} onChange={(e) => setName(e.target.value)} style={{ fontSize: "13px" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>Rating:</span>
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{ background: "rgba(255,255,255,0.05)", color: "var(--foreground)", padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
              <option value={5}>★★★★★ (5 Stars - Excellent)</option>
              <option value={4}>★★★★☆ (4 Stars - Great)</option>
              <option value={3}>★★★☆☆ (3 Stars - Average)</option>
              <option value={2}>★★☆☆☆ (2 Stars - Below Average)</option>
              <option value={1}>★☆☆☆☆ (1 Star - Poor)</option>
            </select>
          </div>

          <input required type="text" placeholder="Review Title (e.g. Exceptional quality and craftsmanship)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ fontSize: "13px" }} />
          <textarea required rows={3} placeholder="Share details about product quality, fit, and your experience..." value={comment} onChange={(e) => setComment(e.target.value)} style={{ fontSize: "13px" }} />

          <button className="button primary" disabled={submitting} type="submit" style={{ width: "fit-content", padding: "8px 20px", fontSize: "12px" }}>
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}

      {/* Reviews List */}
      {loading ? (
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>No reviews yet. Be the first to review this item!</p>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: "14px", padding: "16px", display: "grid", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: "var(--gold)", fontSize: "14px" }}>
                  {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                </div>
                {r.is_verified && (
                  <span style={{ fontSize: "10px", background: "rgba(107,203,119,0.15)", color: "#6BCB77", padding: "2px 8px", borderRadius: "999px", fontWeight: "700" }}>
                    ✓ Verified Purchase
                  </span>
                )}
              </div>
              <strong style={{ fontSize: "14px" }}>{r.title}</strong>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: "1.5" }}>{r.comment}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", fontSize: "11px", color: "var(--muted-subtle)" }}>
                <span>by {r.customer_name} • {new Date(r.created_at).toLocaleDateString()}</span>
                <button className="text-button" onClick={() => handleVoteHelpful(r.id)} type="button" style={{ fontSize: "11px" }}>
                  👍 Helpful ({r.helpful_votes})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
