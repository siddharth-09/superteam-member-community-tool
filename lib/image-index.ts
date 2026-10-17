import type { NameEntry, NameIndex } from "@/types/name-index";

/** The original poster, posted by Superteam on X. */
export const POSTER_SOURCE_URL = "https://x.com/superteam/status/2111017883455422735";

export const INDEX_URL = "/name-index.json";

export interface LoadedIndex {
  index: NameIndex;
  /** Number of malformed entries that were dropped. */
  skipped: number;
}

const isUnit = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;

function validateEntry(raw: unknown): NameEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.text !== "string" || !e.text.trim()) return null;
  if (!isUnit(e.x) || !isUnit(e.y) || !isUnit(e.width) || !isUnit(e.height)) return null;
  if ((e.width as number) <= 0 || (e.height as number) <= 0) return null;
  if ((e.x as number) + (e.width as number) > 1.001 || (e.y as number) + (e.height as number) > 1.001) return null;
  return {
    id: typeof e.id === "number" ? e.id : -1,
    text: e.text.trim(),
    x: e.x as number,
    y: e.y as number,
    width: e.width as number,
    height: e.height as number,
    confidence: typeof e.confidence === "number" ? e.confidence : 0,
    source: e.source === "manual" ? "manual" : "ocr",
    aliases: Array.isArray(e.aliases) ? e.aliases.filter((a): a is string => typeof a === "string") : undefined,
  };
}

export async function loadNameIndex(signal?: AbortSignal): Promise<LoadedIndex> {
  const res = await fetch(INDEX_URL, { signal, cache: "no-cache" });
  if (!res.ok) throw new Error(`Name index not found (HTTP ${res.status}). Run "npm run index" to generate public/name-index.json.`);
  const data = (await res.json()) as Partial<NameIndex>;
  const img = data.image;
  if (!img || !(img.width > 0) || !(img.height > 0) || !Array.isArray(data.entries)) {
    throw new Error("Name index is malformed: missing image size or entries.");
  }
  const entries: NameEntry[] = [];
  data.entries.forEach((raw, i) => {
    const entry = validateEntry(raw);
    if (entry) entries.push({ ...entry, id: entry.id >= 0 ? entry.id : i });
  });
  return {
    index: { version: data.version ?? 1, image: img, entries },
    skipped: data.entries.length - entries.length,
  };
}
