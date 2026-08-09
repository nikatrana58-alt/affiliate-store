import fs from "fs";
import path from "path";

// Load .env.local
try {
  const envPath = path.resolve(".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
} catch (e) {}

import { createAdminSupabaseClient } from "./lib/supabase";

async function checkProducts() {
  const supabase = createAdminSupabaseClient();
  const { data: prods, error: pErr } = await supabase.from("products").select("id, title, slug, cj_product_id");
  console.log("Supabase error:", pErr?.message || "none");
  console.log("Total products in Supabase:", prods?.length);
  console.log("Products list:", prods);

  if (prods && prods.length > 0) {
    for (const p of prods) {
      const { data: vars } = await supabase.from("product_variants").select("id, name, sku, cj_variant_id, attributes").eq("product_id", p.id);
      console.log(`Product "${p.title}" (id: ${p.id}) has ${vars?.length ?? 0} variants in product_variants table.`);
      if (vars && vars.length > 0) {
        console.log("  Sample variant [0]:", vars[0]);
      }
    }
  }
}

checkProducts().catch(console.error);
