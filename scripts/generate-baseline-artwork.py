"""Regenerate temporary PNGs from the committed SVG source (requires cairosvg)."""
from pathlib import Path
import cairosvg

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs' / 'artwork' / 'wgp-01'

for source in sorted(SOURCE.rglob('*.svg')):
    output = ROOT / 'public' / source.relative_to(SOURCE).with_suffix('.png')
    output.parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(url=str(source), write_to=str(output))
    print(output.relative_to(ROOT))
