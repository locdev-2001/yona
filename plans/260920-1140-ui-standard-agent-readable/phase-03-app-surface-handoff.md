# Phase 3 — bề mặt dashboard, luật bàn giao subagent, lối vào tất định

**Phụ thuộc:** phase 2 xong.

## 3.1 Lối vào tất định từ `CLAUDE.md`

`CLAUDE.md` hiện **chưa từng nhắc tới** `design-system.md`. Đây là nguyên nhân cơ
học của việc doc không bao giờ vào context: nó không có lối vào tự động nào.

Skill nạp theo khớp `description` — tức là theo xác suất. Doc ở đường dẫn cố định
thì luôn tìm được. Muốn có cả hai: thêm một dòng vào `CLAUDE.md` trỏ thẳng skill,
để cả khi skill không tự kích hoạt thì agent vẫn biết đường.

Một dòng, không hơn. `CLAUDE.md` là thứ luôn nạp, mỗi dòng thêm vào là thuế cho
mọi phiên.

## 3.2 Luật bàn giao subagent

Lỗi `82px` lan ra cả bốn subagent vì controller **diễn giải lại** chuẩn thành
prompt thay vì đưa nguồn. Bốn agent nhận bản nén sai và không đứa nào cãi.

Luật, viết vào `SKILL.md` phần quy trình:

- Giao việc UI cho subagent thì **bảo nó gọi skill `yona-ui`**, không dán tóm tắt.
- Prompt chỉ chứa thứ **riêng của việc đó**: tệp được sửa, tiêu chí nghiệm thu,
  ràng buộc riêng. Không lặp lại luật chung.
- Bắt subagent chạy `scripts/check-ui.py` và **dán kết quả vào báo cáo**. Phiên
  19–20/09 subagent báo DONE dựa trên `tsc` + grep, trong khi section chúng vừa sửa
  có tranh đè thẳng lên tiêu đề.

## 3.3 `references/app.md` — bề mặt dashboard

`docs/design-system-app.md` (308 dòng) là chuẩn cho dashboard. Áp cùng khuôn bốn
tầng, nhưng **chưa cần cắt sâu** như landing: vòng 2 (revamp dashboard) sẽ viết lại
phần lớn nội dung này, cắt bây giờ là làm hai lần.

Việc ở phase này:

1. Chuyển vào `references/app.md`, giữ nội dung, thêm nhãn nguồn cho các con số.
2. Rút `docs/design-system-app.md` thành stub như landing.
3. Ghi rõ đầu tệp: phần này chờ vòng 2, đừng coi là đã chốt.

## 3.4 Mở rộng check cho bề mặt có đăng nhập

`scripts/check-ui.py` ở phase 1 chỉ chạy trang công khai. Dashboard cần đăng nhập:

- thêm `--login <email> <password>` (chỉ dùng cho dev, không đưa thông tin đăng nhập
  vào tệp nào trong repo)
- thêm `--path` để kiểm một màn hình cụ thể

Phần này chuẩn bị cho vòng 2, không dùng ngay.

## Nghiệm thu

- `CLAUDE.md` có đúng một dòng trỏ skill.
- `SKILL.md` có mục bàn giao subagent, nêu rõ cấm dán tóm tắt.
- `docs/design-system-app.md` rút thành stub; nội dung sang `references/app.md` với
  nhãn nguồn đầy đủ.
- `check-ui.py` chạy được trên một màn hình dashboard sau đăng nhập.

## Ghi chú cho vòng 2

Đo trong phiên 19–20/09: ảnh chụp dashboard 90–95% trắng, 0.6–1.2% điểm có màu. Đây
là lý do trang landing nhạt hơn tham chiếu 10 điểm, và **không khung ảnh hay cách
cắt nào chữa được** — đã thử chụp lại rộng 2.2:1 (sửa được chiều cao, không sửa
được độ nhạt) và thử ba kiểu cắt (đều tệ hơn).

Mảng màu của bề mặt công khai phụ thuộc vào chính giao diện dashboard. Đưa vào tiêu
chí của vòng 2, đừng để landing gánh tiếp.
