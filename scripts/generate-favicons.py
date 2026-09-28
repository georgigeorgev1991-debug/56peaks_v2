"""Generate favicon set from 56/1.png into icons/."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "56" / "1.png"
OUT = ROOT / "icons"

SIZES = {
    "favicon-32.png": 32,
    "favicon-180.png": 180,
    "favicon-192.png": 192,
    "favicon-512.png": 512,
}


def center_square(img: Image.Image) -> Image.Image:
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def main() -> None:
    OUT.mkdir(exist_ok=True)
    src = Image.open(SRC).convert("RGBA")
    square = center_square(src)

    pngs = {}
    for name, size in SIZES.items():
        resized = square.resize((size, size), Image.Resampling.LANCZOS)
        path = OUT / name
        resized.save(path, format="PNG", optimize=True)
        pngs[size] = resized
        print(f"{name}: {path.stat().st_size} bytes")

    ico_path = OUT / "favicon.ico"
    pngs[16] = square.resize((16, 16), Image.Resampling.LANCZOS)
    pngs[16].save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32)],
        append_images=[pngs[32]],
    )
    print(f"favicon.ico: {ico_path.stat().st_size} bytes")

    total = sum(p.stat().st_size for p in OUT.iterdir() if p.is_file())
    print(f"Total: {total} bytes ({total / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
