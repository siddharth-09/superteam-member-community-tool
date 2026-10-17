#!/usr/bin/env python3
"""Turn raw OCR words into public/name-index.json.

Two sources:
  A. words.json        OCR of the original poster (primary, best boxes)
  B. words-clean.json  OCR of the black-background copy (finds faded names A missed)
B only contributes names whose box does not overlap anything from A.

Per source: row-wise consensus across passes -> split rows into names on blank
pixel columns -> normalise to 0..1 coordinates. Optional scripts/corrections.json.
"""
import json, os, statistics
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "public", "community-wall.jpg")

poster = Image.open(SRC).convert("RGB")
W, H = poster.size
S = W / 1600  # all pixel constants below were tuned on a 1600px-wide poster
ROW_TOL = 4 * S
NAME_GAP = 6 * S  # px of blank columns separating two names (in-name spaces are ~3px at 1600px)
LUM_ORIG = np.asarray(poster.convert("L"), dtype=np.int16)
CLEAN_PATH = os.path.join(HERE, "clean.png")
LUM_CLEAN = np.asarray(Image.open(CLEAN_PATH).convert("L"), dtype=np.int16) if os.path.exists(CLEAN_PATH) else None


def overlap(a, b):
    o = min(a["x"] + a["w"], b["x"] + b["w"]) - max(a["x"], b["x"])
    return o / max(1e-6, min(a["w"], b["w"]))


def group_rows(items):
    items = sorted(items, key=lambda a: a["y"] + a["h"] / 2)
    rows = []
    for a in items:
        cy = a["y"] + a["h"] / 2
        for r in rows[-12:]:
            if abs(r["cy"] - cy) < ROW_TOL:
                r["w"].append(a); break
        else:
            rows.append({"cy": cy, "w": [a]})
    return rows


def consensus(words):
    """Cluster overlapping words from different passes; the reading most passes agree on wins."""
    keep = []
    for r in group_rows(words):
        clusters = []
        for a in sorted(r["w"], key=lambda a: a["x"]):
            for c in clusters:
                if overlap(c["box"], a) > 0.5:
                    c["m"].append(a)
                    c["box"] = {"x": statistics.median(m["x"] for m in c["m"]), "w": statistics.median(m["w"] for m in c["m"])}
                    break
            else:
                clusters.append({"m": [a], "box": {"x": a["x"], "w": a["w"]}})
        for c in clusters:
            votes = {}
            for m in c["m"]:
                votes.setdefault(m["t"], []).append(m)
            ranked = sorted(votes.values(), key=lambda v: (-len(v), -sum(m["c"] for m in v)))
            best = ranked[0]
            keep.append({
                "t": best[0]["t"], "alts": [v[0]["t"] for v in ranked],
                "x": statistics.median(m["x"] for m in best), "y": statistics.median(m["y"] for m in best),
                "w": statistics.median(m["w"] for m in best), "h": statistics.median(m["h"] for m in best),
                "c": sum(m["c"] for m in best) / max(len(c["m"]), 1),  # agreement-weighted
            })
    return keep


def segment(words, ink_fn, min_width=12 * S):
    """Split each row on blank pixel columns (Vision's word boxes are too loose to find name boundaries)."""
    records = []
    for r in group_rows(words):
        ws = r["w"]
        y1 = max(0, int(min(w["y"] for w in ws)))
        y2 = min(H, int(max(w["y"] + w["h"] for w in ws)) + 1)
        ink = ink_fn(y1, y2)
        segs, start, blank, end = [], None, 0, 0
        for x in range(W):
            if ink[x]:
                if start is None: start = x
                end, blank = x, 0
            elif start is not None:
                blank += 1
                if blank >= NAME_GAP:
                    segs.append([start, end]); start = None
        if start is not None: segs.append([start, end])
        if not segs: continue
        buckets = [[] for _ in segs]
        for w in ws:
            cx = w["x"] + w["w"] / 2
            i = min(range(len(segs)), key=lambda k: 0 if segs[k][0] - 2 <= cx <= segs[k][1] + 2 else min(abs(cx - segs[k][0]), abs(cx - segs[k][1])))
            buckets[i].append(w)
        for (sx, ex), g in zip(segs, buckets):
            if not g: continue
            g = sorted(g, key=lambda w: w["x"])
            text = " ".join(w["t"] for w in g).strip()
            if len(text) < 2 or ex - sx < min_width: continue
            aliases = []
            for k in (1, 2):
                alt = " ".join(w["alts"][k] if len(w["alts"]) > k else w["alts"][0] for w in g)
                if alt != text and alt not in aliases: aliases.append(alt)
            gy1 = min(w["y"] for w in g); gy2 = max(w["y"] + w["h"] for w in g)
            records.append({"text": text, "aliases": aliases, "x": sx, "y": gy1, "w": ex - sx + 1, "h": gy2 - gy1,
                            "confidence": sum(w["c"] for w in g) / len(g)})
    return records


def load(name):
    p = os.path.join(HERE, name)
    return json.load(open(p)) if os.path.exists(p) else []


# --- A: original poster ---------------------------------------------------------------
def ink_orig(y1, y2):
    strip = LUM_ORIG[y1:y2]
    return (strip.max(axis=0) - strip.min(axis=0)) > 40

records = segment(consensus(load("words.json")), ink_orig)
for r in records: r["source"] = "ocr"
n_primary = len(records)

# --- B: black-background copy: only names A has no box for ---------------------------------
added = 0
clean_words = load("words-clean.json")
if clean_words and LUM_CLEAN is not None:
    def ink_clean(y1, y2):
        strip = LUM_CLEAN[y1:y2]
        return (strip > 90).sum(axis=0) >= round(2 * S)
    def covered(b):
        area = b["w"] * b["h"]
        for a in records:
            ox = min(a["x"] + a["w"], b["x"] + b["w"]) - max(a["x"], b["x"])
            oy = min(a["y"] + a["h"], b["y"] + b["h"]) - max(a["y"], b["y"])
            if ox > 0 and oy > 0 and ox * oy / area > 0.25: return True
            # fragment hugging an existing name on the same line: a split-off piece, not a new name
            if oy > 0.5 * b["h"] and -NAME_GAP * 1.5 < ox < 0: return True
        return False
    extra = []
    for b in segment(consensus(clean_words), ink_clean):
        if b["w"] > 260 * S or len(b["text"].split()) > 6: continue  # merged noise, not a single name
        if not covered(b):
            b["source"] = "ocr-enhanced"; b["confidence"] = min(b["confidence"], 0.5)
            extra.append(b)
    records += extra
    added = len(extra)

# --- manual corrections ----------------------------------------------------------------
cpath = os.path.join(HERE, "corrections.json")
if os.path.exists(cpath):
    c = json.load(open(cpath))
    rm = set(c.get("remove", [])); rn = c.get("rename", {})
    records = [r for r in records if r["text"] not in rm]
    for r in records:
        if r["text"] in rn: r["text"] = rn[r["text"]]; r["source"] = "manual"; r["confidence"] = 1
    for a in c.get("add", []):
        records.append({"text": a["text"], "x": a["x"], "y": a["y"], "w": a["w"], "h": a["h"], "confidence": 1, "source": "manual", "aliases": []})

records.sort(key=lambda r: (r["y"], r["x"]))
out = {
    "version": 3,
    "image": {"src": "/community-wall.jpg", "width": W, "height": H},
    "entries": [
        {"id": i, "text": r["text"], "x": round(r["x"] / W, 6), "y": round(r["y"] / H, 6),
         "width": round(r["w"] / W, 6), "height": round(r["h"] / H, 6),
         "confidence": round(r["confidence"], 3), "source": r["source"],
         **({"aliases": r["aliases"]} if r.get("aliases") else {})}
        for i, r in enumerate(records)
    ],
}
json.dump(out, open(os.path.join(ROOT, "public", "name-index.json"), "w"), separators=(",", ":"), ensure_ascii=False)
print(f"{len(records)} names indexed ({n_primary} from original, {added} extra from black-background pass)")
