import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomerOrderDetails } from "@/components/customer-order-details";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { getOrderById, getOrderStatusHistory } from "@/lib/orders";
import "@/app/checkout.css";

export const metadata: Metadata = {
  title: "Order Details & Tracking | Curated Finds",
  description: "View order details, shipment tracking, and download invoice.",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
};

export default async function OrderDetailsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { email } = await searchParams;

  if (!id) notFound();

  const [order, history] = await Promise.all([
    getOrderById(id),
    getOrderStatusHistory(id),
  ]);

  if (!order) {
    notFound();
  }

  // Security verification: if email param provided, ensure it matches order customer_email
  if (email && order.customer_email.toLowerCase() !== email.toLowerCase().trim()) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A18] text-white">
      <Navbar />

      <main className="flex-1 checkout-shell" style={{ padding: "32px 22px 100px" }}>
        <CustomerOrderDetails order={order} history={history} />
      </main>

      <Footer />
    </div>
  );
}
