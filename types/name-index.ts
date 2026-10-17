/** A rectangle in ORIGINAL poster pixel coordinates. */
export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One name on the poster. Coordinates are normalised (0..1) against the original image size. */
export interface NameEntry {
  id: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  source: "ocr" | "manual";
  /** Alternative OCR readings of the same box, searched alongside `text`. */
  aliases?: string[];
}

export interface NameIndex {
  version: number;
  image: { src: string; width: number; height: number };
  entries: NameEntry[];
}

export type MatchKind = "exact" | "partial" | "fuzzy" | "token";

export interface SearchResult {
  entry: NameEntry;
  kind: MatchKind;
  score: number;
  /** The reading (text or alias) that matched. */
  matchedText: string;
}

export type Selection =
  | { type: "entry"; entry: NameEntry; kind?: MatchKind }
  | { type: "region"; rect: PixelRect };
