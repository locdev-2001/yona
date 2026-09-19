#!/usr/bin/env python3
"""Sinh bản chữ số đều bề rộng (tabular) của Be Vietnam Pro.

Vì sao cần: Be Vietnam Pro không có feature OpenType `tnum`, và chữ số của nó
lệch bề rộng nặng (`1` = 385/1000em, `4` = 710). Cột số trong bảng vì thế nhảy
mỗi lần giá trị đổi, và đặt `font-variant-numeric: tabular-nums` lên nó không có
tác dụng gì vì font không có feature đó để bật.

Cách làm: lấy đúng glyph chữ số của font gốc, đặt advance width về một giá trị
chung, dịch outline để canh giữa trong ô rộng hơn, rồi subset xuống chỉ chữ số và
vài ký tự đi kèm trong cột số. Font kết quả không chứa chữ cái, nên khi xếp trước
Be Vietnam Pro trong font stack thì chữ số lấy từ bản này còn mọi ký tự khác rơi
về font gốc — cùng một kiểu chữ, chỉ khác phần đo chữ số.

Dùng:
    uv run --with fonttools --with brotli python scripts/make-tnum-font.py

Đọc BeVietnamPro-{Light,Regular,Medium}.woff2 trong resources/fonts/BeVietnamPro/
và ghi BeVietnamProTnum-*.woff2 cạnh chúng.

Chạy lại mỗi khi nâng cấp Be Vietnam Pro. Xem docs/design-system.md §1.2.
"""

from pathlib import Path

from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

FONT_DIR = Path(__file__).resolve().parent.parent / "resources/fonts/BeVietnamPro"
FAMILY = "Be Vietnam Pro Tnum"
DIGITS = "0123456789"
# Ký tự đi cùng chữ số trong cột số. Giữ tối thiểu để file nhỏ.
KEEP = DIGITS + ".,:%+-/ $"
# Bề rộng chung cho mọi chữ số, dùng chung cả ba weight để cột vẫn khớp khi hàng
# tổng đổi sang font-medium. 713 = chữ số rộng nhất trong weight Medium.
ADVANCE = 713
WEIGHTS = (("Light", 300), ("Regular", 400), ("Medium", 500))


def build(src: Path, dst: Path) -> None:
    font = TTFont(src)
    cmap, glyf, hmtx = font.getBestCmap(), font["glyf"], font["hmtx"]

    for digit in DIGITS:
        name = cmap[ord(digit)]
        advance, lsb = hmtx[name]
        shift = round((ADVANCE - advance) / 2)
        if shift:
            recorded = RecordingPen()
            glyf[name].draw(recorded, glyf)
            rebuilt = TTGlyphPen(glyf)
            recorded.replay(TransformPen(rebuilt, (1, 0, 0, 1, shift, 0)))
            glyf[name] = rebuilt.glyph()
        hmtx[name] = (ADVANCE, lsb + shift)

    options = Options()
    options.layout_features = []  # bỏ GSUB/GPOS, font này chỉ cần glyph trần
    options.notdef_outline = True
    subsetter = Subsetter(options=options)
    subsetter.populate(text=KEEP)
    subsetter.subset(font)

    # 1 = family, 4 = full name, 6 = PostScript name
    for name_id in (1, 4):
        font["name"].setName(FAMILY, name_id, 3, 1, 0x409)
    font["name"].setName(FAMILY.replace(" ", ""), 6, 3, 1, 0x409)

    font.flavor = "woff2"
    font.save(dst)


def main() -> None:
    for weight, css_weight in WEIGHTS:
        src = FONT_DIR / f"BeVietnamPro-{weight}.woff2"
        if not src.exists():
            raise SystemExit(f"Thiếu {src}. Tải Be Vietnam Pro về thư mục đó trước.")
        dst = FONT_DIR / f"BeVietnamProTnum-{weight}.woff2"
        build(src, dst)
        size_kb = dst.stat().st_size / 1024
        print(f"{weight:<8} weight {css_weight}  {dst.name}  {size_kb:.1f} KB")


if __name__ == "__main__":
    main()
