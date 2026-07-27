"use client";

import { useEffect, useState } from "react";

type AdminNotif = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
};

type EmailLog = {
  id: string;
  recipient: string;
  subject: string;
  event_type: string;
  provider: string;
  status: "sent" | "failed" | "queued";
  error?: string;
  retry_count: number;
  created_at: string;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminNotificationsCenter() {
  const [notifications, setNotifications] = useState<AdminNotif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [activeTab, setActiveTab] = useState<"notifs" | "email_logs">("notifs");
  const [msg, setMsg] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notifRes, logsRes] = await Promise.all([
        fetch("/api/admin/notifications"),
        fetch("/api/admin/email-logs"),
      ]);

      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
        setUnreadCount(notifData.unreadCount || 0);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setEmailLogs(logsData.logs || []);
      }
    } catch (err) {
      console.error("[AdminNotificationsCenter] Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetryFailedEmails = async () => {
    setRetrying(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/email-logs", { method: "POST" });
      const data = await res.json();
      setMsg(`Retried ${data.retriedCount || 0} failed email(s). Successes: ${data.successCount || 0}`);
      fetchData();
    } catch {
      setMsg("Failed to retry emails.");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="panel" style={{ marginTop: "24px" }}>
      <div className="section-heading" style={{ marginBottom: "16px" }}>
        <div>
          <p className="eyebrow" style={{ color: "var(--gold)" }}>Communication Center</p>
          <h3 style={{ margin: "4px 0 0", fontSize: "20px", fontFamily: "'Playfair Display', serif" }}>
            Admin Alerts & Email Logs
          </h3>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className={`button ${activeTab === "notifs" ? "primary" : "secondary"}`}
            onClick={() => setActiveTab("notifs")}
            type="button"
            style={{ padding: "6px 14px", fontSize: "12px" }}
          >
            System Alerts ({unreadCount} unread)
          </button>
          <button
            className={`button ${activeTab === "email_logs" ? "primary" : "secondary"}`}
            onClick={() => setActiveTab("email_logs")}
            type="button"
            style={{ padding: "6px 14px", fontSize: "12px" }}
          >
            Email Logs ({emailLogs.length})
          </button>
        </div>
      </div>

      {msg && <p className="status" style={{ marginBottom: "12px", color: "var(--gold)" }}>{msg}</p>}

      {loading ? (
        <p className="status">Loading alerts...</p>
      ) : activeTab === "notifs" ? (
        <div style={{ display: "grid", gap: "12px" }}>
          {unreadCount > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="text-button" onClick={handleMarkAllRead} type="button">
                Mark All Alerts Read
              </button>
            </div>
          )}

          {notifications.length === 0 ? (
            <p className="empty-state">No system alerts recorded.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)",
                  background: n.is_read ? "rgba(255,255,255,0.01)" : "rgba(255, 107, 107, 0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: n.is_read ? "500" : "700", fontSize: "13px" }}>
                    <span style={{ textTransform: "uppercase", fontSize: "10px", color: "var(--gold)", marginRight: "8px" }}>
                      [{n.type}]
                    </span>
                    {n.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>{n.message}</div>
                  <div style={{ fontSize: "10px", color: "var(--muted-subtle)", marginTop: "4px" }}>{formatDate(n.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Email delivery audit status log</span>
            <button
              className="button secondary"
              disabled={retrying}
              onClick={handleRetryFailedEmails}
              type="button"
              style={{ padding: "6px 12px", fontSize: "11px" }}
            >
              {retrying ? "Retrying..." : "Retry Failed Emails"}
            </button>
          </div>

          {emailLogs.length === 0 ? (
            <p className="empty-state">No email dispatch logs recorded.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table width="100%" style={{ borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--glass-border)", color: "var(--muted)" }}>
                    <th style={{ padding: "8px" }}>Recipient</th>
                    <th style={{ padding: "8px" }}>Subject</th>
                    <th style={{ padding: "8px" }}>Event</th>
                    <th style={{ padding: "8px" }}>Provider</th>
                    <th style={{ padding: "8px" }}>Status</th>
                    <th style={{ padding: "8px" }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "8px", fontWeight: "600" }}>{log.recipient}</td>
                      <td style={{ padding: "8px", color: "var(--muted)" }}>{log.subject}</td>
                      <td style={{ padding: "8px" }}><code>{log.event_type}</code></td>
                      <td style={{ padding: "8px", textTransform: "uppercase", fontSize: "10px" }}>{log.provider}</td>
                      <td style={{ padding: "8px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "999px",
                            fontSize: "10px",
                            fontWeight: "700",
                            background: log.status === "sent" ? "rgba(107,203,119,0.15)" : "rgba(255,107,107,0.15)",
                            color: log.status === "sent" ? "#6BCB77" : "#FF6B6B",
                          }}
                        >
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "8px", color: "var(--muted-subtle)" }}>{formatDate(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
