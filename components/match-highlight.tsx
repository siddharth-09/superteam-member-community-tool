import { MapPin } from "lucide-react";
import type { PixelRect } from "@/types/name-index";

/** Draws the highlight on the viewer canvas. Coordinates are original-image px mapped through scale/tx/ty. */
export function drawMatchHighlight(
  ctx: CanvasRenderingContext2D,
  rect: PixelRect,
  t: { scale: number; tx: number; ty: number },
  view: { width: number; height: number },
  pulse: number, // 0..1 progress of the "located" ping, 1 = finished
) {
  const pad = Math.max(2, 2.5 * Math.min(1, t.scale / 4)) ; // screen px
  const x = rect.x * t.scale + t.tx - pad;
  const y = rect.y * t.scale + t.ty - pad;
  const w = rect.width * t.scale + pad * 2;
  const h = rect.height * t.scale + pad * 2;
  const r = Math.min(6, h / 3);

  // dim everything except the match so it stands out on both light and dark text
  ctx.save();
  ctx.fillStyle = "rgba(6,4,14,0.55)";
  ctx.beginPath();
  ctx.rect(0, 0, view.width, view.height);
  ctx.roundRect(x - 2, y - 2, w + 4, h + 4, r + 2);
  ctx.fill("evenodd");

  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();
  ctx.strokeStyle = "#14F195";
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(20,241,149,0.7)";
  ctx.shadowBlur = 10;
  ctx.stroke();

  if (pulse < 1) {
    const grow = 6 + pulse * 46;
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1 - pulse;
    ctx.strokeStyle = "#9945FF";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - grow, y - grow, w + grow * 2, h + grow * 2, r + grow);
    ctx.stroke();
  }
  ctx.restore();
}

export function MatchBadge({ label }: { label: string }) {
  return (
    <div className="pointer-events-none flex max-w-[70%] items-center gap-1.5 rounded-full border border-[#14F195]/40 bg-[#0B0B10]/85 px-3 py-1.5 text-xs font-medium text-[#14F195] shadow-lg backdrop-blur">
      <MapPin className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">Located: {label}</span>
    </div>
  );
}
