from pathlib import Path

from PIL import Image, ImageChops


OUT_DIR = Path("app/icons")
SOURCE = OUT_DIR / "jimny-logo-source.png"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def trim_white_border(image):
    rgb = image.convert("RGB")
    background = Image.new("RGB", rgb.size, (255, 255, 255))
    diff = ImageChops.difference(rgb, background)
    bbox = diff.getbbox()
    return rgb.crop(bbox) if bbox else rgb


def make_icon(size):
    logo = trim_white_border(Image.open(SOURCE))
    canvas = Image.new("RGB", (size, size), (255, 255, 255))

    max_width = int(size * 0.88)
    max_height = int(size * 0.42)
    logo.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    canvas.paste(logo, (x, y))
    return canvas


if not SOURCE.exists():
    raise FileNotFoundError(f"Missing source logo: {SOURCE}")

for icon_size in (180, 192, 512):
    make_icon(icon_size).save(OUT_DIR / f"icon-{icon_size}.png")
