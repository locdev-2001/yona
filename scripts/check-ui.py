"""Kiểm bề mặt công khai trên trang ĐÃ RENDER, không phải trên source.

Vì sao tồn tại: bộ gate cũ là 7 lệnh grep trên `resources/js/landing`. Trong phiên
19-20/09 nó xanh 100% trên một trang có tranh đè thẳng lên tiêu đề, ảnh chụp chặt
mất chữ cái đầu mọi tên khách, và hero tràn quá một màn hình. Grep kiểm TỪ VỰNG
trong source; lỗi nằm ở KẾT QUẢ sau khi render.

Mỗi check dưới đây tương ứng một lỗi có thật đã lọt lưới. Check nào không chứng
minh được là nó bắt lại được lỗi cũ thì không đáng giữ.

Chạy:
    uv run --with playwright --with pillow --with numpy \\
        python scripts/check-ui.py --url http://127.0.0.1:8610/

Lần đầu cần: python -m playwright install chromium
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from urllib.parse import urlparse
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image

# ── Ngưỡng ────────────────────────────────────────────────────────────────────
# Mọi con số ở đây có nhãn nguồn. Số không nhãn thì không được tin: bốn con số
# 82/58/51/18px trong doc cũ chết vì chúng ngồi cùng bảng, cùng giọng với
# `container 1170px`, trong khi chúng chỉ là khung hình bắt được giữa lúc một
# thanh tiến trình đang chạy.

VIEWPORTS_MAC_DINH = "1280x800,1440x900,1920x1080"  # ta chọn — dải laptop phổ biến

# đo 20/09 — mọi ảnh chụp lành có lề trái 12-13px (padding của chính app), bản bị
# cắt xuyên chữ có lề trái 0. Ngưỡng 3px tách bạch hai nhóm mà còn dư biên an toàn.
LE_NGANG_TOI_THIEU_PX = 3
NGUONG_MUC = 170  # ta chọn — dưới mức sáng này tính là nét/chữ, không phải nền
DICH_CHAM_MIN = 44  # WCAG 2.5.5 — dưới 768px
TUONG_PHAN_THAN = 4.5  # WCAG AA
TUONG_PHAN_CHU_LON = 3.0  # WCAG AA, từ 18px (hoặc 14px bold)
CHU_LON_PX = 18.0

# đo 20/09 · intercom.com · 1440px · đã đo 2 lần
SUC_NANG_THAM_CHIEU = {"trang": 77.6, "toi": 2.5, "mau": 3.3}
# đo 20/09 · intercom.com · 390px · đã đo 2 lần (hai lượt ra số trùng khít)
#
# Dải này phụ thuộc viewport, không phải một hằng số của trang: CÙNG một trang
# tham chiếu đọc 3.2% tối ở 1440px và 4.8% ở 390px, vì màn hẹp thì chữ chiếm tỉ
# lệ diện tích lớn hơn hẳn. Đọ ảnh chụp 390px với dải đo ở 1440px làm mọi trang
# lành đều trượt.
SUC_NANG_THAM_CHIEU_HEP = {"trang": 76.3, "toi": 4.8, "mau": 2.6}
# ta chọn — dải chấp nhận quanh tham chiếu. Rộng vì mảng màu phụ thuộc ảnh sản
# phẩm, mà ảnh sản phẩm phụ thuộc giao diện dashboard (vòng 2).
SUC_NANG_DUNG_SAI = {"trang": 12.0, "toi": 3.0, "mau": 3.5}

DO_LAI_SAU_GIAY = 1.8  # đo 20/09 — thanh tiến trình của tham chiếu nở 42.2->106px trong 1.8s


# ── Kết quả ───────────────────────────────────────────────────────────────────
@dataclass
class KetQua:
    ma: str
    ten: str
    dat: bool
    chi_tiet: list[str] = field(default_factory=list)
    bo_qua: str | None = None

    def dong_tom_tat(self) -> str:
        if self.bo_qua:
            return f"  ~ {self.ma} {self.ten}: bỏ qua ({self.bo_qua})"
        dau = "✓" if self.dat else "✗"
        return f"  {dau} {self.ma} {self.ten}" + ("" if self.dat else f" — {len(self.chi_tiet)} chỗ")


# ── Tiện ích ảnh ──────────────────────────────────────────────────────────────
def _mat_na_muc(im: Image.Image) -> np.ndarray:
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    return lum < NGUONG_MUC


def _suc_nang(im: Image.Image) -> dict[str, float]:
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    mx, mn = a.max(2), a.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    return {
        "trang": float(((r > 242) & (g > 242) & (b > 242)).mean() * 100),
        "toi": float((lum < 120).mean() * 100),
        "mau": float((sat > 0.25).mean() * 100),
    }


def _tuong_phan(fg: tuple[float, float, float], bg: tuple[float, float, float]) -> float:
    def kenh(c: float) -> float:
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    def L(rgb):
        r, g, b = (kenh(v) for v in rgb)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b

    a, b = L(fg), L(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def _parse_rgba(s: str) -> tuple[float, float, float, float] | None:
    if not s or "rgb" not in s:
        return None
    nums = [float(x) for x in s.replace("rgba", "").replace("rgb", "").strip("() ").split(",")[:4]]
    if len(nums) < 3:
        return None
    a = nums[3] if len(nums) >= 4 else 1.0
    return (nums[0], nums[1], nums[2], a)


def _tron_nen(stack: list[str]) -> tuple[float, float, float] | None:
    """Trộn ngăn xếp nền từ DƯỚI lên, đáy là trắng.

    `stack` xếp từ gần phần tử nhất ra ngoài, nên phải đảo lại trước khi trộn.
    Không trộn thì nền nửa trong suốt bị đọc thành nền đặc — nguồn của 24 báo giả.
    """
    duoi = (255.0, 255.0, 255.0)
    for mau in reversed(stack):
        p = _parse_rgba(mau)
        if not p:
            continue
        r, g, b, a = p
        duoi = (r * a + duoi[0] * (1 - a), g * a + duoi[1] * (1 - a), b * a + duoi[2] * (1 - a))
    return duoi


# ── Check trên TỆP (không cần trình duyệt) ────────────────────────────────────
def c2_anh_khong_bi_cat_xuyen_chu(thu_muc: Path) -> KetQua:
    """Ảnh chụp sản phẩm không được cắt xuyên qua chữ.

    Lỗi thật 19-20/09: square-contacts.png và square-contact.png mất chữ cái đầu
    của MỌI tên khách và vài chữ số đầu của MỌI số điện thoại. Cắt ô vuông ra từ
    ảnh rộng hơn mà không kiểm nhát cắt.

    CHỈ kiểm lề TRÁI và PHẢI. Mép trên/dưới của ảnh chụp nguyên màn hình luôn
    chạm nội dung vì trang còn cuộn tiếp — kiểm cả bốn mép thì `inbox.png` và
    `feature-inbox.png` (đều lành) bị báo nhầm, mà báo nhầm là đường ngắn nhất
    để một gate bị bỏ qua.
    """
    loi = []
    for p in sorted(thu_muc.glob("*.png")):
        m = _mat_na_muc(Image.open(p))
        cols = m.any(0)
        if not cols.any():
            continue
        trai = int(np.argmax(cols))
        phai = int(len(cols) - 1 - np.argmax(cols[::-1]))
        phai_le = len(cols) - 1 - phai
        for ten, le in (("trái", trai), ("phải", phai_le)):
            if le < LE_NGANG_TOI_THIEU_PX:
                loi.append(
                    f"{p.name}: lề {ten} {le}px < {LE_NGANG_TOI_THIEU_PX}px — "
                    "chữ bị nhát cắt xén mất một bên"
                )
    return KetQua("C2", "ảnh sản phẩm không bị cắt xuyên chữ", not loi, loi)


def c7_xuat_xu_tranh(thu_muc_art: Path) -> KetQua:
    """Mỗi .webp trang trí phải có xuất xứ CC0, và không có xuất xứ mồ côi."""
    credits = thu_muc_art / "CREDITS.json"
    if not credits.exists():
        return KetQua("C7", "xuất xứ tranh", False, [f"thiếu {credits}"])
    d = json.loads(credits.read_text())
    co = {c["tep"] for c in d.get("anh", [])}
    tep = {"art/" + p.name for p in thu_muc_art.glob("*.webp")}
    loi = [f"thiếu xuất xứ: {t}" for t in sorted(tep - co)]
    loi += [f"xuất xứ mồ côi: {t}" for t in sorted(co - tep)]
    loi += [
        f"không phải CC0: {c['tep']}"
        for c in d.get("anh", [])
        if "Public Domain" not in c.get("giay_phep", "")
    ]
    return KetQua("C7", "xuất xứ tranh CC0", not loi, loi)


# ── JS chạy trong trang ───────────────────────────────────────────────────────
# Đo theo GLYPH thật (Range) chứ không theo hộp bao phần tử. Lần đầu viết check
# này tôi đo theo hộp bao <p> rộng hết container và nhận 2 báo giả; báo giả là
# đường ngắn nhất để một gate bị bỏ qua.
JS_THU_THAP = r"""
() => {
  const glyph = el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
  const rect = el => el.getBoundingClientRect();
  const co_chu = el => Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
  const mau = s => s;

  const chu = [];
  document.querySelectorAll('h1,h2,h3,h4,p,a,button,span,dt,dd,li,label').forEach(el => {
    if (!co_chu(el)) return;
    const g = glyph(el), s = getComputedStyle(el);
    if (g.width < 2 || g.height < 2) return;
    // Thu cả NGĂN XẾP nền, không dừng ở lớp đầu tiên: nền nửa trong suốt
    // (vd bg-neutral-900/5) phải được TRỘN với lớp dưới nó. Bản trước vứt alpha
    // nên coi tấm nền 5% mực thành mực đặc, và cho 24 báo giả kiểu "1.00:1".
    const bg = [];
    let node = el, co_anh = false;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage !== 'none') { co_anh = true; break; }
      const c = cs.backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)') bg.push(c);
      node = node.parentElement;
    }
    chu.push({ x: g.left, y: g.top + scrollY, w: g.width, h: g.height,
               fs: parseFloat(s.fontSize), fw: s.fontWeight, col: s.color,
               bg: co_anh ? 'ANH' : bg,
               txt: (el.textContent || '').trim().slice(0, 30), tag: el.tagName });
  });

  const tranh = [];
  document.querySelectorAll('img[aria-hidden]').forEach(el => {
    const src = el.getAttribute('src') || '';
    if (!src.includes('/landing/art/')) return;
    const r = rect(el);
    if (r.width < 2) return;
    tranh.push({ x: r.left, y: r.top + scrollY, w: r.width, h: r.height, src: src.split('/').pop() });
  });

  const anh_loi = [];
  document.querySelectorAll('img').forEach(im => {
    if (im.complete && im.naturalWidth === 0) anh_loi.push(im.currentSrc || im.src);
  });

  const dich_cham = [];
  if (innerWidth < 768) {
    document.querySelectorAll('a,button,[role=button],input,select').forEach(el => {
      // Nhánh aria-hidden không tới tay người dùng nào: trình đọc màn hình bỏ
      // qua, và nó cũng không nhận được chạm. Bẫy honeypot của form công khai
      // nằm ở đây, và nó KHÔNG phải một đích chạm.
      if (el.closest('[aria-hidden="true"]')) return;
      const r = rect(el);
      if (r.width < 1 || r.height < 1) return;
      if (r.height < 44 || r.width < 44) {
        dich_cham.push({ w: Math.round(r.width), h: Math.round(r.height),
                         txt: (el.textContent || '').trim().slice(0, 24) || el.tagName });
      }
    });
  }

  // nhóm tab/accordion: dấu hiệu chọn phải NHÌN thấy được, không chỉ nằm ở aria
  const nhom = [];
  const chon_duoc = Array.from(document.querySelectorAll('[role=tab],[aria-selected],[aria-expanded]'));
  if (chon_duoc.length) {
    const van_tay = el => {
      const s = getComputedStyle(el);
      const con = Array.from(el.querySelectorAll('*')).slice(0, 12)
        .map(c => { const cs = getComputedStyle(c); return cs.backgroundColor + '|' + cs.color; }).join(';');
      return [s.color, s.backgroundColor, s.borderColor, s.borderWidth, s.fontWeight, con].join('~');
    };
    const theo_cha = new Map();
    chon_duoc.forEach(el => {
      const k = el.parentElement;
      if (!theo_cha.has(k)) theo_cha.set(k, []);
      theo_cha.get(k).push(el);
    });
    theo_cha.forEach(ds => {
      if (ds.length < 2) return;
      const chon = ds.filter(e => e.getAttribute('aria-selected') === 'true' || e.getAttribute('aria-expanded') === 'true');
      if (!chon.length) return;
      nhom.push({
        so_muc: ds.length,
        vt_chon: chon.map(van_tay),
        vt_khac: ds.filter(e => !chon.includes(e)).map(van_tay),
        nhan: (ds[0].textContent || '').trim().slice(0, 24),
      });
    });
  }

  const sections = Array.from(document.querySelectorAll('header, main > *, footer')).map(s => {
    const r = rect(s);
    // `fill`: section TỰ KHAI mình cao đúng một màn hình bằng min-height trên
    // lớp trong. Section không khai thì nó cao theo nội dung, và ép nó vừa một
    // màn hình ở 390px là đòi một thứ nó chưa bao giờ hứa.
    const khai_fill = Array.from(s.querySelectorAll('*')).some(el => {
      const mh = getComputedStyle(el).minHeight;
      return mh && mh !== 'auto' && mh !== '0px' && parseFloat(mh) > innerHeight * 0.5;
    });
    return { top: Math.round(r.top + scrollY), h: Math.round(r.height),
             tag: s.tagName.toLowerCase(), id: s.id || '', fill: khai_fill };
  });

  return { chu, tranh, anh_loi, dich_cham, nhom, sections,
           vw: innerWidth, vh: innerHeight,
           pageH: document.documentElement.scrollHeight,
           tran_ngang: document.documentElement.scrollWidth > innerWidth };
}
"""


def _cuon_het(page) -> None:
    h = page.evaluate("() => document.documentElement.scrollHeight")
    y = 0
    while y < h:
        page.evaluate("v => scrollTo(0, v)", y)
        page.wait_for_timeout(70)
        y += 700
    page.evaluate("() => scrollTo(0, 0)")
    page.wait_for_timeout(400)


def _chong_nhau(a: dict, b: dict) -> float:
    ox = min(a["x"] + a["w"], b["x"] + b["w"]) - max(a["x"], b["x"])
    oy = min(a["y"] + a["h"], b["y"] + b["h"]) - max(a["y"], b["y"])
    return ox * oy if ox > 2 and oy > 2 else 0.0


def kiem_mot_viewport(page, w: int, h: int, url: str) -> tuple[list[KetQua], dict]:
    page.set_viewport_size({"width": w, "height": h})
    page.goto(url, wait_until="load")
    _cuon_het(page)
    d = page.evaluate(JS_THU_THAP)
    vp = f"{w}x{h}"
    kq: list[KetQua] = []

    # C1 — tranh trang trí không đè chữ
    loi = []
    for t in d["tranh"]:
        for c in d["chu"]:
            dt = _chong_nhau(t, c)
            if dt:
                loi.append(f"[{vp}] {t['src']} đè \"{c['txt']}\" ({int(dt)}px²)")
    kq.append(KetQua("C1", "tranh trang trí không đè chữ", not loi, loi))

    # C3 — section đầu vừa một màn hình
    #
    # Chỉ áp cho trang CÓ HỨA điều đó: trang chủ (yêu cầu của chủ dự án 20/09) và
    # bất kỳ section đầu nào tự khai `fill`. Trang form hai cột ở 390px xếp chồng
    # thành 1349px — không trang nào hai cột vừa nổi 844px, và ép nó vừa chỉ tạo
    # ra một lỗi không sửa được bằng cách nào đúng.
    secs = d["sections"]
    if len(secs) >= 2:
        la_trang_chu = urlparse(url).path in ("", "/")
        if la_trang_chu or secs[1].get("fill"):
            cao = secs[0]["h"] + secs[1]["h"]
            dat = cao <= d["vh"] + 1
            ct = [] if dat else [f"[{vp}] nav+hero cao {cao}px > viewport {d['vh']}px"]
            kq.append(KetQua("C3", "nav + section đầu vừa một màn hình", dat, ct))
        else:
            kq.append(KetQua("C3", "nav + section đầu vừa một màn hình", True,
                             bo_qua="section đầu không khai `fill`, và đây không phải trang chủ"))

    # C4 — không tràn ngang, không ảnh lỗi
    loi = ([f"[{vp}] trang trượt ngang"] if d["tran_ngang"] else []) + [
        f"[{vp}] ảnh lỗi: {s}" for s in d["anh_loi"]
    ]
    kq.append(KetQua("C4", "không tràn ngang, không ảnh lỗi", not loi, loi))

    # C5 — tương phản chữ
    loi = []
    for c in d["chu"]:
        if c["bg"] == "ANH":
            continue  # nền là ảnh: không tính được bằng công thức, để mắt người xem
        fg4 = _parse_rgba(c["col"])
        if not fg4:
            continue
        bg = _tron_nen(c["bg"] or [])
        # chữ cũng có thể nửa trong suốt (vd text-neutral-900/50)
        fr, fg_, fb, fa = fg4
        fg = (fr * fa + bg[0] * (1 - fa), fg_ * fa + bg[1] * (1 - fa), fb * fa + bg[2] * (1 - fa))
        lon = c["fs"] >= CHU_LON_PX or (c["fs"] >= 14 and str(c["fw"]) in ("700", "bold"))
        can = TUONG_PHAN_CHU_LON if lon else TUONG_PHAN_THAN
        tp = _tuong_phan(fg, bg)
        if tp < can - 0.01:
            loi.append(f"[{vp}] \"{c['txt']}\" {tp:.2f}:1 < {can}:1 ({c['fs']:.0f}px)")
    kq.append(KetQua("C5", "tương phản chữ đạt WCAG AA", not loi, loi))

    # C6 — đích chạm (chỉ dưới 768px)
    if w < 768:
        loi = [f"[{vp}] \"{t['txt']}\" {t['w']}x{t['h']} < {DICH_CHAM_MIN}px" for t in d["dich_cham"]]
        kq.append(KetQua("C6", f"đích chạm ≥ {DICH_CHAM_MIN}px", not loi, loi))
    else:
        kq.append(KetQua("C6", "đích chạm", True, bo_qua=f"chỉ áp dụng dưới 768px, đang {w}px"))

    # C8 — trạng thái chọn phải nhìn thấy được
    loi = []
    for n in d["nhom"]:
        khac = set(n["vt_khac"])
        if any(v in khac for v in n["vt_chon"]):
            loi.append(f"[{vp}] nhóm \"{n['nhan']}\": mục đang chọn trông y hệt mục không chọn")
    kq.append(KetQua("C8", "trạng thái chọn nhìn thấy được, không chỉ nằm ở aria", not loi, loi))

    return kq, d


def c9_suc_nang(page, url: str, w: int, h: int) -> tuple[KetQua, dict]:
    page.set_viewport_size({"width": w, "height": h})
    page.goto(url, wait_until="load")
    _cuon_het(page)
    png = page.screenshot(full_page=True)
    import io

    sn = _suc_nang(Image.open(io.BytesIO(png)))
    chuan = SUC_NANG_THAM_CHIEU_HEP if w < 768 else SUC_NANG_THAM_CHIEU
    loi = []
    for k, v in sn.items():
        lech = abs(v - chuan[k])
        if lech > SUC_NANG_DUNG_SAI[k]:
            loi.append(
                f"{k} {v:.1f}% lệch {lech:.1f} điểm khỏi tham chiếu {chuan[k]}% "
                f"(dung sai {SUC_NANG_DUNG_SAI[k]}, đo ở {w}px)"
            )
    return KetQua("C9", "sức nặng thị giác trong dải", not loi, loi), {**sn, "_vp": float(w)}


def c10_do_hai_lan(page, url: str) -> KetQua:
    """Trang tham chiếu có animation không? Đo một lần rồi ghi làm hằng số là sai.

    Lỗi thật: `thanh accent 82px` thực ra là thanh tiến trình carousel, đo lại sau
    1.8 giây thì đã nở lên 106px.

    PHẢI CUỘN QUA TỪNG KHỐI rồi mới đo. Bản đầu của check này chỉ đo ở đỉnh trang
    và báo "không động" trên đúng trang đã biết là có carousel — mấy khối đó nằm
    dưới màn hình nên animation chưa khởi động. Báo sót ở đây nguy hơn báo nhầm:
    nó là check sinh ra để chặn đúng lỗi này.
    """
    page.set_viewport_size({"width": 1440, "height": 900})
    page.goto(url, wait_until="load")
    page.wait_for_timeout(2500)
    cao = page.evaluate("() => document.documentElement.scrollHeight")

    js = """() => Array.from(document.querySelectorAll('section *')).slice(0, 4000).map(el => {
        const r = el.getBoundingClientRect();
        return Math.round(r.width) + ',' + Math.round(r.height) + ',' + Math.round(r.left);
    })"""

    ct = []
    tong_doi = 0
    for y in range(0, min(cao, 9000), 1200):
        page.evaluate("v => scrollTo(0, v)", y)
        page.wait_for_timeout(1400)  # ta chọn — đủ để animation vào-khung-nhìn khởi động
        a = page.evaluate(js)
        page.wait_for_timeout(int(DO_LAI_SAU_GIAY * 1000))
        b = page.evaluate(js)
        doi = sum(1 for x, y2 in zip(a, b) if x != y2)
        if doi:
            tong_doi += doi
            ct.append(f"cuộn y={y}: {doi}/{len(a)} phần tử đổi hình học sau {DO_LAI_SAU_GIAY}s")

    if ct:
        ct.append(
            "TRANG ĐANG ĐỘNG — không được ghi số đo ở những vị trí trên làm hằng số "
            "thiết kế. Đo lại hai lần rồi mới chép."
        )
    return KetQua("C10", "trang tham chiếu có động không", not tong_doi, ct)


def luu_crop(page, url: str, w: int, h: int, ra: Path) -> list[Path]:
    """Cắt từng section thành ảnh rời để người/agent khác NHÌN.

    Đây là đầu vào của gate thẩm mỹ. Agent dựng trang là người chấm tệ nhất chính
    nó, nên ảnh phải sẵn sàng để giao cho một con mắt khác.
    """
    import io

    page.set_viewport_size({"width": w, "height": h})
    page.goto(url, wait_until="load")
    _cuon_het(page)
    secs = page.evaluate(
        "() => Array.from(document.querySelectorAll('header, main > *, footer'))"
        ".map(s => { const r = s.getBoundingClientRect();"
        " return { top: Math.round(r.top + scrollY), h: Math.round(r.height), id: s.id || '' }; })"
    )
    im = Image.open(io.BytesIO(page.screenshot(full_page=True)))
    ra.mkdir(parents=True, exist_ok=True)
    out = []
    for i, s in enumerate(secs):
        if s["h"] < 40:
            continue
        c = im.crop((0, s["top"], im.width, min(s["top"] + s["h"], im.height)))
        ten = ra / f"{w}-{i:02d}{('-' + s['id']) if s['id'] else ''}.png"
        c.save(ten)
        out.append(ten)
    return out


def tu_kiem() -> int:
    """Chạy từng check trên fixture lỗi THẬT và khẳng định nó phải TRƯỢT.

    Bộ 7 gate grep cũ xanh 100% trên một trang đang hỏng. Bài học: một check chưa
    chứng minh được là nó bắt được lỗi thì chưa phải là check, mới chỉ là thủ tục.
    """
    # Chữ F hoa cho khớp quy ước sẵn có (tests/Feature, tests/Unit, tests/Support).
    # macOS không phân biệt hoa thường nên chữ thường vẫn chạy ở máy, nhưng CI Linux thì vỡ.
    fx = Path("tests/Fixtures/ui")
    if not fx.is_dir():
        print(f"thiếu thư mục fixture {fx}")
        return 2

    ca = [
        # (mô tả, hàm, thư mục, phải trượt?)
        ("C2 trên ảnh bị cắt xuyên chữ (39bc7bc9)", c2_anh_khong_bi_cat_xuyen_chu, fx, True),
        ("C2 trên ảnh sản phẩm hiện tại", c2_anh_khong_bi_cat_xuyen_chu, Path("public/landing"), False),
        ("C7 trên thư mục tranh hiện tại", c7_xuat_xu_tranh, Path("public/landing/art"), False),
    ]

    print("\nTỰ KIỂM — check có thật sự bắt được lỗi cũ không")
    hong = 0

    # Phép tính nền tảng: check "đạt" vì ngừng kiểm còn tệ hơn check báo nhầm.
    # Ba ca dưới đây đều là số đã gặp thật trong phiên 19-20/09.
    phep_tinh = [
        # (mô tả, tính được, mong đợi, sai số)
        ("tương phản: mực 50% trên trắng (đang dùng ở hero)",
         _tuong_phan(_tron_nen(["rgba(17, 17, 17, 0.5)"]), (255, 255, 255)), 3.54, 0.15),
        ("tương phản: mực 40% trên trắng — TỪNG TRƯỢT ngưỡng 3:1",
         _tuong_phan(_tron_nen(["rgba(17, 17, 17, 0.4)"]), (255, 255, 255)), 2.61, 0.15),
        ("trộn nền: 5% mực chồng trắng KHÔNG được thành mực đặc",
         _tron_nen(["rgba(17, 17, 17, 0.05)"])[0], 243.0, 1.0),
    ]
    for mo_ta, thuc, mong, sai_so in phep_tinh:
        dung = abs(thuc - mong) <= sai_so
        hong += 0 if dung else 1
        print(f"  {'✓' if dung else '✗'} {mo_ta}: {thuc:.2f} (mong {mong})")

    # Hình học chồng lấn — lõi của C1
    hinh_hoc = [
        ("chồng nhau thật sự", {"x": 100, "y": 100, "w": 50, "h": 50},
         {"x": 120, "y": 120, "w": 50, "h": 50}, True),
        ("chỉ chạm mép, không tính là đè", {"x": 100, "y": 100, "w": 50, "h": 50},
         {"x": 151, "y": 100, "w": 50, "h": 50}, False),
    ]
    for mo_ta, a, b, phai_chong in hinh_hoc:
        dung = (_chong_nhau(a, b) > 0) == phai_chong
        hong += 0 if dung else 1
        print(f"  {'✓' if dung else '✗'} hình học: {mo_ta}")

    for mo_ta, ham, thu_muc, phai_truot in ca:
        if not thu_muc.is_dir():
            print(f"  ~ bỏ qua: {mo_ta} (thiếu {thu_muc})")
            continue
        kq = ham(thu_muc)
        dung = (not kq.dat) == phai_truot
        hong += 0 if dung else 1
        mong = "TRƯỢT" if phai_truot else "ĐẠT"
        thuc = "TRƯỢT" if not kq.dat else "ĐẠT"
        print(f"  {'✓' if dung else '✗'} {mo_ta}: mong {mong}, thực {thuc}")
        if not dung and kq.chi_tiet:
            for c in kq.chi_tiet[:3]:
                print(f"      {c}")
    tong = len(ca) + 5
    print(f"\n  {tong - hong}/{tong} đúng kỳ vọng")
    return 1 if hong else 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Kiểm bề mặt công khai trên trang đã render")
    ap.add_argument("--url", help="trang cần kiểm")
    ap.add_argument("--viewports", default=VIEWPORTS_MAC_DINH)
    ap.add_argument("--reference", help="đo trang tham chiếu (bật C10), không phán đạt/trượt")
    ap.add_argument("--anh-san-pham", default="public/landing", help="thư mục ảnh chụp sản phẩm")
    ap.add_argument("--tranh", default="public/landing/art", help="thư mục tranh trang trí")
    ap.add_argument("--save-crops", help="cắt từng section ra thư mục này")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--self-test", action="store_true", help="chạy check trên fixture lỗi, khẳng định nó trượt")
    ap.add_argument("--login", nargs=2, metavar=("EMAIL", "MATKHAU"),
                    help="đăng nhập trước khi kiểm (bề mặt dashboard). CHỈ dùng cho dev — "
                         "không đưa thông tin đăng nhập vào bất kỳ tệp nào trong repo")
    ap.add_argument("--login-url", default="/app/login")
    args = ap.parse_args()

    if args.self_test:
        return tu_kiem()

    tat_ca: list[KetQua] = []
    phu: dict = {}

    # check trên tệp — không cần trình duyệt
    if Path(args.anh_san_pham).is_dir():
        tat_ca.append(c2_anh_khong_bi_cat_xuyen_chu(Path(args.anh_san_pham)))
    if Path(args.tranh).is_dir():
        tat_ca.append(c7_xuat_xu_tranh(Path(args.tranh)))

    if args.url or args.reference:
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            print("thiếu playwright. Chạy: uv run --with playwright --with pillow --with numpy python scripts/check-ui.py …")
            return 2

        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            page = browser.new_page()
            try:
                if args.login:
                    from urllib.parse import urljoin

                    goc = args.url or args.reference
                    page.goto(urljoin(goc, args.login_url), wait_until="load")
                    page.get_by_test_id("email_input").fill(args.login[0])
                    page.get_by_test_id("password_input").fill(args.login[1])
                    page.get_by_test_id("submit_button").click()
                    page.wait_for_timeout(2500)
                if args.reference:
                    tat_ca.append(c10_do_hai_lan(page, args.reference))
                if args.url:
                    vps = []
                    for v in args.viewports.split(","):
                        w, h = v.lower().split("x")
                        vps.append((int(w), int(h)))
                    for w, h in vps:
                        kq, _ = kiem_mot_viewport(page, w, h, args.url)
                        tat_ca.extend(kq)
                    kq9, sn = c9_suc_nang(page, args.url, *vps[len(vps) // 2])
                    tat_ca.append(kq9)
                    phu["suc_nang"] = sn
                    if args.save_crops:
                        paths = luu_crop(page, args.url, vps[len(vps) // 2][0], vps[len(vps) // 2][1], Path(args.save_crops))
                        phu["crops"] = [str(p) for p in paths]
            finally:
                browser.close()

    # gộp kết quả trùng mã (chạy nhiều viewport)
    gop: dict[str, KetQua] = {}
    for k in tat_ca:
        if k.ma in gop:
            g = gop[k.ma]
            g.dat = g.dat and k.dat
            g.chi_tiet += k.chi_tiet
            if k.bo_qua and not g.chi_tiet:
                g.bo_qua = k.bo_qua
            else:
                g.bo_qua = None if g.chi_tiet else g.bo_qua
        else:
            gop[k.ma] = k
    ds = [gop[m] for m in sorted(gop)]

    if args.json:
        print(json.dumps(
            {"ket_qua": [{"ma": k.ma, "ten": k.ten, "dat": k.dat, "chi_tiet": k.chi_tiet,
                          "bo_qua": k.bo_qua} for k in ds], **phu},
            ensure_ascii=False, indent=1))
    else:
        print("\nKIỂM BỀ MẶT CÔNG KHAI")
        for k in ds:
            print(k.dong_tom_tat())
            for c in k.chi_tiet[:12]:
                print(f"      {c}")
            if len(k.chi_tiet) > 12:
                print(f"      … thêm {len(k.chi_tiet) - 12} chỗ")
        if "suc_nang" in phu:
            sn = phu["suc_nang"]
            chuan = SUC_NANG_THAM_CHIEU_HEP if sn.get("_vp", 1440) < 768 else SUC_NANG_THAM_CHIEU
            print(f"\n  sức nặng: trắng {sn['trang']:.1f}% · tối {sn['toi']:.1f}% · màu {sn['mau']:.1f}%"
                  f"   (tham chiếu {chuan['trang']}/{chuan['toi']}/{chuan['mau']} ở {int(sn.get('_vp', 1440))}px)")
        if "crops" in phu:
            print(f"\n  đã cắt {len(phu['crops'])} ảnh section — GIAO CHO AGENT KHÁC XEM, đừng tự chấm")
        truot = [k for k in ds if not k.dat]
        print(f"\n  {len(ds) - len(truot)}/{len(ds)} đạt" + (f" · TRƯỢT: {', '.join(k.ma for k in truot)}" if truot else ""))

    return 1 if any(not k.dat for k in ds) else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # noqa: BLE001
        print(f"lỗi chạy: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(2)
