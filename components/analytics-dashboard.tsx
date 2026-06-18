"use client";

import { useEffect, useState } from "react";

type AnalyticsItem = {
  id: string;
  title: string;
  clicks: number;
  lastClicked: string | null;
};

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch("/api/admin/analytics");
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load analytics");
        }
        const data = await response.json();
        setAnalytics(data.analytics);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (isLoading) return <p className="status">Loading analytics...</p>;
  if (error) return <p className="notification error">{error}</p>;

  const topProducts = analytics.filter(item => item.clicks > 0).slice(0, 5);

  return (
    <div className="analytics-dashboard">
      <section className="leaderboard panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Top Performing Products</p>
            <h2>🔥 Leaderboard</h2>
          </div>
        </div>
        {topProducts.length > 0 ? (
          <div className="leaderboard-list">
            {topProducts.map((item, index) => (
              <div key={item.id} className="leaderboard-item">
                <span className="rank">{index + 1}</span>
                <span className="title">{item.title}</span>
                <span className="clicks">{item.clicks} clicks</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No clicks tracked yet.</p>
        )}
      </section>

      <section className="detailed-analytics panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Full Breakdown</p>
            <h2>Product Clicks</h2>
          </div>
        </div>
        <div className="admin-products">
          {analytics.map((item) => (
            <div key={item.id} className="admin-product">
              <div className="admin-product-details">
                <strong>{item.title}</strong>
                <span>
                  {item.clicks} total clicks
                  {item.lastClicked && ` • Last clicked ${new Date(item.lastClicked).toLocaleString()}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        .analytics-dashboard {
          display: grid;
          gap: 22px;
          margin-top: 22px;
        }
        .leaderboard-list {
          display: grid;
          gap: 12px;
          margin-top: 12px;
        }
        .leaderboard-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
        }
        .rank {
          font-weight: 900;
          color: var(--accent);
          font-size: 18px;
          width: 24px;
        }
        .title {
          flex: 1;
          font-weight: 600;
        }
        .clicks {
          font-weight: 800;
          color: var(--muted);
        }
      `}</style>
    </div>
  );
}
