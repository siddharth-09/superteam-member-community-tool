"use client";

import { Download, Eye } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { computeCropRect, entryToRect } from "@/lib/image-crop";
import { cn } from "@/lib/utils";
import type { MatchKind, SearchResult } from "@/types/name-index";

const KIND_LABEL: Record<MatchKind, string> = {
  exact: "Exact match",
  partial: "Partial match",
  fuzzy: "Close match (OCR variation)",
  token: "Shares a word only",
};

/** Small real-pixel preview of the area around a name. */
function CropThumb({ image, result }: { image: HTMLImageElement; result: SearchResult }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = 176;
    const target = entryToRect(result.entry, image.naturalWidth, image.naturalHeight);
    const crop = computeCropRect(target, image.naturalWidth, image.naturalHeight, "tight");
    const cssH = Math.round((cssW * crop.height) / crop.width);
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.height = `${cssH}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
    const k = canvas.width / crop.width;
    ctx.strokeStyle = "#14F195";
    ctx.lineWidth = 1.5 * dpr;
    ctx.strokeRect((target.x - crop.x) * k - 2, (target.y - crop.y) * k - 2, target.width * k + 4, target.height * k + 4);
  }, [image, result]);
  return <canvas ref={ref} className="w-[176px] max-w-full shrink-0 rounded-md border border-white/10" aria-hidden />;
}

function Confidence({ value }: { value: number }) {
  const level = value >= 0.85 ? "High" : value >= 0.55 ? "Medium" : "Low";
  const color = value >= 0.85 ? "bg-[#14F195]" : value >= 0.55 ? "bg-[#FFC857]" : "bg-red-400";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-white/50" title={`OCR confidence ${Math.round(value * 100)}%`}>
      <span className={cn("size-1.5 rounded-full", color)} aria-hidden />
      {level} confidence
    </span>
  );
}

interface Props {
  image: HTMLImageElement | null;
  results: SearchResult[];
  selectedId: number | null;
  onSelect: (r: SearchResult) => void;
  onDownload: (r: SearchResult) => void;
}

export function SearchResults({ image, results, selectedId, onSelect, onDownload }: Props) {
  return (
    <ol className="space-y-2.5" aria-label="Search results">
      {results.map((r, i) => {
        const active = r.entry.id === selectedId;
        return (
          <li
            key={r.entry.id}
            className={cn(
              "rounded-xl border p-3 transition",
              active ? "border-[#9945FF]/70 bg-[#9945FF]/[0.10]" : "border-white/10 bg-white/[0.03] hover:border-white/20",
            )}
          >
            <div className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-xs text-white/70">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium leading-snug text-white">{r.entry.text}</p>
                <p className="mt-0.5 text-xs text-white/50">{KIND_LABEL[r.kind]}</p>
                <div className="mt-1"><Confidence value={r.entry.confidence} /></div>
              </div>
            </div>
            {image ? <div className="mt-3 flex justify-center"><CropThumb image={image} result={r} /></div> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant={active ? "default" : "outline"} onClick={() => onSelect(r)} aria-pressed={active}
                className={active ? "bg-[#9945FF] text-white hover:bg-[#a95bff]" : "border-white/15 bg-transparent text-white hover:bg-white/10"}>
                <Eye /> View on poster
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDownload(r)} className="border-white/15 bg-transparent text-white hover:bg-white/10">
                <Download /> Download snippet
              </Button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
