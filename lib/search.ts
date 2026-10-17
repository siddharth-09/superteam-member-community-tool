import type { MatchKind, NameEntry, SearchResult } from "@/types/name-index";

export function normalize(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}@_]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

interface Variant {
  raw: string;
  norm: string;
  compact: string;
  tokens: string[];
  penalty: number;
}
interface IndexedEntry {
  entry: NameEntry;
  variants: Variant[];
}
export type SearchIndex = IndexedEntry[];

function makeVariant(raw: string, penalty: number): Variant {
  const norm = normalize(raw);
  return { raw, norm, compact: norm.replace(/ /g, ""), tokens: norm.split(" ").filter(Boolean), penalty };
}

export function buildSearchIndex(entries: NameEntry[]): SearchIndex {
  return entries.map((entry) => ({
    entry,
    variants: [makeVariant(entry.text, 0), ...(entry.aliases ?? []).map((a) => makeVariant(a, 6))],
  }));
}

/** Levenshtein distance, giving up (returning max+1) once it exceeds `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const maxEdits = (len: number) => (len <= 4 ? 0 : len <= 8 ? 1 : 2);

function tokenDistance(qt: string, tokens: string[]): number {
  const max = maxEdits(qt.length);
  let best = max + 1;
  for (const w of tokens) best = Math.min(best, editDistance(qt, w, max));
  return best;
}

function scoreVariant(v: Variant, qn: string, qc: string, qt: string[]): { score: number; kind: MatchKind } | null {
  if (v.norm === qn || v.compact === qc) return { score: 100 - v.penalty, kind: "exact" };
  if (v.norm.startsWith(qn)) return { score: 85 - Math.min(10, (v.norm.length - qn.length) / 2) - v.penalty, kind: "partial" };
  if (qt.every((t) => v.tokens.some((w) => w.startsWith(t)))) return { score: 75 - v.penalty, kind: "partial" };
  if ((qn.length >= 3 && v.norm.includes(qn)) || (qc.length >= 4 && v.compact.includes(qc))) {
    return { score: 60 - v.penalty, kind: "partial" };
  }
  if (qc.length >= 4) {
    let total = 0;
    let ok = true;
    for (const t of qt) {
      const d = tokenDistance(t, v.tokens);
      if (d > maxEdits(t.length)) { ok = false; break; }
      total += d;
    }
    if (ok) return { score: 48 - total * 5 - v.penalty, kind: "fuzzy" };
    const compactMax = maxEdits(qc.length);
    if (compactMax > 0 && editDistance(qc, v.compact, compactMax) <= compactMax) return { score: 40 - v.penalty, kind: "fuzzy" };
  }
  return null;
}

/** "Shares a word" matches: at least one query word (4+ letters) matches a name word. Only used when nothing better exists. */
function scoreToken(v: Variant, qt: string[]): number | null {
  let hits = 0;
  for (const t of qt) {
    if (t.length < 4) continue;
    if (tokenDistance(t, v.tokens) <= maxEdits(t.length)) hits++;
  }
  return hits > 0 ? 10 + hits * 5 - v.penalty / 2 : null;
}

export function search(query: string, index: SearchIndex, limit = 40): SearchResult[] {
  const qn = normalize(query);
  if (qn.length < 2) return [];
  const qc = qn.replace(/ /g, "");
  const qt = qn.split(" ");

  const strong: SearchResult[] = [];
  const weak: SearchResult[] = [];
  for (const { entry, variants } of index) {
    let best: SearchResult | null = null;
    for (const v of variants) {
      const s = scoreVariant(v, qn, qc, qt);
      if (s && (!best || s.score > best.score)) best = { entry, kind: s.kind, score: s.score, matchedText: v.raw };
    }
    if (best) {
      strong.push(best);
      continue;
    }
    if (qt.length > 1) {
      for (const v of variants) {
        const s = scoreToken(v, qt);
        if (s !== null && (!best || s > best.score)) best = { entry, kind: "token", score: s, matchedText: v.raw };
      }
      if (best) weak.push(best);
    }
  }
  const order = (a: SearchResult, b: SearchResult) =>
    b.score - a.score || a.entry.y - b.entry.y || a.entry.x - b.entry.x;
  strong.sort(order);
  if (strong.length > 0) return strong.slice(0, limit);
  return weak.sort(order).slice(0, 8);
}
