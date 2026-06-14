import { redirect } from "next/navigation";
import { ProductManager } from "@/components/product-manager";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { getProducts, type Product } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getCurrentAdmin();

  if (!admin) redirect("/admin/login");

  let products: Product[] = [];

  try {
    products = await getProducts();
  } catch (error) {
    console.error("[products] Unable to load products for admin.", error);
  }

  return <ProductManager initialProducts={products} />;
}
