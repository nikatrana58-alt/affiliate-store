"use client";

/**
 * components/printful-importer.tsx
 *
 * Printful Catalog Product Importer Component.
 * Features search, pagination, detailed preview modal, variant swatches,
 * duplicate handling, update action, duplicate copy action, and execution log drawer.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { PrintfulSyncProduct, PrintfulSyncVariant } from "@/lib/printful";

type PrintfulImporterProps = {
  onProductImported?: (product?: any) => void;
};

type EnrichedPrintfulProduct = PrintfulSyncProduct & {
  alreadyImported?: boolean;
  importedProduct?: { id: string; slug: string } | null;
};

type ModalDetailData = {
  product: PrintfulSyncProduct;
  variants: PrintfulSyncVariant[];
  alreadyImported: boolean;
  importedProduct: { id: string; slug: string; title: string } | null;
};

export function PrintfulImporter({ onProductImported }: PrintfulImporterProps) {
  const [keywordInput, setKeywordInput] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [products, setProducts] = useState<EnrichedPrintfulProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client Details Cache
  const detailsCacheRef = useRef<Map<string, ModalDetailData>>(new Map());

  // Modal State
  const [activeModalId, setActiveModalId] = useState<string | null>(null);
  const [modalData, setModalData] = useState<ModalDetailData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Import Action State
  const [importingId, setImportingId] = useState<string | null>(null);
  const [duplicatePromptId, setDuplicatePromptId] = useState<string | null>(null);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [notification, setNotification] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const fetchProducts = useCallback(
    async (targetPage = 1, kw = activeKeyword) => {
      setLoading(true);
      setError(null);
      try {
        const offset = (targetPage - 1) * 20;
        const query = new URLSearchParams();
        if (kw.trim()) query.set("keyword", kw.trim());
        query.set("offset", offset.toString());
        query.set("limit", "20");

        const res = await fetch(`/api/admin/printful/products?${query.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to search Printful products.");
        }

        const data = await res.json();
        setProducts(data.products || []);
        setTotal(data.total || (data.products ? data.products.length : 0));
        setPage(targetPage);
      } catch (err) {
        console.error("[printful-importer] Search error:", err);
        setError(err instanceof Error ? err.message : "Failed to load products from Printful.");
      } finally {
        setLoading(false);
      }
    },
    [activeKeyword]
  );

  // 300ms Input Debounce Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (keywordInput.trim() !== activeKeyword) {
        setActiveKeyword(keywordInput.trim());
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [keywordInput, activeKeyword]);

  useEffect(() => {
    fetchProducts(1, activeKeyword);
  }, [activeKeyword, fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveKeyword(keywordInput.trim());
  };

  const openDetailsModal = async (id: string | number) => {
    const idStr = String(id);
    setActiveModalId(idStr);
    setActiveImageIndex(0);

    if (detailsCacheRef.current.has(idStr)) {
      setModalData(detailsCacheRef.current.get(idStr)!);
      setModalLoading(false);
      return;
    }

    setModalLoading(true);
    setModalData(null);

    try {
      const res = await fetch(`/api/admin/printful/product/${idStr}`);
      if (!res.ok) throw new Error("Failed to load Printful product details.");
      const data: ModalDetailData = await res.json();

      setModalData(data);
      detailsCacheRef.current.set(idStr, data);
    } catch (err) {
      console.error("[printful-importer] Modal load error:", err);
      setNotification({ kind: "error", message: "Unable to load product detail." });
    } finally {
      setModalLoading(false);
    }
  };

  const executeImport = async (
    syncProductId: string | number,
    action: "import" | "update" | "duplicate" = "import"
  ) => {
    const idStr = String(syncProductId);
    setImportingId(idStr);
    setNotification(null);
    setDuplicatePromptId(null);

    try {
      const res = await fetch("/api/admin/printful/import-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync_product_id: syncProductId, action }),
      });

      const report = await res.json();

      if (report.logs) setImportLogs(report.logs);

      if (report.status === "already_imported" && action === "import") {
        setDuplicatePromptId(idStr);
        return;
      }

      if (res.ok && (report.status === "imported" || report.status === "already_imported")) {
        setNotification({
          kind: "success",
          message: report.message || `Successfully ${action === "update" ? "updated" : "imported"} Printful product!`,
        });

        setProducts((prev) =>
          prev.map((p) =>
            String(p.id) === idStr
              ? {
                  ...p,
                  alreadyImported: true,
                  importedProduct: report.product
                    ? { id: report.product.id, slug: report.product.slug }
                    : p.importedProduct,
                }
              : p
          )
        );

        if (detailsCacheRef.current.has(idStr)) {
          const cached = detailsCacheRef.current.get(idStr)!;
          cached.alreadyImported = true;
          if (report.product) {
            cached.importedProduct = {
              id: report.product.id,
              slug: report.product.slug,
              title: report.product.title,
            };
          }
          if (activeModalId === idStr) {
            setModalData({ ...cached });
          }
        }

        if (onProductImported) onProductImported(report.product);
      } else {
        throw new Error(report.message || "Import failed.");
      }
    } catch (err) {
      console.error("[printful-importer] Import error:", err);
      setNotification({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to import product from Printful.",
      });
    } finally {
      setImportingId(null);
    }
  };

  const getGalleryImages = (): string[] => {
    if (!modalData) return [];
    const imgs: string[] = [];
    if (modalData.product.thumbnail_url) imgs.push(modalData.product.thumbnail_url);
    if (modalData.variants) {
      modalData.variants.forEach((v) => {
        if (v.files) {
          v.files.forEach((f) => {
            if (f.preview_url && !imgs.includes(f.preview_url)) {
              imgs.push(f.preview_url);
            }
          });
        }
      });
    }
    return imgs.length > 0 ? imgs : ["/placeholder.png"];
  };

  const galleryImages = getGalleryImages();

  return (
    <div className="printful-importer-container">
      {/* Search Header */}
      <div className="panel cj-search-panel">
        <div className="section-heading" style={{ marginBottom: "20px" }}>
          <div>
            <p className="eyebrow" style={{ color: "#C9A84C" }}>Printful Store Integration</p>
            <h2>Import from Printful</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Sync custom printed apparel, accessories, and mockups directly from your Printful account.
            </p>
          </div>
        </div>

        <form className="cj-search-form" onSubmit={handleSearch}>
          <div className="cj-search-inputs">
            <div className="cj-search-field" style={{ flex: 1 }}>
              <label>Keyword / Sync Product ID</label>
              <input
                type="text"
                placeholder="Search Printful sync products by title or ID..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
              />
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
                {showLogs ? "Hide Logs" : "View Import Trace"}
              </button>
            )}
          </div>
        )}

        {showLogs && importLogs.length > 0 && (
          <div className="cj-terminal-log">
            <div className="cj-terminal-header">
              <span>Printful Import Execution Trace</span>
              <button type="button" className="text-button" onClick={() => setShowLogs(false)}>
                ✕
              </button>
            </div>
            <pre className="cj-terminal-body">{importLogs.join("\n")}</pre>
          </div>
        )}
      </div>

      {/* Duplicate prompt modal */}
      {duplicatePromptId && (
        <div className="cj-modal-backdrop">
          <div className="panel cj-prompt-modal">
            <p className="eyebrow" style={{ color: "#C9A84C" }}>Duplicate Detected</p>
            <h3>Printful Product Already Exists</h3>
            <p className="muted">
              Product ID <code>{duplicatePromptId}</code> is already in your store catalog. What action would you like to perform?
            </p>
            <div className="cj-prompt-actions">
              <button
                type="button"
                className="button primary"
                onClick={() => executeImport(duplicatePromptId, "update")}
              >
                Update Existing Record
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => executeImport(duplicatePromptId, "duplicate")}
              >
                Create Duplicate Copy
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setDuplicatePromptId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results grid */}
      <div className="cj-results-section" style={{ marginTop: "24px" }}>
        <div className="section-heading" style={{ marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: "4px 0 0", color: "#FFF", fontSize: "18px" }}>
              {total > 0 ? `Printful Products (${total})` : loading ? "Loading Printful products..." : "No Products Found"}
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
              const isImporting = importingId === String(p.id);

              return (
                <div key={p.id} className="panel cj-product-card">
                  <div className="cj-card-image-wrap">
                    {p.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnail_url} alt={p.name} loading="lazy" />
                    ) : (
                      <div className="image-placeholder">No Preview</div>
                    )}
                    {p.alreadyImported && (
                      <span className="cj-card-badge imported">In Store</span>
                    )}
                  </div>

                  <div className="cj-card-content">
                    <span className="cj-card-pid">Sync ID: {p.id}</span>
                    <h4 className="cj-card-title" title={p.name}>
                      {p.name}
                    </h4>

                    <div className="cj-card-meta-row">
                      <div className="cj-card-meta-item">
                        <span className="muted">Variants:</span>
                        <strong>{p.variants || 1}</strong>
                      </div>
                      <div className="cj-card-meta-item">
                        <span className="muted">Status:</span>
                        <span style={{ textTransform: "capitalize", color: "#6BCB77" }}>
                          {p.status || "active"}
                        </span>
                      </div>
                    </div>

                    <div className="cj-card-actions">
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => openDetailsModal(p.id)}
                        style={{ flex: 1, padding: "8px 12px", fontSize: "12px" }}
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        className="button primary"
                        disabled={isImporting}
                        onClick={() => executeImport(p.id, p.alreadyImported ? "update" : "import")}
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
        ) : (
          <div className="panel empty-state" style={{ textAlign: "center", padding: "48px" }}>
            <p>No Printful products found. Ensure products exist in your Printful dashboard.</p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {activeModalId && (
        <div className="cj-modal-backdrop" onClick={() => setActiveModalId(null)}>
          <div className="panel cj-detail-modal enhanced" onClick={(e) => e.stopPropagation()}>
            <div className="cj-modal-header">
              <div>
                <div className="cj-modal-header-eyebrow">
                  <span className="eyebrow" style={{ color: "#C9A84C" }}>Printful Catalog Detail</span>
                  {modalData && (
                    <span className={`cj-status-pill ${modalData.alreadyImported ? "imported" : "new"}`}>
                      {modalData.alreadyImported ? "✓ In Store Catalog" : "Ready to Import"}
                    </span>
                  )}
                </div>
                <h3>{modalData?.product.name || `Sync ID: ${activeModalId}`}</h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {modalData && (
                  <button
                    type="button"
                    className="button primary cj-header-import-btn"
                    disabled={importingId === activeModalId}
                    onClick={() => executeImport(activeModalId, modalData.alreadyImported ? "update" : "import")}
                  >
                    {importingId === activeModalId
                      ? "Importing..."
                      : modalData.alreadyImported
                      ? "Update Product"
                      : "Import Product"}
                  </button>
                )}
                <button
                  type="button"
                  className="cj-modal-close-btn"
                  onClick={() => setActiveModalId(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            {modalLoading ? (
              <div className="cj-modal-skeleton-container" style={{ padding: "24px" }}>
                <p>Loading Printful product preview...</p>
              </div>
            ) : modalData ? (
              <div className="cj-modal-content">
                <div className="cj-stats-banner">
                  <div className="cj-stat-card">
                    <span className="cj-stat-label">Variants</span>
                    <strong className="cj-stat-value gold-text">
                      {modalData.variants?.length || 0}
                    </strong>
                  </div>
                  <div className="cj-stat-card">
                    <span className="cj-stat-label">Supplier Cost</span>
                    <strong className="cj-stat-value gold-text">
                      ${modalData.variants?.[0]?.retail_price || "15.00"}
                    </strong>
                  </div>
                  <div className="cj-stat-card">
                    <span className="cj-stat-label">Fulfillment</span>
                    <strong className="cj-stat-value">⚡ Printful Direct POD</strong>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px", marginTop: "20px" }}>
                  <div>
                    <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={galleryImages[activeImageIndex] || galleryImages[0]}
                        alt={modalData.product.name}
                        style={{ width: "100%", height: "280px", objectFit: "cover" }}
                      />
                    </div>
                  </div>

                  <div>
                    <h4 style={{ margin: "0 0 12px", color: "#FFF" }}>Variants & Specs</h4>
                    <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ background: "rgba(255,255,255,0.05)", textAlign: "left" }}>
                            <th style={{ padding: "8px 12px" }}>Variant Name</th>
                            <th style={{ padding: "8px 12px" }}>SKU</th>
                            <th style={{ padding: "8px 12px" }}>Retail Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modalData.variants.map((v) => (
                            <tr key={v.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                              <td style={{ padding: "8px 12px" }}>{v.name}</td>
                              <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{v.sku || `PF-${v.id}`}</td>
                              <td style={{ padding: "8px 12px", color: "#C9A84C", fontWeight: 700 }}>${v.retail_price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
