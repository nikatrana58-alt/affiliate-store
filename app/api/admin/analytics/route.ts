import { requireCurrentAdmin } from "@/lib/auth/admin";
import { createAdminSupabaseClient } from "@/lib/supabase";

export async function GET() {
  try {
    await requireCurrentAdmin();

    const supabase = createAdminSupabaseClient();
    
    // Join products with product_clicks
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        title,
        product_clicks (
          click_count,
          last_clicked_at
        )
      `);

    if (error) throw error;

    const analytics = data.map((product: any) => ({
      id: product.id,
      title: product.title,
      clicks: product.product_clicks?.click_count || 0,
      lastClicked: product.product_clicks?.last_clicked_at || null,
    }));

    // Sort by highest clicks first
    analytics.sort((a: any, b: any) => b.clicks - a.clicks);

    return Response.json({ analytics });
  } catch (error) {
    console.error("[analytics] Admin fetch failed.", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load analytics." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 },
    );
  }
}
