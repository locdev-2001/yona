# Duyệt input, Combobox, Drawer và thanh cuộn

> Đã duyệt cùng toàn bộ components và tokens ngày 23/10/2026. [Baseline UI admin v1](admin-design-baseline.md) là nguồn chốt; nội dung các lượt duyệt bên dưới được giữ làm lịch sử.

Ngày 22/10/2026 · Nhánh `codex/admin-design-skeleton` · Chỉ áp dụng vào bản xem trước admin.

## Lỗi và cách sửa

| Phần | Nguyên nhân | Bản sửa |
| --- | --- | --- |
| Input có icon | Input con và khung ngoài cùng giữ style riêng, icon không được dành khoảng cách | Một khung chung tại `field-controls.css`; input con không viền/focus riêng; khoảng cách icon–chữ 8px |
| Combobox | InputGroup bị ghi đè kích thước, popup và ô nhập không chung mép; clear chỉ dựa vào giá trị đã chọn | Popup neo theo khung ngoài; clear cho cả truy vấn lẫn lựa chọn; giữ nút mở danh sách |
| Nền xám | Token bề mặt trung tính ở light mode dùng nhiều sắc nền | Canvas, sidebar, card, field và popup đều `#ffffff`; giữ các màu có mục đích của widget, chart, badge |
| Drawer | Sheet mặc định sát mép, border trái; badge bị kéo giãn; nội dung chỉ có ba dòng | Khung nổi rộng 480px, inset desktop 16px/mobile 8px, bo 20px, không border ngoài; toolbar và footer cố định; thân cuộn riêng |
| Scrollbar | Thanh cuộn mặc định nổi bật và rộng | Token kích thước 6px, track trong suốt, thumb light 15%/dark 18%, hover rõ hơn; Firefox dùng `thin` |

## Cấu trúc dùng chung

- `PreviewDrawer` giữ bố cục trung tính; nội dung kết nối ở `ConnectionDrawerDemo`.
- Reuse Sheet, Checkbox, Textarea, DropdownMenu từ shadcn/Base UI, cùng PreviewButton và StatusBadge.
- Ghi chú lưu vào trình duyệt của bản xem trước, giữ sau tải lại. Thao tác kết nối và checklist là dữ liệu minh họa, chưa nối backend.
- Tài liệu TXT/CSV là tệp mẫu có nội dung tải được, không giả định là tài liệu thật.
- Margin/padding/gap tiếp tục dùng token chức năng đã chốt. Thêm `drawer-inset`, `drawer-inset-mobile`; màu scrollbar và kích thước nằm trong `tokens.ts`.

## Đã dùng trực tiếp trên trình duyệt

- Desktop 1440px và mobile 375px; light/dark.
- Input: khung focus duy nhất, icon cách chữ 8px, input con không lệch theo chiều dọc.
- Combobox: tìm, chọn bằng chuột/bàn phím, xóa lựa chọn, xóa truy vấn chưa chọn, không có kết quả. Popup khớp hai mép ở cả desktop/mobile.
- Drawer: mở/đóng, Escape, sửa/lưu ghi chú, giữ ghi chú sau reload; checklist, bookmark, menu tạm dừng; body cuộn trong khi toolbar/footer đứng yên. Không tràn ngang trên 375px.
- Scrollbar: kiểm tra computed style 6px, track trong suốt và thumb alpha theo theme.

## Trạng thái duyệt

Spacing, Card và Metric đã được người dùng chốt. Các bản sửa input, Combobox, Drawer và scrollbar đang chờ người dùng xem lại; chưa tự ghi nhận là đã được duyệt.

Ảnh trong `docs/design/admin-preview/`: `input-focus-fixed.png`, `combobox-fixed.png`, `drawer-mobile.png`, `drawer-dark.png`, `drawer-light.png`.
