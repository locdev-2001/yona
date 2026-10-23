# Widget/Card — đã chốt

> Đã duyệt cùng toàn bộ components và tokens ngày 23/10/2026. [Baseline UI admin v1](admin-design-baseline.md) là nguồn chốt; nội dung các lượt duyệt bên dưới được giữ làm lịch sử.

Ngày cập nhật: 22/10/2026. Nhánh: `codex/admin-design-skeleton`.

Bản mẫu chỉ tập trung vào Widget/Card, theo ảnh tham chiếu người dùng đã gửi.

- Bo ngoài giảm từ 28px xuống 20px. Card không có viền.
- Bề mặt có góc cắt lõm thật bằng SVG clip-path, không giả bằng một khối màu nền che lên.
- Có bốn vị trí: trên phải, trên trái, dưới phải, dưới trái. Vị trí được phân bổ theo định danh card, giữ ổn định giữa các lần render.
- Nút tròn nằm trong vùng cắt. Bản mẫu có nút Đổi vị trí cắt để thử từng hướng; lựa chọn được lưu khi tải lại.
- Chỉ cắt bề mặt nền. Nội dung và nút giữ được focus ring, không bị clip.
- Khoảng cách đã chốt giữ nguyên: 24px desktop, 16px điện thoại. Phần dành chỗ cho góc cắt được tính từ token `card-cutout-size`.
- Nguồn hình học và xử lý resize ở `resources/js/superadmin/design-preview/widget-card.tsx`; không sao chép path riêng cho từng góc.

## Token liên quan

| Token | Giá trị |
|---|---:|
| `panel-radius` | 20px |
| `card-cutout-size` | 64px |
| `control-height` | 40px |
| `widget-padding` | 24px |
| `widget-padding-mobile` | 16px |

Đã thử đổi đủ bốn góc trên UI; bản 375px không tràn ngang, nút góc nằm trong phạm vi card. TypeScript, build preview và i18n-check đạt.

Trạng thái: người dùng đã chốt Widget/Card ngày 22/10/2026. Thành phần tiếp theo: Metric widget.
