# Community Name Finder (Solana × Superteam)

Search for your name on the community wall poster. The app finds the name, zooms to it, highlights it, and cuts a real PNG snippet from the original poster pixels.

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Canvas API.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

Optional env (see `.env.example`): `NEXT_PUBLIC_GITHUB_URL` shows a GitHub link in the navbar.

## How it works

| Piece | File |
| --- | --- |
| Poster (never modified) | `public/community-wall.jpg` |
| Precomputed name index | `public/name-index.json` |
| Index loading + validation | `lib/image-index.ts` |
| Search (exact / partial / fuzzy, aliases) | `lib/search.ts` |
| Crop maths + PNG rendering | `lib/image-crop.ts` |
| Zoom/pan maths | `lib/viewer-math.ts` |
| Canvas viewer | `components/community-image-viewer.tsx` |

**Coordinates.** Every box in `name-index.json` is stored normalised (0–1) against the original poster size. The crop always converts back to original pixels, so viewport size, zoom, pan, letterboxing and device pixel ratio never affect the snippet.

**Search.** Runs client-side on the index. Exact matches rank first, then partial, then close OCR variants. If nothing matches but a word is shared, those results are shown with a warning and are never auto-selected. No match means an honest "not found" plus a manual region-capture mode.

**Share links.** `/find?q=<name>&m=<entry id>` (or `?r=x,y,w,h` for manual regions, normalised). Opening one re-runs the search and re-selects the same box.

**Snippet.** Context presets (tight / balanced / wide), optional name outline, optional Superteam frame. Output is PNG, 2× upscaled from the real pixels, with a filename like `community-wall-matheus-macedo-santos.png`.

## Generating / updating the name index

OCR runs offline once, not in the browser. This uses Apple Vision, so it needs macOS with Swift and Python 3 + Pillow + numpy.

1. Replace `public/community-wall.jpg` with the new poster.
2. `npm run index`

This runs several tile/scale OCR passes (`scripts/ocr.swift`) on the poster, then a second set on a black-background, contrast-boosted copy (`scripts/preprocess.py`, used for OCR only) to catch faded names. The passes are merged by per-row consensus, rows are split into names using blank pixel columns, and `public/name-index.json` is written (`scripts/build-index.py`). Entries from the second pass are tagged `ocr-enhanced` and low confidence.

### Fixing OCR mistakes

The poster's text is tiny, so some names are misread or missing, and the faded names near the poster edges are mostly unreadable. Create `scripts/corrections.json` (applied on each `npm run index`):

```json
{
  "remove": ["garbled text"],
  "rename": { "Biddharth Pandro": "Siddharth Pandro" },
  "add": [{ "text": "Your Name", "x": 812, "y": 640, "w": 70, "h": 10 }]
}
```

`add` takes pixel coordinates in the original poster. Users can also capture any region manually in the UI.

## Limits (honest)

- The index is OCR output. Check it against the poster; it is not a verified roster.
- Some names may be missing, or a person may simply not be on the wall (it features builders, writers, designers and pioneers). The app says so on the page.
- Poster source: https://x.com/superteam/status/2111017883455422735
- The poster is the 3277×4096 original from Superteam's X post. Snippets are 2× upscaled from its real pixels.
- If you host the poster on another origin, it needs CORS headers (`Access-Control-Allow-Origin`) or the canvas will be tainted and downloads will fail.
