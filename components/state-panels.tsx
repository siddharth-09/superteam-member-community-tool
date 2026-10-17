import { AlertTriangle, Crosshair, Loader2, SearchX, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const panel = "rounded-2xl border border-white/10 bg-white/[0.03] p-5";

export function EmptyState({ onManual }: { onManual: () => void }) {
  return (
    <div className={panel}>
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-[#9945FF]" aria-hidden />
        <div>
          <h2 className="font-medium text-white">Find your spot on the wall</h2>
          <p className="mt-1 text-sm text-white/55">
            Search above and we&apos;ll zoom straight to your name, then give you a downloadable snippet. Or explore the poster yourself: scroll to zoom, drag to pan.
          </p>
          <button onClick={onManual} className="mt-3 text-sm text-[#14F195] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#14F195]">
            Capture a region manually
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotFoundState({ query, onManual }: { query: string; onManual: () => void }) {
  return (
    <div className={panel} role="status">
      <div className="flex items-start gap-3">
        <SearchX className="mt-0.5 size-5 shrink-0 text-white/50" aria-hidden />
        <div>
          <h2 className="font-medium text-white">No match for &ldquo;{query}&rdquo;</h2>
          <p className="mt-1 text-sm text-white/55">
            Some names may be missing from our index (the poster&apos;s text is tiny and some is faded), or you may not be on the wall, which features builders, writers, designers and pioneers. Try just your first or last name, or a different spelling.
          </p>
          <p className="mt-2 text-sm text-white/55">
            Can you spot your name on the poster yourself? Select it and we&apos;ll cut the snippet from the real pixels.
          </p>
          <Button onClick={onManual} variant="outline" size="sm" className="mt-3 border-[#14F195]/40 bg-transparent text-[#14F195] hover:bg-[#14F195]/10">
            <Crosshair /> Select region manually
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className={panel} role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-white/70">
        <Loader2 className="size-4 animate-spin text-[#9945FF]" aria-hidden /> {label}
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-14 w-full bg-white/[0.06]" />
        <Skeleton className="h-14 w-full bg-white/[0.06]" />
      </div>
    </div>
  );
}

export function ErrorState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-red-400/25 bg-red-500/[0.06] p-5" role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-300" aria-hidden />
        <div>
          <h2 className="font-medium text-white">{title}</h2>
          <p className="mt-1 text-sm text-white/60">{message}</p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
