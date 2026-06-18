import { createAdminSupabaseClient } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const supabase = createAdminSupabaseClient();
    
    // Use the RPC function to increment click count atomically
    const { error } = await supabase.rpc("increment_product_click", {
      target_product_id: id,
    });

    if (error) throw error;

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[analytics] Click tracking failed.", error);
    return Response.json(
      { error: "Unable to track click." },
      { status: 500 },
    );
  }
}
