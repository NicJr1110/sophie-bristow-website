"""Rebuild the "boiling" drawing strips in public/marks/boil/ from Sophie's single drawings.

Each strip holds one set's frames side by side, every frame lined up on the same base
(the root of the grass, the foot of the stem), so the drawing stays put as it flicks.
Used by src/components/Boil.astro: if a set's frame count or size changes, update SETS there.

  python3 scripts/build-boil-strips.py     (needs Pillow: pip install pillow)
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'flowers'
OUT = ROOT / 'public' / 'marks' / 'boil'

# set name → (source files, frame height in px)
SETS = {
    'grass': ([f'grass-{i:02}.png' for i in range(1, 6)], 300),
    'flower': ([f'flower-{i:02}.png' for i in range(1, 7)], 600),
}


def trim(im: Image.Image) -> Image.Image:
    alpha = im.getchannel('A').point(lambda v: 255 if v > 40 else 0)
    return im.crop(alpha.getbbox())


def base_x(im: Image.Image) -> float:
    """Middle of the drawing along its bottom 10%: where it stands."""
    px = im.getchannel('A').load()
    xs = [x for y in range(int(im.height * 0.9), im.height) for x in range(im.width) if px[x, y] > 100]
    return sum(xs) / len(xs)


def build(name: str, files: list[str], height: int) -> None:
    frames = [trim(Image.open(SRC / f).convert('RGBA')) for f in files]
    frames = [f.resize((round(f.width * height / f.height), height), Image.LANCZOS) for f in frames]
    bases = [base_x(f) for f in frames]
    left = max(bases)
    right = max(f.width - b for f, b in zip(frames, bases))
    width = int(left + right) + 4
    strip = Image.new('RGBA', (width * len(frames), height), (0, 0, 0, 0))
    for i, (f, b) in enumerate(zip(frames, bases)):
        strip.alpha_composite(f, (i * width + round(left - b) + 2, 0))
    OUT.mkdir(parents=True, exist_ok=True)
    strip.convert('LA').save(OUT / f'{name}.png', optimize=True)
    print(f'{name}: {len(frames)} frames, {width} x {height}')


for name, (files, height) in SETS.items():
    build(name, files, height)
