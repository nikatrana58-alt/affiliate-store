"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { CJImporter } from "@/components/cj-importer";
import { PrintfulImporter } from "@/components/printful-importer";
import { OrdersDashboard } from "@/components/orders-dashboard";
import {
  getFirebaseClientAuth,
} from "@/lib/firebase/client";

import {
  calculateProductPricing,
  calculateProfitMetrics,
  recalculateFromSellingPrice,
  recalculateFromProfit,
  recalculateFromMargin,
  recalculateAllVariantPrices,
} from "@/lib/pricing-engine";
import type { Product, ProductInput, ProductVariantItem } from "@/lib/products";
import type { GeminiOptimizationOutput } from "@/lib/gemini";

type ProductManagerProps = {
  initialProducts: Product[];
};

type FormState = {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  category: string;
  collections: string;
  tags: string;
  brand: string;
  badge: string;
  price: string;
  compare_at_price: string;
  cost_price: string;
  is_cost_editable: boolean;
  price_manually_overridden: boolean;
  last_modified_pricing_field?: "price" | "profit" | "margin" | "auto";
  image: string;
  images: string[];
  variants: ProductVariantItem[];
  sku: string;
  inventory_quantity: string;
  weight: string;
  dimensions: string;
  seo_title: string;
  seo_description: string;
  status: "draft" | "published" | "hidden";
  affiliate_link: string;
  cj_product_id: string;
};

type Notification = {
  kind: "error" | "success";
  message: string;
} | null;

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  category: "",
  collections: "",
  tags: "",
  brand: "",
  badge: "",
  price: "",
  compare_at_price: "",
  cost_price: "",
  is_cost_editable: false,
  price_manually_overridden: false,
  last_modified_pricing_field: "auto",
  image: "",
  images: [],
  variants: [],
  sku: "",
  inventory_quantity: "999",
  weight: "",
  dimensions: "",
  seo_title: "",
  seo_description: "",
  status: "published",
  affiliate_link: "",
  cj_product_id: "",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function readResponse<T>(response: Response) {
  const result = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(result.error || "The request could not be completed.");
  }

  return result;
}

export function ProductManager({ initialProducts }: ProductManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [visibleCount, setVisibleCount] = useState(20);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authIsLoading, setAuthIsLoading] = useState(true);
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [status, setStatus] = useState("");
  const [notification, setNotification] = useState<Notification>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [activeTab, setActiveTab] = useState<"inventory" | "orders" | "analytics" | "cj-import" | "printful-import">("inventory");
  const [newImageUrl, setNewImageUrl] = useState("");

  // Gemini Assistant State
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [geminiRecommendations, setGeminiRecommendations] = useState<GeminiOptimizationOutput | null>(null);
  const [isGeminiWorking, setIsGeminiWorking] = useState(false);
  const [applyGeminiCategory, setApplyGeminiCategory] = useState(false);
  const [hasOptimizedOnce, setHasOptimizedOnce] = useState(false);

  async function handleGeminiAssist() {
    if (!form.title.trim()) {
      setNotification({ kind: "error", message: "Enter a product title first before running Gemini Assist." });
      return;
    }

    if (hasOptimizedOnce && !window.confirm("This product has already been analyzed by Gemini. Re-run analysis?")) {
      return;
    }

    setIsGeminiWorking(true);
    setStatus("Analyzing product with Gemini...");
    setNotification(null);

    try {
      const response = await fetch("/api/admin/gemini/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          short_description: form.short_description,
          description: form.description,
          category: form.category,
          brand: form.brand,
          tags: form.tags,
          variants: form.variants,
          seo_title: form.seo_title,
          seo_description: form.seo_description,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        if (data.error === "Gemini is not configured") {
          setNotification({ kind: "error", message: "Gemini is not configured" });
        } else {
          setNotification({ kind: "error", message: data.error || "Gemini optimization failed." });
        }
        return;
      }

      setGeminiRecommendations(data.recommendations);
      setApplyGeminiCategory(false);
      setHasOptimizedOnce(true);
      setShowGeminiModal(true);
    } catch (err) {
      console.error("Gemini assist error:", err);
      setNotification({ kind: "error", message: "Failed to connect to Gemini service." });
    } finally {
      setIsGeminiWorking(false);
      setStatus("");
    }
  }

  function applyGeminiRecommendations() {
    if (!geminiRecommendations) return;

    setIsDirty(true);
    setForm((c) => {
      let updatedDesc = geminiRecommendations.description;
      if (Array.isArray(geminiRecommendations.bullet_points) && geminiRecommendations.bullet_points.length > 0) {
        const bulletText = "\n\nKey Highlights:\n" + geminiRecommendations.bullet_points.map((b) => `• ${b}`).join("\n");
        if (!updatedDesc.includes("Key Highlights:")) {
          updatedDesc = updatedDesc + bulletText;
        }
      }

      return {
        ...c,
        title: geminiRecommendations.title,
        short_description: geminiRecommendations.short_description,
        description: updatedDesc,
        tags: Array.isArray(geminiRecommendations.tags) ? geminiRecommendations.tags.join(", ") : c.tags,
        seo_title: geminiRecommendations.seo_title,
        seo_description: geminiRecommendations.seo_description,
        ...(applyGeminiCategory && geminiRecommendations.category_suggestion
          ? { category: geminiRecommendations.category_suggestion }
          : {}),
      };
    });

    setShowGeminiModal(false);
    setNotification({
      kind: "success",
      message: "Gemini recommendations applied to form! Click Save Draft or Publish Product to save changes.",
    });
  }

  function makeCoverImage(index: number) {
    if (index <= 0 || index >= form.images.length) return;
    const newImages = [...form.images];
    const [selected] = newImages.splice(index, 1);
    newImages.unshift(selected);
    setIsDirty(true);
    setForm((c) => ({
      ...c,
      image: newImages[0],
      images: newImages,
    }));
  }

  function moveGalleryImage(index: number, direction: "left" | "right") {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= form.images.length) return;
    const newImages = [...form.images];
    const temp = newImages[index];
    newImages[index] = newImages[targetIndex];
    newImages[targetIndex] = temp;
    setIsDirty(true);
    setForm((c) => ({
      ...c,
      image: newImages[0],
      images: newImages,
    }));
  }

  function removeGalleryImage(index: number) {
    const newImages = form.images.filter((_, idx) => idx !== index);
    setIsDirty(true);
    setForm((c) => ({
      ...c,
      image: newImages[0] || "",
      images: newImages,
    }));
  }

  function addGalleryImage() {
    if (!newImageUrl.trim()) return;
    const trimmed = newImageUrl.trim();
    const newImages = [...form.images, trimmed];
    setIsDirty(true);
    setForm((c) => ({
      ...c,
      image: c.image || trimmed,
      images: newImages,
    }));
    setNewImageUrl("");
  }

  // Pagination slice for smooth 60fps rendering
  const visibleProducts = useMemo(() => products.slice(0, visibleCount), [products, visibleCount]);



  // Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseClientAuth(), (user) => {
      setFirebaseUser(user);
      setAuthIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Unsaved changes browser prompt
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function safeSwitchTab(tab: typeof activeTab) {
    if (isDirty && !window.confirm("You have unsaved changes in the product editor. Are you sure you want to switch tabs?")) {
      return;
    }
    setIsDirty(false);
    setActiveTab(tab);
  }

  function updateField(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;

    setIsDirty(true);
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "price" ? { price_manually_overridden: true } : {}),
      ...(name === "title" && !slugWasEdited ? { slug: slugify(value) } : {}),
      ...(name === "title" && !form.seo_title ? { seo_title: value.slice(0, 60) } : {}),
    }));
  }

  function updateSlug(event: ChangeEvent<HTMLInputElement>) {
    setSlugWasEdited(Boolean(event.target.value));
    setIsDirty(true);
    setForm((current) => ({ ...current, slug: slugify(event.target.value) }));
  }

  function resetForm() {
    if (isDirty && !window.confirm("Discard unsaved changes?")) return;
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setSlugWasEdited(false);
    setIsDirty(false);
    setStatus("");
    setGeminiRecommendations(null);
    setHasOptimizedOnce(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function beginEdit(product: Product) {
    setEditingProduct(product);

    let galleryImages: string[] = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      galleryImages = product.images;
    } else if (product.image) {
      galleryImages = [product.image];
    }

    // Derive profit from persisted price + cost so variant prices can be
    // synchronized on load. Always compute from the authoritative source values.
    const loadedCost = Number(product.cost_price) || 0;
    const loadedPrice = Number(product.price) || 0;
    const loadedProfit = parseFloat((loadedPrice - loadedCost).toFixed(2));

    // Synchronize variant prices from per-variant CJ costs + derived profit.
    // This ensures the variant table is correct immediately on edit-load,
    // not only after the first profit-field interaction.
    let loadedVariants = Array.isArray(product.variants) ? product.variants : [];
    if (loadedVariants.length > 0 && loadedCost > 0) {
      const syncResult = recalculateAllVariantPrices(loadedVariants, loadedProfit, loadedCost);
      loadedVariants = syncResult.updatedVariants as ProductVariantItem[];
    }

    setForm({
      title: product.title || "",
      slug: product.slug || "",
      short_description: product.short_description || "",
      description: product.description || "",
      category: product.category || "",
      collections: Array.isArray(product.collections) ? product.collections.join(", ") : product.collections || "",
      tags: Array.isArray(product.tags) ? product.tags.join(", ") : product.tags || "",
      brand: product.brand || "",
      badge: product.badge || "",
      price: product.price?.toString() || "",
      compare_at_price: product.compare_at_price?.toString() || "",
      cost_price: product.cost_price?.toString() || product.price?.toString() || "",
      is_cost_editable: false,
      price_manually_overridden: Boolean(product.price_manually_overridden),
      image: product.image || "",
      images: galleryImages,
      variants: loadedVariants,
      sku: product.sku || "",
      inventory_quantity: product.inventory_quantity?.toString() || "999",
      weight: product.weight || "",
      dimensions: product.dimensions || "",
      seo_title: product.seo_title || product.title || "",
      seo_description: product.seo_description || product.short_description || "",
      status: product.status || "published",
      affiliate_link: product.affiliate_link || "",
      cj_product_id: product.cj_product_id || "",
    });

    setImageFile(null);
    setSlugWasEdited(true);
    setIsDirty(false);
    setNotification(null);
    setStatus("");
    setGeminiRecommendations(null);
    setHasOptimizedOnce(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  // Recalculate single product price using Pricing Engine
  function handleRecalculateSinglePrice() {
    const cost = parseFloat(form.cost_price) || 0;
    if (cost <= 0) {
      setNotification({ kind: "error", message: "Enter a valid Cost Price first to calculate prices." });
      return;
    }

    const pricing = calculateProductPricing(cost, form.category);
    setIsDirty(true);
    setForm((current) => {
      let updatedVariants = current.variants;
      if (current.variants && current.variants.length > 0) {
        const result = recalculateAllVariantPrices(current.variants, pricing.profit, cost);
        updatedVariants = result.updatedVariants as ProductVariantItem[];
      }
      return {
        ...current,
        price: pricing.sellingPrice.toString(),
        compare_at_price: pricing.compareAtPrice.toString(),
        variants: updatedVariants,
        price_manually_overridden: false,
        last_modified_pricing_field: "auto",
      };
    });
    setNotification({
      kind: "success",
      message: `Price recalculated automatically ($${pricing.sellingPrice}, Profit: $${pricing.profit}, Margin: ${pricing.marginPercent}%).`,
    });
  }

  // Recalculate all products that haven't been manually overridden
  async function handleRecalculateAllPrices() {
    if (!window.confirm("Recalculate prices for all products using global pricing rules? (Manually overridden prices will be preserved)")) {
      return;
    }

    setIsWorking(true);
    setStatus("Recalculating prices...");

    try {
      let updatedCount = 0;
      const updatedList = await Promise.all(
        products.map(async (prod) => {
          if (prod.price_manually_overridden) return prod; // Preserve manual override

          const cost = prod.cost_price || prod.price || 0;
          if (cost <= 0) return prod;

          const pricing = calculateProductPricing(cost, prod.category);
          const updatedObj: Product = {
            ...prod,
            price: pricing.sellingPrice,
            compare_at_price: pricing.compareAtPrice,
            profit: pricing.profit,
            margin_percent: pricing.marginPercent,
          };

          // Save update
          try {
            await fetch(`/api/admin/products/${prod.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatedObj),
            });
            updatedCount++;
          } catch (e) {
            console.error("Failed to update product pricing:", e);
          }

          return updatedObj;
        })
      );

      setProducts(updatedList);
      setNotification({
        kind: "success",
        message: `Successfully recalculated pricing for ${updatedCount} products!`,
      });
    } catch (err) {
      console.error("Batch recalculation error:", err);
      setNotification({ kind: "error", message: "Failed to recalculate prices." });
    } finally {
      setIsWorking(false);
      setStatus("");
    }
  }



  // Variant management actions
  function updateVariantField(index: number, key: string, val: any) {
    setIsDirty(true);
    setForm((current) => {
      const updated = [...current.variants];
      updated[index] = { ...updated[index], [key]: val };
      return { ...current, variants: updated };
    });
  }

  function addVariant() {
    setIsDirty(true);
    setForm((current) => ({
      ...current,
      variants: [
        ...current.variants,
        { name: "New Variant", price_delta: 0, stock: 100, sku: "" },
      ],
    }));
  }

  function removeVariant(index: number) {
    setIsDirty(true);
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, i) => i !== index),
    }));
  }

  function validateForm(slug: string) {
    if (!form.title.trim()) return "Title is required.";
    if (!slug) return "Slug is required.";
    if (!form.affiliate_link.trim()) return "Affiliate link is required.";

    try {
      new URL(form.affiliate_link);
    } catch {
      return "Affiliate link must be a valid URL.";
    }

    if (!editingProduct && !imageFile && !form.image && !form.images.length) {
      return "Product main image or gallery image is required.";
    }

    return "";
  }

  async function uploadProductImage(file: File) {
    if (!firebaseUser) {
      throw new Error("Your Firebase session expired. Sign in again.");
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary configuration is missing.");
    }

    setStatus("Uploading image...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary upload failed", errorData);
      throw new Error("Upload Failed");
    }

    const data = await response.json();
    return data.secure_url;
  }

  async function handleSaveProduct(targetStatus: "draft" | "published" | "hidden" = form.status) {
    const generatedSlug = form.slug || slugify(form.title);
    const validationError = validateForm(generatedSlug);

    if (validationError) {
      setNotification({ kind: "error", message: validationError });
      return;
    }

    setIsWorking(true);
    setNotification(null);

    let uploadedImageUrl: string | null = null;

    try {
      if (imageFile) {
        uploadedImageUrl = await uploadProductImage(imageFile);
      }

      const finalMainImage = uploadedImageUrl || form.image || form.images[0] || null;
      const finalGalleryImages = uploadedImageUrl
        ? [uploadedImageUrl, ...form.images.filter((img) => img !== uploadedImageUrl)]
        : form.images;

      const liveCost = parseFloat(form.cost_price) || 0;
      const liveSell = parseFloat(form.price) || 0;
      const liveMetrics = calculateProfitMetrics(liveCost, liveSell);

      const productInput: ProductInput = {
        title: form.title,
        slug: generatedSlug,
        short_description: form.short_description || null,
        description: form.description || null,
        category: form.category || null,
        collections: form.collections ? form.collections.split(",").map((s) => s.trim()).filter(Boolean) : null,
        tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : null,
        brand: form.brand || null,
        badge: form.badge || null,
        price: form.price ? Number(form.price) : null,
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        cost_price: form.cost_price ? Number(form.cost_price) : null,
        profit: liveMetrics.profit,
        margin_percent: liveMetrics.marginPercent,
        price_manually_overridden: form.price_manually_overridden,
        image: finalMainImage,
        images: finalGalleryImages,
        variants: form.variants,
        sku: form.sku || null,
        inventory_quantity: form.inventory_quantity ? Number(form.inventory_quantity) : 999,
        weight: form.weight || null,
        dimensions: form.dimensions || null,
        seo_title: form.seo_title || form.title || null,
        seo_description: form.seo_description || form.short_description || null,
        status: targetStatus,
        affiliate_link: form.affiliate_link,
        cj_product_id: form.cj_product_id || null,
      };

      console.info("[product-save] Values Before Save:", {
        cost_price: form.cost_price,
        price: form.price,
        compare_at_price: form.compare_at_price,
        profit: liveMetrics.profit,
        margin_percent: liveMetrics.marginPercent,
        price_manually_overridden: form.price_manually_overridden,
      });
      console.info("[product-save] Payload Sent from Frontend:", productInput);

      const endpoint = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : "/api/admin/products";

      setStatus(targetStatus === "draft" ? "Saving draft..." : "Publishing product...");

      const response = await fetch(endpoint, {
        body: JSON.stringify(productInput),
        headers: { "Content-Type": "application/json" },
        method: editingProduct ? "PUT" : "POST",
      });
      const result = await readResponse<{ product: Product }>(response);

      if (editingProduct) {
        setProducts((current) =>
          current.map((product) =>
            product.id === result.product.id ? result.product : product,
          ),
        );
      } else {
        setProducts((current) => [result.product, ...current]);
      }

      setIsDirty(false);
      setStatus(targetStatus === "draft" ? "Draft Saved" : "Product Published");
      setNotification({
        kind: "success",
        message: targetStatus === "draft" ? "Product Draft Saved Successfully" : "Product Published & Live on Storefront",
      });
      resetForm();
      router.refresh();
    } catch (error) {
      console.error("[admin] Product save failed.", error);
      setStatus("");
      setNotification({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to save product.",
      });
    } finally {
      setIsWorking(false);
    }
  }

  function promptDelete(product: Product) {
    setDeletingProduct(product);
  }

  async function confirmPermanentDelete() {
    if (!deletingProduct) return;
    const targetProduct = deletingProduct;
    setIsWorking(true);
    setNotification(null);
    setStatus(`Permanently deleting "${targetProduct.title}"...`);

    try {
      console.info("[admin] Executing permanent product delete.", {
        id: targetProduct.id,
        slug: targetProduct.slug,
      });

      const response = await fetch(`/api/admin/products/${targetProduct.id}`, {
        method: "DELETE",
      });

      await readResponse<{ ok: boolean; message?: string }>(response);

      setProducts((current) =>
        current.filter((p) => p.id !== targetProduct.id && p.cj_product_id !== targetProduct.id)
      );

      if (editingProduct?.id === targetProduct.id) {
        setEditingProduct(null);
        setForm(EMPTY_FORM);
        setIsDirty(false);
      }

      console.info("[admin] Product permanent deletion complete.", { id: targetProduct.id });
      setStatus("");
      setNotification({
        kind: "success",
        message: `Product "${targetProduct.title}" has been permanently deleted.`,
      });
      setDeletingProduct(null);
      router.refresh();
    } catch (error) {
      console.error("[admin] Product delete failed.", error);
      setStatus("");
      setNotification({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to delete product.",
      });
    } finally {
      setIsWorking(false);
    }
  }

  async function handleCopyLink(product: Product) {
    const baseUrl = "https://wealth-store.vercel.app";
    const productUrl = `${baseUrl}/products/${product.slug}`;

    try {
      await navigator.clipboard.writeText(productUrl);
      setNotification({
        kind: "success",
        message: "Product link copied",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("[admin] Failed to copy link.", error);
      setNotification({
        kind: "error",
        message: "Failed to copy product link.",
      });
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    await signOut(getFirebaseClientAuth());
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Affiliate Store</p>
          <h1>Product manager</h1>
          <p className="muted">Publish and customize products without changing application code.</p>
        </div>
        <div className="admin-header-actions">
          <button
            className={`button ${activeTab === "inventory" ? "primary" : "secondary"}`}
            onClick={() => safeSwitchTab("inventory")}
            type="button"
          >
            Inventory
          </button>
          <button
            className={`button ${activeTab === "cj-import" ? "primary" : "secondary"}`}
            onClick={() => safeSwitchTab("cj-import")}
            type="button"
          >
            Import from CJ
          </button>
          <button
            className={`button ${activeTab === "printful-import" ? "primary" : "secondary"}`}
            onClick={() => safeSwitchTab("printful-import")}
            type="button"
          >
            Import from Printful
          </button>
          <button
            className={`button ${activeTab === "orders" ? "primary" : "secondary"}`}
            onClick={() => safeSwitchTab("orders")}
            type="button"
          >
            Orders
          </button>
          <button
            className={`button ${activeTab === "analytics" ? "primary" : "secondary"}`}
            onClick={() => safeSwitchTab("analytics")}
            type="button"
          >
            Analytics
          </button>
          <Link className="button secondary" href="/" target="_blank">
            View store
          </Link>
          <button className="button secondary" onClick={handleLogout} type="button">
            Sign out
          </button>
        </div>
      </header>

      {activeTab === "inventory" ? (
        <section className="admin-grid">
          <form className="product-form panel" onSubmit={(e) => { e.preventDefault(); handleSaveProduct("published"); }}>
            <div className="section-heading" style={{ flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <p className="eyebrow">{editingProduct ? "Editing Product" : "New Listing"}</p>
                  {form.status && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background: form.status === "published" ? "rgba(107, 203, 119, 0.2)" : "rgba(201, 168, 76, 0.2)",
                        color: form.status === "published" ? "var(--success)" : "var(--gold)",
                        border: form.status === "published" ? "1px solid rgba(107, 203, 119, 0.4)" : "1px solid rgba(201, 168, 76, 0.4)",
                      }}
                    >
                      {form.status}
                    </span>
                  )}
                  {form.cj_product_id && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontSize: "10px",
                        fontWeight: 600,
                        background: "rgba(255, 255, 255, 0.08)",
                        color: "var(--muted)",
                      }}
                    >
                      CJ PID: {form.cj_product_id}
                    </span>
                  )}
                </div>
                <h2 style={{ margin: "4px 0 0" }}>{editingProduct ? form.title || editingProduct.title : "Add a product"}</h2>
              </div>
              <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
                {editingProduct && (
                  <button className="text-button" onClick={resetForm} type="button">
                    Cancel Edit
                  </button>
                )}
                <button
                  className="button secondary"
                  type="button"
                  disabled={isWorking || isGeminiWorking}
                  onClick={handleGeminiAssist}
                  style={{
                    padding: "8px 14px",
                    fontSize: "12px",
                    background: "linear-gradient(135deg, rgba(201, 168, 76, 0.25) 0%, rgba(120, 80, 220, 0.25) 100%)",
                    borderColor: "rgba(201, 168, 76, 0.5)",
                    color: "var(--foreground)",
                    fontWeight: 700,
                  }}
                  title="Optimize product title, description, tags & SEO with Gemini AI"
                >
                  {isGeminiWorking ? "✨ Analyzing..." : "✨ Gemini Assist"}
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  style={{ padding: "8px 14px", fontSize: "12px" }}
                >
                  Preview Product
                </button>
                <button
                  className="button secondary"
                  type="button"
                  disabled={isWorking}
                  onClick={() => handleSaveProduct("draft")}
                  style={{ padding: "8px 14px", fontSize: "12px" }}
                >
                  Save Draft
                </button>
                <button
                  className="button primary"
                  type="button"
                  disabled={isWorking}
                  onClick={() => handleSaveProduct("published")}
                  style={{ padding: "8px 16px", fontSize: "12px" }}
                >
                  Publish Product
                </button>
              </div>
            </div>

            {/* Form Section 1: Basic Information */}
            <div className="form-section-title" style={{ marginTop: "16px", fontSize: "13px", fontWeight: 700, color: "var(--gold)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
              1. Basic Information
            </div>
            <div className="form-grid" style={{ marginTop: "12px" }}>
              <label className="full-width">
                Product Title *
                <input name="title" onChange={updateField} required value={form.title} placeholder="Enter product title..." />
              </label>

              <label>
                URL Slug *
                <input name="slug" onChange={updateSlug} required value={form.slug} placeholder="product-slug" />
              </label>

              <label>
                Category
                <input name="category" onChange={updateField} value={form.category} placeholder="e.g. Clothing, Electronics" />
              </label>

              <label>
                Brand
                <input name="brand" onChange={updateField} value={form.brand} placeholder="e.g. Curated Luxury, CJ Direct" />
              </label>

              <label>
                Badge / Tagline
                <input name="badge" onChange={updateField} placeholder="Editor's Pick, Best Seller" value={form.badge} />
              </label>

              <label>
                Collections (comma separated)
                <input name="collections" onChange={updateField} value={form.collections} placeholder="Featured, New Arrivals" />
              </label>

              <label>
                Tags (comma separated)
                <input name="tags" onChange={updateField} value={form.tags} placeholder="luxury, summer, fashion" />
              </label>

              <label className="full-width">
                Affiliate Link / Buy URL *
                <input
                  name="affiliate_link"
                  onChange={updateField}
                  placeholder="https://..."
                  required
                  type="url"
                  value={form.affiliate_link}
                />
              </label>
            </div>

            {/* Form Section 2: Descriptions */}
            <div className="form-section-title" style={{ marginTop: "24px", fontSize: "13px", fontWeight: 700, color: "var(--gold)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
              2. Descriptions
            </div>
            <div className="form-grid" style={{ marginTop: "12px" }}>
              <label className="full-width">
                Short Description (Summary preview)
                <textarea
                  name="short_description"
                  onChange={updateField}
                  rows={2}
                  value={form.short_description}
                  placeholder="Short 1-2 sentence overview for product cards..."
                />
              </label>

              <label className="full-width">
                Full Description (Rich Details)
                <textarea
                  name="description"
                  onChange={updateField}
                  rows={5}
                  value={form.description}
                  placeholder="Detailed product overview, materials, features, specifications..."
                />
              </label>
            </div>

            {/* Form Section 3: Bi-Directional Pricing Engine */}
            <div className="form-section-title" style={{ marginTop: "24px", fontSize: "13px", fontWeight: 700, color: "var(--gold)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
              3. Bi-Directional Pricing Engine (Fixed Base: CJ Cost Price)
            </div>
            {(() => {
              const liveCost = parseFloat(form.cost_price) || 0;
              const livePrice = parseFloat(form.price) || 0;
              const liveMetrics = calculateProfitMetrics(liveCost, livePrice);
              const activeSource = form.last_modified_pricing_field || (form.price_manually_overridden ? "price" : "auto");

              return (
                <div className="form-grid" style={{ marginTop: "12px" }}>
                  {/* Field 1: Landed Cost ($) */}
                  <label>
                    Landed Cost ($) {form.cj_product_id ? "— CJ Total" : ""}
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <input
                        min="0"
                        name="cost_price"
                        onChange={(e) => {
                          updateField(e);
                          const newCost = parseFloat(e.target.value) || 0;
                          if (activeSource === "margin" && liveMetrics.marginPercent) {
                            const res = recalculateFromMargin(newCost, liveMetrics.marginPercent);
                            setForm((c) => {
                              let updatedVariants = c.variants;
                              if (c.variants && c.variants.length > 0) {
                                const result = recalculateAllVariantPrices(c.variants, res.profit, newCost);
                                updatedVariants = result.updatedVariants as ProductVariantItem[];
                              }
                              return { ...c, price: res.sellingPrice.toString(), variants: updatedVariants };
                            });
                          } else if (activeSource === "profit" && liveMetrics.profit) {
                            const res = recalculateFromProfit(newCost, liveMetrics.profit);
                            setForm((c) => {
                              let updatedVariants = c.variants;
                              if (c.variants && c.variants.length > 0) {
                                const result = recalculateAllVariantPrices(c.variants, liveMetrics.profit, newCost);
                                updatedVariants = result.updatedVariants as ProductVariantItem[];
                              }
                              return { ...c, price: res.sellingPrice.toString(), variants: updatedVariants };
                            });
                          }
                        }}
                        step="0.01"
                        type="number"
                        readOnly={!form.is_cost_editable && Boolean(form.cj_product_id)}
                        value={form.cost_price}
                        placeholder="Supplier cost price"
                        style={{ background: (!form.is_cost_editable && Boolean(form.cj_product_id)) ? "rgba(255,255,255,0.03)" : undefined }}
                      />
                      {form.cj_product_id && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => setForm((c) => ({ ...c, is_cost_editable: !c.is_cost_editable }))}
                          style={{ fontSize: "11px", whiteSpace: "nowrap" }}
                        >
                          {form.is_cost_editable ? "Lock" : "Edit"}
                        </button>
                      )}
                    </div>
                  </label>

                  {/* Field 2: Selling Price ($) */}
                  <label>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Selling Price ($) *</span>
                      {activeSource === "price" && (
                        <span style={{ fontSize: "9px", background: "rgba(201, 168, 76, 0.25)", color: "var(--gold)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, border: "1px solid rgba(201, 168, 76, 0.4)" }}>
                          ✏️ Price Edit Mode
                        </span>
                      )}
                      {activeSource === "auto" && (
                        <span style={{ fontSize: "9px", background: "rgba(76, 175, 80, 0.2)", color: "#81c784", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                          🤖 Auto-Suggested
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <input
                        min="0"
                        name="price"
                        onChange={(e) => {
                          const val = e.target.value;
                          const sellVal = parseFloat(val) || 0;
                          const res = recalculateFromSellingPrice(liveCost, sellVal);
                          setIsDirty(true);
                          setForm((c) => ({
                            ...c,
                            price: val,
                            price_manually_overridden: true,
                            last_modified_pricing_field: "price",
                          }));
                        }}
                        step="0.01"
                        type="number"
                        value={form.price}
                        placeholder="0.00"
                        style={{
                          borderColor: activeSource === "price" ? "var(--gold)" : undefined,
                          boxShadow: activeSource === "price" ? "0 0 0 1px var(--gold)" : undefined,
                        }}
                      />
                      <button
                        type="button"
                        className="button secondary"
                        onClick={handleRecalculateSinglePrice}
                        style={{ padding: "6px 10px", fontSize: "11px", whiteSpace: "nowrap" }}
                        title="Auto-calculate price using global markup tier & category rules"
                      >
                        Auto-Price
                      </button>
                    </div>
                  </label>

                  {/* Field 3: Compare At Price ($) */}
                  <label>
                    Compare At Price ($)
                    <input
                      min="0"
                      name="compare_at_price"
                      onChange={updateField}
                      step="0.01"
                      type="number"
                      value={form.compare_at_price}
                      placeholder="MSRP before discount"
                    />
                  </label>

                  {/* Field 4: Net Profit ($) - EDITABLE */}
                  <label>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Net Profit ($)</span>
                      {activeSource === "profit" && (
                        <span style={{ fontSize: "9px", background: "rgba(201, 168, 76, 0.25)", color: "var(--gold)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, border: "1px solid rgba(201, 168, 76, 0.4)" }}>
                          ✏️ Profit Mode
                        </span>
                      )}
                    </div>
                    <input
                      step="0.01"
                      type="number"
                      value={liveMetrics.profit}
                      onChange={(e) => {
                        const newProfit = parseFloat(e.target.value) || 0;
                        const res = recalculateFromProfit(liveCost, newProfit);
                        setIsDirty(true);
                        setForm((c) => {
                          let updatedVariants = c.variants;
                          if (c.variants && c.variants.length > 0) {
                            const result = recalculateAllVariantPrices(c.variants, newProfit, liveCost);
                            updatedVariants = result.updatedVariants as ProductVariantItem[];
                          }
                          return {
                            ...c,
                            price: res.sellingPrice.toString(),
                            profit: newProfit,
                            variants: updatedVariants,
                            price_manually_overridden: true,
                            last_modified_pricing_field: "profit",
                          };
                        });
                      }}
                      style={{
                        borderColor: activeSource === "profit" ? "var(--gold)" : undefined,
                        boxShadow: activeSource === "profit" ? "0 0 0 1px var(--gold)" : undefined,
                        color: liveMetrics.profit > 0 ? "var(--success)" : "var(--foreground-secondary)",
                        fontWeight: 700,
                      }}
                    />
                  </label>

                  {/* Field 5: Profit Margin (%) - EDITABLE */}
                  <label>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Profit Margin (%)</span>
                      {activeSource === "margin" && (
                        <span style={{ fontSize: "9px", background: "rgba(201, 168, 76, 0.25)", color: "var(--gold)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, border: "1px solid rgba(201, 168, 76, 0.4)" }}>
                          ✏️ Margin Mode
                        </span>
                      )}
                    </div>
                    <input
                      step="0.1"
                      type="number"
                      value={liveMetrics.marginPercent}
                      onChange={(e) => {
                        const newMargin = parseFloat(e.target.value) || 0;
                        const res = recalculateFromMargin(liveCost, newMargin);
                        setIsDirty(true);
                        setForm((c) => {
                          let updatedVariants = c.variants;
                          if (c.variants && c.variants.length > 0) {
                            const result = recalculateAllVariantPrices(c.variants, res.profit, liveCost);
                            updatedVariants = result.updatedVariants as ProductVariantItem[];
                          }
                          return {
                            ...c,
                            price: res.sellingPrice.toString(),
                            variants: updatedVariants,
                            price_manually_overridden: true,
                            last_modified_pricing_field: "margin",
                          };
                        });
                      }}
                      style={{
                        borderColor: activeSource === "margin" ? "var(--gold)" : undefined,
                        boxShadow: activeSource === "margin" ? "0 0 0 1px var(--gold)" : undefined,
                        color: liveMetrics.marginPercent > 40 ? "var(--gold)" : "var(--foreground-secondary)",
                        fontWeight: 700,
                      }}
                    />
                  </label>
                </div>
              );
            })()}

            {/* Form Section 4: Images & Gallery Manager */}
            <div className="form-section-title" style={{ marginTop: "24px", fontSize: "13px", fontWeight: 700, color: "var(--gold)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
              4. Media & Gallery Manager ({form.images.length} Images)
            </div>
            <div className="form-grid" style={{ marginTop: "12px" }}>
              <label className="full-width">
                Upload New Image (Cloudinary)
                <input
                  accept="image/*"
                  onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                  ref={fileInputRef}
                  type="file"
                />
              </label>

              <div className="full-width" style={{ marginTop: "8px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Product Gallery ({form.images.length} Images)</label>
                
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                  {form.images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: "relative",
                        width: "110px",
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: idx === 0 ? "2px solid var(--gold)" : "1px solid rgba(255,255,255,0.1)",
                        boxShadow: idx === 0 ? "0 0 12px rgba(201,168,76,0.3)" : "none",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {/* Image Thumbnail */}
                      <div style={{ position: "relative", width: "100%", height: "85px", background: "#000" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgUrl} alt={`Gallery ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {idx === 0 && (
                          <span style={{ position: "absolute", top: "4px", left: "4px", background: "rgba(201,168,76,0.95)", color: "#070710", fontSize: "9px", fontWeight: 800, padding: "2px 6px", borderRadius: "4px" }}>
                            COVER
                          </span>
                        )}
                      </div>

                      {/* Controls Toolbar */}
                      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "4px 2px", background: "rgba(0,0,0,0.6)" }}>
                        <button
                          type="button"
                          onClick={() => moveGalleryImage(idx, "left")}
                          disabled={idx === 0}
                          style={{ background: "none", border: "none", color: idx === 0 ? "#555" : "#fff", cursor: idx === 0 ? "default" : "pointer", fontSize: "11px", padding: "2px 4px" }}
                          title="Move Left"
                        >
                          ←
                        </button>

                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => makeCoverImage(idx)}
                            style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontSize: "10px", fontWeight: 700, padding: "2px 4px" }}
                            title="Make Cover Image"
                          >
                            Set Cover
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => moveGalleryImage(idx, "right")}
                          disabled={idx === form.images.length - 1}
                          style={{ background: "none", border: "none", color: idx === form.images.length - 1 ? "#555" : "#fff", cursor: idx === form.images.length - 1 ? "default" : "pointer", fontSize: "11px", padding: "2px 4px" }}
                          title="Move Right"
                        >
                          →
                        </button>

                        <button
                          type="button"
                          onClick={() => removeGalleryImage(idx)}
                          style={{ background: "none", border: "none", color: "#ff5f56", cursor: "pointer", fontSize: "11px", padding: "2px 4px" }}
                          title="Delete image"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="url"
                    placeholder="Paste image URL to add to gallery..."
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="button secondary" onClick={addGalleryImage} style={{ padding: "8px 14px", fontSize: "12px" }}>
                    + Add Image
                  </button>
                </div>
              </div>
            </div>

            {/* Form Section 5: Variants & Inventory */}
            <div className="form-section-title" style={{ marginTop: "24px", fontSize: "13px", fontWeight: 700, color: "var(--gold)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
              5. Variants & Inventory
            </div>
            <div className="form-grid" style={{ marginTop: "12px" }}>
              <label>
                Master SKU
                <input name="sku" onChange={updateField} value={form.sku} placeholder="SUP-SKU-100" />
              </label>

              <label>
                Inventory Stock Quantity
                <input name="inventory_quantity" onChange={updateField} type="number" value={form.inventory_quantity} placeholder="999" />
              </label>

              <label>
                Weight (g / kg / lbs)
                <input name="weight" onChange={updateField} value={form.weight} placeholder="e.g. 450g" />
              </label>

              <label>
                Dimensions (L × W × H)
                <input name="dimensions" onChange={updateField} value={form.dimensions} placeholder="e.g. 20 × 15 × 10 cm" />
              </label>

              {/* Variants table editor */}
              <div className="full-width" style={{ marginTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ margin: 0 }}>Product Variants ({form.variants.length})</label>
                  <button type="button" className="text-button" onClick={addVariant} style={{ fontSize: "12px", textDecoration: "underline" }}>
                    + Add Variant
                  </button>
                </div>

                {form.variants.length > 0 ? (
                  <table className="cj-table" style={{ background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "50px" }}>Image</th>
                        <th>Variant Name</th>
                        <th style={{ width: "100px" }}>Color</th>
                        <th style={{ width: "90px" }}>Size</th>
                        <th>SKU</th>
                        <th style={{ width: "140px" }}>CJ VID</th>
                        <th style={{ width: "90px" }}>Cost ($)</th>
                        <th style={{ width: "90px" }}>Price ($)</th>
                        <th style={{ width: "80px" }}>Stock</th>
                        <th style={{ width: "60px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.variants.map((v, vIdx) => (
                        <tr key={vIdx}>
                          <td>
                            {v.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={v.image} alt="v" style={{ width: "36px", height: "36px", borderRadius: "4px", objectFit: "cover" }} />
                            ) : (
                              <div className="cj-table-thumb-placeholder" style={{ width: "36px", height: "36px", fontSize: "10px" }}>No Img</div>
                            )}
                          </td>
                          <td>
                            <input
                              type="text"
                              value={v.name}
                              onChange={(e) => updateVariantField(vIdx, "name", e.target.value)}
                              style={{ padding: "4px 8px", fontSize: "12px" }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={v.color || ""}
                              placeholder="Color"
                              onChange={(e) => updateVariantField(vIdx, "color", e.target.value)}
                              style={{ padding: "4px 8px", fontSize: "12px" }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={v.size || ""}
                              placeholder="Size"
                              onChange={(e) => updateVariantField(vIdx, "size", e.target.value)}
                              style={{ padding: "4px 8px", fontSize: "12px" }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={v.sku || ""}
                              placeholder="SKU"
                              onChange={(e) => updateVariantField(vIdx, "sku", e.target.value)}
                              style={{ padding: "4px 8px", fontSize: "12px" }}
                            />
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: "11px",
                                fontFamily: "monospace",
                                color: "var(--gold)",
                                background: "rgba(255,255,255,0.05)",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                display: "inline-block",
                                maxWidth: "130px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={v.cj_variant_id || v.id || ""}
                            >
                              {v.cj_variant_id || v.id || "N/A"}
                            </span>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={v.cost_price ?? (parseFloat(form.cost_price) || 0)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                updateVariantField(vIdx, "cost_price", val);
                                const productCost = parseFloat(form.cost_price) || 0;
                                const productPrice = parseFloat(form.price) || 0;
                                const currentProfit = productPrice - productCost;
                                const newPrice = parseFloat((val + currentProfit).toFixed(2));
                                updateVariantField(vIdx, "price", newPrice);
                              }}
                              style={{ padding: "4px 8px", fontSize: "12px", width: "90px", color: "var(--muted)" }}
                              title="Individual variant supplier cost price"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={(() => {
                                // Display priority: explicit variant price → variantCost + derivedProfit → 0
                                // Never fall back to baseProductPrice + delta (would hide per-variant cost differences)
                                if (v.price != null) return v.price;
                                const vCost = v.cost_price != null ? Number(v.cost_price) : (parseFloat(form.cost_price) || 0);
                                const derivedProfit = (parseFloat(form.price) || 0) - (parseFloat(form.cost_price) || 0);
                                return parseFloat((vCost + Math.max(0, derivedProfit)).toFixed(2));
                              })()}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const basePrice = parseFloat(form.price) || 0;
                                updateVariantField(vIdx, "price", val);
                                updateVariantField(vIdx, "price_delta", parseFloat((val - basePrice).toFixed(2)));
                              }}
                              style={{ padding: "4px 8px", fontSize: "12px", width: "90px" }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={v.stock}
                              onChange={(e) => updateVariantField(vIdx, "stock", parseInt(e.target.value, 10) || 0)}
                              style={{ padding: "4px 8px", fontSize: "12px", width: "80px" }}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="text-button danger"
                              onClick={() => removeVariant(vIdx)}
                              style={{ fontSize: "12px" }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="muted" style={{ fontSize: "12px", margin: 0 }}>No custom variants defined for this product.</p>
                )}
              </div>
            </div>

            {/* Form Section 6: SEO Metadata */}
            <div className="form-section-title" style={{ marginTop: "24px", fontSize: "13px", fontWeight: 700, color: "var(--gold)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
              6. Search Engine Optimization (SEO)
            </div>
            <div className="form-grid" style={{ marginTop: "12px" }}>
              <label className="full-width">
                SEO Meta Title
                <input name="seo_title" onChange={updateField} value={form.seo_title} placeholder="Custom SEO Page Title..." />
              </label>

              <label className="full-width">
                SEO Meta Description
                <textarea
                  name="seo_description"
                  onChange={updateField}
                  rows={2}
                  value={form.seo_description}
                  placeholder="Compelling meta description for Google search results..."
                />
              </label>
            </div>

            {/* Form Section 7: Status & Submit */}
            <div className="form-section-title" style={{ marginTop: "24px", fontSize: "13px", fontWeight: 700, color: "var(--gold)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
              7. Listing Status
            </div>
            <div className="form-grid" style={{ marginTop: "12px" }}>
              <label>
                Status
                <select name="status" value={form.status} onChange={updateField} className="cj-select">
                  <option value="published">Published (Visible on Storefront)</option>
                  <option value="draft">Draft (Review / Private)</option>
                  <option value="hidden">Hidden (Archived)</option>
                </select>
              </label>
            </div>

            {status ? <p className="status" style={{ marginTop: "16px" }}>{status}</p> : null}
            {notification ? (
              <p className={`notification ${notification.kind}`} style={{ marginTop: "16px" }}>{notification.message}</p>
            ) : null}

            <div style={{ marginTop: "24px", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                className="button secondary"
                disabled={isWorking}
                type="button"
                onClick={() => handleSaveProduct("draft")}
              >
                Save Draft
              </button>
              <button
                className="button primary"
                disabled={isWorking}
                type="button"
                onClick={() => handleSaveProduct("published")}
              >
                {isWorking ? status || "Saving..." : editingProduct ? "Save & Publish Changes" : "Confirm & Publish Product"}
              </button>
            </div>
          </form>

          {/* Right column: Inventory list */}
          <section className="product-list panel">
            <div className="section-heading" style={{ flexWrap: "wrap", gap: "8px" }}>
              <div>
                <p className="eyebrow">Inventory Catalog</p>
                <h2>{products.length} Products</h2>
              </div>
              <button
                type="button"
                className="button secondary"
                onClick={handleRecalculateAllPrices}
                disabled={isWorking}
                style={{ marginLeft: "auto", fontSize: "11px", padding: "6px 12px" }}
                title="Recalculate prices for all non-overridden catalog items using global pricing rules"
              >
                Recalculate Prices
              </button>
            </div>

            {products.length ? (
              <>
                <div className="admin-products">
                  {visibleProducts.map((product) => (
                    <article className="admin-product" key={product.id}>
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" src={product.image} loading="lazy" decoding="async" />
                      ) : (
                        <div className="image-placeholder">No image</div>
                      )}
                      <div className="admin-product-details">
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <strong>{product.title}</strong>
                          {product.supplier_type === "PRINTFUL" || product.printful_sync_id || product.id.startsWith("pf-sync-") ? (
                            <span style={{ fontSize: "9px", background: "rgba(201, 168, 76, 0.2)", color: "#F3E5AB", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, border: "1px solid rgba(201, 168, 76, 0.4)" }}>
                              🖨️ PRINTFUL
                            </span>
                          ) : product.supplier_type === "CJ" || product.cj_product_id || product.id.startsWith("cj-") ? (
                            <span style={{ fontSize: "9px", background: "rgba(255, 102, 0, 0.2)", color: "#FF8C00", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, border: "1px solid rgba(255, 102, 0, 0.4)" }}>
                              📦 CJ DROPSHIPPING
                            </span>
                          ) : (
                            <span style={{ fontSize: "9px", background: "rgba(52, 152, 219, 0.2)", color: "#3498DB", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, border: "1px solid rgba(52, 152, 219, 0.4)" }}>
                              🏢 MANUAL
                            </span>
                          )}
                          {product.status === "draft" && (
                            <span style={{ fontSize: "9px", background: "rgba(201, 168, 76, 0.2)", color: "var(--gold)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>DRAFT</span>
                          )}
                        </div>
                        <span>/{product.slug}</span>
                        <div className="product-actions">
                          <button
                            className="text-button"
                            onClick={() => handleCopyLink(product)}
                            style={{ alignItems: "center", display: "inline-flex", gap: "4px" }}
                            type="button"
                          >
                            Get Link
                          </button>
                          <button
                            className="text-button"
                            onClick={() => beginEdit(product)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="text-button danger"
                            disabled={isWorking}
                            onClick={() => promptDelete(product)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {products.length > visibleCount && (
                  <div style={{ marginTop: "16px", textAlign: "center" }}>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setVisibleCount((prev) => prev + 20)}
                      style={{ fontSize: "12px", padding: "8px 16px" }}
                    >
                      Load More Products (Showing {visibleProducts.length} of {products.length})
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="empty-state">No products yet. Import or create your first listing.</p>
            )}
          </section>
        </section>
      ) : activeTab === "cj-import" ? (
        <CJImporter
          onProductImported={async (importedProduct?: Product) => {
            try {
              const response = await fetch("/api/admin/products");
              if (response.ok) {
                const data = await response.json();
                if (data.products) setProducts(data.products);
                const target = importedProduct || (data.products && data.products[0]);
                if (target) {
                  beginEdit(target);
                  setActiveTab("inventory");
                  setNotification({
                    kind: "success",
                    message: `Product imported! Pre-filled in editor below as DRAFT. Customize and click Publish.`,
                  });
                }
              }
            } catch (e) {
              console.error("Failed to refresh products after import", e);
            }
          }}
        />
      ) : activeTab === "printful-import" ? (
        <PrintfulImporter
          onProductImported={async (importedProduct) => {
            try {
              const response = await fetch("/api/admin/products");
              if (response.ok) {
                const data = await response.json();
                if (data.products) setProducts(data.products);
                const target = importedProduct || (data.products && data.products[0]);
                if (target) {
                  beginEdit(target);
                  setActiveTab("inventory");
                  setNotification({
                    kind: "success",
                    message: `Printful product imported! Pre-filled in editor below. Customize and click Publish.`,
                  });
                }
              }
            } catch (e) {
              console.error("Failed to refresh products after Printful import", e);
            }
          }}
        />
      ) : activeTab === "orders" ? (
        <OrdersDashboard />
      ) : (
        <AnalyticsDashboard />
      )}

      {/* Product Live Preview Modal */}
      {showPreviewModal && (
        <div className="cj-modal-backdrop" onClick={() => setShowPreviewModal(false)}>
          <div className="panel cj-detail-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px" }}>
            <div className="cj-modal-header">
              <div>
                <p className="eyebrow" style={{ color: "var(--gold)" }}>Storefront Live Preview</p>
                <h3>{form.title || "Untitled Product"}</h3>
              </div>
              <button type="button" className="text-button" onClick={() => setShowPreviewModal(false)} style={{ fontSize: "20px" }}>
                ✕
              </button>
            </div>

            <div className="cj-overview-grid" style={{ marginTop: "16px" }}>
              <div className="cj-gallery">
                {form.image || form.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image || form.images[0]} alt="Preview" className="cj-main-img" />
                ) : (
                  <div className="image-placeholder" style={{ height: "240px" }}>No Main Image</div>
                )}
                {form.images.length > 1 && (
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px", overflowX: "auto" }}>
                    {form.images.map((img, i) => (
                      <img key={i} src={img} alt="" style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px" }} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                {form.badge && <span className="cart-drawer-count" style={{ display: "inline-block", marginBottom: "8px" }}>{form.badge}</span>}
                <h2 style={{ fontFamily: "Playfair Display, Georgia, serif", margin: "4px 0 12px", fontSize: "22px" }}>{form.title}</h2>
                
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "24px", fontWeight: 700, color: "var(--gold)", fontFamily: "Playfair Display, serif" }}>
                    ${form.price || "0.00"}
                  </span>
                  {form.compare_at_price && (
                    <span style={{ textDecoration: "line-through", color: "var(--muted)", fontSize: "14px" }}>
                      ${form.compare_at_price}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: "13px", color: "var(--foreground-secondary)", lineHeight: 1.5, marginBottom: "16px" }}>
                  {form.short_description || form.description?.slice(0, 140) || "No description provided."}
                </p>

                {form.variants.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Variants ({form.variants.length})</label>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {form.variants.map((v, i) => (
                        <span key={i} className="cj-tag" style={{ border: i === 0 ? "1px solid var(--gold)" : undefined }}>
                          {v.name} (+${v.price_delta})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button type="button" className="cart-checkout-btn" style={{ width: "100%", marginTop: "12px" }}>
                  Add to Cart (Live Preview)
                </button>
              </div>
            </div>

            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="button secondary" onClick={() => setShowPreviewModal(false)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    
      {/* Permanent Delete Confirmation Modal (Requirement 2) */}
      {deletingProduct && (
        <div className="cj-modal-backdrop" onClick={() => setDeletingProduct(null)}>
          <div
            className="panel cj-prompt-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "500px", textAlign: "left" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p className="eyebrow" style={{ color: "var(--danger, #eb5757)" }}>Permanent Action</p>
                <h3 style={{ margin: "4px 0 0", fontSize: "20px" }}>Delete Product?</h3>
              </div>
              <button
                type="button"
                className="cj-modal-close-btn"
                onClick={() => setDeletingProduct(null)}
              >
                ✕
              </button>
            </div>

            <p style={{ marginTop: "12px", color: "var(--foreground)", fontWeight: 600 }}>
              This action is permanent.
            </p>

            <div style={{ background: "rgba(235, 87, 87, 0.06)", border: "1px solid rgba(235, 87, 87, 0.2)", borderRadius: "12px", padding: "14px", margin: "14px 0" }}>
              <p style={{ margin: "0 0 8px", fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>
                The following will be deleted:
              </p>
              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "var(--foreground-secondary)", lineHeight: 1.6 }}>
                <li>Product (<strong>{deletingProduct.title}</strong>)</li>
                <li>Images</li>
                <li>Variants</li>
                <li>Inventory</li>
                <li>SEO data</li>
                <li>CJ mapping</li>
                <li>Any related product records</li>
              </ul>
            </div>

            <p style={{ color: "var(--danger, #eb5757)", fontSize: "13px", fontWeight: 700, margin: "0 0 20px" }}>
              This action cannot be undone.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setDeletingProduct(null)}
                disabled={isWorking}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button primary"
                disabled={isWorking}
                onClick={confirmPermanentDelete}
                style={{
                  background: "linear-gradient(135deg, #eb5757 0%, #c0392b 100%)",
                  borderColor: "#eb5757",
                  color: "#fff",
                }}
              >
                {isWorking ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini Prepared Improvements Review Modal */}
      {showGeminiModal && geminiRecommendations && (
        <div className="cj-modal-backdrop" onClick={() => setShowGeminiModal(false)}>
          <div
            className="panel cj-detail-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "780px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="cj-modal-header">
              <div>
                <p className="eyebrow" style={{ color: "var(--gold)" }}>✨ Gemini Merchandising Assistant</p>
                <h3 style={{ margin: "4px 0 0" }}>Gemini Prepared Improvements</h3>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setShowGeminiModal(false)}
                style={{ fontSize: "20px" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "12px 0 16px" }}>
              Review Gemini&apos;s recommendations below. Click <strong>Apply Improvements</strong> to copy recommendations into the editor form. Changes are only published when you save the product.
            </p>

            {geminiRecommendations.warnings && geminiRecommendations.warnings.length > 0 && (
              <div style={{ background: "rgba(235, 87, 87, 0.1)", border: "1px solid rgba(235, 87, 87, 0.3)", borderRadius: "8px", padding: "10px 14px", margin: "0 0 16px", fontSize: "12px", color: "var(--danger, #eb5757)" }}>
                <strong>⚠️ Fact-Preservation Warning:</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: "20px" }}>
                  {geminiRecommendations.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Field 1: Title */}
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--gold)", display: "block", marginBottom: "4px" }}>Product Title</label>
                <div style={{ fontSize: "13px" }}>
                  <div style={{ color: "var(--muted)", marginBottom: "4px" }}>Current: <em>{form.title}</em></div>
                  <div style={{ color: "var(--foreground)", fontWeight: 600 }}>Suggested: <strong>{geminiRecommendations.title}</strong></div>
                </div>
              </div>

              {/* Field 2: Short Description */}
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--gold)", display: "block", marginBottom: "4px" }}>Short Description</label>
                <div style={{ fontSize: "13px" }}>
                  <div style={{ color: "var(--muted)", marginBottom: "4px" }}>Current: {form.short_description || "(None)"}</div>
                  <div style={{ color: "var(--foreground)" }}>Suggested: {geminiRecommendations.short_description}</div>
                </div>
              </div>

              {/* Field 3: Full Description */}
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--gold)", display: "block", marginBottom: "4px" }}>Full Description</label>
                <div style={{ fontSize: "13px" }}>
                  <div style={{ color: "var(--muted)", marginBottom: "6px", maxHeight: "80px", overflowY: "auto" }}>Current: {form.description || "(None)"}</div>
                  <div style={{ color: "var(--foreground)", maxHeight: "120px", overflowY: "auto", whiteSpace: "pre-wrap" }}>Suggested: {geminiRecommendations.description}</div>
                </div>
              </div>

              {/* Field 4: Bullet Points */}
              {Array.isArray(geminiRecommendations.bullet_points) && geminiRecommendations.bullet_points.length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--gold)", display: "block", marginBottom: "4px" }}>Suggested Key Highlights (Bullet Points)</label>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "var(--foreground)", lineHeight: 1.5 }}>
                    {geminiRecommendations.bullet_points.map((bp, i) => (
                      <li key={i}>{bp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Field 5: Tags */}
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--gold)", display: "block", marginBottom: "4px" }}>Tags</label>
                <div style={{ fontSize: "13px" }}>
                  <div style={{ color: "var(--muted)", marginBottom: "4px" }}>Current: {form.tags || "(None)"}</div>
                  <div style={{ color: "var(--foreground)" }}>Suggested: {geminiRecommendations.tags.join(", ")}</div>
                </div>
              </div>

              {/* Field 6: Category Suggestion (Requirement #4: Explicit Confirmation) */}
              <div style={{ background: "rgba(201, 168, 76, 0.08)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(201, 168, 76, 0.3)" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--gold)", display: "block", marginBottom: "4px" }}>Category Suggestion</label>
                <div style={{ fontSize: "13px", marginBottom: "8px" }}>
                  <span style={{ color: "var(--muted)" }}>Current Category: <strong>{form.category || "(Uncategorized)"}</strong></span>
                  <br />
                  <span style={{ color: "var(--foreground)" }}>Gemini Suggested Category: <strong>{geminiRecommendations.category_suggestion || "(None)"}</strong></span>
                </div>
                {geminiRecommendations.category_suggestion && (
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", color: "var(--gold)", fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={applyGeminiCategory}
                      onChange={(e) => setApplyGeminiCategory(e.target.checked)}
                    />
                    Explicitly confirm category change to &quot;{geminiRecommendations.category_suggestion}&quot;
                  </label>
                )}
              </div>

              {/* Field 7: SEO Title & Description */}
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--gold)", display: "block", marginBottom: "4px" }}>SEO Meta Title & Description</label>
                <div style={{ fontSize: "13px" }}>
                  <div style={{ color: "var(--foreground)", fontWeight: 600 }}>Title: {geminiRecommendations.seo_title}</div>
                  <div style={{ color: "var(--muted)", marginTop: "4px" }}>Description: {geminiRecommendations.seo_description}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setShowGeminiModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button primary"
                onClick={applyGeminiRecommendations}
              >
                Apply Improvements
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default ProductManager;

