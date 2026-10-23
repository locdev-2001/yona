# Input tệp, Range, Modal/Form và Select

> Đã duyệt cùng toàn bộ components và tokens ngày 23/10/2026. [Baseline UI admin v1](admin-design-baseline.md) là nguồn chốt; nội dung các lượt duyệt bên dưới được giữ làm lịch sử.

Ngày 22/10/2026 · `codex/admin-design-skeleton` · Bản xem trước admin.

## Quyết định và trạng thái

- File input và Range: người dùng đã phản hồi đồng ý trước khi chuyển sang Modal/Form.
- Modal và Form: bổ sung theo ảnh bố cục hai cột; cùng dùng `AppointmentForm`, không sao chép trường và logic xác thực.
- Người dùng nhấn mạnh lỗi Select một lựa chọn lệch bộ input. Bản sửa tập trung trực tiếp vào Select đó; Multi select giữ thành mục riêng, dùng thư viện.
- Theo yêu cầu, không tự mở/chuyển trang preview của người dùng. Nghiệm thu thực hiện trong tab nền tạm và đã đóng tab đó.

## File input

`file-upload.tsx` chứa khung kéo thả, input file ẩn, danh sách tệp, gỡ/hủy, giới hạn 25 MB mỗi tệp và tối đa 5 tệp. `prepareFile` và `onAttach` là callback; phần demo dùng `FileReader` đọc trên thiết bị, không gửi tệp qua mạng. Tiến độ phản ánh quá trình đọc thực, không dùng bộ đếm tiến độ giả.

Có tệp mẫu TXT/CSV để duyệt trạng thái. Đã dùng trực tiếp chu trình chọn hai tệp mẫu → đính kèm → gỡ một tệp → hủy → chọn lại.

## Range

`RangeField` dùng Slider của Base UI. Thumb 24px, track 6px màu xanh solid; nhãn giá trị nổi, vạch chính/phụ và mốc 0/25/50/75/100%. Giữ logic ngưỡng cảnh báo bước 5%.

Đã kiểm tra Home về 0%, End lên 100%, phím mũi tên thay đổi giá trị. Nhãn không bị cắt ở hai đầu; đưa về 65% để chụp ảnh.

## Modal và Form

`form-preview.tsx` có `FormField`, `AppointmentForm`, bản inline và bản trong Dialog của shadcn/Base UI. Họ/Tên và Ngày/Điện thoại xếp hai cột ở desktop; một cột ở mobile. Header/mô tả và footer tách nhẹ bằng đường chia. Trên màn hình thấp, chỉ thân form cuộn.

Input/nhóm icon tiếp tục dùng hợp đồng chung ở `field-controls.css`. Lịch ngày là bộ chọn ngày của trình duyệt, có lịch bật ra; chữ hiển thị trong field được định dạng tiếng Việt. Yêu cầu được lưu trong localStorage của bản xem trước.

Đã kiểm tra: gửi rỗng báo ba trường lỗi và focus về Họ; điền dữ liệu mẫu, chọn 28/10/2026 từ lịch bằng bàn phím, lưu, mở lại giữ dữ liệu; đóng bằng Escape. 375px: modal nằm trong viewport, không tràn ngang, thân cuộn riêng và footer còn hiển thị.

## Select một lựa chọn

Nguyên nhân menu đè lên field: Base UI mặc định `alignItemWithTrigger=true`. Bản preview chuyển sang `false`, `align=start`, `sideOffset=control-gap` để menu mở bên dưới, khớp hai mép. Select và Combobox dùng chung style popup. `items` cung cấp ánh xạ value/label ngay từ đầu, nên disabled không còn hiện giá trị nội bộ `read-only`.

Đo trực tiếp trên UI:

| Thuộc tính | Desktop | 375px |
| --- | --- | --- |
| Chiều cao field | 40px | 44px |
| Font | 14px | 14px |
| Padding ngang | 12px | 12px |
| Khoảng hở menu | 8px | 8px |
| Chiều rộng menu | Bằng field | Bằng field |

Đã chọn Zalo cá nhân và Email; nhãn field và dòng kết quả cùng cập nhật. Menu nền trắng ở light mode, không tràn ngang.

## Multi select

Dùng Combobox `multiple`, Chips, ChipRemove, Value, List, Item và Trigger của shadcn/Base UI. Chip dạng viên thuốc; có tìm và xóa tất cả. Đã kiểm tra từ rỗng chọn Yona → Zalo cá nhân → Email, giữ đủ ba lựa chọn; gỡ riêng một chip. Chỉ còn một chevron, không dùng select nhiều lựa chọn tự dựng.

## Token và bằng chứng

Kích thước mới khai báo theo chức năng trong `tokens.ts`: range track/thumb/tick/bubble, upload document/dropzone/progress, form modal width và multi search minimum width. Margin/padding/gap dùng token đã chốt.

Ảnh trong `docs/design/admin-preview/`: `range-input-light.png`, `file-input-light.png`, `modal-form-light.png`, `modal-form-mobile.png`, `multi-select-library.png`, `select-aligned-desktop.png`, `select-aligned-mobile.png`.
