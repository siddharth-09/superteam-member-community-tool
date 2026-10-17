"use client";

import { useEffect, useMemo, useState } from "react";
import { loadNameIndex, type LoadedIndex } from "@/lib/image-index";
import { buildSearchIndex } from "@/lib/search";
import type { AsyncState } from "./use-poster";

export function useNameIndex() {
  const [state, setState] = useState<AsyncState<LoadedIndex>>({ status: "loading" });
  useEffect(() => {
    const ctrl = new AbortController();
    loadNameIndex(ctrl.signal)
      .then((value) => setState({ status: "ready", value }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setState({ status: "error", message: e instanceof Error ? e.message : "The name index failed to load." });
      });
    return () => ctrl.abort();
  }, []);
  const searchIndex = useMemo(() => (state.status === "ready" ? buildSearchIndex(state.value.index.entries) : null), [state]);
  return { state, searchIndex };
}
