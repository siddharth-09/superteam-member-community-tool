"use client";

import { useEffect, useState } from "react";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "ready"; value: T }
  | { status: "error"; message: string };

/** Decodes the poster once and shares the HTMLImageElement with the viewer and the crop code. */
export function usePoster(src: string): AsyncState<HTMLImageElement> {
  const [state, setState] = useState<AsyncState<HTMLImageElement>>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous"; // keeps the canvas untainted if the poster is hosted elsewhere (needs CORS headers)
    img.decoding = "async";
    img.onload = () => {
      if (cancelled) return;
      img.decode().catch(() => undefined).finally(() => !cancelled && setState({ status: "ready", value: img }));
    };
    img.onerror = () => !cancelled && setState({ status: "error", message: `The poster image (${src}) could not be loaded.` });
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return state;
}
