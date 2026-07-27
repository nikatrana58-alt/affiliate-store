"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminNotificationsCenter } from "@/components/admin-notifications-center";
import { AdminSystemHealth } from "@/components/admin-system-health";
import { AdminGrowthAnalytics } from "@/components/admin-growth-analytics";
import type {
  Order,
  OrderWithItems,
  OrderStatusHistory,
  Payment,
  OrderStatus,
  OrderStats,
} from "@/lib/db/types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(price);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: OrderStatus | string }) {
  const getBadgeStyle = (s: string) => {
    switch (s) {
      case "paid":
      case "confirmed":
      case "delivered":
      case "succeeded":
        return {
          bg: "rgba(107, 203, 119, 0.12)",
          border: "rgba(107, 203, 119, 0.3)",
          color: "#6BCB77",
        };
      case "processing":
      case "shipped":
        return {
          bg: "rgba(77, 150, 255, 0.12)",
          border: "rgba(77, 150, 255, 0.3)",
          color: "#4D96FF",
        };
      case "pending":
        return {
          bg: "rgba(201, 168, 76, 0.12)",
          border: "rgba(201, 168, 76, 0.3)",
          color: "#C9A84C",
        };
      case "cancelled":
      case "failed":
      case "refunded":
        return {
          bg: "rgba(255, 107, 107, 0.12)",
          border: "rgba(255, 107, 107, 0.3)",
          color: "#FF6B6B",
        };
      default:
        return {
          bg: "rgba(255, 255, 255, 0.08)",
          border: "rgba(255, 255, 255, 0.15)",
          color: "#E0E0E0",
        };
    }
  };

  const style = getBadgeStyle(status);

  return (
    <span
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.color,
        borderRadius: "999px",
        padding: "3px 10px",
        fontSize: "11px",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      {status}
    </span>
  );
}

export function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [count, setCount] = useState(0);
  const [stats, setStats] = useState<OrderStats | null>(null);

  // Filters & Pagination state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Selected Order for Details View
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderStatusHistory[]>([]);
  const [orderPayment, setOrderPayment] = useState<Payment | null>(null);

  // Form & Action state
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");
  const [notification, setNotification] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  // Load Orders & Stats from API
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        status: statusFilter,
        dateFilter,
        sortOrder,
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();

      setOrders(data.orders || []);
      setCount(data.count || 0);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error("[OrdersDashboard] Error fetching orders:", err);
      setNotification({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to load orders.",
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, dateFilter, sortOrder, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Fetch Order Details
  const openOrderDetails = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsLoading(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (!res.ok) throw new Error("Failed to fetch order details");
      const data = await res.json();

      setSelectedOrder(data.order);
      setOrderHistory(data.history || []);
      setOrderPayment(data.payment || null);
      setNewStatus(data.order.status);
      setAdminNotes(data.order.notes || "");
      setTrackingNumberInput(data.order.tracking_number || "");
      setCarrierInput(data.order.shipping_carrier || "");
      setTrackingUrlInput(data.order.tracking_url || "");
      setStatusNote("");
    } catch (err) {
      console.error("[OrdersDashboard] Error fetching order details:", err);
      setNotification({
        kind: "error",
        message: "Unable to load order details.",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  // Update Status Action
  const handleUpdateStatus = async () => {
    if (!selectedOrderId || !newStatus) return;
    setUpdatingStatus(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          note: statusNote.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update order status");
      }

      const data = await res.json();
      setSelectedOrder(data.order);
      setOrderHistory(data.history || []);
      setOrderPayment(data.payment || null);
      setStatusNote("");
      setNotification({
        kind: "success",
        message: `Order status updated to ${newStatus.toUpperCase()}`,
      });
      fetchOrders();
    } catch (err) {
      console.error("[OrdersDashboard] Status update failed:", err);
      setNotification({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to update status.",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const [fulfillingCj, setFulfillingCj] = useState(false);
  const [syncingTracking, setSyncingTracking] = useState(false);

  // Submit Order to CJ Dropshipping
  const handleFulfillWithCJ = async () => {
    if (!selectedOrderId) return;
    setFulfillingCj(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderId}/fulfill-cj`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fulfillment failed.");

      setSelectedOrder(data.order);
      setNotification({
        kind: "success",
        message: `Order submitted to CJ Dropshipping! CJ Order ID: ${data.cjOrderId}`,
      });
      fetchOrders();
    } catch (err) {
      console.error("[OrdersDashboard] CJ Fulfillment failed:", err);
      setNotification({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to fulfill with CJ Dropshipping.",
      });
    } finally {
      setFulfillingCj(false);
    }
  };

  // Sync Tracking from CJ Dropshipping
  const handleSyncTracking = async () => {
    if (!selectedOrderId) return;
    setSyncingTracking(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderId}/sync-tracking`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tracking sync failed.");

      setSelectedOrder(data.order);
      setNotification({
        kind: "success",
        message: `Tracking info updated from CJ Dropshipping. Status: ${data.trackingInfo?.status || "Synced"}`,
      });
      fetchOrders();
    } catch (err) {
      console.error("[OrdersDashboard] CJ Tracking Sync failed:", err);
      setNotification({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to sync tracking.",
      });
    } finally {
      setSyncingTracking(false);
    }
  };

  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [carrierInput, setCarrierInput] = useState("");
  const [trackingUrlInput, setTrackingUrlInput] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);

  // Manual Tracking Info Update
  const handleSaveManualTracking = async () => {
    if (!selectedOrderId) return;
    setSavingTracking(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_number: trackingNumberInput.trim() || null,
          shipping_carrier: carrierInput.trim() || null,
          tracking_url: trackingUrlInput.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to save tracking information.");
      const data = await res.json();

      setSelectedOrder(data.order);
      setOrderHistory(data.history || []);
      setNotification({
        kind: "success",
        message: "Manual tracking information saved successfully.",
      });
      fetchOrders();
    } catch (err) {
      setNotification({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to save tracking information.",
      });
    } finally {
      setSavingTracking(false);
    }
  };

  // Save Internal Notes Action
  const handleSaveNotes = async () => {
    if (!selectedOrderId) return;
    setUpdatingStatus(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: adminNotes }),
      });

      if (!res.ok) throw new Error("Failed to save notes");
      const data = await res.json();
      setSelectedOrder(data.order);
      setNotification({
        kind: "success",
        message: "Internal admin notes saved.",
      });
    } catch (err) {
      setNotification({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to save notes.",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const totalPages = Math.ceil(count / limit) || 1;

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {/* ── Notification Banner ── */}
      {notification && (
        <div
          className={`notification ${notification.kind}`}
          style={{ marginBottom: "0" }}
        >
          {notification.message}
        </div>
      )}

      {/* ── Statistics Grid ── */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px",
          }}
        >
          <div className="panel" style={{ padding: "18px 20px" }}>
            <p className="eyebrow">Total Revenue</p>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "24px",
                color: "var(--gold)",
                margin: "4px 0 0",
              }}
            >
              {formatPrice(stats.totalRevenue)}
            </h3>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
              Today: {formatPrice(stats.revenueToday)} | Month: {formatPrice(stats.revenueThisMonth)}
            </span>
          </div>

          <div className="panel" style={{ padding: "18px 20px" }}>
            <p className="eyebrow">Total Orders</p>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "24px",
                margin: "4px 0 0",
              }}
            >
              {stats.totalOrders}
            </h3>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
              Pending: {stats.pendingOrders} | Paid: {stats.paidOrders}
            </span>
          </div>

          <div className="panel" style={{ padding: "18px 20px" }}>
            <p className="eyebrow">Fulfillment</p>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "24px",
                color: "#4D96FF",
                margin: "4px 0 0",
              }}
            >
              {stats.processingOrders + stats.shippedOrders}
            </h3>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
              Processing: {stats.processingOrders} | Shipped: {stats.shippedOrders}
            </span>
          </div>

          <div className="panel" style={{ padding: "18px 20px" }}>
            <p className="eyebrow">Completed / Cancelled</p>
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "24px",
                color: "#6BCB77",
                margin: "4px 0 0",
              }}
            >
              {stats.deliveredOrders}
            </h3>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
              Delivered: {stats.deliveredOrders} | Cancelled: {stats.cancelledOrders}
            </span>
          </div>
        </div>
      )}

      {/* ── Toolbar: Search & Filters ── */}
      <div className="panel" style={{ padding: "20px 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            alignItems: "end",
          }}
        >
          {/* Search */}
          <label className="full-width" style={{ gridColumn: "span 2 / span 2" }}>
            Search Orders
            <input
              type="text"
              placeholder="Search by order ID, email, or name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>

          {/* Status Filter */}
          <label>
            Status
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                color: "var(--foreground)",
                padding: "11px 14px",
                fontSize: "14px",
              }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
          </label>

          {/* Date Filter */}
          <label>
            Date
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                color: "var(--foreground)",
                padding: "11px 14px",
                fontSize: "14px",
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">This Month</option>
            </select>
          </label>

          {/* Sort Order */}
          <label>
            Sort By
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as "newest" | "oldest");
                setPage(1);
              }}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                color: "var(--foreground)",
                padding: "11px 14px",
                fontSize: "14px",
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </label>
        </div>
      </div>

      {/* ── Main Layout: Table & Selected Details ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: selectedOrderId ? "1fr 420px" : "1fr",
          gap: "22px",
          alignItems: "start",
        }}
      >
        {/* ── Orders Table Panel ── */}
        <div className="panel">
          <div className="section-heading" style={{ marginBottom: "16px" }}>
            <div>
              <p className="eyebrow">Orders Database</p>
              <h2>{count} Orders Found</h2>
            </div>
          </div>

          {loading ? (
            <p className="status">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="empty-state">No orders match your filter criteria.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--glass-border)",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      fontSize: "10px",
                      letterSpacing: "0.8px",
                    }}
                  >
                    <th style={{ padding: "12px 10px" }}>Order ID</th>
                    <th style={{ padding: "12px 10px" }}>Date</th>
                    <th style={{ padding: "12px 10px" }}>Customer</th>
                    <th style={{ padding: "12px 10px" }}>Status</th>
                    <th style={{ padding: "12px 10px" }}>Total</th>
                    <th style={{ padding: "12px 10px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        background:
                          selectedOrderId === order.id
                            ? "rgba(201, 168, 76, 0.06)"
                            : "transparent",
                      }}
                    >
                      <td style={{ padding: "12px 10px", fontFamily: "monospace", fontSize: "11px" }}>
                        {order.id.slice(0, 8)}...
                      </td>
                      <td style={{ padding: "12px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {formatDate(order.created_at)}
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <div style={{ fontWeight: "600" }}>
                          {order.customer_first_name} {order.customer_last_name}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                          {order.customer_email}
                        </div>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <StatusBadge status={order.status} />
                      </td>
                      <td style={{ padding: "12px 10px", fontWeight: "600", color: "var(--gold)" }}>
                        {formatPrice(order.grand_total)}
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "right" }}>
                        <button
                          className="text-button"
                          onClick={() => openOrderDetails(order.id)}
                          type="button"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "20px",
                paddingTop: "16px",
                borderTop: "1px solid var(--glass-border)",
              }}
            >
              <button
                className="button secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                type="button"
                style={{ padding: "6px 14px", fontSize: "12px" }}
              >
                Previous
              </button>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="button secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                type="button"
                style={{ padding: "6px 14px", fontSize: "12px" }}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* ── Order Details Panel (Side Drawer / Inspector) ── */}
        {selectedOrderId && (
          <div className="panel" style={{ position: "sticky", top: "24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div>
                <p className="eyebrow">Order Inspection</p>
                <h3 style={{ margin: 0, fontSize: "16px", fontFamily: "monospace" }}>
                  {selectedOrderId.slice(0, 13)}...
                </h3>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  setSelectedOrderId(null);
                  setSelectedOrder(null);
                }}
                type="button"
              >
                Close
              </button>
            </div>

            {detailsLoading ? (
              <p className="status">Loading details...</p>
            ) : selectedOrder ? (
              <div style={{ display: "grid", gap: "20px", fontSize: "13px" }}>
                {/* Status Change Selector */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "14px",
                    padding: "14px",
                  }}
                >
                  <label style={{ marginBottom: "8px" }}>Order Status</label>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                      style={{
                        flex: 1,
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "10px",
                        color: "var(--foreground)",
                        padding: "8px 10px",
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                      <option value="failed">Failed</option>
                    </select>
                    <button
                      className="button primary"
                      disabled={updatingStatus || newStatus === selectedOrder.status}
                      onClick={handleUpdateStatus}
                      type="button"
                      style={{ padding: "8px 14px", fontSize: "12px" }}
                    >
                      Update
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Status update note (optional)..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    style={{ width: "100%", fontSize: "12px" }}
                  />
                </div>

                {/* Customer Info */}
                <div>
                  <h4 style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", marginBottom: "6px" }}>
                    Customer Details
                  </h4>
                  <div>
                    <strong>
                      {selectedOrder.customer_first_name} {selectedOrder.customer_last_name}
                    </strong>
                  </div>
                  <div style={{ color: "var(--muted)" }}>{selectedOrder.customer_email}</div>
                  {selectedOrder.customer_phone && (
                    <div style={{ color: "var(--muted)" }}>{selectedOrder.customer_phone}</div>
                  )}
                </div>

                {/* Shipping & Billing Address */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <h4 style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", marginBottom: "6px" }}>
                      Shipping Address
                    </h4>
                    <p style={{ margin: 0, lineHeight: "1.4", color: "var(--foreground-secondary)" }}>
                      {selectedOrder.shipping_address.address_line1}
                      {selectedOrder.shipping_address.address_line2 && `, ${selectedOrder.shipping_address.address_line2}`}
                      <br />
                      {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} {selectedOrder.shipping_address.postal_code}
                      <br />
                      {selectedOrder.shipping_address.country}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", marginBottom: "6px" }}>
                      Billing Address
                    </h4>
                    <p style={{ margin: 0, lineHeight: "1.4", color: "var(--muted)" }}>
                      {selectedOrder.billing_address
                        ? `${selectedOrder.billing_address.address_line1}, ${selectedOrder.billing_address.city}`
                        : "Same as shipping"}
                    </p>
                  </div>
                </div>

                {/* Ordered Items */}
                <div>
                  <h4 style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", marginBottom: "6px" }}>
                    Ordered Products ({selectedOrder.order_items.length})
                  </h4>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {selectedOrder.order_items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          background: "rgba(255, 255, 255, 0.02)",
                          padding: "8px 10px",
                          borderRadius: "10px",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        {item.product_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.product_image}
                            alt=""
                            style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover" }}
                          />
                        ) : (
                          <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "var(--glass-bg-3)" }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.product_title}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                            Qty: {item.quantity} × {formatPrice(item.unit_price)}
                          </div>
                        </div>
                        <div style={{ fontWeight: "600" }}>{formatPrice(item.quantity * item.unit_price)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary */}
                <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "12px", display: "grid", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
                    <span>Subtotal</span>
                    <span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
                    <span>Shipping ({selectedOrder.shipping_method})</span>
                    <span>{formatPrice(selectedOrder.shipping_cost)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
                    <span>Tax</span>
                    <span>{formatPrice(selectedOrder.tax_amount)}</span>
                  </div>
                  {selectedOrder.discount_amount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--success)" }}>
                      <span>Discount ({selectedOrder.coupon_code})</span>
                      <span>−{formatPrice(selectedOrder.discount_amount)}</span>
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: "700",
                      fontSize: "15px",
                      color: "var(--gold)",
                      marginTop: "6px",
                    }}
                  >
                    <span>Grand Total</span>
                    <span>{formatPrice(selectedOrder.grand_total)}</span>
                  </div>
                </div>

                {/* Payment Information */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "12px",
                    padding: "12px",
                  }}
                >
                  <h4 style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", margin: "0 0 6px" }}>
                    Payment Information
                  </h4>
                  <div style={{ display: "grid", gap: "4px", fontSize: "12px" }}>
                    <div>
                      Gateway: <strong>{orderPayment?.gateway || "Stripe"}</strong>
                    </div>
                    <div>
                      Status: <StatusBadge status={orderPayment?.status || "pending"} />
                    </div>
                    {orderPayment?.gateway_payment_id && (
                      <div>
                        Stripe Payment ID:{" "}
                        <code style={{ fontSize: "11px", color: "var(--gold)" }}>
                          {orderPayment.gateway_payment_id}
                        </code>
                      </div>
                    )}
                    {selectedOrder.stripe_session_id && (
                      <div>
                        Stripe Session:{" "}
                        <code style={{ fontSize: "11px", color: "var(--muted)" }}>
                          {selectedOrder.stripe_session_id.slice(0, 16)}...
                        </code>
                      </div>
                    )}
                  </div>
                </div>

                {/* CJ Dropshipping Fulfillment Section */}
                <div
                  style={{
                    background: "rgba(201, 168, 76, 0.04)",
                    border: "1px solid rgba(201, 168, 76, 0.2)",
                    borderRadius: "12px",
                    padding: "12px",
                    display: "grid",
                    gap: "8px",
                  }}
                >
                  <h4 style={{ color: "var(--gold)", fontSize: "11px", textTransform: "uppercase", margin: 0 }}>
                    CJ Dropshipping Fulfillment
                  </h4>
                  <div style={{ fontSize: "12px", display: "grid", gap: "4px" }}>
                    {selectedOrder.cj_order_id ? (
                      <>
                        <div>
                          CJ Order ID: <code style={{ fontSize: "11px", color: "var(--gold)" }}>{selectedOrder.cj_order_id}</code>
                        </div>
                        <div>
                          Fulfillment Status: <strong>{selectedOrder.fulfillment_status || "processing"}</strong>
                        </div>
                        {selectedOrder.tracking_number && (
                          <div>
                            Tracking: <strong>{selectedOrder.shipping_carrier || "Carrier"}</strong> —{" "}
                            <code style={{ fontSize: "11px", color: "var(--gold)" }}>{selectedOrder.tracking_number}</code>
                          </div>
                        )}
                        {selectedOrder.synced_at && (
                          <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                            Last synced: {formatDate(selectedOrder.synced_at)}
                          </div>
                        )}
                        <button
                          className="button secondary"
                          disabled={syncingTracking}
                          onClick={handleSyncTracking}
                          type="button"
                          style={{ padding: "6px 12px", fontSize: "11px", marginTop: "4px" }}
                        >
                          {syncingTracking ? "Syncing Tracking..." : "Sync CJ Tracking"}
                        </button>
                      </>
                    ) : (
                      <>
                        <div style={{ color: "var(--muted)", fontSize: "11px" }}>
                          Not yet submitted to CJ Dropshipping.
                        </div>
                        <button
                          className="button primary"
                          disabled={fulfillingCj || selectedOrder.status === "cancelled" || selectedOrder.status === "failed"}
                          onClick={handleFulfillWithCJ}
                          type="button"
                          style={{ padding: "8px 12px", fontSize: "12px", marginTop: "4px" }}
                        >
                          {fulfillingCj ? "Submitting to CJ..." : "Submit to CJ Dropshipping"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Manual Tracking Override & Edit Section */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "12px",
                    padding: "12px",
                    display: "grid",
                    gap: "8px",
                  }}
                >
                  <h4 style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", margin: 0 }}>
                    Manual Shipment Tracking Override
                  </h4>
                  <div style={{ display: "grid", gap: "6px" }}>
                    <input
                      type="text"
                      placeholder="Carrier (e.g. USPS, CJ Packet, DHL)..."
                      value={carrierInput}
                      onChange={(e) => setCarrierInput(e.target.value)}
                      style={{ fontSize: "12px" }}
                    />
                    <input
                      type="text"
                      placeholder="Tracking Number..."
                      value={trackingNumberInput}
                      onChange={(e) => setTrackingNumberInput(e.target.value)}
                      style={{ fontSize: "12px" }}
                    />
                    <input
                      type="url"
                      placeholder="Tracking URL (optional)..."
                      value={trackingUrlInput}
                      onChange={(e) => setTrackingUrlInput(e.target.value)}
                      style={{ fontSize: "12px" }}
                    />
                    <button
                      className="button secondary"
                      disabled={savingTracking}
                      onClick={handleSaveManualTracking}
                      type="button"
                      style={{ padding: "6px 12px", fontSize: "11px", marginTop: "2px" }}
                    >
                      {savingTracking ? "Saving..." : "Save Manual Tracking"}
                    </button>
                  </div>
                </div>

                {/* Status Timeline History */}
                <div>
                  <h4 style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", marginBottom: "8px" }}>
                    Status Timeline
                  </h4>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {orderHistory.map((h) => (
                      <div
                        key={h.id}
                        style={{
                          fontSize: "11px",
                          borderLeft: "2px solid var(--gold)",
                          paddingLeft: "10px",
                        }}
                      >
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <StatusBadge status={h.new_status} />
                          <span style={{ color: "var(--muted)" }}>by {h.changed_by}</span>
                        </div>
                        {h.note && <div style={{ color: "var(--foreground-secondary)", marginTop: "2px" }}>{h.note}</div>}
                        <div style={{ color: "var(--muted-subtle)", fontSize: "10px" }}>{formatDate(h.created_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Internal Admin Notes */}
                <div>
                  <h4 style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", marginBottom: "6px" }}>
                    Internal Admin Notes
                  </h4>
                  <textarea
                    rows={3}
                    placeholder="Add internal notes about this order..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    style={{ width: "100%", fontSize: "12px", marginBottom: "6px" }}
                  />
                  <button
                    className="button secondary"
                    disabled={updatingStatus}
                    onClick={handleSaveNotes}
                    type="button"
                    style={{ padding: "6px 12px", fontSize: "11px" }}
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Admin System Health Metrics, Growth Analytics & Alerts */}
      <AdminGrowthAnalytics />
      <AdminSystemHealth />
      <AdminNotificationsCenter />
    </div>
  );
}
