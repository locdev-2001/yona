# Phase 1 — `scripts/check-ui.py`: assertion trên trang đã render

**Mục tiêu:** biến năm cái check viết tạm trong phiên 19–20/09 (đang nằm trong
`.playwright-mcp/`, sẽ mất) thành một công cụ chạy được, và bổ sung các check cho
những lỗi đã lọt lưới.

## Vì sao đây là phase đầu

Năm check tạm đó bắt được **toàn bộ** lỗi thật của phiên. Bảy gate grep trong doc
bắt được **không cái nào**. Gate kiểm *từ vựng trong source*, còn lỗi nằm ở *kết
quả đã render*. Skill ở phase 2 chỉ được trỏ tới check đã chạy được.

## Runtime

Đã xác minh có sẵn: `playwright` (python), `PIL`, `numpy`, `uv`. Node playwright
**không** có. Viết Python, cùng kiểu với ba `scripts/make-*.py` đang có.

```
uv run --with playwright --with pillow --with numpy python scripts/check-ui.py --url http://127.0.0.1:8610/
```

## Danh sách check

Cột "đã bắt được" là lỗi thật của phiên 19–20/09 — mỗi check phải chứng minh lại
được bằng fixture, nếu không thì chưa xong.

| # | Assertion | Đã bắt được | Fixture |
|---|---|---|---|
| C1 | Ảnh trang trí không đè chữ. Đo theo **glyph thật** (`Range.getBoundingClientRect`), không theo hộp bao phần tử | 4 chỗ tranh đè tiêu đề section kết | dựng lại từ `ca4fa683` |
| C2 | Ảnh chụp sản phẩm không bị cắt xuyên chữ: mực không chạm 5px sát mép ảnh | `square-contacts` và `square-contact` mất chữ cái đầu mọi tên khách | `git show 39bc7bc9:public/landing/square-contacts.png` — **đã xác minh lấy được, mực ở cột 0** |
| C3 | Header + section đầu ≤ chiều cao viewport, kiểm ở 1280/1366/1440/1920 | hero tràn màn hình | — |
| C4 | Không tràn ngang; không ảnh lỗi (`naturalWidth === 0` sau khi cuộn hết) | — (phòng hồi quy) | — |
| C5 | Tương phản chữ/nền ≥ 4.5:1 (thân), ≥ 3:1 (chữ lớn) | `text-neutral-900/40` chỉ đạt 2.61:1 | — |
| C6 | Đích chạm ≥ 44px dưới 768px | — (phòng hồi quy) | — |
| C7 | Mỗi `.webp` trang trí có xuất xứ CC0 trong `CREDITS.json`, và ngược lại không có xuất xứ mồ côi | — (đang là grep rời, gom vào đây) | — |
| C8 | Chỉ báo trạng thái phải **khác nhau** giữa mục đang chọn và mục không chọn (tab, accordion) | tab: cả hai đều có thanh accent nên thanh đó không chỉ được gì | — |
| C9 | Tỉ lệ điểm trắng / tối / có màu nằm trong dải đặt trước | trang nhạt hơn tham chiếu 10 điểm | — |
| C10 | **Đo hai lần cách nhau ≥ 1.5s**; nếu số đổi thì báo "trang đang động, không được ghi làm hằng số" | thanh tiến trình nở 42.2px → 106px bị ghi thành "accent 82px" | trang tham chiếu |

C10 chạy ở chế độ `--reference <url>`: dùng khi đo một trang tham chiếu, không phải
khi kiểm trang của mình.

## Giao diện dòng lệnh

```
--url <url>              trang cần kiểm (bắt buộc)
--viewports 1280x800,1440x900,1920x1080
--reference <url>        bật C10, chỉ đo, không phán đạt/không đạt
--json                   xuất máy đọc được, cho CI
--save-crops <dir>       cắt từng section ra ảnh cho người xem
```

Mã thoát: `0` đạt, `1` có check fail, `2` lỗi chạy (không tải được trang…).

## Việc phải làm

1. `scripts/check-ui.py` với C1–C9; C10 sau vì nó phục vụ việc đo tham chiếu.
2. `tests/fixtures/ui/` chứa ảnh lỗi lấy từ lịch sử git + một test khẳng định
   **check phải FAIL** trên fixture đó. Check không chứng minh được là nó bắt được
   lỗi thì không tính là xong.
3. Thêm script `check:ui` vào `package.json` để chạy bằng một lệnh.
4. `--save-crops` phải cắt theo đúng biên section, vì đây là thứ agent dùng để
   *nhìn* — và nhìn là khâu agent yếu nhất, nên phải làm cho dễ nhất có thể.

## Ràng buộc

- Không sửa gì trong `resources/js/landing/` ở phase này. Chỉ thêm công cụ.
- Ngưỡng C9 để ở đầu tệp thành hằng số có tên, kèm nhãn nguồn — không rải số trong
  thân hàm.
- Check phải chạy được khi chưa đăng nhập (trang landing công khai).

## Nghiệm thu

- `uv run … scripts/check-ui.py --url http://127.0.0.1:8610/` chạy xong, mã thoát 0
  trên bản landing hiện tại.
- Chạy trên fixture lỗi → mã thoát 1, và thông báo chỉ đúng tệp/toạ độ.
- C2 fail trên `square-contacts.png` bản `39bc7bc9`, pass trên bản hiện tại.
- Chạy < 60 giây cho cả 3 viewport.

## Rủi ro

- **Check quá nhạy sinh báo giả** thì agent sẽ học cách bỏ qua nó — nguy hơn không
  có check. C1 đã dính đúng lỗi này một lần: đo theo hộp bao `<p>` rộng hết
  container cho 2 báo giả, phải đổi sang đo glyph. Mọi check phải chạy sạch trên
  bản hiện tại trước khi commit.
- Playwright cần tải chromium lần đầu; ghi vào README của script.
