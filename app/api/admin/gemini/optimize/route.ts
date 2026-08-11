import { requireCurrentAdmin } from "@/lib/auth/admin";
import { optimizeProductWithGemini, type GeminiProductInput } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    // 1. Authenticate request — Admin ONLY
    await requireCurrentAdmin();

    // 2. Check API key configuration
    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: "Gemini is not configured" },
        { status: 400 }
      );
    }

    // 3. Parse input payload
    const input = (await request.json()) as GeminiProductInput;

    if (!input || !input.title?.trim()) {
      return Response.json(
        { error: "Product title is required for Gemini optimization." },
        { status: 400 }
      );
    }

    // 4. Run Gemini Optimization Service
    const recommendations = await optimizeProductWithGemini(input);

    return Response.json({ recommendations });
  } catch (error) {
    const isAuthError =
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message.toLowerCase().includes("admin"));

    if (isAuthError) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isNotConfigured =
      error instanceof Error && error.message.includes("Gemini is not configured");

    if (isNotConfigured) {
      return Response.json({ error: "Gemini is not configured" }, { status: 400 });
    }

    console.error("[gemini-api] Product optimization failed:", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate product recommendations with Gemini.",
      },
      { status: 500 }
    );
  }
}
