#!/usr/bin/env bash
# Rebuild public/name-index.json from public/community-wall.jpg (macOS only: uses Apple Vision OCR).
# OCR runs on the original poster (primary) and on a black-background, contrast-boosted copy
# (adds faded names the first pass missed). build-index.py merges them. The poster itself is never changed.
set -euo pipefail
cd "$(dirname "$0")"
IMG="${1:-../public/community-wall.jpg}"
rm -f pass-*.json
python3 -I preprocess.py "$IMG" clean.png
merge() {  # merge pass-*.json into $1
  python3 -I - "$1" <<'PY'
import json, glob, sys
words = []
for f in sorted(glob.glob("pass-*.json")): words += json.load(open(f))
json.dump(words, open(sys.argv[1], "w"))
print(sys.argv[1], "words:", len(words))
PY
  rm -f pass-*.json
}
run_passes() {  # OCR image $1 with several tile/scale configs
  local i=0
  for cfg in "2 1000 100" "2 480 70" "3 600 80" "1 1600 150" "3 400 70"; do  # "upscale tile overlap", tuned for a ~3300px-wide poster
    i=$((i+1)); swift ocr.swift "$1" "pass-$i.json" $cfg
  done
}
run_passes "$IMG";      merge words.json
run_passes clean.png;   merge words-clean.json
python3 -I build-index.py
