"""Chụp lại bốn ảnh sản phẩm của landing từ app thật, trên dữ liệu demo dựng lại được.

Ảnh cũ chụp trên dữ liệu làm tay (hộp thư "Zalo cá nhân" là kênh API nên hiện icon
`{}`), dữ liệu đó mất thì không ai chụp lại đúng được nữa. Script này:

  1. chạy `php artisan landing:demo-account --at=<mốc>` trước MỖI ảnh — trạng thái
     chưa đọc, panel liên hệ… luôn bắt đầu từ cùng một điểm;
  2. đăng nhập bằng agent demo mà lệnh in ra (không ghi mật khẩu ở đây);
  3. mở hội thoại, tải lại trang (để mốc "đã xem" của agent bỏ dải "tin chưa đọc"),
     rồi chụp đúng khung như ảnh cũ và ghi đè public/landing/<tên>.png.

Đồng hồ trình duyệt cố định ở mốc kịch bản (ca chiều 15:30 giờ Việt Nam) nên
"34m", "1h"… và giờ trên bong bóng khớp dữ liệu dù chụp lúc nào.

Chạy từ gốc repo, app dev đang chạy (mặc định http://localhost:8610), DB dev:

    uv run --with playwright --with pillow --with numpy python scripts/capture-landing-screenshots.py

Chỉ chụp một ảnh: thêm `--only inbox.png`. KHÔNG chạy trên production (lệnh artisan
tự từ chối).
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

from PIL import Image
from playwright.sync_api import Page, sync_playwright

REPO = Path(__file__).resolve().parent.parent
OUT_DIR = REPO / "public" / "landing"
VIETNAM = timezone(timedelta(hours=7))
ANCHOR = datetime(2026, 9, 23, 15, 30, tzinfo=VIETNAM)

# Nhãn dịch vi còn lẫn ký tự điều khiển U+0008 (lỗi dữ liệu dịch, ghi ở báo cáo).
# Chrome trên macOS/Windows không vẽ gì cho nó, Chromium Linux vẽ ô hex — gỡ khỏi
# DOM trước khi chụp để ảnh giống thứ người dùng thật nhìn thấy.
STRIP_CONTROL_CHARS = """
() => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]/.test(node.nodeValue)) {
      node.nodeValue = node.nodeValue.replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]/g, '');
    }
  }
}
"""


@dataclass(frozen=True)
class Shot:
    file: str
    viewport: tuple[int, int]
    conversation: int
    contact_panel_open: bool | None = None
    clip: tuple[int, int, int, int] | None = None  # x, y, w, h


# Khung từng ảnh đo từ ảnh cũ: 1600 rộng = ba cột + panel phải (≥1280 mở sẵn);
# ảnh dọc là màn 1440 (sidebar 200 | danh sách 340 | chat 580 | panel 320) cắt lấy
# danh sách + chat — màn hẹp hơn thì header chat đổi sang dạng gọn; 1000 < 1024 =
# bố cục hai-màn có nút "Trở về".
SHOTS = [
    Shot("inbox.png", (1600, 728), conversation=2, contact_panel_open=True),
    Shot("feature-inbox.png", (1600, 728), conversation=5, contact_panel_open=False),
    Shot("feature-zalo-tall.png", (1440, 900), conversation=1, clip=(200, 0, 920, 900)),
    Shot("square-panel.png", (1000, 1000), conversation=4),
]


@dataclass(frozen=True)
class DemoAccount:
    account_id: int
    email: str
    password: str


def rebuild_demo_account() -> DemoAccount:
    result = subprocess.run(
        ["php", "artisan", "landing:demo-account", f"--at={ANCHOR.isoformat()}"],
        cwd=REPO, capture_output=True, text=True,
    )
    if result.returncode != 0:
        sys.exit(f"landing:demo-account hỏng:\n{result.stdout}\n{result.stderr}")

    def pick(pattern: str) -> str:
        found = re.search(pattern, result.stdout)
        if not found:
            sys.exit(f"không đọc được '{pattern}' trong output:\n{result.stdout}")
        return found.group(1)

    return DemoAccount(
        account_id=int(pick(r"account demo #(\d+)")),
        email=pick(r"Đăng nhập\s*\.+\s*(\S+)"),
        password=pick(r"Mật khẩu\s*\.+\s*(\S+)"),
    )


def log_in(page: Page, base_url: str, demo: DemoAccount) -> None:
    page.goto(f"{base_url}/app/login")
    page.get_by_test_id("email_input").fill(demo.email)
    page.get_by_test_id("password_input").fill(demo.password)
    page.get_by_test_id("submit_button").click()
    page.wait_for_url(re.compile(r"/app/accounts/\d+"))


def open_conversation(page: Page, base_url: str, demo: DemoAccount, display_id: int) -> None:
    url = f"{base_url}/app/accounts/{demo.account_id}/conversations/{display_id}"
    page.goto(url)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    page.reload()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)


def settle_for_capture(page: Page) -> None:
    page.evaluate(STRIP_CONTROL_CHARS)
    page.evaluate("() => document.activeElement && document.activeElement.blur()")
    page.mouse.move(2, page.viewport_size["height"] - 2)
    page.evaluate("() => document.fonts.ready")
    page.wait_for_timeout(600)


def capture(shot: Shot, base_url: str, browser) -> Path:
    demo = rebuild_demo_account()
    width, height = shot.viewport
    context = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=1,
        locale="vi-VN",
        timezone_id="Asia/Ho_Chi_Minh",
    )
    context.add_cookies([{"name": "yona_locale", "value": "vi", "url": base_url}])
    page = context.new_page()
    page.clock.set_fixed_time(ANCHOR)

    log_in(page, base_url, demo)
    open_conversation(page, base_url, demo, shot.conversation)

    if shot.contact_panel_open is False:
        page.get_by_test_id("sidepanel-switch-floating").get_by_role("button", name="Liên hệ").click()
        page.wait_for_load_state("networkidle")

    settle_for_capture(page)

    target = OUT_DIR / shot.file
    options = {"path": str(target)}
    if shot.clip:
        x, y, w, h = shot.clip
        options["clip"] = {"x": x, "y": y, "width": w, "height": h}
    page.screenshot(**options)
    context.close()
    return target


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base-url", default="http://localhost:8610")
    parser.add_argument("--only", action="append", help="chỉ chụp ảnh này (lặp lại được)")
    args = parser.parse_args()

    shots = [s for s in SHOTS if not args.only or s.file in args.only]
    expected = {s.file: Image.open(OUT_DIR / s.file).size for s in shots if (OUT_DIR / s.file).exists()}

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for shot in shots:
            path = capture(shot, args.base_url, browser)
            size = Image.open(path).size
            note = "" if expected.get(shot.file, size) == size else f"  ≠ kích thước cũ {expected[shot.file]}"
            print(f"{shot.file}: {size[0]}x{size[1]}{note}")
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
