"use client";

import { Loader2, Search, X } from "lucide-react";
import { useId, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  busy: boolean;
  indexedCount: number | null;
}

export function NameSearch({ value, onChange, onSubmit, onClear, busy, indexedCount }: Props) {
  const id = useId();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={submit} role="search" className="group relative">
        <label htmlFor={id} className="sr-only">Your name as it appears on the community wall</label>
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 pl-4 shadow-[0_0_0_1px_rgba(153,69,255,0.0),0_10px_50px_-12px_rgba(153,69,255,0.55)] transition focus-within:border-[#9945FF]/70 focus-within:shadow-[0_0_0_3px_rgba(153,69,255,0.25),0_10px_50px_-12px_rgba(153,69,255,0.7)]">
          <Search className="size-5 shrink-0 text-white/40" aria-hidden />
          <input
            id={id}
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search your name…"
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="search"
            className="h-11 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/35 [&::-webkit-search-cancel-button]:hidden"
          />
          {value ? (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear search"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-white/50 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#14F195]/70"
            >
              <X className="size-4" />
            </button>
          ) : null}
          <Button
            type="submit"
            disabled={busy || value.trim().length < 2}
            className="h-11 rounded-xl bg-[#9945FF] px-5 text-sm font-semibold text-white hover:bg-[#a95bff] focus-visible:ring-[#14F195]/60"
          >
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Search
          </Button>
        </div>
      </form>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/50">
        <span>Enter your name exactly as it appears on the community wall.</span>
        {indexedCount !== null ? (
          <span className="inline-flex items-center gap-1.5 text-[#14F195]/90">
            <span className="size-1.5 rounded-full bg-[#14F195]" aria-hidden />
            {indexedCount.toLocaleString()} names indexed
          </span>
        ) : null}
      </p>
    </div>
  );
}
