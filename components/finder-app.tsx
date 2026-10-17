"use client";

import { ArrowLeft, Crosshair, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommunityImageViewer, type ViewerHandle } from "@/components/community-image-viewer";
import { DownloadActions } from "@/components/download-actions";
import { HeroSection } from "@/components/hero-section";
import { Navbar } from "@/components/navbar";
import { SearchResults } from "@/components/search-results";
import { SnippetPreview } from "@/components/snippet-preview";
import { EmptyState, ErrorState, LoadingState, NotFoundState } from "@/components/state-panels";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNameIndex } from "@/hooks/use-name-index";
import { usePoster } from "@/hooks/use-poster";
import { buildSnippetCanvas, resolveCrop, useSnippet, type SnippetInput, type SnippetOptionsState } from "@/hooks/use-snippet";
import { canvasToBlob, computeCropRect, downloadBlob, entryToRect, rectToNormalized, snippetFilename, type ContextPreset } from "@/lib/image-crop";
import { POSTER_SOURCE_URL } from "@/lib/image-index";
import { search } from "@/lib/search";
import type { PixelRect, SearchResult, Selection } from "@/types/name-index";

const POSTER_FALLBACK = "/community-wall.jpg";

export function FinderApp() {
  const { state: indexState, searchIndex } = useNameIndex();
  const posterSrc = indexState.status === "ready" ? indexState.value.index.image.src : POSTER_FALLBACK;
  const poster = usePoster(posterSrc);
  const image = poster.status === "ready" ? poster.value : null;

  const viewer = useRef<ViewerHandle>(null);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [manual, setManual] = useState(false);
  const [opts, setOpts] = useState<SnippetOptionsState>({ preset: "balanced", branded: true, outline: true });
  const [focusKey, setFocusKey] = useState(0);
  const restored = useRef(false);

  const iw = image?.naturalWidth ?? 0;
  const ih = image?.naturalHeight ?? 0;

  const targetRect = useMemo<PixelRect | null>(() => {
    if (!image) return null;
    if (selection?.type === "entry") return entryToRect(selection.entry, iw, ih);
    return null;
  }, [selection, image, iw, ih]);

  const snippetInput = useMemo<SnippetInput | null>(() => {
    if (!selection) return null;
    if (selection.type === "entry" && targetRect) return { target: targetRect, label: selection.entry.text };
    if (selection.type === "region") return { target: null, region: selection.rect, label: null };
    return null;
  }, [selection, targetRect]);

  const { snippet, error: snippetError } = useSnippet(image, snippetInput, opts);

  const focus = useMemo(() => {
    if (!image || !selection) return null;
    const rect = selection.type === "entry" && targetRect ? computeCropRect(targetRect, iw, ih, "balanced") : selection.type === "region" ? selection.rect : null;
    return rect ? { rect, key: `${selection.type}-${selection.type === "entry" ? selection.entry.id : selection.rect.x}-${focusKey}` } : null;
  }, [selection, targetRect, image, iw, ih, focusKey]);

  const syncUrl = useCallback((sel: Selection | null, q: string) => {
    const params = new URLSearchParams();
    if (sel?.type === "entry") {
      params.set("q", sel.entry.text);
      params.set("m", String(sel.entry.id));
    } else if (sel?.type === "region" && iw) {
      const n = rectToNormalized(sel.rect, iw, ih);
      params.set("r", [n.x, n.y, n.width, n.height].map((v) => v.toFixed(5)).join(","));
    } else if (q) {
      params.set("q", q);
    }
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/find?${qs}` : "/");
  }, [iw, ih]);

  const select = useCallback((r: SearchResult) => {
    const sel: Selection = { type: "entry", entry: r.entry, kind: r.kind };
    setSelection(sel);
    setFocusKey((k) => k + 1);
    syncUrl(sel, r.entry.text);
  }, [syncUrl]);

  const runSearch = useCallback((q: string, preferId?: number) => {
    if (!searchIndex) return;
    const trimmed = q.trim();
    setSubmitted(trimmed);
    setManual(false);
    const found = search(trimmed, searchIndex);
    setResults(found);
    const pick = (preferId !== undefined ? found.find((r) => r.entry.id === preferId) : undefined) ?? found[0];
    // a "shares a word only" result is never auto-selected: the user must confirm it is theirs
    if (pick && pick.kind !== "token") select(pick);
    else {
      setSelection(null);
      syncUrl(null, trimmed);
    }
  }, [searchIndex, select, syncUrl]);

  const restoreRegion = useCallback((rect: PixelRect) => {
    if (!image) return;
    setSelection({ type: "region", rect: resolveCrop(image, { target: null, region: rect, label: null }, "balanced") });
  }, [image]);

  // restore a shared link: /find?q=...&m=<id> or ?r=x,y,w,h
  /* One-shot sync from the URL (an external source) into state once data is ready. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (restored.current || !searchIndex || !image || indexState.status !== "ready") return;
    restored.current = true;
    const p = new URLSearchParams(window.location.search);
    const r = p.get("r")?.split(",").map(Number);
    if (r && r.length === 4 && r.every((v) => Number.isFinite(v)) && r[2] > 0 && r[3] > 0) {
      const rect = { x: r[0] * iw, y: r[1] * ih, width: r[2] * iw, height: r[3] * ih };
      restoreRegion(rect);
      return;
    }
    const q = p.get("q");
    if (q) {
      setQuery(q);
      const m = p.get("m");
      runSearch(q, m !== null && m !== "" ? Number(m) : undefined);
    }
  }, [searchIndex, image, indexState.status, iw, ih, runSearch, restoreRegion]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const clear = () => {
    setQuery("");
    setSubmitted(null);
    setResults([]);
    setSelection(null);
    setManual(false);
    window.history.replaceState(null, "", "/");
    viewer.current?.fit();
  };

  const onRegionSelect = useCallback((rect: PixelRect) => {
    if (!image) return;
    const sel: Selection = { type: "region", rect: resolveCrop(image, { target: null, region: rect, label: null }, "balanced") };
    setSelection(sel);
    setManual(false);
    setResults([]);
    setSubmitted(null);
    syncUrl(sel, "");
  }, [image, syncUrl]);

  const shareUrl = () => `${window.location.origin}${window.location.pathname}${window.location.search}`;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      window.prompt("Copy this:", text);
      return false;
    }
  };

  const downloadFor = async (input: SnippetInput) => {
    if (!image) return;
    const { canvas, crop } = buildSnippetCanvas(image, input, opts);
    downloadBlob(await canvasToBlob(canvas), snippetFilename(input.label, crop));
  };

  const download = () => {
    if (snippet && snippetInput) downloadBlob(snippet.blob, snippetFilename(snippetInput.label, snippet.crop));
  };

  const share = async () => {
    const url = shareUrl();
    const label = snippetInput?.label ?? "a region of the community wall";
    if (typeof navigator.share === "function") {
      try {
        const file = snippet && snippetInput ? new File([snippet.blob], snippetFilename(snippetInput.label, snippet.crop), { type: "image/png" }) : null;
        if (file && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "Superteam community wall", text: `Found ${label} on the community wall`, url });
        } else {
          await navigator.share({ title: "Superteam community wall", text: `Found ${label} on the community wall`, url });
        }
      } catch {
        /* user dismissed the sheet */
      }
    } else {
      await copy(url);
    }
  };

  const selectedId = selection?.type === "entry" ? selection.entry.id : null;
  const indexed = indexState.status === "ready" ? indexState.value.index.entries.length : null;
  const searching = indexState.status === "loading";
  const label = selection?.type === "entry" ? selection.entry.text : selection?.type === "region" ? "Selected region" : undefined;
  const announce = submitted === null ? "" : results.length ? `${results.length} ${results.length === 1 ? "match" : "matches"} found for ${submitted}` : `No match found for ${submitted}`;

  return (
    <div className="min-h-screen bg-[#0B0B10] text-white">
      <Navbar />
      <main>
        <HeroSection value={query} onChange={setQuery} onSubmit={() => runSearch(query)} onClear={clear} busy={searching} indexedCount={indexed} />
        <p className="sr-only" role="status" aria-live="polite">{announce}</p>

        <section aria-label="Community wall and results" className="mx-auto grid max-w-7xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="order-2 min-w-0 lg:order-1">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-2 shadow-[0_0_80px_-20px_rgba(153,69,255,0.55)] sm:p-3">
              <div className="mb-2 flex items-center justify-between gap-2 px-2 pt-1">
                <h2 className="text-sm font-medium text-white/80">Community wall</h2>
                <Button
                  size="sm"
                  variant={manual ? "default" : "outline"}
                  aria-pressed={manual}
                  onClick={() => setManual((m) => !m)}
                  className={manual ? "bg-[#14F195] text-black hover:bg-[#3df5ab]" : "border-white/15 bg-transparent text-white hover:bg-white/10"}
                >
                  {manual ? <X /> : <Crosshair />} {manual ? "Cancel selection" : "Capture a region"}
                </Button>
              </div>
              {poster.status === "ready" ? (
                <CommunityImageViewer
                  ref={viewer}
                  image={poster.value}
                  highlight={targetRect}
                  focus={focus}
                  label={label}
                  selectMode={manual}
                  onRegionSelect={onRegionSelect}
                />
              ) : poster.status === "loading" ? (
                <Skeleton className="aspect-[4/5] max-h-[70vh] w-full rounded-2xl bg-white/[0.05]" />
              ) : (
                <ErrorState title="Poster unavailable" message={poster.message} />
              )}
              <p className="px-2 pb-1 pt-2 text-xs text-white/40">
                Scroll or pinch to zoom, drag to pan, double-click to zoom in. The poster is never modified.{" "}
                Poster:{" "}
                <a href={POSTER_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-[#14F195]/80 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#14F195]">
                  Superteam on X
                </a>
              </p>
            </div>
          </div>

          <aside className="order-1 min-w-0 space-y-4 lg:order-2 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-1" aria-label="Results">
            {indexState.status === "loading" ? <LoadingState label="Loading the name index…" /> : null}
            {indexState.status === "error" ? (
              <ErrorState title="Name index unavailable" message={`${indexState.message} You can still explore the poster and capture a region manually.`} />
            ) : null}
            {indexState.status === "ready" && indexState.value.skipped > 0 ? (
              <p className="text-xs text-white/40">{indexState.value.skipped} malformed index entries were ignored.</p>
            ) : null}

            {indexState.status === "ready" && submitted === null && !selection ? <EmptyState onManual={() => setManual(true)} /> : null}
            {submitted !== null && results.length === 0 ? <NotFoundState query={submitted} onManual={() => setManual(true)} /> : null}

            {results.length > 0 ? (
              <div>
                <h2 className="mb-2 text-sm font-medium text-white/70">
                  {results.length} {results.length === 1 ? "result" : "results"} for &ldquo;{submitted}&rdquo;
                </h2>
                {results[0].kind === "token" ? (
                  <p className="mb-2 rounded-lg border border-[#FFC857]/25 bg-[#FFC857]/[0.06] p-2.5 text-xs text-[#FFD98A]">
                    No full match. These only share a word with your search, so check the preview before using one.
                  </p>
                ) : null}
                <SearchResults image={image} results={results} selectedId={selectedId} onSelect={select}
                  onDownload={(r) => downloadFor({ target: image ? entryToRect(r.entry, iw, ih) : null, label: r.entry.text })} />
              </div>
            ) : null}

            {selection ? (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-medium text-white/80">Your snippet</h2>
                  <button onClick={() => viewer.current?.fit()} className="inline-flex items-center gap-1 text-xs text-[#14F195] hover:underline focus-visible:outline-2 focus-visible:outline-[#14F195]">
                    <ArrowLeft className="size-3" aria-hidden /> Full poster
                  </button>
                </div>
                <SnippetPreview snippet={snippet} error={snippetError} alt={`Snippet of the community wall around ${label ?? "the selected region"}`} />
                <DownloadActions
                  branded={opts.branded}
                  onBranded={(branded) => setOpts((o) => ({ ...o, branded }))}
                  outline={opts.outline}
                  onOutline={(outline) => setOpts((o) => ({ ...o, outline }))}
                  outlineAvailable={selection.type === "entry"}
                  preset={opts.preset}
                  onPreset={(preset: ContextPreset) => setOpts((o) => ({ ...o, preset }))}
                  onDownload={download}
                  onCopyLink={() => copy(shareUrl())}
                  onShare={share}
                  onCopyName={selection.type === "entry" ? () => copy(selection.entry.text) : undefined}
                  disabled={!snippet}
                />
              </div>
            ) : null}
          </aside>
        </section>
      </main>
      <footer className="border-t border-white/[0.07] py-8 text-center text-xs text-white/35">
        <p className="mx-auto max-w-2xl px-4 leading-relaxed">
          Some names may be missing, or you may not be on the wall: it features builders, writers, designers and pioneers. Names are read from the poster by OCR and may contain errors.
        </p>
        <p className="mt-2">
          Unofficial community tool. Poster by{" "}
          <a href={POSTER_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-[#14F195]/80 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#14F195]">
            Superteam on X
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
