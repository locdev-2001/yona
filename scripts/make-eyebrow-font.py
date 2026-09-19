"""Sinh bản cắt JetBrains Mono cho nhãn eyebrow.

Eyebrow là nhãn ngắn in hoa, không phải văn bản chạy. Nhúng cả font mono
(~90 KB/weight) cho vài chục ký tự là lãng phí, nên ở đây subset xuống đúng
tập ký tự nhãn có thể chứa: chữ hoa Latin, chữ hoa tiếng Việt đủ dấu, chữ số
và ít dấu câu.

Giữ cả chữ thường: nhãn có thể không in hoa ở một vài chỗ, và thiếu glyph thì
trình duyệt rơi về font khác giữa chừng — vỡ hơn là thừa vài KB.

Chạy lại khi nâng cấp JetBrains Mono:
    uv run --with fonttools --with brotli python scripts/make-eyebrow-font.py <thư-mục-ttf>
"""

import sys
import unicodedata
from pathlib import Path

from fontTools.subset import Subsetter, Options
from fontTools.ttLib import TTFont

OUT = Path("resources/fonts/JetBrainsMono")
WEIGHTS = {"Regular": 400, "Medium": 500}


def vietnamese_letters() -> set[str]:
    """Mọi chữ cái Latin có dấu mà tiếng Việt dùng, cả hoa lẫn thường."""
    base = set("AĂÂEÊIOÔƠUƯYD")
    marks = ["", "̀", "́", "̃", "̉", "̣"]  # huyền sắc ngã hỏi nặng
    out = set()

    for letter in base:
        for mark in marks:
            composed = unicodedata.normalize("NFC", letter + mark)
            if len(composed) == 1:
                out.add(composed)
                out.add(composed.lower())

    out.update("ĐđĂăÂâÊêÔôƠơƯư")
    return out


def charset() -> str:
    upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    chars = set(upper) | set(upper.lower())
    chars.update("0123456789")
    chars.update(" .,:;!?/+-—·()[]%&#@'\"")
    chars.update(vietnamese_letters())
    return "".join(sorted(chars))


def build(src: Path, name: str, text: str) -> None:
    font = TTFont(src)
    options = Options()
    options.layout_features = ["kern", "liga", "ccmp", "mark", "mkmk"]
    options.flavor = "woff2"
    options.desubroutinize = True
    options.notdef_outline = True

    subsetter = Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)

    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / f"JetBrainsMono-{name}.woff2"
    font.flavor = "woff2"
    font.save(dst)
    print(f"{dst}  {dst.stat().st_size / 1024:.1f} KB  {len(text)} ký tự")


def main() -> None:
    ttf_dir = Path(sys.argv[1])
    text = charset()

    for name in WEIGHTS:
        src = ttf_dir / f"JetBrainsMono-{name}.ttf"
        if not src.exists():
            raise SystemExit(f"thiếu {src}")
        build(src, name, text)


if __name__ == "__main__":
    main()
