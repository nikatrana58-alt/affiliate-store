/**
 * Customer UI Product Data Formatter & Sanitizer
 * Ensures zero supplier noise (CJ codes, SKUs, Asian size warnings, Chinese notes)
 * and formats product descriptions into a premium ecommerce layout.
 */

export interface FormattedProductDetails {
  overview: string;
  keyFeatures: string[];
  material: string;
  availableSizes: string;
  careInstructions: string;
  shipping: string;
  returns: string;
}

/**
 * Strips all supplier-intended noise, Chinese notes, raw import dumps,
 * and Asian size warnings from customer UI descriptions.
 */
export function sanitizeProductDescription(raw?: string | null): string {
  if (!raw) {
    return "Designed with meticulous attention to detail using premium materials for exceptional everyday performance and style.";
  }

  let text = raw;

  // 1. Strip HTML tags
  text = text.replace(/<[^>]*>/g, " ");

  // 2. Decode HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

  // 3. Remove Chinese characters & Chinese notes
  text = text.replace(/[\u4e00-\u9fa5]+/g, "");

  // 4. Remove Asian sizing warning paragraphs
  text = text.replace(
    /Asian size(s)? (is|are) \d+ (to|or) \d+ size(s)? smaller[^\.\!\n]*[\.\!\n]?/gi,
    ""
  );
  text = text.replace(
    /Choose the larger size if your size between two sizes[^\.\!\n]*[\.\!\n]?/gi,
    ""
  );
  text = text.replace(
    /Please check the size chart carefully before you buy[^\.\!\n]*[\.\!\n]?/gi,
    ""
  );
  text = text.replace(
    /Different computers display colors differently[^\.\!\n]*[\.\!\n]?/gi,
    ""
  );
  text = text.replace(
    /Please allow \d+[\-\.]?\d*cm differences due to manual measurement[^\.\!\n]*[\.\!\n]?/gi,
    ""
  );

  // 5. Remove CJ & Printful product codes, SKUs, internal supplier IDs
  text = text.replace(/\b(CJ|CJJJ|CJBH|CJSX|PF|PRINTFUL)[A-Z0-9_-]{4,}\b/gi, "");
  text = text.replace(/SKU\s*:\s*[A-Z0-9_-]+/gi, "");
  text = text.replace(/Product ID\s*:\s*[A-Z0-9_-]+/gi, "");
  text = text.replace(/Supplier Code\s*:\s*[A-Z0-9_-]+/gi, "");
  text = text.replace(/CJ Direct/gi, "");
  text = text.replace(/Printful Direct/gi, "");

  // 6. Remove raw package list/content dumps, machine notes & supplier headers
  text = text.replace(/Packing list\s*:[^\n]*/gi, "");
  text = text.replace(/Package content(s)?\s*:[^\n]*/gi, "");
  text = text.replace(/Attention\s*:[^\n]*/gi, "");
  text = text.replace(/Notice\s*:[^\n]*/gi, "");
  text = text.replace(/Overview\s*:\s*/gi, "");
  text = text.replace(/Specification(s)?\s*:\s*/gi, "");
  text = text.replace(/Note\s*:\s*/gi, "");
  text = text.replace(/\d+\s*[\*x]\s*[A-Za-z0-9\s]+/gi, "");

  // 7. Clean up multiple spaces, line breaks & orphan characters
  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^[:\-\,\.\s]+$/.test(line))
    .join(" ");

  text = text.replace(/\s+/g, " ").trim();

  // Deduplicate consecutive repeated phrases
  const sentences = text.split(/(?<=[.!?])\s+/);
  const uniqueSentences: string[] = [];
  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed && !uniqueSentences.includes(trimmed)) {
      uniqueSentences.push(trimmed);
    }
  }

  const cleaned = uniqueSentences.join(" ").trim();

  if (cleaned.length < 15) {
    return "Designed with meticulous attention to detail using premium materials for exceptional everyday performance and style.";
  }

  return cleaned;
}

/**
 * Converts raw product descriptions into structured premium ecommerce layout.
 */
export function formatProductDetails(
  rawDescription?: string | null,
  category?: string | null
): FormattedProductDetails {
  const cleanText = sanitizeProductDescription(rawDescription);

  // Extract feature-like sentences or split by punctuation
  const rawBullets = cleanText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);

  const overview = rawBullets[0] || cleanText;

  const keyFeatures =
    rawBullets.length > 1
      ? rawBullets.slice(1, 5)
      : [
          "Crafted from premium-grade, durable materials.",
          "Precision design engineered for everyday reliability.",
          "Rigorous quality inspection prior to dispatch.",
          "Timeless aesthetic tailored for modern luxury.",
        ];

  // Determine material default based on category if not in text
  let material = "High-Grade Engineered Alloy & Premium Composite";
  const lowerCat = (category || "").toLowerCase();
  const lowerText = cleanText.toLowerCase();

  if (lowerText.includes("leather")) {
    material = "Full-Grain Italian Leather";
  } else if (lowerText.includes("cotton") || lowerCat.includes("apparel") || lowerCat.includes("fashion")) {
    material = "450GSM Heavyweight French Terry / Premium Cotton";
  } else if (lowerText.includes("titanium") || lowerText.includes("metal") || lowerCat.includes("gadget")) {
    material = "Aerospace Titanium & Stainless Alloy";
  } else if (lowerText.includes("silk")) {
    material = "100% Pure Mulberry Silk";
  }

  return {
    overview,
    keyFeatures,
    material,
    availableSizes: "Standard International Sizing (S, M, L, XL, XXL / One Size)",
    careInstructions: "Wipe clean with a soft dry cloth. Store in a cool, dry place away from direct sunlight.",
    shipping: "Trackable shipping options available at checkout.",
    returns: "Returns available in accordance with our return policy.",
  };
}
