"use client";

import { useEffect, useState } from "react";
import { canvasToBlob, renderSnippet, type ContextPreset, computeCropRect } from "@/lib/image-crop";
import type { PixelRect } from "@/types/name-index";

export interface SnippetInput {
  /** Name box in original px, or null for a manual region. */
  target: PixelRect | null;
  /** For manual regions: the region itself. */
  region?: PixelRect;
  label: string | null;
}

export interface SnippetOptionsState {
  preset: ContextPreset;
  branded: boolean;
  outline: boolean;
}

export interface Snippet {
  blob: Blob;
  url: string;
  crop: PixelRect;
  width: number;
  height: number;
}

export function resolveCrop(image: HTMLImageElement, input: SnippetInput, preset: ContextPreset): PixelRect {
  if (input.region) {
    const r = input.region;
    const x = Math.max(0, Math.floor(r.x));
    const y = Math.max(0, Math.floor(r.y));
    return {
      x, y,
      width: Math.max(8, Math.min(image.naturalWidth - x, Math.ceil(r.width))),
      height: Math.max(8, Math.min(image.naturalHeight - y, Math.ceil(r.height))),
    };
  }
  return computeCropRect(input.target!, image.naturalWidth, image.naturalHeight, preset);
}

export function buildSnippetCanvas(image: HTMLImageElement, input: SnippetInput, o: SnippetOptionsState) {
  const crop = resolveCrop(image, input, o.preset);
  const canvas = renderSnippet(image, crop, input.target, {
    branded: o.branded,
    outline: o.outline && !!input.target,
    label: input.label ?? "Selected region",
  });
  return { canvas, crop };
}

/** Renders the real PNG whenever the selection or options change; the preview shows exactly what gets downloaded. */
export function useSnippet(image: HTMLImageElement | null, input: SnippetInput | null, o: SnippetOptionsState) {
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = input ? `${input.target?.x}|${input.target?.y}|${input.region?.x}|${input.region?.y}|${input.region?.width}|${input.region?.height}|${input.label}` : "";

  useEffect(() => {
    if (!image || !input) return;
    let cancelled = false;
    let url: string | null = null;
    (async () => {
      try {
        const { canvas, crop } = buildSnippetCanvas(image, input, o);
        const blob = await canvasToBlob(canvas);
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setError(null);
        setSnippet({ blob, url, crop, width: canvas.width, height: canvas.height });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not generate the snippet.");
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, key, o.preset, o.branded, o.outline]);

  const active = !!image && !!input;
  return { snippet: active ? snippet : null, error: active ? error : null };
}
