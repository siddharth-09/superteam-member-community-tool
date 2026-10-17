import { Skeleton } from "@/components/ui/skeleton";
import type { Snippet } from "@/hooks/use-snippet";

export function SnippetPreview({ snippet, error, alt }: { snippet: Snippet | null; error: string | null; alt: string }) {
  if (error) return <p role="alert" className="text-sm text-red-300">{error}</p>;
  if (!snippet) return <Skeleton className="aspect-[2/1] w-full bg-white/[0.06]" />;
  return (
    <figure className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={snippet.url} alt={alt} width={snippet.width} height={snippet.height} className="h-auto w-full" />
      <figcaption className="border-t border-white/10 px-3 py-1.5 font-mono text-[11px] text-white/45">
        {snippet.width} × {snippet.height}px · PNG · cropped from poster at ({snippet.crop.x}, {snippet.crop.y})
      </figcaption>
    </figure>
  );
}
