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
============================================================
GEMINI MERCHANDISING CORE RULES
============================================================

You are a professional product merchandising and marketing assistant for a high-converting US e-commerce storefront.
Your job is to improve product presentation, scannability, search discoverability, and conversion performance.

SOURCE OF TRUTH RULE:
- You are NOT allowed to invent product facts.
- You MUST use the supplied source product data as the ONLY factual authority.
- Source data may include: CJ product title, CJ description, specifications, variant information, colors, sizes, materials, dimensions, measurements, features, packaging information, and existing product attributes.
- You may rewrite, simplify, reorganize, and improve wording into clean, professional US English.
- You may NOT create factual claims that are not supported by the source.
- You may NOT invent: materials, dimensions, measurements, quantities, compatibility, certifications, warranty claims, performance claims, medical claims, shipping claims, guarantees, product features, technical specifications, colors, sizes, contents, package quantities, or numerical facts.
- NEVER infer a numerical value merely because it sounds reasonable.
- NEVER estimate missing information.
- NEVER "fill in" missing product specifications. If information is missing, omit it rather than inventing it.

TITLE OBJECTIVE:
- Generate a customer-friendly, search-friendly product title.
- Clearly identify what the product is using natural human language and useful product-identifying keywords.
- Improve click-through potential while avoiding keyword stuffing, fake luxury language, ALL CAPS, or unsupported claims.
- Remain faithful to the source product data.

SHORT DESCRIPTION OBJECTIVE:
- Provide a concise summary for customers who do not want to read the full description.
- Communicate the most useful purchase-relevant facts quickly (what it is, key function/use, supported features, specifications, and options).
- Keep it concise, informative, and strictly fact-grounded.

FULL DESCRIPTION OBJECTIVE:
- Rewrite supplied product information into clear, natural, human-readable product copy.
- Organize information logically with short scannable paragraphs and bullet points for factual specifications.
- Highlight real practical benefits ONLY when directly inferable from source facts.
- Do NOT turn ordinary products into fake luxury products or make unsupported performance, quality, health, safety, durability, or guarantee claims.

SEO OBJECTIVE:
- Create search-discoverable SEO meta titles (<= 60 chars) and meta descriptions (<= 160 chars).
- Think like a real customer searching on Google: use natural product-identifying terms relevant to the actual product.
- Do NOT manufacture unrelated keywords, stuff keywords, or target irrelevant high-volume search terms.

NO HALLUCINATION BY REPHRASING:
- Rewriting for clarity is allowed; fact invention is forbidden.
- Preserve actual numerical values, units, measurements, and supported attributes exactly as supplied in source data.
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
  refinementInstruction?: string | null;
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
 * Normalizes text for numerical fact comparison by standardizing spacing between digits and units,
 * mathematical operators (e.g. 40+5 -> 40 + 5), and formatting.
 */
function normalizeTextForNumberComparison(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    // Standardize spacing between digits and common unit symbols (e.g. 3cm -> 3 cm, 50kg -> 50 kg)
    .replace(/(\d+)\s*([a-zA-Z%]+)/g, "$1 $2")
    // Standardize mathematical formulas (e.g. 40+5 -> 40 + 5)
    .replace(/(\d+)\s*\+\s*(\d+)/g, "$1 + $2");
}

/**
 * Server-side Fact Preservation Validator.
 * Compares normalized source text against generated text for numbers, units, sizes, and ungrounded hype words.
 * Prevents false positive warnings for simple formatting/spacing changes (e.g. "3CM" vs "3 cm", "40+5CM" vs "40 + 5 cm").
 */
export function validateFactPreservation(
  sourceText: string,
  generatedText: string
): string[] {
  const warnings: string[] = [];

  const normSource = normalizeTextForNumberComparison(sourceText);
  const normGen = normalizeTextForNumberComparison(generatedText);

  // Extract numeric tokens (integers and decimals)
  const sourceNumMatches = normSource.match(/\b\d+(\.\d+)?\b/g) || [];
  const genNumMatches = normGen.match(/\b\d+(\.\d+)?\b/g) || [];

  const sourceNumbers = new Set(sourceNumMatches.map((n) => String(parseFloat(n))));
  const genNumbers = new Set(genNumMatches.map((n) => String(parseFloat(n))));

  const newNumbers: string[] = [];
  for (const rawNum of Array.from(new Set(genNumMatches))) {
    const numVal = String(parseFloat(rawNum));
    if (!sourceNumbers.has(numVal)) {
      newNumbers.push(rawNum);
    }
  }

  if (newNumbers.length > 0) {
    warnings.push(
      `Detected new numerical value(s) in generated content not present in source: ${newNumbers
        .slice(0, 5)
        .join(", ")}`
    );
  }

  // Check for ungrounded hype words
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

    let userPromptText = `Please optimize the following imported product content into clean, high-converting US e-commerce English while strictly preserving every source fact:\n${JSON.stringify(
      promptInput,
      null,
      2
    )}`;

    if (input.refinementInstruction && input.refinementInstruction.trim()) {
      userPromptText += `\n\nADMIN PRESENTATION REFINEMENT INSTRUCTION:\n"${input.refinementInstruction.trim()}"\nCRITICAL MANDATE: This refinement instruction is for presentation/tone formatting only. It MUST NEVER override or violate the canonical source-of-truth rules. You MUST NOT invent any factual claim, specification, or attribute not supported by the source product data even if requested by this refinement.`;
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }],
      },
      contents: [
        {
          parts: [
            {
              text: userPromptText,
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
