/**
 * lib/gemini.ts
 *
 * Centralized Gemini Product Merchandising Assistant Integration (Marketing Engine 2.0).
 *
 * Security & Architectural Rules:
 * 1. Server-side execution ONLY. Never exposes API key to client bundles or browser environment.
 * 2. Configurable model ID (defaults to gemini-3.6-flash).
 * 3. Centralized system instruction enforcing strict source-of-truth fact preservation & professional US e-commerce copywriting.
 * 4. Schema-constrained JSON output validation (including bullet_points).
 * 5. Server-side Fact-Preservation Engine comparing source vs generated content for numbers, units, specs, and hype-words.
 * 6. Strictly content merchandising suggestions ONLY. Does NOT modify pricing, inventory, VIDs, SKUs, or business-critical fields.
 */

export const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID || "gemini-3.6-flash";

export const GEMINI_SYSTEM_INSTRUCTION = `
You are a professional US e-commerce product merchandiser, SEO specialist, and conversion copywriter.
You are improving supplier-imported product content for a high-converting retail storefront.
The supplied source product data is authoritative. You are an EDITOR, NOT a product inventor.

INTERNAL PROCESSING WORKFLOW:
1. Extract all factual information (product type, style, material, dimensions, measurements, sizes, colors, features).
2. Protect all factual specifications — never alter numbers, units, sizes, materials, or dimensions.
3. Identify legitimate selling points and natural search terms directly supported by the source facts.
4. Rewrite title, short description, full description, bullet points, tags, and SEO metadata into professional US e-commerce English.

TITLE RULES:
- Format: [Primary Product Type] + [Key Feature/Style] + [Material or Important Attribute].
- Concise, search-friendly, click-through optimized.
- NO keyword stuffing, spam, ALL CAPS, fake claims, or unsupported adjectives.

SHORT DESCRIPTION RULES:
- Concise summary explaining what the product is and key supported features.
- Scannable, distinct from the title, no invented benefits.

FULL DESCRIPTION RULES:
- Persuasive, natural, professional US e-commerce English.
- Start with a clear explanation of what the product is.
- Explain practical benefits ONLY when directly inferable from source facts.
- Present all specifications clearly using short paragraphs and bullet points (• Spec: value).
- End with a natural shopping-oriented sentence supported by source facts.

SEO RULES:
- SEO Title: Search-discoverable, <= 60 characters, primary keyword near beginning.
- SEO Description: <= 160 characters, naturally includes primary keyword, clear value proposition without hype.

CONVERSION & FACT PRESERVATION RULES:
- Persuasive copy MUST be grounded in real product facts.
- NEVER invent materials, dimensions, measurements, weight, sizes, colors, quantities, certifications, compatibility, warranties, shipping claims, durability claims, performance claims, or quality claims.
- NEVER add ungrounded hype words ("premium", "luxury", "high-quality", "best", "ultimate", "top-rated", "durable", "lightweight", "comfortable", "professional", "exclusive", "perfect", "revolutionary", "superior") unless explicitly stated in the source.
- NEVER change numerical values or units.
- NEVER remove important factual specifications present in the source.
`.trim();

export type GeminiProductInput = {
  title: string;
  description?: string | null;
  short_description?: string | null;
  category?: string | null;
  brand?: string | null;
  tags?: string[] | string | null;
  variants?: Array<{
    name: string;
    color?: string | null;
    size?: string | null;
    cost_price?: number | null;
  }> | null;
  seo_title?: string | null;
  seo_description?: string | null;
};

export type GeminiOptimizationOutput = {
  title: string;
  short_description: string;
  description: string;
  bullet_points: string[];
  tags: string[];
  category_suggestion: string;
  seo_title: string;
  seo_description: string;
  warnings?: string[];
};

/**
 * Server-side Fact Preservation Validator.
 * Compares source text against generated text for numbers, units, sizes, and ungrounded hype words.
 */
export function validateFactPreservation(
  sourceText: string,
  generatedText: string
): string[] {
  const warnings: string[] = [];

  // 1. Extract numbers and numeric values (e.g., 450, 750, 3, 50, 100%)
  const sourceNumbers = new Set(sourceText.match(/\b\d+(\.\d+)?%?\b/g) || []);
  const genNumbers = new Set(generatedText.match(/\b\d+(\.\d+)?%?\b/g) || []);

  const newNumbers: string[] = [];
  for (const num of genNumbers) {
    if (!sourceNumbers.has(num)) {
      newNumbers.push(num);
    }
  }

  if (newNumbers.length > 0) {
    warnings.push(
      `Detected new numerical value(s) in generated content not present in source: ${newNumbers
        .slice(0, 5)
        .join(", ")}`
    );
  }

  // 2. Check for ungrounded hype words
  const FORBIDDEN_HYPE_WORDS = [
    "premium",
    "high-quality",
    "high quality",
    "luxurious",
    "luxury",
    "ultimate",
    "unmatched",
    "unbeatable",
    "top-rated",
    "top rated",
    "revolutionary",
    "superior",
  ];

  const sourceLower = sourceText.toLowerCase();
  const genLower = generatedText.toLowerCase();

  const addedHypeWords: string[] = [];
  for (const word of FORBIDDEN_HYPE_WORDS) {
    if (!sourceLower.includes(word) && genLower.includes(word)) {
      addedHypeWords.push(word);
    }
  }

  if (addedHypeWords.length > 0) {
    warnings.push(
      `Detected ungrounded hype word(s) in generated content not present in source: ${addedHypeWords.join(", ")}`
    );
  }

  return warnings;
}

/**
 * Executes a controlled, single-turn Gemini API call for product content optimization.
 */
export async function optimizeProductWithGemini(
  input: GeminiProductInput
): Promise<GeminiOptimizationOutput> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    throw new Error("Gemini is not configured");
  }

  // Construct safe prompt containing ONLY non-sensitive merchandising product data
  const promptInput = {
    title: input.title || "",
    current_short_description: input.short_description || "",
    current_description: input.description || "",
    current_category: input.category || "",
    brand: input.brand || "",
    current_tags: Array.isArray(input.tags)
      ? input.tags
      : typeof input.tags === "string"
        ? input.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
    variants_summary: (input.variants || []).slice(0, 20).map((v) => ({
      name: v.name,
      color: v.color || null,
      size: v.size || null,
    })),
    current_seo_title: input.seo_title || "",
    current_seo_description: input.seo_description || "",
  };

  const sourceCombinedText = `${input.title} ${input.short_description || ""} ${input.description || ""}`;

  // Use configured GEMINI_MODEL_ID, with fallback if model endpoint responds with non-OK
  const modelsToTry = [GEMINI_MODEL_ID, "gemini-2.5-flash", "gemini-1.5-flash"];
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: Error | null = null;
  let rawText: string | null = null;

  for (const model of uniqueModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      systemInstruction: {
        parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }],
      },
      contents: [
        {
          parts: [
            {
              text: `Please optimize the following imported product content into clean, high-converting US e-commerce English while strictly preserving every source fact:\n${JSON.stringify(
                promptInput,
                null,
                2
              )}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1, // Ultra-low temperature for factual precision
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            short_description: { type: "STRING" },
            description: { type: "STRING" },
            bullet_points: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            tags: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            category_suggestion: { type: "STRING" },
            seo_title: { type: "STRING" },
            seo_description: { type: "STRING" },
          },
          required: [
            "title",
            "short_description",
            "description",
            "bullet_points",
            "tags",
            "category_suggestion",
            "seo_title",
            "seo_description",
          ],
        },
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (response.status === 429) {
        throw new Error("Gemini API rate limit exceeded (HTTP 429). Please wait a moment and try again.");
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(`[gemini] Model ${model} returned HTTP ${response.status}:`, errText);
        lastError = new Error(`Gemini request failed (HTTP ${response.status}).`);
        continue;
      }

      const result = await response.json();
      rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || null;

      if (rawText) {
        break;
      }
    } catch (err) {
      console.warn(`[gemini] Attempt with model ${model} failed:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!rawText) {
    throw lastError || new Error("Gemini returned empty response.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("Gemini output failed JSON parsing.");
  }

  // Validate output fields strictly
  if (
    typeof parsed.title !== "string" ||
    typeof parsed.description !== "string" ||
    !Array.isArray(parsed.tags)
  ) {
    throw new Error("Gemini output structure is invalid.");
  }

  const bulletPoints = Array.isArray(parsed.bullet_points)
    ? parsed.bullet_points.map((b: any) => String(b).trim()).filter(Boolean)
    : [];

  const genCombinedText = `${parsed.title} ${parsed.short_description || ""} ${parsed.description || ""} ${bulletPoints.join(" ")}`;
  const warnings = validateFactPreservation(sourceCombinedText, genCombinedText);

  return {
    title: parsed.title.trim(),
    short_description: String(parsed.short_description || "").trim(),
    description: parsed.description.trim(),
    bullet_points: bulletPoints,
    tags: parsed.tags.map((t: any) => String(t).trim()).filter(Boolean),
    category_suggestion: String(parsed.category_suggestion || "").trim(),
    seo_title: String(parsed.seo_title || parsed.title).slice(0, 60).trim(),
    seo_description: String(parsed.seo_description || parsed.short_description || "").slice(0, 160).trim(),
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}
