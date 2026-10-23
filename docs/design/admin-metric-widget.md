# Metric widget — đã chốt

> Đã duyệt cùng toàn bộ components và tokens ngày 23/10/2026. [Baseline UI admin v1](admin-design-baseline.md) là nguồn chốt; nội dung các lượt duyệt bên dưới được giữ làm lịch sử.

Ngày: 22/10/2026. Nhánh: `codex/admin-design-skeleton`.

Widget/Card đã được người dùng chốt. Lượt này chỉ duyệt Metric widget.

## Cấu trúc

- Dùng trực tiếp `WidgetCard`, giữ cùng hình học clip-path, bo góc 20px và khoảng cách 24px / 16px đã chốt.
- Nhãn chỉ số và icon theo ngữ cảnh; icon góc mang tính nhận diện, không giả làm nút hành động.
- Giá trị chính 40px, số dài dùng 32px; số tabular và độ đậm 700.
- Sparkline solid rộng theo vùng nội dung, cùng nét mảnh ổn định khi đổi kích thước.
- Biến động dạng viên thuốc, có mũi tên tăng/giảm hoặc dấu ngang; kèm nhãn so với kỳ trước.
- Màu theo chức năng: người dùng, tin nhắn, kết nối và gửi thành công; biến thể tối dùng nền tương phản và điểm nhấn sáng.

## Mẫu duyệt

Mở Bộ component, tìm `Metric card` để chỉ xem một widget. Có thể đổi loại chỉ số, kỳ 7/30/90 ngày và trạng thái Tăng/Giảm/Không đổi.

## Nghiệm thu

Đã thử trên UI: bốn loại chỉ số; số dài `1.824.602`; tăng, giảm và không đổi; bản 375px không tràn ngang. Hình dạng card do `WidgetCard` cung cấp, không sao chép clip-path vào Metric.

Trạng thái: người dùng xác nhận các phần còn lại ổn, ngoại trừ Combobox, ngày 22/10/2026. Metric widget đã chốt.
