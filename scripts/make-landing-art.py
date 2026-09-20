"""Lấy tranh nét mực cho bề mặt công khai từ Art Institute of Chicago.

Vì sao chỉ nét mực: đo trên bề mặt tham chiếu, tranh trang trí quanh tiêu đề là
NÉT trên nền trong suốt — nó tan vào nền trắng và lùi sau chữ. Khối màu đặc thì
thành một vật thể thứ hai cạnh tiêu đề, hút mắt mạnh hơn cả chữ, và trên trang
CRM nó đọc ra như ảnh nhặt đại về dán vào.

Quy trình:
  1. hỏi API tác phẩm thuộc phạm vi công cộng, phân loại drawing/print
  2. tải ảnh IIIF, chấm điểm "nét mực được" (nhiều giấy, ít màu)
  3. tách mực thành alpha theo độ sáng, cắt sát nội dung, xuất webp
  4. ghi xuất xứ vào CREDITS.json để kiểm chứng giấy phép

Chỉ nhận tác phẩm `is_public_domain = true`. Không tải gì khác.

Chạy:
    uv run --with pillow --with requests python scripts/make-landing-art.py --list
    uv run --with pillow --with requests python scripts/make-landing-art.py --build
"""

import argparse
import io
import json
import sys
from pathlib import Path

import numpy as np
import requests
from PIL import Image

API = "https://api.artic.edu/api/v1/artworks/search"
IIIF = "https://www.artic.edu/iiif/2/{id}/full/{w},/0/default.jpg"
HEADERS = {"AIC-User-Agent": "Yona landing art (contact: yona.vn)"}
OUT = Path("public/landing/art")

# Khung cần lấp: tên tệp -> bề rộng đích. Chiều cao để ảnh tự quyết theo tỉ lệ
# gốc — ép tỉ lệ thì nét bị kéo méo, mà nét méo thì nhìn ra ngay.
SLOTS = {
    "hero-1": 212, "hero-2": 236, "hero-3": 248, "hero-4": 176,
    "end-1": 120, "end-2": 100, "end-3": 116, "end-4": 144, "end-5": 132,
    "end-ink-1": 300,
    "rule-1": 249, "rule-2": 249, "rule-3": 249, "rule-4": 249,
    "feat-ink-1": 493, "feat-ink-2": 486, "feat-ink-3": 521,
}


def search(page: int, limit: int = 100) -> list[dict]:
    """Tác phẩm trên giấy, thuộc phạm vi công cộng, có ảnh."""
    query = {
        "q": "drawing engraving etching woodcut",
        "query": {
            "bool": {
                "must": [
                    {"term": {"is_public_domain": True}},
                    {"exists": {"field": "image_id"}},
                ]
            }
        },
        "fields": "id,title,artist_title,date_display,image_id,is_public_domain,classification_title",
        "limit": limit,
        "page": page,
    }
    r = requests.post(API, json=query, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.json().get("data", [])


def fetch(image_id: str, width: int = 600) -> Image.Image | None:
    try:
        r = requests.get(IIIF.format(id=image_id, w=width), headers=HEADERS, timeout=30)
        r.raise_for_status()
        return Image.open(io.BytesIO(r.content)).convert("RGB")
    except Exception:
        return None


def inkability(im: Image.Image) -> tuple[float, float]:
    """(tỉ lệ giấy, tỉ lệ điểm có màu) — nét mực thì giấy nhiều, màu gần 0."""
    a = np.asarray(im).astype(np.float32)
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    paper = (lum > 200).mean()
    mx, mn = a.max(2), a.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    return float(paper), float((sat > 0.22).mean())


def to_ink(im: Image.Image) -> Image.Image:
    """Độ sáng -> alpha. Giấy biến mất, nét mực ở lại."""
    # Cắt biên trước: ảnh chụp hiện vật hay dính khung bồi và mép sẫm, mà mép
    # sẫm thì thành một đường viền mực chạy quanh ảnh.
    w, h = im.size
    im = im.crop((int(w * 0.04), int(h * 0.04), int(w * 0.96), int(h * 0.96)))

    a = np.asarray(im).astype(np.float32)
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]

    paper = np.percentile(lum, 80)  # mức giấy
    ink = np.percentile(lum, 2)     # mức mực đậm nhất
    if paper - ink < 40:
        raise ValueError("tương phản quá thấp")

    alpha = np.clip((paper - lum) / (paper - ink), 0.0, 1.0)
    alpha[alpha < 0.18] = 0.0  # sàn: bỏ vân giấy, nếu không nền thành một mảng xám

    rgb = np.full(a.shape, 17.0)  # #111111 — cùng màu chữ tiêu đề
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")

    bbox = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    return img.crop(bbox) if bbox else img


def hop_khung(ink: Image.Image, ti_le_min: float, muc_min: float, muc_max: float) -> bool:
    """Tranh có hợp với khung của nó không: đủ ngang, và độ đậm nằm trong dải.

    Hai lỗi thật 20/09 đều từ chỗ này:
    - `hero-4` 69.5% mực giữa cụm 16-28% -> một khối đen hút mắt hơn cả nút CTA
    - `rule-1` tỉ lệ 0.68 (tranh dọc) trong khung 4:3 -> co còn 104px cạnh ba tấm
      186-200px, đọc ra như ảnh lỗi chưa tải xong
    """
    import numpy as _np

    a = _np.asarray(ink).astype(_np.float32)
    muc = float((a[..., 3] / 255.0 > 0.35).mean() * 100)
    return ink.width / ink.height >= ti_le_min and muc_min <= muc <= muc_max


def build(width_for: dict[str, int], ti_le_min: float = 0.0,
          muc_min: float = 0.0, muc_max: float = 100.0) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    picked: list[dict] = []
    seen: set[str] = set()

    # Chống trùng theo TÁC PHẨM, không theo image_id: cùng một tác phẩm có nhiều
    # id trong bộ sưu tập, nên lọc theo id để lọt một bản khắc dùng ở BA khung
    # (feat-ink-3, hero-1, hero-4). Doc bắt mỗi khối một ảnh khác nhau.
    da_dung: set[tuple[str, str]] = set()
    if (OUT / "CREDITS.json").exists():
        cu = json.load(open(OUT / "CREDITS.json"))
        for c in cu.get("anh", []):
            if c["tep"].replace("art/", "").replace(".webp", "") in width_for:
                continue  # khung đang dựng lại thì được phép lấy tác phẩm khác
            da_dung.add((c.get("tac_pham", ""), c.get("tac_gia", "")))

    for page in range(1, 8):
        if len(picked) >= len(width_for):
            break
        for rec in search(page):
            if len(picked) >= len(width_for):
                break
            iid = rec.get("image_id")
            if not iid or iid in seen or not rec.get("is_public_domain"):
                continue
            seen.add(iid)
            khoa = (rec.get("title") or "", rec.get("artist_title") or "")
            if khoa in da_dung:
                continue
            im = fetch(iid)
            if im is None:
                continue
            paper, colour = inkability(im)
            if paper < 0.55 or colour > 0.06:
                continue
            try:
                ink = to_ink(im)
            except ValueError:
                continue
            if ink.width < 120 or ink.height < 120:
                continue
            if not hop_khung(ink, ti_le_min, muc_min, muc_max):
                continue
            da_dung.add(khoa)
            picked.append({"rec": rec, "ink": ink})
            print(f"  nhận {rec['title'][:44]:<46} giấy {paper:.0%} màu {colour:.1%}")

    if len(picked) < len(width_for):
        sys.exit(f"chỉ tìm được {len(picked)}/{len(width_for)} tấm đạt")

    credits = json.load(open(OUT / "CREDITS.json"))
    by_file = {c["tep"]: c for c in credits["anh"]}

    for (name, target_w), item in zip(width_for.items(), picked):
        ink, rec = item["ink"], item["rec"]
        h = max(1, round(ink.height * target_w / ink.width))
        ink.resize((target_w, h), Image.LANCZOS).save(OUT / f"{name}.webp", "WEBP", quality=88)
        by_file[f"art/{name}.webp"] = {
            "tep": f"art/{name}.webp",
            "rong": target_w,
            "cao": h,
            "tac_pham": rec.get("title") or "Khuyết danh",
            "tac_gia": rec.get("artist_title") or "Khuyết danh",
            "nien_dai": rec.get("date_display") or "",
            "bo_suu_tap": "Art Institute of Chicago",
            "giay_phep": "Public Domain (CC0)",
            "xu_ly": "tách mực theo độ sáng, nền trong suốt, cắt sát nét",
        }
        print(f"{name}.webp  {target_w}x{h}")

    credits["anh"] = [by_file[k] for k in sorted(by_file)]
    json.dump(credits, open(OUT / "CREDITS.json", "w"), ensure_ascii=False, indent=1)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", action="store_true")
    ap.add_argument("--only", nargs="*", help="chỉ dựng lại vài khung")
    ap.add_argument("--ti-le-min", type=float, default=0.0, help="tỉ lệ rộng/cao tối thiểu")
    ap.add_argument("--muc-min", type=float, default=0.0, help="%% diện tích có mực, tối thiểu")
    ap.add_argument("--muc-max", type=float, default=100.0, help="%% diện tích có mực, tối đa")
    args = ap.parse_args()

    if args.only:
        la = [k for k in args.only if k not in SLOTS]
        if la:
            # Im lặng no-op ở đây từng ngốn ba lượt chạy: `--only feat-ink-3` lọc
            # ra rỗng vì SLOTS chưa khai khung đó, script thoát 0 không nói gì.
            sys.exit(f"khung không có trong SLOTS: {', '.join(la)}\ncó: {', '.join(SLOTS)}")
    slots = {k: v for k, v in SLOTS.items() if not args.only or k in args.only}
    if args.build:
        build(slots, args.ti_le_min, args.muc_min, args.muc_max)
    else:
        print("khung sẽ dựng:", ", ".join(slots))


if __name__ == "__main__":
    main()
