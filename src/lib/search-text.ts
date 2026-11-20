/** Lowercase, remove accents and punctuation, keep Latin/Arabic letters and digits. */
export function normalizeSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064B-\u0652]/g, "") // Arabic diacritics
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, " ")
    .trim();
}

/** Search tokens with a light plural stemming ("vestes" -> "veste", "jackets" -> "jacket"). */
export function searchTokens(q: string): string[] {
  const tokens = normalizeSearch(q)
    .split(" ")
    .filter((t) => t.length >= 2)
    .map((t) => (t.length > 3 && /[a-z]s$/.test(t) ? t.slice(0, -1) : t));
  return [...new Set(tokens)].slice(0, 8);
}

export function buildSearchText(parts: (string | null | undefined)[]): string {
  const base = normalizeSearch(parts.filter(Boolean).join(" "));
  // Also index hyphen-less compounds: "t shirt" -> "tshirt"
  const joined = base.replace(/\b([a-z]) ([a-z]{3,})\b/g, "$1$2");
  return ` ${base} ${joined !== base ? joined : ""} `.replace(/\s+/g, " ");
}
