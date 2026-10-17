#!/usr/bin/env python3
"""Make a black-background, high-contrast copy of the poster for OCR only (the displayed poster is untouched).

Background = local minimum luminance (text is always brighter than the purple behind it), smoothed.
Text signal = luminance - background, amplified so faded names become solid white on black.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
CEIL = float(sys.argv[3]) if len(sys.argv) > 3 else 45.0
im = Image.open(src).convert("RGB")
S = im.width / 1600  # filter sizes were tuned on a 1600px-wide poster
lum = im.convert("L").filter(ImageFilter.GaussianBlur(0.6 * S))
# smooth lower envelope of the luminance = purple background without the text
bg = lum.filter(ImageFilter.MinFilter(2 * round(7.5 * S) + 1)).filter(ImageFilter.GaussianBlur(12 * S))
diff = np.asarray(lum, dtype=np.float32) - np.asarray(bg, dtype=np.float32)
diff = np.clip(diff - 7.0, 0, None)            # drop jpeg noise / background ripple
# sqrt curve: faint names (diff ~12) land mid-grey, bold names (diff 100+) saturate without bloating
out = (np.clip(diff / CEIL, 0, 1) ** 0.5 * 255).astype(np.uint8)
Image.fromarray(out).convert("RGB").save(dst)
