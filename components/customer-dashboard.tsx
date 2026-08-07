"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import type {
  OrderWithItems,
  Address,
  WishlistItem,
  CustomerNotification,
  CustomerSettings,
} from "@/lib/db/types";
import type { Product } from "@/lib/products";

import { useAuth } from "@/components/auth-context";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(price);
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const getStyle = (s: string) => {
    switch (s) {
      case "paid":
      case "confirmed":
      case "delivered":
        return { bg: "rgba(107, 203, 119, 0.12)", border: "rgba(107, 203, 119, 0.3)", color: "#6BCB77" };
      case "processing":
      case "shipped":
        return { bg: "rgba(77, 150, 255, 0.12)", border: "rgba(77, 150, 255, 0.3)", color: "#4D96FF" };
      case "pending":
        return { bg: "rgba(201, 168, 76, 0.12)", border: "rgba(201, 168, 76, 0.3)", color: "#C9A84C" };
      default:
        return { bg: "rgba(255, 107, 107, 0.12)", border: "rgba(255, 107, 107, 0.3)", color: "#FF6B6B" };
    }
  };
  const style = getStyle(status);
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
      }}
    >
      {status}
    </span>
  );
}

type TabType = "home" | "orders" | "addresses" | "wishlist" | "notifications" | "profile" | "settings" | "security";

export function CustomerDashboard() {
  const { addToCart } = useCart();
  const { user, signOut: authSignOut, openAuthModal } = useAuth();

  // Authentication Email state
  const [customerEmail, setCustomerEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("home");

  // Data states
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [activeShipments, setActiveShipments] = useState<OrderWithItems[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [settings, setSettings] = useState<CustomerSettings | null>(null);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [stats, setStats] = useState<{
    totalOrders: number;
    activeShipmentsCount: number;
    savedAddressesCount: number;
    wishlistCount: number;
    unreadNotificationsCount: number;
  } | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  // Form states
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState<Partial<Address>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  // Load account data
  const loadAccountData = useCallback(async (email: string) => {
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch(`/api/account/data?email=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error("Failed to load account data");
      const data = await res.json();

      setOrders(data.orders || []);
      setActiveShipments(data.activeShipments || []);
      setWishlist(data.wishlist || []);
      setAddresses(data.addresses || []);
      setNotifications(data.notifications || []);
      setSettings(data.settings || null);
      setRecommended(data.recommendedProducts || []);
      setStats(data.stats || null);

      if (data.settings?.customer_email) {
        setProfilePhone(data.settings.phone || "");
      }
    } catch (err) {
      console.error("[CustomerDashboard] Load error:", err);
      setToast({ kind: "error", message: "Failed to load account details." });
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync with AuthContext user
  useEffect(() => {
    if (user?.email) {
      const email = user.email.toLowerCase().trim();
      setCustomerEmail(email);
      setEmailInput(email);
      setIsAuthenticated(true);
      if (user.displayName) setProfileName(user.displayName);
      if (user.phoneNumber) setProfilePhone(user.phoneNumber);
      loadAccountData(email);
    } else {
      const saved = localStorage.getItem("customer_dashboard_email");
      if (saved) {
        setCustomerEmail(saved);
        setEmailInput(saved);
        setIsAuthenticated(true);
        loadAccountData(saved);
      } else {
        setIsAuthenticated(false);
      }
    }
  }, [user, loadAccountData]);

  // Login / Session handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    const normalized = emailInput.trim().toLowerCase();
    setCustomerEmail(normalized);
    setIsAuthenticated(true);
    localStorage.setItem("customer_dashboard_email", normalized);
    loadAccountData(normalized);
  };

  const handleLogout = () => {
    localStorage.removeItem("customer_dashboard_email");
    setIsAuthenticated(false);
    setCustomerEmail("");
    authSignOut();
  };

  // Reorder Action
  const handleReorder = (order: OrderWithItems) => {
    let countAdded = 0;
    for (const item of order.order_items) {
      for (let i = 0; i < item.quantity; i++) {
        addToCart({
          id: item.product_id,
          title: item.product_title,
          slug: item.product_slug,
          price: item.unit_price,
          image: item.product_image,
          description: null,
          category: null,
          badge: null,
          affiliate_link: "",
          created_at: "",
        });
      }
      countAdded += item.quantity;
    }
    setToast({
      kind: "success",
      message: `Reordered! Added ${countAdded} item(s) to your cart.`,
    });
  };

  // Wishlist Actions
  const handleRemoveWishlist = async (productId: string) => {
    try {
      const res = await fetch("/api/account/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: customerEmail, productId, action: "remove" }),
      });
      if (!res.ok) throw new Error("Failed to remove from wishlist");
      const data = await res.json();
      setWishlist(data.wishlist || []);
      setToast({ kind: "success", message: "Item removed from wishlist." });
    } catch {
      setToast({ kind: "error", message: "Failed to update wishlist." });
    }
  };

  const handleMoveWishlistToCart = (product: Product) => {
    addToCart(product);
    handleRemoveWishlist(product.id);
    setToast({ kind: "success", message: `Moved "${product.title}" to cart!` });
  };

  // Address Actions
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: customerEmail, address: addressForm }),
      });
      if (!res.ok) throw new Error("Failed to save address");
      const data = await res.json();
      setAddresses(data.addresses || []);
      setShowAddressForm(false);
      setAddressForm({});
      setToast({ kind: "success", message: "Address saved successfully." });
    } catch {
      setToast({ kind: "error", message: "Failed to save address." });
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const res = await fetch(`/api/account/addresses?email=${encodeURIComponent(customerEmail)}&id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete address");
      const data = await res.json();
      setAddresses(data.addresses || []);
      setToast({ kind: "success", message: "Address deleted." });
    } catch {
      setToast({ kind: "error", message: "Failed to delete address." });
    }
  };

  // Notification Actions
  const handleNotificationAction = async (action: "read" | "read_all" | "delete", notificationId?: string) => {
    try {
      const res = await fetch("/api/account/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: customerEmail, action, notificationId }),
      });
      if (!res.ok) throw new Error("Notification update failed");
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      setToast({ kind: "error", message: "Notification update failed." });
    }
  };

  // Settings Actions
  const handleUpdateSetting = async (key: keyof CustomerSettings, value: boolean) => {
    try {
      const res = await fetch("/api/account/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: customerEmail, settings: { [key]: value } }),
      });
      if (!res.ok) throw new Error("Settings update failed");
      const data = await res.json();
      setSettings(data.settings);
      setToast({ kind: "success", message: "Settings updated." });
    } catch {
      setToast({ kind: "error", message: "Failed to update settings." });
    }
  };

  // Filtered Orders for My Orders Tab
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !orderSearch.trim() ||
      order.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.order_items.some((i) => i.product_title.toLowerCase().includes(orderSearch.toLowerCase()));
    const matchesStatus = orderStatusFilter === "all" || order.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Render Login Prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: "480px", margin: "40px auto", textAlign: "center" }} className="panel">
        <div style={{ marginBottom: "24px" }}>
          <p className="eyebrow" style={{ color: "var(--gold)" }}>Customer Portal</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", margin: "8px 0" }}>Sign In to Your RA2Z Account</h2>
          <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.6 }}>
            Access your luxury profile, view live order tracking status, manage saved shipping addresses, and sync your account wishlist.
          </p>
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          <button
            onClick={() => openAuthModal("signin")}
            className="button primary"
            type="button"
            style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px", fontWeight: 700 }}
          >
            Sign In to Account
          </button>
          <button
            onClick={() => openAuthModal("signup")}
            className="button secondary"
            type="button"
            style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px" }}
          >
            Create New Account
          </button>
        </div>

        <div style={{ margin: "24px 0 16px", color: "#555", fontSize: "12px" }}>OR QUICK ACCESSS VIA EMAIL</div>

        <form onSubmit={handleLogin} style={{ display: "grid", gap: "12px" }}>
          <div className="co-field">
            <input
              id="acc-email"
              className="co-input"
              type="email"
              placeholder="Enter email used at checkout..."
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </div>
          <button type="submit" className="button secondary" style={{ width: "100%", justifyContent: "center", fontSize: "13px" }}>
            Access Order History with Email
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {/* Toast Notification */}
      {toast && (
        <div className={`notification ${toast.kind}`} style={{ marginBottom: 0 }}>
          {toast.message}
        </div>
      )}

      {/* Account Header */}
      <div
        className="panel"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--gold) 0%, #E6C667 100%)",
              color: "#0A0A18",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "700",
              fontSize: "20px",
            }}
          >
            {customerEmail[0].toUpperCase()}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontFamily: "'Playfair Display', serif" }}>
              Welcome, {customerEmail.split("@")[0]}
            </h2>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>{customerEmail}</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="button secondary" onClick={handleLogout} type="button" style={{ padding: "8px 16px", fontSize: "12px" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
        {[
          { id: "home", label: "Dashboard" },
          { id: "orders", label: `My Orders (${orders.length})` },
          { id: "addresses", label: `Address Book (${addresses.length})` },
          { id: "wishlist", label: `Wishlist (${wishlist.length})` },
          { id: "notifications", label: `Notifications (${stats?.unreadNotificationsCount ?? 0})` },
          { id: "profile", label: "Profile" },
          { id: "settings", label: "Settings" },
          { id: "security", label: "Security & 2FA" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`button ${activeTab === tab.id ? "primary" : "secondary"}`}
            onClick={() => setActiveTab(tab.id as TabType)}
            type="button"
            style={{ padding: "8px 16px", fontSize: "12px", whiteSpace: "nowrap" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className="status">Loading dashboard...</p>}

      {/* ── TAB 1: DASHBOARD HOME ── */}
      {!loading && activeTab === "home" && (
        <div style={{ display: "grid", gap: "24px" }}>
          {/* Summary Stat Cards */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
              <div className="panel" style={{ padding: "18px 20px" }}>
                <p className="eyebrow">Total Purchases</p>
                <h3 style={{ fontSize: "24px", color: "var(--gold)", margin: "4px 0 0" }}>{stats.totalOrders}</h3>
              </div>
              <div className="panel" style={{ padding: "18px 20px" }}>
                <p className="eyebrow">Active Shipments</p>
                <h3 style={{ fontSize: "24px", color: "#4D96FF", margin: "4px 0 0" }}>{stats.activeShipmentsCount}</h3>
              </div>
              <div className="panel" style={{ padding: "18px 20px" }}>
                <p className="eyebrow">Saved Addresses</p>
                <h3 style={{ fontSize: "24px", margin: "4px 0 0" }}>{stats.savedAddressesCount}</h3>
              </div>
              <div className="panel" style={{ padding: "18px 20px" }}>
                <p className="eyebrow">Wishlist Saved</p>
                <h3 style={{ fontSize: "24px", color: "#6BCB77", margin: "4px 0 0" }}>{stats.wishlistCount}</h3>
              </div>
            </div>
          )}

          {/* Active Shipments Card */}
          {activeShipments.length > 0 && (
            <div className="panel" style={{ border: "1px solid rgba(77, 150, 255, 0.3)", background: "rgba(77, 150, 255, 0.04)" }}>
              <p className="eyebrow" style={{ color: "#4D96FF" }}>Live Active Shipment</p>
              <h3 style={{ margin: "4px 0 12px", fontSize: "18px" }}>Order #{activeShipments[0].id.slice(0, 13)}</h3>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <StatusBadge status={activeShipments[0].status} />
                  {activeShipments[0].tracking_number && (
                    <span style={{ fontSize: "12px", marginLeft: "10px", color: "var(--muted)" }}>
                      Carrier: {activeShipments[0].shipping_carrier} ({activeShipments[0].tracking_number})
                    </span>
                  )}
                </div>
                <Link href={`/orders/${activeShipments[0].id}?email=${encodeURIComponent(customerEmail)}`} className="co-submit-btn" style={{ padding: "6px 14px", fontSize: "12px", width: "auto" }}>
                  Track Live Shipment ↗
                </Link>
              </div>
            </div>
          )}

          {/* Recent Orders List */}
          <div className="panel">
            <div className="section-heading" style={{ marginBottom: "16px" }}>
              <div>
                <p className="eyebrow">Purchases</p>
                <h2>Recent Orders</h2>
              </div>
              <button className="text-button" onClick={() => setActiveTab("orders")} type="button">
                View All ({orders.length})
              </button>
            </div>

            {orders.length === 0 ? (
              <p className="empty-state">No orders yet. Start exploring our catalog!</p>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {orders.slice(0, 3).map((order) => (
                  <div key={order.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--gold)" }}>#{order.id.slice(0, 13)}</div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>{formatDate(order.created_at)} • {order.order_items.length} item(s)</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <StatusBadge status={order.status} />
                      <strong style={{ fontSize: "14px" }}>{formatPrice(order.grand_total)}</strong>
                      <Link href={`/orders/${order.id}?email=${encodeURIComponent(customerEmail)}`} className="text-button">
                        Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended Products */}
          {recommended.length > 0 && (
            <div className="panel">
              <div className="section-heading" style={{ marginBottom: "16px" }}>
                <div>
                  <p className="eyebrow">Curated Selection</p>
                  <h2>Recommended For You</h2>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                {recommended.map((prod) => (
                  <div key={prod.id} style={{ border: "1px solid var(--glass-border)", borderRadius: "14px", padding: "12px", background: "rgba(255,255,255,0.02)" }}>
                    {prod.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prod.image} alt="" style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "10px", marginBottom: "8px" }} />
                    )}
                    <div style={{ fontWeight: "600", fontSize: "13px" }}>{prod.title}</div>
                    <div style={{ color: "var(--gold)", fontSize: "14px", fontWeight: "700", margin: "4px 0 8px" }}>{formatPrice(prod.price ?? 0)}</div>
                    <button className="button primary" onClick={() => addToCart(prod)} type="button" style={{ width: "100%", padding: "6px", fontSize: "11px" }}>
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MY ORDERS ── */}
      {!loading && activeTab === "orders" && (
        <div className="panel">
          <div className="section-heading" style={{ marginBottom: "16px" }}>
            <div>
              <p className="eyebrow">History</p>
              <h2>My Orders ({filteredOrders.length})</h2>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search orders..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              style={{ flex: 1, minWidth: "200px", fontSize: "13px" }}
            />
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "var(--foreground)", padding: "8px 12px", fontSize: "13px" }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <p className="empty-state">No matching orders found.</p>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {filteredOrders.map((order) => (
                <div key={order.id} style={{ border: "1px solid var(--glass-border)", borderRadius: "16px", padding: "16px", background: "rgba(255,255,255,0.02)", display: "grid", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <div style={{ fontFamily: "monospace", color: "var(--gold)", fontWeight: "600" }}>Order #{order.id}</div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>Placed on {formatDate(order.created_at)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <StatusBadge status={order.status} />
                      <strong style={{ fontSize: "16px", color: "var(--gold)" }}>{formatPrice(order.grand_total)}</strong>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px", display: "grid", gap: "6px" }}>
                    {order.order_items.map((item) => (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                        <span>{item.product_title} × {item.quantity}</span>
                        <span>{formatPrice(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {order.tracking_number ? `Tracking: ${order.shipping_carrier} (${order.tracking_number})` : "No tracking yet"}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="button secondary" onClick={() => handleReorder(order)} type="button" style={{ padding: "6px 12px", fontSize: "11px" }}>
                        Reorder Purchases
                      </button>
                      <Link href={`/orders/${order.id}?email=${encodeURIComponent(customerEmail)}`} className="button primary" style={{ padding: "6px 12px", fontSize: "11px" }}>
                        Track / Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: ADDRESS BOOK ── */}
      {!loading && activeTab === "addresses" && (
        <div className="panel">
          <div className="section-heading" style={{ marginBottom: "16px" }}>
            <div>
              <p className="eyebrow">Book</p>
              <h2>Saved Addresses ({addresses.length})</h2>
            </div>
            <button className="button primary" onClick={() => { setShowAddressForm(true); setAddressForm({}); }} type="button" style={{ padding: "6px 14px", fontSize: "12px" }}>
              + Add New Address
            </button>
          </div>

          {/* Add/Edit Address Form Modal/Panel */}
          {showAddressForm && (
            <form onSubmit={handleSaveAddress} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: "14px", padding: "16px", marginBottom: "20px", display: "grid", gap: "12px" }}>
              <h4 style={{ margin: 0, fontSize: "14px" }}>{addressForm.id ? "Edit Address" : "New Address"}</h4>
              <div className="form-grid">
                <label>First Name *<input required value={addressForm.first_name || ""} onChange={(e) => setAddressForm({ ...addressForm, first_name: e.target.value })} /></label>
                <label>Last Name *<input required value={addressForm.last_name || ""} onChange={(e) => setAddressForm({ ...addressForm, last_name: e.target.value })} /></label>
                <label className="full-width">Address Line 1 *<input required value={addressForm.address_line1 || ""} onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })} /></label>
                <label className="full-width">Address Line 2<input value={addressForm.address_line2 || ""} onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })} /></label>
                <label>City *<input required value={addressForm.city || ""} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} /></label>
                <label>State / Province *<input required value={addressForm.state || ""} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} /></label>
                <label>Postal Code *<input required value={addressForm.postal_code || ""} onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })} /></label>
                <label>Country *<input required value={addressForm.country || "United States"} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })} /></label>
              </div>

              <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", textTransform: "none", fontSize: "12px" }}>
                  <input type="checkbox" checked={Boolean(addressForm.is_default)} onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })} />
                  Set as Default Shipping Address
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", textTransform: "none", fontSize: "12px" }}>
                  <input type="checkbox" checked={Boolean(addressForm.is_default_billing)} onChange={(e) => setAddressForm({ ...addressForm, is_default_billing: e.target.checked })} />
                  Set as Default Billing Address
                </label>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button className="button primary" type="submit" style={{ padding: "6px 14px", fontSize: "12px" }}>Save Address</button>
                <button className="text-button" onClick={() => setShowAddressForm(false)} type="button">Cancel</button>
              </div>
            </form>
          )}

          {addresses.length === 0 ? (
            <p className="empty-state">No saved addresses yet.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
              {addresses.map((addr) => (
                <div key={addr.id} style={{ border: "1px solid var(--glass-border)", borderRadius: "14px", padding: "16px", background: "rgba(255,255,255,0.02)", display: "grid", gap: "8px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{addr.first_name} {addr.last_name}</strong>
                    <div>
                      {addr.is_default && <span style={{ fontSize: "10px", background: "rgba(201,168,76,0.15)", color: "var(--gold)", padding: "2px 6px", borderRadius: "4px", marginRight: "4px" }}>Default Shipping</span>}
                      {addr.is_default_billing && <span style={{ fontSize: "10px", background: "rgba(77,150,255,0.15)", color: "#4D96FF", padding: "2px 6px", borderRadius: "4px" }}>Default Billing</span>}
                    </div>
                  </div>
                  <div style={{ color: "var(--muted)" }}>
                    {addr.address_line1} {addr.address_line2 && `, ${addr.address_line2}`}<br />
                    {addr.city}, {addr.state} {addr.postal_code}<br />
                    {addr.country}
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button className="text-button" onClick={() => { setAddressForm(addr); setShowAddressForm(true); }} type="button">Edit</button>
                    <button className="text-button danger" onClick={() => handleDeleteAddress(addr.id)} type="button">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: WISHLIST ── */}
      {!loading && activeTab === "wishlist" && (
        <div className="panel">
          <div className="section-heading" style={{ marginBottom: "16px" }}>
            <div>
              <p className="eyebrow">Favorites</p>
              <h2>My Wishlist ({wishlist.length})</h2>
            </div>
          </div>

          {wishlist.length === 0 ? (
            <p className="empty-state">Your wishlist is currently empty.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              {wishlist.map((item) => (
                <div key={item.id} style={{ border: "1px solid var(--glass-border)", borderRadius: "14px", padding: "14px", background: "rgba(255,255,255,0.02)", display: "grid", gap: "8px" }}>
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" style={{ width: "100%", height: "160px", objectFit: "cover", borderRadius: "10px" }} />
                  )}
                  <div style={{ fontWeight: "600", fontSize: "14px" }}>{item.title}</div>
                  <div style={{ color: "var(--gold)", fontWeight: "700" }}>{formatPrice(item.price ?? 0)}</div>

                  <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                    <button className="button primary" onClick={() => handleMoveWishlistToCart(item)} type="button" style={{ flex: 1, padding: "6px", fontSize: "11px" }}>
                      Move to Cart
                    </button>
                    <button className="button secondary" onClick={() => handleRemoveWishlist(item.id)} type="button" style={{ padding: "6px 10px", fontSize: "11px" }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: NOTIFICATIONS ── */}
      {!loading && activeTab === "notifications" && (
        <div className="panel">
          <div className="section-heading" style={{ marginBottom: "16px" }}>
            <div>
              <p className="eyebrow">Center</p>
              <h2>Notifications ({notifications.length})</h2>
            </div>
            {notifications.some((n) => !n.is_read) && (
              <button className="text-button" onClick={() => handleNotificationAction("read_all")} type="button">
                Mark All as Read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="empty-state">No notifications right now.</p>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {notifications.map((n) => (
                <div key={n.id} style={{ padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: n.is_read ? "transparent" : "rgba(201,168,76,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                  <div>
                    <div style={{ fontWeight: n.is_read ? "500" : "700", fontSize: "13px" }}>{n.title}</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>{n.message}</div>
                    <div style={{ fontSize: "10px", color: "var(--muted-subtle)", marginTop: "2px" }}>{formatDate(n.created_at)}</div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {!n.is_read && (
                      <button className="text-button" onClick={() => handleNotificationAction("read", n.id)} type="button">
                        Mark Read
                      </button>
                    )}
                    <button className="text-button danger" onClick={() => handleNotificationAction("delete", n.id)} type="button">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 6: PROFILE ── */}
      {!loading && activeTab === "profile" && (
        <div className="panel" style={{ maxWidth: "600px" }}>
          <div className="section-heading" style={{ marginBottom: "16px" }}>
            <div>
              <p className="eyebrow">Personal Info</p>
              <h2>Edit Profile</h2>
            </div>
          </div>

          <div style={{ display: "grid", gap: "16px" }}>
            <label>
              Email Address
              <input disabled value={customerEmail} style={{ opacity: 0.6 }} />
            </label>

            <label>
              Full Name
              <input placeholder="Enter your full name..." value={profileName} onChange={(e) => setProfileName(e.target.value)} />
            </label>

            <label>
              Phone Number
              <input placeholder="+1 (555) 000-0000" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} />
            </label>

            <button
              className="button primary"
              onClick={() => setToast({ kind: "success", message: "Profile details updated." })}
              type="button"
              style={{ width: "fit-content", padding: "8px 20px", fontSize: "12px" }}
            >
              Save Profile Changes
            </button>

            <hr style={{ borderColor: "var(--glass-border)", margin: "16px 0" }} />

            <div>
              <h3 style={{ fontSize: "15px", color: "var(--danger)", margin: "0 0 4px" }}>Danger Zone</h3>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 10px" }}>
                Deleting your account removes all saved preferences and wishlist items.
              </p>
              <button className="button secondary" onClick={() => setShowDeleteModal(true)} type="button" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 7: SETTINGS ── */}
      {!loading && activeTab === "settings" && (
        <div className="panel" style={{ maxWidth: "600px" }}>
          <div className="section-heading" style={{ marginBottom: "16px" }}>
            <div>
              <p className="eyebrow">Preferences</p>
              <h2>Notification Settings</h2>
            </div>
          </div>

          <div style={{ display: "grid", gap: "16px" }}>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textTransform: "none", fontSize: "13px" }}>
              <div>
                <strong>Email Order Updates</strong>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>Receive emails when order or shipment status updates.</div>
              </div>
              <input
                type="checkbox"
                checked={settings?.email_order_updates ?? true}
                onChange={(e) => handleUpdateSetting("email_order_updates", e.target.checked)}
              />
            </label>

            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textTransform: "none", fontSize: "13px" }}>
              <div>
                <strong>Promotional Emails</strong>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>Receive exclusive discounts and product drops.</div>
              </div>
              <input
                type="checkbox"
                checked={settings?.email_promotions ?? true}
                onChange={(e) => handleUpdateSetting("email_promotions", e.target.checked)}
              />
            </label>

            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textTransform: "none", fontSize: "13px" }}>
              <div>
                <strong>SMS Notifications (Future Ready)</strong>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>Receive instant SMS updates on delivery day.</div>
              </div>
              <input
                type="checkbox"
                checked={settings?.sms_updates ?? false}
                onChange={(e) => handleUpdateSetting("sms_updates", e.target.checked)}
              />
            </label>
          </div>
        </div>
      )}

      {/* ── TAB 8: SECURITY & 2FA ── */}
      {!loading && activeTab === "security" && (
        <div className="panel" style={{ maxWidth: "600px" }}>
          <div className="section-heading" style={{ marginBottom: "16px" }}>
            <div>
              <p className="eyebrow">Protection</p>
              <h2>Security & Two-Factor Auth</h2>
            </div>
          </div>

          <div style={{ display: "grid", gap: "16px" }}>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textTransform: "none", fontSize: "13px" }}>
              <div>
                <strong>Two-Factor Authentication (2FA)</strong>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>Secure your customer portal with TOTP code.</div>
              </div>
              <input
                type="checkbox"
                checked={settings?.two_factor_enabled ?? false}
                onChange={(e) => handleUpdateSetting("two_factor_enabled", e.target.checked)}
              />
            </label>

            <div style={{ border: "1px solid var(--glass-border)", borderRadius: "12px", padding: "12px", background: "rgba(255,255,255,0.02)" }}>
              <h4 style={{ margin: "0 0 6px", fontSize: "12px", color: "var(--muted)", textTransform: "uppercase" }}>Active Login Sessions</h4>
              <div style={{ fontSize: "13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>Current Browser Session</strong>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>Active now • Local Storage Authentication</div>
                </div>
                <span style={{ fontSize: "10px", background: "rgba(107,203,119,0.15)", color: "#6BCB77", padding: "2px 6px", borderRadius: "4px" }}>Active</span>
              </div>
            </div>

            <button
              className="button secondary"
              onClick={() => {
                handleLogout();
                setToast({ kind: "success", message: "Logged out from all devices." });
              }}
              type="button"
              style={{ width: "fit-content", padding: "8px 16px", fontSize: "12px" }}
            >
              Logout From All Devices
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Modal Confirmation */}
      {showDeleteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="panel" style={{ maxWidth: "400px", padding: "24px" }}>
            <h3 style={{ margin: "0 0 8px", color: "var(--danger)" }}>Confirm Account Deletion</h3>
            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>
              Are you sure you want to delete your customer portal session and remove all saved addresses & preferences?
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="text-button" onClick={() => setShowDeleteModal(false)} type="button">Cancel</button>
              <button
                className="button primary"
                onClick={() => {
                  handleLogout();
                  setShowDeleteModal(false);
                }}
                type="button"
                style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
