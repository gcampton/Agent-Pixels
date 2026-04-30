#!/usr/bin/env python3
from __future__ import annotations

import colorsys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / "public" / "assets" / "characters"
TARGET_COUNT = 40

OUTFITS = [
    (205, 42, 42), (46, 111, 216), (55, 161, 92), (131, 78, 196),
    (232, 232, 232), (24, 24, 28), (226, 185, 43), (218, 91, 162),
    (43, 173, 181), (238, 112, 57), (120, 190, 80), (96, 82, 210),
]
PANTS = [(28, 38, 52), (42, 84, 150), (72, 58, 48), (38, 38, 42)]
HAIR = [(232, 195, 87), (18, 16, 16), (176, 70, 45), (105, 62, 34), (210, 210, 220)]
SKIN = [(247, 204, 168), (214, 150, 98), (150, 92, 58), (92, 60, 44), (238, 176, 128)]

SKIN_COLORS = {
    (237, 175, 128), (224, 145, 83), (244, 196, 158), (247, 214, 186),
    (233, 165, 113), (239, 184, 134), (248, 229, 214), (245, 219, 200),
    (242, 182, 137), (231, 172, 121), (242, 221, 206), (220, 179, 150),
    (252, 248, 245), (211, 164, 130), (250, 240, 234), (208, 164, 130),
    (194, 135, 90),
}

HAIR_COLORS = {
    (50, 25, 29), (143, 77, 24), (120, 92, 25), (93, 71, 19),
    (148, 113, 30), (176, 166, 163), (218, 204, 201), (191, 182, 179),
    (36, 27, 26), (79, 63, 53), (67, 52, 46), (52, 39, 36),
    (11, 14, 17), (25, 31, 39), (52, 64, 78), (15, 19, 23),
    (38, 47, 58), (44, 54, 66), (32, 39, 48),
}

NEUTRAL_KEEP = {
    (0, 0, 0), (255, 255, 255), (225, 227, 233), (162, 170, 175),
    (159, 159, 159), (212, 212, 212), (189, 189, 189), (238, 238, 238),
}


def blend_shade(rgb: tuple[int, int, int], target: tuple[int, int, int], strength: float) -> tuple[int, int, int]:
    r, g, b = rgb
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    tr, tg, tb = target
    th, _, ts = colorsys.rgb_to_hls(tr / 255, tg / 255, tb / 255)
    nr, ng, nb = colorsys.hls_to_rgb(th, l, max(0.08, min(1.0, ts)))
    return (
        round(r * (1 - strength) + nr * 255 * strength),
        round(g * (1 - strength) + ng * 255 * strength),
        round(b * (1 - strength) + nb * 255 * strength),
    )


def classify(r: int, g: int, b: int) -> str | None:
    rgb = (r, g, b)
    if rgb in SKIN_COLORS:
        return "skin"
    if rgb in HAIR_COLORS:
        return "hair"
    if rgb in NEUTRAL_KEEP:
        return None

    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    hue = h * 360
    value = max(r, g, b) / 255

    if 8 <= hue <= 42 and s > 0.18 and value > 0.48:
        return "skin"
    if 5 <= hue <= 45 and s > 0.14 and value <= 0.50:
        return "hair"
    if value < 0.30 and s <= 0.22:
        return "pants"
    if s > 0.14 and value > 0.20:
        return "outfit"
    return None


def make_variant(source: Path, output: Path, idx: int) -> None:
    img = Image.open(source).convert("RGBA")
    pixels = img.load()
    outfit = OUTFITS[idx % len(OUTFITS)]
    pants = PANTS[(idx // len(OUTFITS)) % len(PANTS)]
    hair = HAIR[(idx * 2 + idx // 5) % len(HAIR)]
    skin = SKIN[(idx * 3 + idx // 7) % len(SKIN)]

    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            kind = classify(r, g, b)
            if kind == "skin":
                nr, ng, nb = blend_shade((r, g, b), skin, 0.82)
            elif kind == "hair":
                nr, ng, nb = blend_shade((r, g, b), hair, 0.78)
            elif kind == "outfit":
                nr, ng, nb = blend_shade((r, g, b), outfit, 0.96)
            elif kind == "pants":
                nr, ng, nb = blend_shade((r, g, b), pants, 0.70)
            else:
                continue
            pixels[x, y] = (nr, ng, nb, a)

    img.save(output)


def main() -> None:
    sources = sorted(CHAR_DIR.glob("char_[0-5].png"))
    if len(sources) < 6:
        raise SystemExit("Expected original char_0.png through char_5.png")

    for idx in range(TARGET_COUNT):
      make_variant(sources[idx % len(sources)], CHAR_DIR / f"char_{idx}.png", idx)

    print(f"Generated {TARGET_COUNT} character spritesheets in {CHAR_DIR}")


if __name__ == "__main__":
    main()
