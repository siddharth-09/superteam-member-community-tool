"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { drawMatchHighlight, MatchBadge } from "@/components/match-highlight";
import { ZoomControls } from "@/components/zoom-controls";
import {
  clampPan, easeInOutCubic, fitTransform, lerpTransform, rectTransform, screenToImage, zoomAt, MAX_SCALE, type Transform,
} from "@/lib/viewer-math";
import type { PixelRect } from "@/types/name-index";

export interface ViewerHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  reset: () => void;
}

interface Props {
  image: HTMLImageElement;
  /** Name box to outline, original px. */
  highlight: PixelRect | null;
  /** Area to glide to whenever `key` changes, original px. */
  focus: { rect: PixelRect; key: string } | null;
  label?: string;
  selectMode: boolean;
  onRegionSelect: (rect: PixelRect) => void;
  ref?: Ref<ViewerHandle>;
}

const PULSE_MS = 1400;

export function CommunityImageViewer({ image, highlight, focus, label, selectMode, onRegionSelect, ref }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const t = useRef<Transform>({ scale: 1, tx: 0, ty: 0 });
  const anim = useRef<{ from: Transform; to: Transform; start: number; dur: number } | null>(null);
  const pulseStart = useRef<number | null>(null);
  const raf = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; mid: { x: number; y: number } } | null>(null);
  const selection = useRef<{ a: { x: number; y: number }; b: { x: number; y: number } } | null>(null);
  const userMoved = useRef(false);
  const latest = useRef({ highlight, selectMode });
  const [zoomLabel, setZoomLabel] = useState("100%");
  const [dragging, setDragging] = useState(false);

  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fitScale = () => fitTransform(size.current.w, size.current.h, iw, ih, 8).scale;
  const minScale = () => fitScale() * 0.9;

  useEffect(() => {
    latest.current = { highlight, selectMode };
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { w, h, dpr } = size.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cur = t.current;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, cur.tx, cur.ty, iw * cur.scale, ih * cur.scale);

    const hl = latest.current.highlight;
    if (hl) {
      const p = pulseStart.current === null ? 1 : Math.min(1, (performance.now() - pulseStart.current) / PULSE_MS);
      drawMatchHighlight(ctx, hl, cur, { width: w, height: h }, p);
    }
    const sel = selection.current;
    if (sel) {
      const x = Math.min(sel.a.x, sel.b.x) * cur.scale + cur.tx;
      const y = Math.min(sel.a.y, sel.b.y) * cur.scale + cur.ty;
      const sw = Math.abs(sel.a.x - sel.b.x) * cur.scale;
      const sh = Math.abs(sel.a.y - sel.b.y) * cur.scale;
      ctx.fillStyle = "rgba(153,69,255,0.22)";
      ctx.fillRect(x, y, sw, sh);
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#14F195";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, sw, sh);
      ctx.setLineDash([]);
    }
  }, [image, iw, ih]);

  const loopRef = useRef<() => void>(() => {});
  const loop = useCallback(() => {
    raf.current = 0;
    const a = anim.current;
    if (a) {
      const k = a.dur <= 0 ? 1 : Math.min(1, (performance.now() - a.start) / a.dur);
      t.current = k >= 1 ? a.to : lerpTransform(a.from, a.to, easeInOutCubic(k), size.current.w, size.current.h);
      if (k >= 1) anim.current = null;
      setZoomLabel(`${Math.round((t.current.scale / fitScale()) * 100)}%`);
    }
    draw();
    const pulsing = pulseStart.current !== null && performance.now() - pulseStart.current < PULSE_MS;
    if (anim.current || pulsing) raf.current = requestAnimationFrame(() => loopRef.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const schedule = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(() => loopRef.current());
  }, []);

  const setTransform = useCallback(
    (next: Transform) => {
      t.current = clampPan(next, size.current.w, size.current.h, iw, ih);
      anim.current = null;
      setZoomLabel(`${Math.round((t.current.scale / fitScale()) * 100)}%`);
      schedule();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [iw, ih, schedule],
  );

  const animateTo = useCallback(
    (to: Transform) => {
      const clamped = clampPan(to, size.current.w, size.current.h, iw, ih);
      anim.current = { from: t.current, to: clamped, start: performance.now(), dur: reducedMotion() ? 0 : 650 };
      schedule();
    },
    [iw, ih, schedule],
  );

  const fit = useCallback(() => animateTo(fitTransform(size.current.w, size.current.h, iw, ih, 8)), [animateTo, iw, ih]);
  const zoomBy = useCallback(
    (factor: number) => {
      const { w, h } = size.current;
      animateTo(zoomAt(t.current, w / 2, h / 2, factor, minScale(), MAX_SCALE));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [animateTo],
  );

  /** 1 poster pixel per CSS pixel, around the current centre. */
  const actualSize = useCallback(() => {
    const { w, h } = size.current;
    userMoved.current = true;
    animateTo(zoomAt(t.current, w / 2, h / 2, 1 / t.current.scale, 0.01, MAX_SCALE));
  }, [animateTo]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomBy(1.6),
    zoomOut: () => zoomBy(1 / 1.6),
    fit,
    reset: actualSize,
  }), [zoomBy, fit, actualSize]);

  // size the canvas to the container (DPR aware) and keep the view stable on resize
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const first = size.current.w === 0;
      size.current = { w, h, dpr };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (first || !userMoved.current) t.current = fitTransform(w, h, iw, ih, 8);
      else t.current = clampPan(t.current, w, h, iw, ih);
      setZoomLabel(`${Math.round((t.current.scale / fitScale()) * 100)}%`);
      schedule();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iw, ih, schedule]);

  // glide to a new match
  useEffect(() => {
    if (!focus || !size.current.w) return;
    userMoved.current = true;
    pulseStart.current = reducedMotion() ? null : performance.now();
    animateTo(rectTransform(focus.rect, size.current.w, size.current.h, 28));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);

  useEffect(() => {
    schedule();
  }, [highlight, selectMode, schedule]);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0; // StrictMode re-runs effects; a stale id would block every later schedule()
    },
    [],
  );

  // non-passive wheel listener so the page doesn't scroll while zooming
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      userMoved.current = true;
      const r = canvas.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018));
      setTransform(zoomAt(t.current, e.clientX - r.left, e.clientY - r.top, factor, minScale(), MAX_SCALE));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setTransform]);

  const local = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    canvasRef.current!.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    anim.current = null;
    if (pointers.current.size === 2) {
      selection.current = null;
      const [a, b] = [...pointers.current.values()];
      gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    } else if (latest.current.selectMode) {
      const ip = screenToImage(t.current, p.x, p.y);
      selection.current = { a: ip, b: ip };
    }
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    userMoved.current = true;
    if (pointers.current.size >= 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const g = gesture.current;
      let next = zoomAt(t.current, mid.x, mid.y, dist / (g.dist || 1), minScale(), MAX_SCALE);
      next = { ...next, tx: next.tx + (mid.x - g.mid.x), ty: next.ty + (mid.y - g.mid.y) };
      gesture.current = { dist, mid };
      setTransform(next);
    } else if (selection.current) {
      const ip = screenToImage(t.current, p.x, p.y);
      selection.current = { a: selection.current.a, b: { x: Math.min(iw, Math.max(0, ip.x)), y: Math.min(ih, Math.max(0, ip.y)) } };
      schedule();
    } else {
      setTransform({ ...t.current, tx: t.current.tx + (p.x - prev.x), ty: t.current.ty + (p.y - prev.y) });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (pointers.current.size === 0) {
      setDragging(false);
      const sel = selection.current;
      selection.current = null;
      if (sel) {
        const rect = {
          x: Math.max(0, Math.min(sel.a.x, sel.b.x)),
          y: Math.max(0, Math.min(sel.a.y, sel.b.y)),
          width: Math.abs(sel.a.x - sel.b.x),
          height: Math.abs(sel.a.y - sel.b.y),
        };
        if (rect.width * t.current.scale >= 8 && rect.height * t.current.scale >= 6) onRegionSelect(rect);
        schedule();
      }
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (latest.current.selectMode) return;
    userMoved.current = true;
    const r = canvasRef.current!.getBoundingClientRect();
    animateTo(zoomAt(t.current, e.clientX - r.left, e.clientY - r.top, 2.2, minScale(), MAX_SCALE));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const step = 80;
    const map: Record<string, () => void> = {
      "+": () => zoomBy(1.4), "=": () => zoomBy(1.4), "-": () => zoomBy(1 / 1.4), "0": fit,
      ArrowLeft: () => setTransform({ ...t.current, tx: t.current.tx + step }),
      ArrowRight: () => setTransform({ ...t.current, tx: t.current.tx - step }),
      ArrowUp: () => setTransform({ ...t.current, ty: t.current.ty + step }),
      ArrowDown: () => setTransform({ ...t.current, ty: t.current.ty - step }),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      userMoved.current = true;
      fn();
    }
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-[62vh] min-h-[360px] w-full overflow-hidden rounded-2xl bg-[#07070B] lg:h-[calc(100vh-9rem)] lg:max-h-[860px]"
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Community wall poster. Use plus and minus to zoom, arrow keys to pan, zero to fit."
        className={`absolute inset-0 size-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-[#14F195]/70 ${
          selectMode ? "cursor-crosshair" : dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
      />
      <div className="absolute left-3 top-3 flex flex-col items-start gap-2">
        {highlight && label ? <MatchBadge label={label} /> : null}
        {selectMode ? (
          <div className="pointer-events-none rounded-full border border-[#9945FF]/50 bg-[#0B0B10]/85 px-3 py-1.5 text-xs text-[#C9A6FF] backdrop-blur">
            Selection mode: drag to capture a region
          </div>
        ) : null}
      </div>
      <div className="absolute bottom-3 right-3">
        <ZoomControls
          zoomLabel={zoomLabel}
          onZoomIn={() => zoomBy(1.6)}
          onZoomOut={() => zoomBy(1 / 1.6)}
          onFit={() => { userMoved.current = false; fit(); }}
          onReset={actualSize}
          onFullPoster={() => { userMoved.current = false; fit(); }}
        />
      </div>
    </div>
  );
}
