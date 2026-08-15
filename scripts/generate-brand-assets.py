from pathlib import Path
import sys

from PIL import Image, ImageChops


def content_box(image: Image.Image, threshold: int = 245):
    rgb = image.convert("RGB")
    background = Image.new("RGB", rgb.size, (255, 255, 255))
    difference = ImageChops.difference(rgb, background).convert("L")
    difference = difference.point(lambda value: 255 if value > 255 - threshold else 0)
    return difference.getbbox()


def fit_on_square(image: Image.Image, size: int = 512, padding: int = 34) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    available = size - padding * 2
    copy = image.convert("RGBA")
    copy.thumbnail((available, available), Image.Resampling.LANCZOS)
    x = (size - copy.width) // 2
    y = (size - copy.height) // 2
    canvas.alpha_composite(copy, (x, y))
    return canvas


def main() -> None:
    source = Path(sys.argv[1])
    project = Path(sys.argv[2])
    image = Image.open(source).convert("RGB")

    full_box = content_box(image) or (0, 0, image.width, image.height)
    margin = 28
    full_box = (
        max(0, full_box[0] - margin), max(0, full_box[1] - margin),
        min(image.width, full_box[2] + margin), min(image.height, full_box[3] + margin),
    )
    full_logo = image.crop(full_box)

    # The supplied logo has a clean gap between the SP mark and the Arabic text.
    mark_region = image.crop((0, 0, image.width, int(image.height * 0.51)))
    mark_box = content_box(mark_region) or (0, 0, mark_region.width, mark_region.height)
    mark = mark_region.crop(mark_box)
    square_icon = fit_on_square(mark)

    renderer_assets = project / "src" / "renderer" / "src" / "assets"
    resources = project / "resources"
    renderer_assets.mkdir(parents=True, exist_ok=True)
    resources.mkdir(parents=True, exist_ok=True)

    full_logo.save(renderer_assets / "sandala-logo.png", optimize=True)
    square_icon.save(renderer_assets / "sandala-icon.png", optimize=True)
    square_icon.save(resources / "icon.png", optimize=True)
    square_icon.save(resources / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])


if __name__ == "__main__":
    main()
