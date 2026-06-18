"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import {
  getFirebaseClientAuth,
} from "@/lib/firebase/client";
import type { Product, ProductInput } from "@/lib/products";

type ProductManagerProps = {
  initialProducts: Product[];
};

type FormState = {
  affiliate_link: string;
  badge: string;
  category: string;
  description: string;
  image: string;
  price: string;
  slug: string;
  title: string;
};

type Notification = {
  kind: "error" | "success";
  message: string;
} | null;

const EMPTY_FORM: FormState = {
  affiliate_link: "",
  badge: "",
  category: "",
  description: "",
  image: "",
  price: "",
  slug: "",
  title: "",
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
  const [products, setProducts] = useState(initialProducts);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authIsLoading, setAuthIsLoading] = useState(true);
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const [status, setStatus] = useState("");
  const [notification, setNotification] = useState<Notification>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [activeTab, setActiveTab] = useState<"inventory" | "analytics">("inventory");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseClientAuth(), (user) => {
      setFirebaseUser(user);
      setAuthIsLoading(false);
    });

    return unsubscribe;
  }, []);

  function updateField(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "title" && !slugWasEdited ? { slug: slugify(value) } : {}),
    }));
  }

  function updateSlug(event: ChangeEvent<HTMLInputElement>) {
    setSlugWasEdited(Boolean(event.target.value));
    setForm((current) => ({ ...current, slug: slugify(event.target.value) }));
  }

  function resetForm() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setSlugWasEdited(false);
    setStatus("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function beginEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      affiliate_link: product.affiliate_link,
      badge: product.badge ?? "",
      category: product.category ?? "",
      description: product.description ?? "",
      image: product.image ?? "",
      price: product.price?.toString() ?? "",
      slug: product.slug,
      title: product.title,
    });
    setImageFile(null);
    setSlugWasEdited(true);
    setNotification(null);
    setStatus("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    window.scrollTo({ behavior: "smooth", top: 0 });
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

    if (!editingProduct && !imageFile) return "Product image is required.";

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

    console.log("upload start");
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
    const imageUrl = data.secure_url;

    console.log("upload success");
    console.log("image url", imageUrl);

    return imageUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

      const productInput: ProductInput = {
        affiliate_link: form.affiliate_link,
        badge: form.badge || null,
        category: form.category || null,
        description: form.description || null,
        image: uploadedImageUrl || form.image || null,
        price: form.price ? Number(form.price) : null,
        slug: generatedSlug,
        title: form.title,
      };
      const endpoint = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : "/api/admin/products";

      setStatus("Saving product...");
      console.info(
        editingProduct ? "[admin] Saving product update." : "[admin] Saving product.",
        { endpoint, slug: productInput.slug },
      );

      const response = await fetch(endpoint, {
        body: JSON.stringify(productInput),
        headers: { "Content-Type": "application/json" },
        method: editingProduct ? "PUT" : "POST",
      });
      const result = await readResponse<{ product: Product }>(response);

      console.log("supabase save success");

      if (editingProduct) {
        setProducts((current) =>
          current.map((product) =>
            product.id === result.product.id ? result.product : product,
          ),
        );
      } else {
        setProducts((current) => [result.product, ...current]);
      }

      setStatus(editingProduct ? "Product updated" : "Product published");
      setNotification({
        kind: "success",
        message: "Product Published Successfully",
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

  async function handleDelete(product: Product) {
    if (!window.confirm(`Delete "${product.title}"?`)) return;

    setIsWorking(true);
    setNotification(null);
    setStatus("Deleting product...");

    try {
      console.info("[admin] Deleting product.", {
        id: product.id,
        slug: product.slug,
      });
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });

      await readResponse<{ ok: boolean }>(response);
      setProducts((current) => current.filter(({ id }) => id !== product.id));
      console.info("[admin] Product delete complete.", { id: product.id });
      setStatus("");
      setNotification({ kind: "success", message: "Product deleted." });
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
          <p className="muted">Publish products without changing application code.</p>
        </div>
        <div className="admin-header-actions">
          <button 
            className={`button ${activeTab === "inventory" ? "primary" : "secondary"}`}
            onClick={() => setActiveTab("inventory")}
            type="button"
          >
            Inventory
          </button>
          <button 
            className={`button ${activeTab === "analytics" ? "primary" : "secondary"}`}
            onClick={() => setActiveTab("analytics")}
            type="button"
          >
            Analytics
          </button>
          <Link className="button secondary" href="/">
            View store
          </Link>
          <button className="button secondary" onClick={handleLogout} type="button">
            Sign out
          </button>
        </div>
      </header>

      {activeTab === "inventory" ? (
        <section className="admin-grid">
          <form className="product-form panel" onSubmit={handleSubmit}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">{editingProduct ? "Editing" : "New listing"}</p>
              <h2>{editingProduct ? editingProduct.title : "Add a product"}</h2>
            </div>
            {editingProduct ? (
              <button className="text-button" onClick={resetForm} type="button">
                Cancel edit
              </button>
            ) : null}
          </div>

          <div className="form-grid">
            <label className="full-width">
              Title *
              <input name="title" onChange={updateField} required value={form.title} />
            </label>
            <label>
              Slug *
              <input name="slug" onChange={updateSlug} required value={form.slug} />
            </label>
            <label>
              Price
              <input
                min="0"
                name="price"
                onChange={updateField}
                step="0.01"
                type="number"
                value={form.price}
              />
            </label>
            <label>
              Category
              <input name="category" onChange={updateField} value={form.category} />
            </label>
            <label>
              Badge
              <input
                name="badge"
                onChange={updateField}
                placeholder="Editor's pick"
                value={form.badge}
              />
            </label>
            <label className="full-width">
              Affiliate link *
              <input
                name="affiliate_link"
                onChange={updateField}
                placeholder="https://..."
                required
                type="url"
                value={form.affiliate_link}
              />
            </label>
            <label className="full-width">
              Description
              <textarea
                name="description"
                onChange={updateField}
                rows={4}
                value={form.description}
              />
            </label>
            <label className="full-width">
              Product image {editingProduct ? "(leave empty to keep current)" : "*"}
              <input
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                ref={fileInputRef}
                required={!editingProduct}
                type="file"
              />
            </label>
          </div>

          {status ? <p className="status">{status}</p> : null}
          {notification ? (
            <p className={`notification ${notification.kind}`}>{notification.message}</p>
          ) : null}
          {!authIsLoading && !firebaseUser ? (
            <p className="notification error">
              Your Firebase browser session expired. Sign out and sign in again before
              uploading an image.
            </p>
          ) : null}

          <button className="button primary" disabled={isWorking} type="submit">
            {isWorking
              ? status || "Working..."
              : editingProduct
                ? "Save Changes"
                : "Confirm & List Product"}
          </button>
        </form>

        <section className="product-list panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Inventory</p>
              <h2>{products.length} products</h2>
            </div>
          </div>

          {products.length ? (
            <div className="admin-products">
              {products.map((product) => (
                <article className="admin-product" key={product.id}>
                  {product.image ? (
                    // Dynamic Firebase URLs are intentionally rendered without optimization.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" src={product.image} />
                  ) : (
                    <div className="image-placeholder">No image</div>
                  )}
                  <div className="admin-product-details">
                    <strong>{product.title}</strong>
                    <span>/{product.slug}</span>
                    <div className="product-actions">
                      <button
                        className="text-button"
                        onClick={() => handleCopyLink(product)}
                        style={{ alignItems: "center", display: "inline-flex", gap: "4px" }}
                        type="button"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
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
                        onClick={() => handleDelete(product)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No products yet. Publish your first listing.</p>
          )}
        </section>
      </section>
    ) : (
      <AnalyticsDashboard />
    )}
  </main>
);
}
