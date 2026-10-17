import type { PixelRect } from "@/types/name-index";

/** screen = image * scale + (tx, ty), all in CSS pixels. */
export interface Transform {
  scale: number;
  tx: number;
  ty: number;
}

export const MAX_SCALE = 24;

export function fitTransform(cw: number, ch: number, iw: number, ih: number, margin = 0): Transform {
  const scale = Math.min((cw - margin * 2) / iw, (ch - margin * 2) / ih);
  return { scale, tx: (cw - iw * scale) / 2, ty: (ch - ih * scale) / 2 };
}

/** Transform that centres `rect` (image px) in the viewport, fitting it with `margin`. */
export function rectTransform(rect: PixelRect, cw: number, ch: number, margin = 24, maxScale = MAX_SCALE): Transform {
  const scale = Math.min(maxScale, (cw - margin * 2) / rect.width, (ch - margin * 2) / rect.height);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  return { scale, tx: cw / 2 - cx * scale, ty: ch / 2 - cy * scale };
}

export function zoomAt(t: Transform, px: number, py: number, factor: number, min: number, max = MAX_SCALE): Transform {
  const scale = Math.min(max, Math.max(min, t.scale * factor));
  const k = scale / t.scale;
  return { scale, tx: px - (px - t.tx) * k, ty: py - (py - t.ty) * k };
}

/** Keep the poster from being dragged out of view. */
export function clampPan(t: Transform, cw: number, ch: number, iw: number, ih: number): Transform {
  const w = iw * t.scale;
  const h = ih * t.scale;
  const clampAxis = (pos: number, size: number, view: number) => {
    if (size <= view) return (view - size) / 2;
    return Math.min(0, Math.max(view - size, pos));
  };
  return { scale: t.scale, tx: clampAxis(t.tx, w, cw), ty: clampAxis(t.ty, h, ch) };
}

export const screenToImage = (t: Transform, x: number, y: number) => ({ x: (x - t.tx) / t.scale, y: (y - t.ty) / t.scale });

/** Interpolate so the viewport-centre image point glides and zoom changes evenly (log scale). */
export function lerpTransform(a: Transform, b: Transform, k: number, cw: number, ch: number): Transform {
  const ca = screenToImage(a, cw / 2, ch / 2);
  const cb = screenToImage(b, cw / 2, ch / 2);
  const scale = Math.exp(Math.log(a.scale) + (Math.log(b.scale) - Math.log(a.scale)) * k);
  const cx = ca.x + (cb.x - ca.x) * k;
  const cy = ca.y + (cb.y - ca.y) * k;
  return { scale, tx: cw / 2 - cx * scale, ty: ch / 2 - cy * scale };
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
