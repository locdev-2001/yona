#!/usr/bin/env python3
"""Sinh logo và icon của public/ từ bộ brand kit Yona.

Vì sao cần: bộ kit không dùng thẳng được.
- Wordmark và mark có viền trong suốt thừa (~12% bên phải). Đặt nguyên vào
  `<img class="h-8">` thì logo lệch trái trong khung, khoảng cách tới menu bên
  cạnh sai so với thiết kế.
- File gốc cao 615px cho chỗ hiển thị 32px — nặng gấp hai chục lần mức cần.
- `pwa-maskable-512x512.png` trong kit là bản sao y hệt app icon: góc bo, nền
  trong suốt. Android cắt icon theo mặt nạ của máy nên bản đó bị lẹm vào mark và
  hở góc. Bản maskable phải có nền đặc và mark nằm trong vùng an toàn.
- `apple-touch-icon` cũng vậy: iOS tự bo góc, đưa ảnh bo sẵn vào thì bo hai lần.

Dùng:
    uv run --with pillow python scripts/make-brand-assets.py [đường-dẫn-brand-kit]

Mặc định đọc ~/Documents/Beru/yona-brand-kit. Các file khác của public/ (favicon
16/32, favicon.ico, app-icon 192/512, ảnh Open Graph) chép thẳng từ kit, không
qua script này.

Chạy lại mỗi khi bộ nhận diện đổi.
"""

import sys
from pathlib import Path

from PIL import Image

PUBLIC = Path(__file__).resolve().parent.parent / "public"
DEFAULT_KIT = Path.home() / "Documents/Beru/yona-brand-kit"

# Nền icon: dải gradient lấy từ app icon của kit.
GRADIENT_TOP = (4, 23, 58)
GRADIENT_BOTTOM = (12, 59, 127)

# Logo hiển thị cao nhất 32px (h-8); 128px đủ cho màn hình 4x.
LOGO_HEIGHT = 128


# File của kit có viền nhiễu alpha 1–2/255 rộng cả trăm pixel quanh hình — mắt
# không thấy nhưng `getbbox()` tính là nội dung, crop theo nó vẫn thừa viền.
VISIBLE_ALPHA = 8


def trimmed(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    opaque = image.split()[3].point(lambda value: 255 if value > VISIBLE_ALPHA else 0)

    return image.crop(opaque.getbbox())


def scaled(image: Image.Image, longest_side: float) -> Image.Image:
    scale = longest_side / max(image.size)
    return image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)


def centered(canvas: Image.Image, mark: Image.Image) -> Image.Image:
    canvas.paste(mark, ((canvas.width - mark.width) // 2, (canvas.height - mark.height) // 2), mark)
    return canvas


def build_logo(kit: Path, source: str, out_name: str) -> Path:
    logo = trimmed(kit / "01-logo" / source)
    logo = scaled(logo, LOGO_HEIGHT * max(logo.size) / logo.height)
    destination = PUBLIC / "brand-assets" / out_name
    logo.save(destination, optimize=True)

    return destination


def build_thumbnail(kit: Path, out_name: str, size: int = 128) -> Path:
    """Thumbnail phải vuông: footer của portal render nó bằng `w-4 h-4`, ảnh chữ
    nhật sẽ bị bóp méo. Nền trong suốt vì nó nằm trên cả nền sáng lẫn nền tối."""
    mark = scaled(trimmed(kit / "01-logo/yona-mark-whale-tail-transparent.png"), size)
    destination = PUBLIC / "brand-assets" / out_name
    centered(Image.new("RGBA", (size, size), (0, 0, 0, 0)), mark).save(destination, optimize=True)

    return destination


def build_icon(kit: Path, size: int, mark_ratio: float, out_name: str) -> Path:
    canvas = Image.new("RGB", (size, size))
    pixels = canvas.load()
    for y in range(size):
        ratio = y / (size - 1)
        row = tuple(
            round(GRADIENT_TOP[i] + (GRADIENT_BOTTOM[i] - GRADIENT_TOP[i]) * ratio) for i in range(3)
        )
        for x in range(size):
            pixels[x, y] = row

    mark = scaled(trimmed(kit / "01-logo/yona-mark-whale-tail-transparent.png"), size * mark_ratio)
    destination = PUBLIC / out_name
    centered(canvas, mark).save(destination, optimize=True)

    return destination


def main() -> None:
    kit = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_KIT
    if not (kit / "01-logo").is_dir():
        raise SystemExit(f"Không thấy brand kit ở {kit}")

    built = [
        build_logo(kit, "yona-logo-primary-transparent.png", "logo.png"),
        build_logo(kit, "yona-logo-white.png", "logo_dark.png"),
        build_thumbnail(kit, "logo_thumbnail.png"),
        # iOS bo góc sẵn nên mark được chiếm nhiều diện tích hơn.
        build_icon(kit, 180, 0.66, "apple-touch-icon.png"),
        # Maskable: vùng an toàn là hình tròn 80% giữa ảnh nên mark phải nhỏ lại.
        build_icon(kit, 512, 0.55, "pwa-maskable-512x512.png"),
    ]

    for path in built:
        with Image.open(path) as image:
            print(f"{path.relative_to(PUBLIC.parent)}  {image.width}x{image.height}  {path.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
