"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { CJProductDetail, CJShippingOption, CJVariant } from "@/lib/cj-dropshipping";

type CJImporterProps = {
  onProductImported?: (product?: any) => void;
};

type EnrichedCJProduct = CJProductDetail & {
  alreadyImported?: boolean;
  importedProduct?: { id: string; slug: string } | null;
};

type ModalDetailData = {
  product: CJProductDetail;
  totalStock: number;
  variantsPreview: Array<
    CJVariant & {
      totalStock?: number;
    }
  >;
  shippingOptions: CJShippingOption[];
  alreadyImported: boolean;
  importedProduct: { id: string; slug: string; title: string } | null;
};

const CATEGORY_OPTIONS = [
  { label: "All Categories", value: "" },
  { label: "Phones & Accessories", value: "E9FDC79A-8365-4CA6-AC23-64D971F08B8B" },
  { label: "Computer & Office", value: "1126E280-CB7D-418A-90AB-7118E2D97CCC" },
  { label: "Consumer Electronics", value: "D9E66BF8-4E81-4CAB-A425-AEDEC5FBFBF2" },
  { label: "Home, Garden & Furniture", value: "52FC6CA5-669B-4D0B-B1AC-415675931399" },
  { label: "Sports & Outdoors", value: "4B397425-26C1-4D0E-B6D2-96B0B03689DB" },
  { label: "Health, Beauty & Hair", value: "2C7D4A0B-1AB2-41EC-8F9E-13DC31B1C902" },
  { label: "Jewelry & Watches", value: "2837816E-2FEA-4455-845C-6F40C6D70D1E" },
  { label: "Automobiles & Motorcycles", value: "A2F799BE-FB59-428E-A953-296AA2673FCF" },
  { label: "Bags & Shoes", value: "2415A90C-5D7B-4CC7-BA8C-C0949F9FF5D8" },
  { label: "Women's Clothing", value: "2FE8A083-5E7B-4179-896D-561EA116F730" },
  { label: "Men's Clothing", value: "B8302697-CF47-4211-9BD0-DFE8995AEB30" },
];

/** Extract unique image URLs from CJ product fields and variants */
function extractGalleryImages(product?: CJProductDetail | null): string[] {
  if (!product) return [];

  const images: string[] = [];

  // Primary image
  if (product.productImage) {
    const trimmed = product.productImage.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          parsed.forEach((img) => {
            if (img && typeof img === "string") images.push(img);
          });
        }
      } catch {
        // Fallback single URL string
      }
    } else if (trimmed) {
      images.push(trimmed);
    }
  }

  // Additional image set
  if (product.productImageSet) {
    const rawSet = product.productImageSet;
    if (Array.isArray(rawSet)) {
      rawSet.forEach((img) => {
        if (img && typeof img === "string") images.push(img);
      });
    } else if (typeof rawSet === "string" && rawSet.startsWith("[")) {
      try {
        const parsed = JSON.parse(rawSet);
        if (Array.isArray(parsed)) {
          parsed.forEach((img) => {
            if (img && typeof img === "string") images.push(img);
          });
        }
      } catch {
        // Fallback
      }
    } else if (typeof rawSet === "string" && rawSet.trim()) {
      images.push(rawSet.trim());
    }
  }

  // Variant images
  if (product.variants && Array.isArray(product.variants)) {
    product.variants.forEach((v) => {
      if (v.variantImage && typeof v.variantImage === "string") {
        images.push(v.variantImage);
      }
    });
  }

  const unique = Array.from(
    new Set(images.filter((img) => Boolean(img && (img.startsWith("http") || img.startsWith("//")))))
  ).map((img) => (img.startsWith("//") ? `https:${img}` : img));

  return unique.length > 0 ? unique : [product.productImage || "/placeholder.png"];
}

/** Extract unique colors and sizes from variants */
function extractColorsAndSizes(variants?: CJVariant[]): { colors: string[]; sizes: string[] } {
  if (!variants || variants.length === 0) return { colors: [], sizes: [] };

  const colorSet = new Set<string>();
  const sizeSet = new Set<string>();

  const knownSizes = new Set([
    "XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL",
    "ONE SIZE", "FREE SIZE", "SMALL", "MEDIUM", "LARGE", "EXTRA LARGE"
  ]);

  for (const v of variants) {
    const key = v.variantKey || v.variantNameEn || v.variantName || "";
    if (!key) continue;

    const parts = key.split("-").map((p) => p.trim());
    if (parts.length >= 2) {
      const p1 = parts[0];
      const p2 = parts.slice(1).join("-");

      if (knownSizes.has(p2.toUpperCase()) || /^\d+(\.\d+)?$/.test(p2) || /^(EU|US|UK)?\s*\d+/i.test(p2)) {
        colorSet.add(p1);
        sizeSet.add(p2);
      } else {
        colorSet.add(p1);
        sizeSet.add(p2);
      }
    } else if (parts.length === 1 && parts[0]) {
      if (knownSizes.has(parts[0].toUpperCase()) || /^\d+$/.test(parts[0])) {
        sizeSet.add(parts[0]);
      } else {
        colorSet.add(parts[0]);
      }
    }
  }

  return {
    colors: Array.from(colorSet).filter(Boolean),
    sizes: Array.from(sizeSet).filter(Boolean),
  };
}

/** Format package dimensions */
function formatDimensions(product?: CJProductDetail | null): string {
  if (!product) return "N/A";
  const l = product.packingLength || product.length || product.packLength;
  const w = product.packingWidth || product.width || product.packWidth;
  const h = product.packingHeight || product.height || product.packHeight;

  if (l && w && h) {
    return `${l} × ${w} × ${h} cm`;
  }
  if (product.dimensions) {
    return String(product.dimensions);
  }
  return "Standard Shipping Box";
}

export function CJImporter({ onProductImported }: CJImporterProps) {
  const [keywordInput, setKeywordInput] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [products, setProducts] = useState<EnrichedCJProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedSearchType, setDetectedSearchType] = useState<string | null>(null);

  // Client Details Cache (Requirement 4 & 7)
  const detailsCacheRef = useRef<Map<string, ModalDetailData>>(new Map());

  // Modal State
  const [activeModalPid, setActiveModalPid] = useState<string | null>(null);
  const [modalData, setModalData] = useState<ModalDetailData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTab, setModalTab] = useState<"overview" | "variants" | "shipping">("overview");

  // Gallery Navigation & Lightbox Zoom State (Requirement 1 & 2)
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  // Import Action State
  const [importingPid, setImportingPid] = useState<string | null>(null);
  const [duplicatePromptPid, setDuplicatePromptPid] = useState<string | null>(null);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [notification, setNotification] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const fetchProducts = useCallback(
    async (targetPage = 1, kw = activeKeyword, cat = category) => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        if (kw.trim()) query.set("keyword", kw.trim());
        if (cat) query.set("category", cat);
        query.set("page", targetPage.toString());
        query.set("pageSize", "20");

        const res = await fetch(`/api/admin/cj/search?${query.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Unable to search CJ products. Please check the CJ API configuration.");
        }

        const data = await res.json();
        setProducts(data.products || []);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        if (data.searchTypeDetected) {
          setDetectedSearchType(data.searchTypeDetected);
        }
      } catch (err) {
        console.error("[cj-importer] Search error:", err);
        setError(err instanceof Error ? err.message : "Failed to load products from CJ Dropshipping.");
      } finally {
        setLoading(false);
      }
    },
    [activeKeyword, category]
  );

  // 700ms Input Debounce Effect (Paced for CJ 1 QPS Rate Limit)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (keywordInput.trim() !== activeKeyword) {
        setActiveKeyword(keywordInput.trim());
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [keywordInput, activeKeyword]);

  // Fetch when page, category, or activeKeyword changes
  useEffect(() => {
    fetchProducts(1, activeKeyword, category);
  }, [activeKeyword, category, fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveKeyword(keywordInput.trim());
  };

  // Open Details Modal with Cache & Progressive Asynchronous Loading (Requirements 4, 5, 6)
  const openDetailsModal = async (pid: string) => {
    setActiveModalPid(pid);
    setActiveImageIndex(0);
    setIsZoomed(false);
    setModalTab("overview");

    // Requirement 4 & 7: Instant load from Client Cache if available
    if (detailsCacheRef.current.has(pid)) {
      setModalData(detailsCacheRef.current.get(pid)!);
      setModalLoading(false);
      return;
    }

    setModalLoading(true);
    setModalData(null);

    try {
      // Step 1: Initial Fast Load (Product info, variants, specs, db status) - Target < 500ms
      const res = await fetch(`/api/admin/cj/product/${pid}`);
      if (!res.ok) throw new Error("Failed to load product details.");
      const data: ModalDetailData = await res.json();

      // Render modal immediately!
      setModalData(data);
      setModalLoading(false);
      detailsCacheRef.current.set(pid, data);

      // Step 2: Progressive Async Loading for Shipping Info (Non-blocking background fetch)
      if (data.product.variants && data.product.variants.length > 0) {
        const topVid = data.product.variants[0].vid;
        fetch(`/api/admin/cj/shipping?vid=${topVid}&endCountryCode=US`)
          .then((shipRes) => (shipRes.ok ? shipRes.json() : null))
          .then((shipData) => {
            if (shipData && Array.isArray(shipData.shippingOptions)) {
              setModalData((prev) => {
                if (!prev || prev.product.pid !== pid) return prev;
                const updated = {
                  ...prev,
                  shippingOptions: shipData.shippingOptions,
                };
                detailsCacheRef.current.set(pid, updated);
                return updated;
              });
            }
          })
          .catch((shipErr) => console.warn("[cj-importer] Async shipping fetch note:", shipErr));
      }
    } catch (err) {
      console.error("[cj-importer] Modal load error:", err);
      setNotification({ kind: "error", message: "Unable to load product detail." });
      setModalLoading(false);
    }
  };

  // Keyboard navigation for image gallery & lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeModalPid || !modalData) return;
      const images = extractGalleryImages(modalData.product);
      if (images.length === 0) return;

      if (e.key === "ArrowLeft") {
        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === "ArrowRight") {
        setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      } else if (e.key === "Escape") {
        if (isZoomed) {
          setIsZoomed(false);
        } else {
          setActiveModalPid(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModalPid, modalData, isZoomed]);

  // Execute Import
  const executeImport = async (pid: string, action: "import" | "update" | "duplicate" = "import") => {
    setImportingPid(pid);
    setNotification(null);
    setDuplicatePromptPid(null);

    try {
      const res = await fetch("/api/admin/cj/import-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid, action }),
      });

      const report = await res.json();

      if (report.logs) setImportLogs(report.logs);

      if (report.status === "already_imported" && action === "import") {
        setDuplicatePromptPid(pid);
        return;
      }

      if (res.ok && (report.status === "imported" || report.status === "already_imported")) {
        setNotification({
          kind: "success",
          message: report.message || `Successfully ${action === "update" ? "updated" : "imported"} product!`,
        });

        // Update local grid state
        setProducts((prev) =>
          prev.map((p) =>
            p.pid === pid
              ? {
                  ...p,
                  alreadyImported: true,
                  importedProduct: report.product ? { id: report.product.id, slug: report.product.slug } : p.importedProduct,
                }
              : p
          )
        );

        // Update cached modal data if present
        if (detailsCacheRef.current.has(pid)) {
          const cached = detailsCacheRef.current.get(pid)!;
          cached.alreadyImported = true;
          if (report.product) {
            cached.importedProduct = {
              id: report.product.id,
              slug: report.product.slug,
              title: report.product.title,
            };
          }
          if (activeModalPid === pid) {
            setModalData({ ...cached });
          }
        }

        if (onProductImported) onProductImported(report.product);
      } else {
        throw new Error(report.message || "Import failed.");
      }
    } catch (err) {
      console.error("[cj-importer] Import error:", err);
      setNotification({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to import product from CJ.",
      });
    } finally {
      setImportingPid(null);
    }
  };

  const currentGalleryImages = extractGalleryImages(modalData?.product);
  const { colors: parsedColors, sizes: parsedSizes } = extractColorsAndSizes(modalData?.product?.variants);
  const formattedDims = formatDimensions(modalData?.product);

  return (
    <div className="cj-importer-container">
      {/* Header section */}
      <div className="panel cj-search-panel">
        <div className="section-heading" style={{ marginBottom: "20px" }}>
          <div>
            <p className="eyebrow">CJ Open API Integration</p>
            <h2>Import from CJ Dropshipping</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Search millions of verified products on CJ Dropshipping and import them with full variants and inventory into your store.
            </p>
          </div>
        </div>

        {/* Search form */}
        <form className="cj-search-form" onSubmit={handleSearch}>
          <div className="cj-search-inputs">
            <div className="cj-search-field">
              <label>Keyword / CJ Product ID</label>
              <input
                type="text"
                placeholder="Search by title, SKU, or CJ Product ID..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
              />
            </div>
            <div className="cj-search-field">
              <label>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="cj-select"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="cj-search-action">
              <button className="button primary" type="submit" disabled={loading}>
                {loading ? "Searching..." : "Search Products"}
              </button>
            </div>
          </div>
        </form>

        {notification && (
          <div className={`notification ${notification.kind}`} style={{ marginTop: "16px" }}>
            {notification.message}
            {importLogs.length > 0 && (
              <button
                type="button"
                className="text-button"
                style={{ marginLeft: "12px", textDecoration: "underline" }}
                onClick={() => setShowLogs(!showLogs)}
              >
                {showLogs ? "Hide Logs" : "View Import Logs"}
              </button>
            )}
          </div>
        )}

        {/* Terminal Logs Panel */}
        {showLogs && importLogs.length > 0 && (
          <div className="cj-terminal-log">
            <div className="cj-terminal-header">
              <span>Import Execution Trace</span>
              <button type="button" className="text-button" onClick={() => setShowLogs(false)}>
                ✕
              </button>
            </div>
            <pre className="cj-terminal-body">
              {importLogs.join("\n")}
            </pre>
          </div>
        )}
      </div>

      {/* Duplicate prompt modal */}
      {duplicatePromptPid && (
        <div className="cj-modal-backdrop">
          <div className="panel cj-prompt-modal">
            <p className="eyebrow" style={{ color: "var(--gold)" }}>Duplicate Detected</p>
            <h3>Product Already Exists</h3>
            <p className="muted">
              Product ID <code>{duplicatePromptPid}</code> is already present in your store catalog. What would you like to do?
            </p>
            <div className="cj-prompt-actions">
              <button
                type="button"
                className="button primary"
                onClick={() => executeImport(duplicatePromptPid, "update")}
              >
                Update Existing Record
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => executeImport(duplicatePromptPid, "duplicate")}
              >
                Create Duplicate Copy
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setDuplicatePromptPid(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="notification error" style={{ margin: "20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{error}</span>
          <button
            type="button"
            className="button secondary"
            onClick={() => fetchProducts(page, activeKeyword, category)}
            style={{ fontSize: "12px", padding: "6px 14px", whiteSpace: "nowrap" }}
          >
            Retry Search
          </button>
        </div>
      )}

      {/* Results grid */}
      <div className="cj-results-section" style={{ marginTop: "24px" }}>
        <div className="section-heading" style={{ marginBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <p className="eyebrow" style={{ margin: 0 }}>Catalogue Results</p>
              {detectedSearchType && activeKeyword && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "rgba(201, 168, 76, 0.18)",
                    color: "var(--gold)",
                    border: "1px solid rgba(201, 168, 76, 0.35)",
                  }}
                >
                  {detectedSearchType === "SKU"
                    ? "🔍 SKU Search Mode"
                    : detectedSearchType === "PRODUCT_ID"
                    ? "🆔 Product ID Mode"
                    : "🔤 Keyword Search Mode"}
                </span>
              )}
            </div>
            <h3 style={{ margin: "4px 0 0", color: "var(--foreground)", fontSize: "18px" }}>
              {total > 0
                ? `Found ${total} Products`
                : loading
                ? "Loading products..."
                : error
                ? "Search Error"
                : detectedSearchType === "SKU"
                ? "No Product Found for this SKU"
                : "No Products Found"}
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="cj-grid-skeleton">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="panel cj-card-skeleton shimmer" style={{ height: "320px" }} />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="cj-product-grid">
            {products.map((p) => {
              const name = p.productNameEn || p.productName || "CJ Product";
              const isImporting = importingPid === p.pid;

              return (
                <div key={p.pid} className="panel cj-product-card">
                  <div className="cj-card-image-wrap">
                    {p.productImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.productImage} alt={name} loading="lazy" />
                    ) : (
                      <div className="image-placeholder">No Image</div>
                    )}
                    {p.alreadyImported && (
                      <span className="cj-card-badge imported">In Store</span>
                    )}
                  </div>

                  <div className="cj-card-content">
                    <span className="cj-card-pid">PID: {p.pid}</span>
                    <h4 className="cj-card-title" title={name}>
                      {name}
                    </h4>

                    <div className="cj-card-meta-row">
                      <div className="cj-card-meta-item">
                        <span className="muted">Cost:</span>
                        <strong className="gold-text">${p.sellPrice || "N/A"}</strong>
                      </div>
                      <div className="cj-card-meta-item">
                        <span className="muted">Category:</span>
                        <span>{p.categoryName?.split(">")?.[0]?.trim() || "General"}</span>
                      </div>
                    </div>

                    <div className="cj-card-tags">
                      {p.variants && p.variants.length > 0 && (
                        <span className="cj-tag">{p.variants.length} Variants</span>
                      )}
                      <span className="cj-tag">Fast Shipping</span>
                    </div>

                    <div className="cj-card-actions">
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => openDetailsModal(p.pid)}
                        style={{ flex: 1, padding: "8px 12px", fontSize: "12px" }}
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        className="button primary"
                        disabled={isImporting}
                        onClick={() => executeImport(p.pid, p.alreadyImported ? "update" : "import")}
                        style={{ flex: 1, padding: "8px 12px", fontSize: "12px" }}
                      >
                        {isImporting
                          ? "Importing..."
                          : p.alreadyImported
                          ? "Update Product"
                          : "Import Product"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : error ? (
          <div className="panel empty-state" style={{ textAlign: "center", padding: "48px" }}>
            <p style={{ color: "#ef4444", fontWeight: 600, marginBottom: "8px" }}>CJ API Search Request Failed</p>
            <p className="muted" style={{ margin: 0 }}>{error}</p>
          </div>
        ) : (
          <div className="panel empty-state" style={{ textAlign: "center", padding: "48px" }}>
            <p>
              {detectedSearchType === "SKU"
                ? `No CJ product found matching SKU "${activeKeyword}". Please verify the SKU.`
                : "No products match your search. Try different keywords or select a category."}
            </p>
          </div>
        )}

        {/* Pagination */}
        {total > 12 && (
          <div className="cj-pagination" style={{ marginTop: "24px", display: "flex", gap: "8px", justifyContent: "center" }}>
            <button
              className="button secondary"
              disabled={page <= 1 || loading}
              onClick={() => fetchProducts(page - 1)}
            >
              Previous
            </button>

            <span style={{ display: "flex", alignItems: "center", padding: "0 12px", fontSize: "13px", color: "var(--muted)" }}>
              Page {page} of {Math.ceil(total / 12)}
            </span>

            <button
              className="button secondary"
              disabled={page >= Math.ceil(total / 12) || loading}
              onClick={() => fetchProducts(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Detailed Preview Modal */}
      {activeModalPid && (
        <div className="cj-modal-backdrop" onClick={() => setActiveModalPid(null)}>
          <div className="panel cj-detail-modal enhanced" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Top Bar */}
            <div className="cj-modal-header">
              <div>
                <div className="cj-modal-header-eyebrow">
                  <span className="eyebrow">CJ Catalogue Product Detail</span>
                  {modalData && (
                    <span className={`cj-status-pill ${modalData.alreadyImported ? "imported" : "new"}`}>
                      {modalData.alreadyImported ? "✓ In Store Catalog" : "Ready to Import"}
                    </span>
                  )}
                </div>
                <h3>{modalData?.product.productNameEn || modalData?.product.productName || `PID: ${activeModalPid}`}</h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {modalData && (
                  <button
                    type="button"
                    className="button primary cj-header-import-btn"
                    disabled={importingPid === activeModalPid}
                    onClick={() => executeImport(activeModalPid, modalData.alreadyImported ? "update" : "import")}
                  >
                    {importingPid === activeModalPid
                      ? "Importing..."
                      : modalData.alreadyImported
                      ? "Update Product"
                      : "Import Product"}
                  </button>
                )}
                <button
                  type="button"
                  className="cj-modal-close-btn"
                  onClick={() => setActiveModalPid(null)}
                  title="Close Preview (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Requirement 6: Loading Skeleton */}
            {modalLoading ? (
              <div className="cj-modal-skeleton-container">
                <div className="cj-skeleton-tabs shimmer" />
                <div className="cj-skeleton-grid">
                  <div className="cj-skeleton-gallery shimmer" />
                  <div className="cj-skeleton-specs">
                    <div className="cj-skeleton-line short shimmer" />
                    <div className="cj-skeleton-line shimmer" />
                    <div className="cj-skeleton-cards-grid">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="cj-skeleton-card shimmer" />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="cj-skeleton-description shimmer" />
              </div>
            ) : modalData ? (
              <div className="cj-modal-content">
                
                {/* Highlights Banner Cards (Requirements 3 & 4) */}
                <div className="cj-stats-banner">
                  <div className="cj-stat-card">
                    <span className="cj-stat-label">Total Variants</span>
                    <strong className="cj-stat-value gold-text">
                      {modalData.product.variants?.length || 0}
                    </strong>
                  </div>
                  <div className="cj-stat-card">
                    <span className="cj-stat-label">Total Inventory</span>
                    <strong className="cj-stat-value success-text">
                      {modalData.totalStock > 0 ? `${modalData.totalStock.toLocaleString()} Units` : "Available on Demand"}
                    </strong>
                  </div>
                  <div className="cj-stat-card">
                    <span className="cj-stat-label">Supplier Cost</span>
                    <strong className="cj-stat-value gold-text">
                      ${modalData.product.sellPrice || "0.00"}
                    </strong>
                  </div>
                  <div className="cj-stat-card">
                    <span className="cj-stat-label">Processing Window</span>
                    <strong className="cj-stat-value">
                      ⚡ 1-3 Business Days
                    </strong>
                  </div>
                  <div className="cj-stat-card">
                    <span className="cj-stat-label">Dispatch Origin</span>
                    <strong className="cj-stat-value">
                      ✈️ China (CN Warehouse)
                    </strong>
                  </div>
                </div>

                {/* Modal Navigation Tabs */}
                <div className="cj-modal-tabs">
                  <button
                    className={`cj-modal-tab ${modalTab === "overview" ? "active" : ""}`}
                    onClick={() => setModalTab("overview")}
                  >
                    Overview & Gallery
                  </button>
                  <button
                    className={`cj-modal-tab ${modalTab === "variants" ? "active" : ""}`}
                    onClick={() => setModalTab("variants")}
                  >
                    Variants & Stock ({modalData.product.variants?.length || 0})
                  </button>
                  <button
                    className={`cj-modal-tab ${modalTab === "shipping" ? "active" : ""}`}
                    onClick={() => setModalTab("shipping")}
                  >
                    Shipping & Carriers ({modalData.shippingOptions.length})
                  </button>
                </div>

                {/* TAB 1: OVERVIEW & GALLERY */}
                {modalTab === "overview" && (
                  <div className="cj-tab-overview">
                    <div className="cj-overview-grid">
                      
                      {/* Left: Gallery & Zoom (Requirements 1 & 2) */}
                      <div className="cj-gallery-container">
                        <div className="cj-main-image-wrap" onClick={() => setIsZoomed(true)}>
                          {currentGalleryImages.length > 0 ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={currentGalleryImages[activeImageIndex] || currentGalleryImages[0]}
                              alt="Product Preview"
                              className="cj-main-img"
                            />
                          ) : (
                            <div className="image-placeholder">No Image Available</div>
                          )}

                          {/* Image Counter Badge */}
                          {currentGalleryImages.length > 1 && (
                            <span className="cj-image-counter">
                              {activeImageIndex + 1} / {currentGalleryImages.length}
                            </span>
                          )}

                          {/* Hover Zoom Hint */}
                          <div className="cj-zoom-hint">
                            <span>🔍 Click for Fullscreen Zoom</span>
                          </div>

                          {/* Prev / Next Arrows (Requirement 2) */}
                          {currentGalleryImages.length > 1 && (
                            <>
                              <button
                                type="button"
                                className="cj-gallery-nav prev"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveImageIndex((prev) =>
                                    prev > 0 ? prev - 1 : currentGalleryImages.length - 1
                                  );
                                }}
                                title="Previous Image (Left Arrow)"
                              >
                                ‹
                              </button>
                              <button
                                type="button"
                                className="cj-gallery-nav next"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveImageIndex((prev) =>
                                    prev < currentGalleryImages.length - 1 ? prev + 1 : 0
                                  );
                                }}
                                title="Next Image (Right Arrow)"
                              >
                                ›
                              </button>
                            </>
                          )}
                        </div>

                        {/* Thumbnail Strip */}
                        {currentGalleryImages.length > 1 && (
                          <div className="cj-thumbnails-strip">
                            {currentGalleryImages.map((imgUrl, idx) => (
                              <button
                                key={idx}
                                type="button"
                                className={`cj-thumb-btn ${activeImageIndex === idx ? "active" : ""}`}
                                onClick={() => setActiveImageIndex(idx)}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Specifications & Attributes */}
                      <div className="cj-specs-section">
                        <h4 className="cj-specs-title">Product Specifications</h4>

                        <div className="cj-specs-grid">
                          <div className="cj-spec-card">
                            <span className="muted">CJ Product ID</span>
                            <code>{modalData.product.pid}</code>
                          </div>

                          <div className="cj-spec-card">
                            <span className="muted">Supplier SKU</span>
                            <strong>{modalData.product.productSku || "N/A"}</strong>
                          </div>

                          <div className="cj-spec-card">
                            <span className="muted">Cost Price</span>
                            <strong className="gold-text">${modalData.product.sellPrice || "0.00"}</strong>
                          </div>

                          <div className="cj-spec-card">
                            <span className="muted">Category</span>
                            <strong>{modalData.product.categoryName || "General"}</strong>
                          </div>

                          <div className="cj-spec-card">
                            <span className="muted">Supplier Info</span>
                            <strong>
                              {(modalData.product.supplierName as string) ||
                                (modalData.product.supplierId as string) ||
                                "CJ Verified Direct Supplier"}
                            </strong>
                          </div>

                          <div className="cj-spec-card">
                            <span className="muted">Weight</span>
                            <strong>
                              {modalData.product.productWeight
                                ? `${modalData.product.productWeight}g`
                                : "N/A"}
                            </strong>
                          </div>

                          <div className="cj-spec-card">
                            <span className="muted">Package Dimensions</span>
                            <strong>{formattedDims}</strong>
                          </div>

                          <div className="cj-spec-card">
                            <span className="muted">Shipping Origin</span>
                            <strong>China (CN Warehouse)</strong>
                          </div>

                          <div className="cj-spec-card">
                            <span className="muted">Processing Time</span>
                            <strong>1-3 Business Days</strong>
                          </div>

                          <div className="cj-spec-card">
                            <span className="muted">Est. Delivery Time</span>
                            <strong>
                              {modalData.shippingOptions[0]?.logisticAging || "7-15 Days (Express)"}
                            </strong>
                          </div>
                        </div>

                        {/* Extracted Colors & Sizes (Requirement 1) */}
                        <div className="cj-variants-summary-row">
                          <div className="cj-attr-group">
                            <span className="muted">Available Colors ({parsedColors.length || "Standard"}):</span>
                            <div className="cj-badge-tags">
                              {parsedColors.length > 0 ? (
                                parsedColors.map((color, i) => (
                                  <span key={i} className="cj-pill-badge color">
                                    {color}
                                  </span>
                                ))
                              ) : (
                                <span className="cj-pill-badge muted">Standard Color</span>
                              )}
                            </div>
                          </div>

                          <div className="cj-attr-group" style={{ marginTop: "10px" }}>
                            <span className="muted">Available Sizes ({parsedSizes.length || "Standard"}):</span>
                            <div className="cj-badge-tags">
                              {parsedSizes.length > 0 ? (
                                parsedSizes.map((size, i) => (
                                  <span key={i} className="cj-pill-badge size">
                                    {size}
                                  </span>
                                ))
                              ) : (
                                <span className="cj-pill-badge muted">One Size</span>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Description Section */}
                    <div className="cj-description-section" style={{ marginTop: "24px" }}>
                      <div className="section-heading" style={{ marginBottom: "8px" }}>
                        <p className="eyebrow">Full Description & Details</p>
                      </div>
                      <div
                        className="cj-description-box"
                        dangerouslySetInnerHTML={{
                          __html: modalData.product.description || "<p>No detailed HTML description provided by CJ Dropshipping.</p>",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: VARIANTS & INVENTORY */}
                {modalTab === "variants" && (
                  <div className="cj-tab-variants">
                    <div className="cj-table-header-info">
                      <p className="muted" style={{ margin: "0 0 12px", fontSize: "13px" }}>
                        Showing <strong>{modalData.product.variants?.length || 0}</strong> variants with individual inventory stock counts:
                      </p>
                    </div>

                    <div className="cj-table-responsive">
                      <table className="cj-table">
                        <thead>
                          <tr>
                            <th style={{ width: "60px" }}>Image</th>
                            <th>Variant Name / Key</th>
                            <th>VID</th>
                            <th>SKU</th>
                            <th>Weight</th>
                            <th>Cost Price</th>
                            <th>Inventory Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modalData.product.variants && modalData.product.variants.length > 0 ? (
                            modalData.product.variants.map((v) => (
                              <tr key={v.vid}>
                                <td>
                                  {v.variantImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={v.variantImage}
                                      alt="v"
                                      style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }}
                                    />
                                  ) : (
                                    <div className="cj-table-thumb-placeholder">—</div>
                                  )}
                                </td>
                                <td>
                                  <strong>{v.variantNameEn || v.variantKey || "Default Option"}</strong>
                                </td>
                                <td>
                                  <code>{v.vid}</code>
                                </td>
                                <td>{v.variantSku || "N/A"}</td>
                                <td>{v.variantWeight ? `${v.variantWeight}g` : "N/A"}</td>
                                <td className="gold-text">
                                  ${v.variantSellPrice ?? modalData.product.sellPrice}
                                </td>
                                <td>
                                  <span className={`cj-stock-pill ${v.inventoryNum && v.inventoryNum > 0 ? "in-stock" : "out-of-stock"}`}>
                                    {v.inventoryNum != null ? `${v.inventoryNum} Units` : "In Stock"}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} style={{ textAlign: "center", padding: "24px" }}>
                                No variant breakdown found for this product.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 3: SHIPPING & LOGISTICS */}
                {modalTab === "shipping" && (
                  <div className="cj-tab-shipping">
                    <div className="cj-shipping-banner">
                      <span>✈️ <strong>Dispatch Origin:</strong> China (CN)</span>
                      <span>⚡ <strong>Processing Window:</strong> 1-3 Business Days</span>
                      <span>🌎 <strong>Calculated Destination:</strong> United States (US)</span>
                    </div>

                    <div className="cj-table-responsive" style={{ marginTop: "16px" }}>
                      <table className="cj-table">
                        <thead>
                          <tr>
                            <th>Carrier / Logistics Method</th>
                            <th>Estimated Shipping Fee</th>
                            <th>Delivery Timeframe (Aging)</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modalData.shippingOptions.length > 0 ? (
                            modalData.shippingOptions.map((option, idx) => (
                              <tr key={idx}>
                                <td>
                                  <strong>{option.logisticName || "CJ Packet Express"}</strong>
                                </td>
                                <td className="gold-text">
                                  ${option.logisticPrice ? option.logisticPrice.toFixed(2) : "Calculated at checkout"}
                                </td>
                                <td>{option.logisticAging || "7-15 business days"}</td>
                                <td>
                                  <span className="cj-stock-pill in-stock">Active Line</span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} style={{ textAlign: "center", padding: "24px" }}>
                                Default shipping available at order checkout.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions (Requirement 5) */}
                <div className="cj-modal-footer">
                  <div className="cj-modal-footer-info">
                    {modalData.alreadyImported && (
                      <span className="muted" style={{ fontSize: "12px" }}>
                        Already imported in catalog as{" "}
                        <a
                          href={`/products/${modalData.importedProduct?.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--gold)", textDecoration: "underline" }}
                        >
                          {modalData.importedProduct?.title || "Product Record"}
                        </a>
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button type="button" className="button secondary" onClick={() => setActiveModalPid(null)}>
                      Close Preview
                    </button>
                    <button
                      type="button"
                      className="button primary"
                      disabled={importingPid === activeModalPid}
                      onClick={() => executeImport(activeModalPid, modalData.alreadyImported ? "update" : "import")}
                    >
                      {importingPid === activeModalPid
                        ? "Importing..."
                        : modalData.alreadyImported
                        ? "Update Product in Store"
                        : "Import Product"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: "32px", textAlign: "center" }}>Product details unavailable.</div>
            )}
          </div>
        </div>
      )}

      {/* Requirement 1 & 2: Fullscreen Lightbox Zoom Modal */}
      {isZoomed && currentGalleryImages.length > 0 && (
        <div className="cj-lightbox-backdrop" onClick={() => setIsZoomed(false)}>
          <button
            type="button"
            className="cj-lightbox-close"
            onClick={() => setIsZoomed(false)}
            title="Close Zoom View (Esc)"
          >
            ✕
          </button>

          <div className="cj-lightbox-content" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentGalleryImages[activeImageIndex] || currentGalleryImages[0]}
              alt="Zoomed View"
              className="cj-lightbox-img"
            />
          </div>

          {currentGalleryImages.length > 1 && (
            <>
              <button
                type="button"
                className="cj-lightbox-nav prev"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex((prev) =>
                    prev > 0 ? prev - 1 : currentGalleryImages.length - 1
                  );
                }}
                title="Previous Image"
              >
                ‹
              </button>
              <button
                type="button"
                className="cj-lightbox-nav next"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex((prev) =>
                    prev < currentGalleryImages.length - 1 ? prev + 1 : 0
                  );
                }}
                title="Next Image"
              >
                ›
              </button>
            </>
          )}

          <div className="cj-lightbox-footer">
            <span>
              Image {activeImageIndex + 1} of {currentGalleryImages.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default CJImporter;
