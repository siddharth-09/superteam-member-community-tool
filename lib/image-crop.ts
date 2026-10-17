import type { NameEntry, PixelRect } from "@/types/name-index";

export type ContextPreset = "tight" | "balanced" | "wide";

/** Minimum crop size (original poster px) per preset; always grows to fit the name plus padding. */
export const CONTEXT_SIZES: Record<ContextPreset, { width: number; height: number }> = {
  tight: { width: 220, height: 110 },
  balanced: { width: 380, height: 190 },
  wide: { width: 640, height: 320 },
};

const NAME_PADDING = 12;
/** CONTEXT_SIZES and NAME_PADDING are specified for a 1600px-wide poster and scale with the real width. */
const REFERENCE_WIDTH = 1600;
const MAX_OUTPUT_DIM = 4096;

/** Normalised index entry -> rectangle in ORIGINAL image pixels. */
export function entryToRect(e: Pick<NameEntry, "x" | "y" | "width" | "height">, iw: number, ih: number): PixelRect {
  return { x: e.x * iw, y: e.y * ih, width: e.width * iw, height: e.height * ih };
}

export const rectToNormalized = (r: PixelRect, iw: number, ih: number) => ({
  x: r.x / iw, y: r.y / ih, width: r.width / iw, height: r.height / ih,
});

/** Crop area (original px) centred on `target`, shifted (never shrunk) to stay inside the image. */
export function computeCropRect(target: PixelRect, iw: number, ih: number, preset: ContextPreset): PixelRect {
  const k = iw / REFERENCE_WIDTH;
  const min = CONTEXT_SIZES[preset];
  const width = Math.min(iw, Math.max(min.width * k, target.width + NAME_PADDING * k * 2));
  const height = Math.min(ih, Math.max(min.height * k, target.height + NAME_PADDING * k * 2));
  const cx = target.x + target.width / 2;
  const cy = target.y + target.height / 2;
  const x = Math.min(iw - width, Math.max(0, cx - width / 2));
  const y = Math.min(ih - height, Math.max(0, cy - height / 2));
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

export interface SnippetOptions {
  /** Add the Superteam/Solana frame, header and footer around the crop. */
  branded: boolean;
  /** Draw an outline around the name inside the crop. */
  outline: boolean;
  /** Name shown in the branded header. */
  label?: string;
  /** Integer upscale of the cropped pixels. */
  scale?: number;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * Renders the snippet from the ORIGINAL image pixels. `crop` and `target` are both in original
 * image coordinates, so the output never depends on viewer zoom, pan or CSS size.
 */
export function renderSnippet(img: HTMLImageElement, crop: PixelRect, target: PixelRect | null, opts: SnippetOptions): HTMLCanvasElement {
  const scale = Math.max(1, Math.min(opts.scale ?? 2, Math.floor(MAX_OUTPUT_DIM / Math.max(crop.width, crop.height))));
  const W = crop.width * scale;
  const H = crop.height * scale;

  const inner = document.createElement("canvas");
  inner.width = W;
  inner.height = H;
  const ictx = inner.getContext("2d")!;
  ictx.imageSmoothingEnabled = true;
  ictx.imageSmoothingQuality = "high";
  ictx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, W, H);

  if (opts.outline && target) {
    const pad = 3 * scale * (img.naturalWidth / REFERENCE_WIDTH);
    const x = (target.x - crop.x) * scale - pad;
    const y = (target.y - crop.y) * scale - pad;
    const w = target.width * scale + pad * 2;
    const h = target.height * scale + pad * 2;
    ictx.lineJoin = "round";
    ictx.strokeStyle = "rgba(0,0,0,0.7)";
    ictx.lineWidth = 2.5 * scale;
    roundRect(ictx, x, y, w, h, 3 * scale);
    ictx.stroke();
    ictx.strokeStyle = "#14F195";
    ictx.lineWidth = 1.25 * scale;
    roundRect(ictx, x, y, w, h, 3 * scale);
    ictx.stroke();
  }
  if (!opts.branded) return inner;

  const u = Math.max(0.7, Math.min(1.5, W / 1140));
  const b = Math.round(14 * u);
  const head = Math.round(70 * u);
  const foot = Math.round(48 * u);
  const out = document.createElement("canvas");
  out.width = W + b * 2;
  out.height = H + head + foot + b;
  const ctx = out.getContext("2d")!;
  const font = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  ctx.fillStyle = "#0B0B10";
  ctx.fillRect(0, 0, out.width, out.height);
  const glow = ctx.createRadialGradient(out.width * 0.15, 0, 0, out.width * 0.15, 0, out.width * 0.8);
  glow.addColorStop(0, "rgba(153,69,255,0.35)");
  glow.addColorStop(1, "rgba(153,69,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, out.width, out.height);

  // header
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#14F195";
  ctx.font = `600 ${Math.round(13 * u)}px ${font}`;
  ctx.fillText("FOUND ON THE SUPERTEAM COMMUNITY WALL", b, Math.round(28 * u));
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 ${Math.round(26 * u)}px ${font}`;
  const label = opts.label ?? "Community wall";
  let text = label;
  while (ctx.measureText(text).width > W && text.length > 4) text = text.slice(0, -2);
  ctx.fillText(text === label ? text : text + "…", b, Math.round(58 * u));

  // gradient frame around the crop
  const g = ctx.createLinearGradient(b, head, b + W, head + H);
  g.addColorStop(0, "#9945FF");
  g.addColorStop(1, "#14F195");
  ctx.fillStyle = g;
  roundRect(ctx, b - 3 * u, head - 3 * u, W + 6 * u, H + 6 * u, 8 * u);
  ctx.fill();
  ctx.save();
  roundRect(ctx, b, head, W, H, 5 * u);
  ctx.clip();
  ctx.drawImage(inner, b, head);
  ctx.restore();

  // footer
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `500 ${Math.round(13 * u)}px ${font}`;
  ctx.fillText("Zoom in. Find your name.", b, head + H + Math.round(30 * u));
  ctx.textAlign = "right";
  ctx.fillStyle = "#B98CFF";
  ctx.fillText("Solana × Superteam", b + W, head + H + Math.round(30 * u));
  return out;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode PNG"))), "image/png"),
  );
}

export function slugify(input: string): string {
  const s = input
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "name";
}

export function snippetFilename(label: string | null, crop: PixelRect): string {
  return label ? `community-wall-${slugify(label)}.png` : `community-wall-region-${crop.x}-${crop.y}.png`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
