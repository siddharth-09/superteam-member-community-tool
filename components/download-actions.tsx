"use client";

import { Check, Copy, Download, Link2, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { ContextPreset } from "@/lib/image-crop";
import { cn } from "@/lib/utils";

interface Props {
  branded: boolean;
  onBranded: (v: boolean) => void;
  outline: boolean;
  onOutline: (v: boolean) => void;
  outlineAvailable: boolean;
  preset: ContextPreset;
  onPreset: (p: ContextPreset) => void;
  onDownload: () => void;
  onCopyLink: () => Promise<boolean>;
  onShare: () => Promise<void>;
  onCopyName?: () => Promise<boolean>;
  disabled: boolean;
}

const PRESETS: { id: ContextPreset; label: string }[] = [
  { id: "tight", label: "Tight" },
  { id: "balanced", label: "Balanced" },
  { id: "wide", label: "Wide" },
];

function Toggle({ id, label, checked, onChange, disabled }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className={cn("text-sm text-white/75", disabled && "opacity-40")}>{label}</label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export function DownloadActions(p: Props) {
  const [done, setDone] = useState<string | null>(null);
  const flash = async (key: string, fn: () => Promise<boolean | void>) => {
    const ok = await fn();
    if (ok !== false) {
      setDone(key);
      setTimeout(() => setDone((d) => (d === key ? null : d)), 1800);
    }
  };
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const btn = "border-white/15 bg-transparent text-white hover:bg-white/10";
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
        <div role="group" aria-label="Context around the name" className="flex rounded-lg bg-black/30 p-0.5">
          {PRESETS.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={p.preset === o.id}
              onClick={() => p.onPreset(o.id)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[#14F195]/70",
                p.preset === o.id ? "bg-[#9945FF] text-white" : "text-white/60 hover:text-white",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <Toggle id="branded" label="Superteam frame & caption" checked={p.branded} onChange={p.onBranded} />
        <Toggle id="outline" label="Outline the name" checked={p.outline} onChange={p.onOutline} disabled={!p.outlineAvailable} />
      </div>

      <Button onClick={p.onDownload} disabled={p.disabled} className="h-11 w-full bg-gradient-to-r from-[#9945FF] to-[#7a3fe0] text-base font-semibold text-white hover:brightness-110">
        <Download /> Download PNG
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className={btn} onClick={() => flash("link", p.onCopyLink)}>
          {done === "link" ? <Check className="text-[#14F195]" /> : <Link2 />} {done === "link" ? "Link copied" : "Copy link"}
        </Button>
        <Button variant="outline" className={btn} onClick={() => flash("share", p.onShare)}>
          <Share2 /> {canShare ? "Share" : "Share link"}
        </Button>
        {p.onCopyName ? (
          <Button variant="outline" className={cn(btn, "col-span-2")} onClick={() => flash("name", p.onCopyName!)}>
            {done === "name" ? <Check className="text-[#14F195]" /> : <Copy />} {done === "name" ? "Name copied" : "Copy name"}
          </Button>
        ) : null}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{done ? "Copied" : ""}</p>
    </div>
  );
}
