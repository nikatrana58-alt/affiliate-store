"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import type { CartItem } from "@/lib/cart";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(price);
}

// ─── Shipping Methods ─────────────────────────────────────────────────────────

const SHIPPING_METHODS = [
  {
    id: "standard",
    label: "Standard Shipping",
    eta: "5–8 business days",
    price: 0,
    badge: null,
  },
  {
    id: "express",
    label: "Express Shipping",
    eta: "2–3 business days",
    price: 12.99,
    badge: "Popular",
  },
  {
    id: "overnight",
    label: "Overnight Delivery",
    eta: "Next business day",
    price: 29.99,
    badge: null,
  },
] as const;

type ShippingMethodId = (typeof SHIPPING_METHODS)[number]["id"];

// ─── Order Summary Item ───────────────────────────────────────────────────────

function OrderItem({ item }: { item: CartItem }) {
  const { product, quantity } = item;
  return (
    <div className="co-order-item">
      <div className="co-order-item-img">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.title} />
        ) : (
          <div className="co-order-item-img-placeholder" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
        )}
        <span className="co-order-item-qty">{quantity}</span>
      </div>
      <div className="co-order-item-info">
        <p className="co-order-item-title">{product.title}</p>
        {product.category && <p className="co-order-item-cat">{product.category}</p>}
      </div>
      <p className="co-order-item-price">
        {product.price !== null ? formatPrice(product.price * quantity) : "—"}
      </p>
    </div>
  );
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="co-section">
      <h2 className="co-section-title">{title}</h2>
      {children}
    </section>
  );
}

// ─── Field Components ─────────────────────────────────────────────────────────

function Field({
  label,
  id,
  required,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="co-field">
      <label className="co-label" htmlFor={id}>
        {label}
        {required && <span className="co-required" aria-hidden="true"> *</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Empty Checkout State ─────────────────────────────────────────────────────

function EmptyCheckout() {
  return (
    <div className="co-empty">
      <div className="co-empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" width="52" height="52">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>
      <h2 className="co-empty-title">Your cart is empty</h2>
      <p className="co-empty-subtitle">Add some items before checking out.</p>
      <Link href="/#products" className="co-empty-cta">
        Browse Collection
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

// ─── Success State ────────────────────────────────────────────────────────────

function OrderSuccess({ orderRef }: { orderRef: string }) {
  return (
    <div className="co-success">
      <div className="co-success-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="40" height="40">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
      </div>
      <h2 className="co-success-title">Order Received!</h2>
      <p className="co-success-ref">Reference: <strong>{orderRef}</strong></p>
      <p className="co-success-note">
        Thank you for your purchase. We&apos;ll send you a confirmation email shortly.
        As an affiliate store, your order will be fulfilled by the respective merchant.
      </p>
      <Link href="/" className="co-empty-cta" style={{ marginTop: "8px" }}>
        Back to Home
      </Link>
    </div>
  );
}

// ─── Main Checkout Form ───────────────────────────────────────────────────────

export function CheckoutForm() {
  const { items, cartTotal, clearCart } = useCart();
  const router = useRouter();
  const uid = useId();

  // Shipping method
  const [shippingMethod, setShippingMethod] = useState<ShippingMethodId>("standard");

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderRef, setOrderRef] = useState("");
  const [orderError, setOrderError] = useState("");

  // Order review step
  const [step, setStep] = useState<"form" | "review">("form");

  // Contact fields
  const [contact, setContact] = useState({ email: "", phone: "" });

  // Shipping fields
  const [shipping, setShipping] = useState({
    firstName: "",
    lastName: "",
    address: "",
    apartment: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
  });

  if (items.length === 0 && !orderSuccess) return <EmptyCheckout />;
  if (orderSuccess) return <OrderSuccess orderRef={orderRef} />;

  // Computed totals
  const selectedShipping = SHIPPING_METHODS.find((m) => m.id === shippingMethod)!;
  const shippingCost = selectedShipping.price;
  const TAX_RATE = 0.08; // 8% placeholder
  const taxAmount = cartTotal * TAX_RATE;
  const discount = couponApplied ? cartTotal * 0.1 : 0; // 10% placeholder discount
  const grandTotal = cartTotal + shippingCost + taxAmount - discount;

  // Handle coupon apply
  function handleApplyCoupon() {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code.");
      return;
    }
    // UI-only placeholder — always shows "invalid" unless specific demo code
    if (couponCode.toUpperCase() === "CURATED10") {
      setCouponApplied(true);
      setCouponError("");
    } else {
      setCouponApplied(false);
      setCouponError("Invalid coupon code. Try CURATED10 for 10% off.");
    }
  }

  function handleRemoveCoupon() {
    setCouponApplied(false);
    setCouponCode("");
    setCouponError("");
  }

  // Move to review step
  function handleProceedToReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Place order — calls POST /api/orders
  async function handlePlaceOrder() {
    setSubmitting(true);
    setOrderError("");

    try {
      const payload = {
        customer_email: contact.email.trim(),
        customer_first_name: shipping.firstName.trim(),
        customer_last_name: shipping.lastName.trim(),
        customer_phone: contact.phone.trim() || undefined,
        shipping_method: shippingMethod,
        coupon_code: couponApplied ? couponCode.trim() : undefined,
        shipping_address: {
          first_name: shipping.firstName.trim(),
          last_name: shipping.lastName.trim(),
          address_line1: shipping.address.trim(),
          address_line2: shipping.apartment.trim() || null,
          city: shipping.city.trim(),
          state: shipping.state.trim(),
          postal_code: shipping.zip.trim(),
          country: shipping.country,
          phone: contact.phone.trim() || null,
        },
        items: items.map((item) => ({
          product_id: item.product.id,
          product_title: item.product.title,
          product_image: item.product.image ?? null,
          product_slug: item.product.slug,
          quantity: item.quantity,
          unit_price: item.product.price ?? 0,
        })),
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg =
          data?.errors?.[0]?.message ||
          data?.error ||
          "Failed to place order. Please try again.";
        setOrderError(msg);
        setSubmitting(false);
        return;
      }

      // Order created successfully — now initiate Stripe Checkout Session
      const orderId = data.order.id;

      const stripeSessionRes = await fetch("/api/stripe/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const stripeData = await stripeSessionRes.json();

      if (!stripeSessionRes.ok || !stripeData.url) {
        setOrderError(
          stripeData?.error || "Failed to initiate payment. Please try again."
        );
        setSubmitting(false);
        return;
      }

      // Redirect to Stripe Hosted Checkout
      window.location.href = stripeData.url;
    } catch {
      setOrderError("Network error. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="co-layout">
      {/* ── Left Column ── */}
      <div className="co-left">
        {/* Breadcrumb */}
        <nav className="co-breadcrumb" aria-label="Checkout steps">
          <Link href="/" className="co-breadcrumb-link">Cart</Link>
          <span className="co-breadcrumb-sep" aria-hidden="true">›</span>
          <span className={step === "form" ? "co-breadcrumb-active" : "co-breadcrumb-link"} style={{ cursor: step === "review" ? "pointer" : "default" }} onClick={() => step === "review" && setStep("form")}>
            Information
          </span>
          <span className="co-breadcrumb-sep" aria-hidden="true">›</span>
          <span className={step === "review" ? "co-breadcrumb-active" : "co-breadcrumb-inactive"}>
            Review & Pay
          </span>
        </nav>

        {step === "form" ? (
          <form id="checkout-form" onSubmit={handleProceedToReview} noValidate>
            {/* Contact Information */}
            <Section title="Contact Information">
              <div className="co-fields-grid co-fields-grid--full">
                <Field label="Email address" id={`${uid}-email`} required>
                  <input
                    id={`${uid}-email`}
                    className="co-input"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    value={contact.email}
                    onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                  />
                </Field>
                <Field label="Phone number" id={`${uid}-phone`}>
                  <input
                    id={`${uid}-phone`}
                    className="co-input"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+1 (555) 000-0000"
                    value={contact.phone}
                    onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                  />
                </Field>
              </div>
            </Section>

            {/* Shipping Information */}
            <Section title="Shipping Address">
              <div className="co-fields-grid">
                <Field label="First name" id={`${uid}-fname`} required>
                  <input
                    id={`${uid}-fname`}
                    className="co-input"
                    type="text"
                    autoComplete="given-name"
                    placeholder="Jane"
                    required
                    value={shipping.firstName}
                    onChange={(e) => setShipping((s) => ({ ...s, firstName: e.target.value }))}
                  />
                </Field>
                <Field label="Last name" id={`${uid}-lname`} required>
                  <input
                    id={`${uid}-lname`}
                    className="co-input"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Smith"
                    required
                    value={shipping.lastName}
                    onChange={(e) => setShipping((s) => ({ ...s, lastName: e.target.value }))}
                  />
                </Field>
              </div>

              <div className="co-fields-grid co-fields-grid--full">
                <Field label="Address" id={`${uid}-address`} required>
                  <input
                    id={`${uid}-address`}
                    className="co-input"
                    type="text"
                    autoComplete="street-address"
                    placeholder="123 Luxury Lane"
                    required
                    value={shipping.address}
                    onChange={(e) => setShipping((s) => ({ ...s, address: e.target.value }))}
                  />
                </Field>
                <Field label="Apartment, suite, etc." id={`${uid}-apt`}>
                  <input
                    id={`${uid}-apt`}
                    className="co-input"
                    type="text"
                    autoComplete="address-line2"
                    placeholder="Apt 4B (optional)"
                    value={shipping.apartment}
                    onChange={(e) => setShipping((s) => ({ ...s, apartment: e.target.value }))}
                  />
                </Field>
              </div>

              <div className="co-fields-grid co-fields-grid--3">
                <Field label="City" id={`${uid}-city`} required>
                  <input
                    id={`${uid}-city`}
                    className="co-input"
                    type="text"
                    autoComplete="address-level2"
                    placeholder="New York"
                    required
                    value={shipping.city}
                    onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                  />
                </Field>
                <Field label="State / Province" id={`${uid}-state`} required>
                  <input
                    id={`${uid}-state`}
                    className="co-input"
                    type="text"
                    autoComplete="address-level1"
                    placeholder="NY"
                    required
                    value={shipping.state}
                    onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))}
                  />
                </Field>
                <Field label="ZIP / Postal code" id={`${uid}-zip`} required>
                  <input
                    id={`${uid}-zip`}
                    className="co-input"
                    type="text"
                    autoComplete="postal-code"
                    placeholder="10001"
                    required
                    value={shipping.zip}
                    onChange={(e) => setShipping((s) => ({ ...s, zip: e.target.value }))}
                  />
                </Field>
              </div>

              <div className="co-fields-grid co-fields-grid--full">
                <Field label="Country" id={`${uid}-country`} required>
                  <select
                    id={`${uid}-country`}
                    className="co-select"
                    autoComplete="country-name"
                    value={shipping.country}
                    onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))}
                  >
                    <option>United States</option>
                    <option>Canada</option>
                    <option>United Kingdom</option>
                    <option>Australia</option>
                    <option>Germany</option>
                    <option>France</option>
                    <option>India</option>
                    <option>Other</option>
                  </select>
                </Field>
              </div>
            </Section>

            {/* Shipping Method */}
            <Section title="Shipping Method">
              <div className="co-shipping-methods" role="radiogroup" aria-label="Choose a shipping method">
                {SHIPPING_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className={`co-shipping-option ${shippingMethod === method.id ? "co-shipping-option--active" : ""}`}
                    htmlFor={`${uid}-ship-${method.id}`}
                  >
                    <input
                      id={`${uid}-ship-${method.id}`}
                      type="radio"
                      name="shipping-method"
                      className="co-shipping-radio"
                      value={method.id}
                      checked={shippingMethod === method.id}
                      onChange={() => setShippingMethod(method.id)}
                    />
                    <div className="co-shipping-option-body">
                      <div className="co-shipping-option-label">
                        <span className="co-shipping-name">{method.label}</span>
                        {method.badge && (
                          <span className="co-shipping-badge">{method.badge}</span>
                        )}
                      </div>
                      <span className="co-shipping-eta">{method.eta}</span>
                    </div>
                    <span className="co-shipping-price">
                      {method.price === 0 ? (
                        <span className="co-shipping-free">Free</span>
                      ) : (
                        formatPrice(method.price)
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </Section>

            {/* Coupon */}
            <Section title="Coupon Code">
              <div className="co-coupon-row">
                <input
                  id={`${uid}-coupon`}
                  className={`co-input co-coupon-input ${couponApplied ? "co-input--success" : ""}`}
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value);
                    setCouponError("");
                  }}
                  disabled={couponApplied}
                  aria-describedby={couponError ? `${uid}-coupon-error` : undefined}
                />
                {couponApplied ? (
                  <button
                    type="button"
                    className="co-coupon-btn co-coupon-btn--remove"
                    onClick={handleRemoveCoupon}
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    className="co-coupon-btn"
                    onClick={handleApplyCoupon}
                  >
                    Apply
                  </button>
                )}
              </div>
              {couponApplied && (
                <p className="co-coupon-success" role="status">
                  ✓ Coupon applied — 10% discount
                </p>
              )}
              {couponError && (
                <p id={`${uid}-coupon-error`} className="co-coupon-error" role="alert">
                  {couponError}
                </p>
              )}
              <p className="co-coupon-hint">Try <code>CURATED10</code> for 10% off your first order</p>
            </Section>

            <div className="co-form-actions">
              <Link href="/" className="co-back-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
                  <path d="M19 12H5" />
                  <path d="m12 19-7-7 7-7" />
                </svg>
                Return to cart
              </Link>
              <button id="checkout-review-btn" type="submit" className="co-submit-btn">
                Review Order
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </form>
        ) : (
          /* ── Order Review Step ── */
          <div className="co-review">
            <Section title="Order Review">
              {/* Contact */}
              <div className="co-review-block">
                <div className="co-review-block-header">
                  <span className="co-review-block-label">Contact</span>
                  <button className="co-review-edit-btn" onClick={() => setStep("form")}>Edit</button>
                </div>
                <p className="co-review-value">{contact.email || "—"}</p>
                {contact.phone && <p className="co-review-value">{contact.phone}</p>}
              </div>

              {/* Shipping Address */}
              <div className="co-review-block">
                <div className="co-review-block-header">
                  <span className="co-review-block-label">Ship to</span>
                  <button className="co-review-edit-btn" onClick={() => setStep("form")}>Edit</button>
                </div>
                <p className="co-review-value">
                  {[shipping.firstName, shipping.lastName].filter(Boolean).join(" ") || "—"}
                  {shipping.address && `, ${shipping.address}`}
                  {shipping.apartment && ` ${shipping.apartment}`}
                  {shipping.city && `, ${shipping.city}`}
                  {shipping.state && ` ${shipping.state}`}
                  {shipping.zip && ` ${shipping.zip}`}
                  {shipping.country && `, ${shipping.country}`}
                </p>
              </div>

              {/* Shipping Method */}
              <div className="co-review-block">
                <div className="co-review-block-header">
                  <span className="co-review-block-label">Method</span>
                  <button className="co-review-edit-btn" onClick={() => setStep("form")}>Edit</button>
                </div>
                <p className="co-review-value">
                  {selectedShipping.label} — {selectedShipping.eta}
                  {shippingCost > 0 ? ` (${formatPrice(shippingCost)})` : " (Free)"}
                </p>
              </div>

              {/* Items */}
              <div className="co-review-block">
                <div className="co-review-block-header">
                  <span className="co-review-block-label">Items ({items.reduce((s, i) => s + i.quantity, 0)})</span>
                </div>
                <div className="co-review-items">
                  {items.map((item) => (
                    <OrderItem key={item.product.id} item={item} />
                  ))}
                </div>
              </div>
            </Section>

            <div className="co-form-actions">
              <button
                type="button"
                className="co-back-link"
                onClick={() => setStep("form")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
                  <path d="M19 12H5" />
                  <path d="m12 19-7-7 7-7" />
                </svg>
                Back to information
              </button>
              {orderError && (
                <p className="co-coupon-error" role="alert" style={{ margin: "0 0 12px", width: "100%", textAlign: "center" }}>
                  {orderError}
                </p>
              )}
              <button
                id="place-order-btn"
                type="button"
                className="co-submit-btn"
                onClick={handlePlaceOrder}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="co-spinner" aria-hidden="true" />
                    Placing Order…
                  </>
                ) : (
                  <>
                    Place Order
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right Column — Order Summary ── */}
      <aside className="co-right" aria-label="Order summary">
        <div className="co-summary-card">
          <h2 className="co-summary-title">Order Summary</h2>

          {/* Items list */}
          <div className="co-summary-items">
            {items.map((item) => (
              <OrderItem key={item.product.id} item={item} />
            ))}
          </div>

          <div className="co-summary-divider" aria-hidden="true" />

          {/* Totals */}
          <div className="co-summary-rows">
            <div className="co-summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(cartTotal)}</span>
            </div>
            <div className="co-summary-row">
              <span>Shipping</span>
              <span>
                {shippingCost === 0 ? (
                  <span className="co-shipping-free">Free</span>
                ) : (
                  formatPrice(shippingCost)
                )}
              </span>
            </div>
            <div className="co-summary-row">
              <span>
                Tax
                <span className="co-summary-note"> (est. 8%)</span>
              </span>
              <span>{formatPrice(taxAmount)}</span>
            </div>
            {couponApplied && (
              <div className="co-summary-row co-summary-row--discount">
                <span>Coupon (CURATED10)</span>
                <span>−{formatPrice(discount)}</span>
              </div>
            )}
          </div>

          <div className="co-summary-divider" aria-hidden="true" />

          <div className="co-summary-total">
            <span>Grand Total</span>
            <span className="co-summary-total-value">{formatPrice(grandTotal)}</span>
          </div>

          {/* Security badge */}
          <div className="co-security-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Secure, encrypted checkout</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
