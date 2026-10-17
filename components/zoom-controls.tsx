"use client";

import { Maximize2, Minus, Plus, RotateCcw, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
  onFullPoster: () => void;
  zoomLabel: string;
}

export function ZoomControls({ onZoomIn, onZoomOut, onFit, onReset, onFullPoster, zoomLabel }: Props) {
  const btn = "size-9 text-white/80 hover:text-white";
  return (
    <div
      role="toolbar"
      aria-label="Poster zoom controls"
      className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-[#0B0B10]/85 p-1 shadow-lg backdrop-blur"
    >
      <Button variant="ghost" size="icon" className={btn} onClick={onZoomOut} aria-label="Zoom out"><Minus /></Button>
      <span className="w-12 text-center font-mono text-xs tabular-nums text-white/60" aria-live="off">{zoomLabel}</span>
      <Button variant="ghost" size="icon" className={btn} onClick={onZoomIn} aria-label="Zoom in"><Plus /></Button>
      <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
      <Button variant="ghost" size="icon" className={btn} onClick={onFit} aria-label="Fit to screen"><Maximize2 /></Button>
      <Button variant="ghost" size="icon" className={btn} onClick={onReset} aria-label="Reset view"><RotateCcw /></Button>
      <Button variant="ghost" size="icon" className={btn} onClick={onFullPoster} aria-label="Return to full poster"><ScanSearch /></Button>
    </div>
  );
}
