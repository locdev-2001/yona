# UI theo portal

Founder chốt ngày 22/10/2026: không áp dụng skill `yona-ui`; giao diện mới kế thừa portal hiện có, component dễ tái sử dụng, màu và kích thước có nguồn tập trung. Trong ứng dụng này, portal là bề mặt hộp thư/dashboard được nạp bởi `resources/scss/app.scss`; không lấy trang help center ở `resources/js/portal/` làm mẫu màn gọi.

## Nguồn hiện hành

- Màu: `resources/scss/_next-colors.scss`; chế độ tối: `resources/scss/_dark-colors.scss`.
- Bề mặt và field: `resources/scss/_base.scss` với `panel-surface`, `field-surface`, `overlay-surface`.
- Component: `resources/js/dashboard/components-next/` gồm Button, DropdownMenu, Switch, Dialog, BottomSheet. Bổ sung primitive dùng chung khi component hiện có chưa đáp ứng; không dựng lại nút/menu riêng cho từng kiểu gọi.
- Giá trị token bên dưới được đọc từ mã hiện hành ngày 22/10/2026, chưa phải số đo màn hình. Giá trị mới phải ghi rõ là lựa chọn thiết kế, không mô tả như đã đo.

## Token màu cần dùng

| Vai trò | Token/class hiện hành | Dùng cho |
|---|---|---|
| Nền ứng dụng | `bg-n-surface-app` | Khung ứng dụng |
| Nền vùng nội dung | `bg-n-surface-canvas` | Màn gọi và vùng làm việc |
| Nền khối | `bg-n-surface-panel` | Ô người, phần cài đặt |
| Nền lớp nổi | `bg-n-surface-raised`, `overlay-surface` | Menu, hộp cài đặt |
| Rê chuột | `bg-n-surface-hover` | Mục menu và hành động |
| Đang chọn | `bg-n-surface-selected` | Thiết bị đang dùng |
| Ô nhập | `field-surface` | Chọn thiết bị, thanh điều chỉnh |
| Chữ chính | `text-n-slate-12` | Tên và nội dung |
| Chữ phụ | `text-n-slate-11` | Nhãn và mô tả |
| Chữ nhạt | `text-n-slate-10` | Số liệu phụ |
| Hành động chính | `n-brand`, `n-blue-11` | Focus, nút chính, lựa chọn |
| Hoạt động | `n-teal-9`, `n-teal-11` | Đang nói, mic hoạt động |
| Cảnh báo | `n-amber-11` | Chất lượng chưa đạt yêu cầu |
| Nguy hiểm | `n-ruby-9`, `n-ruby-11` | Cúp máy, tắt mic, lỗi |
| Nội dung trên video | Chữ trắng, nền đen có alpha | Nhãn tên và lớp phủ thống kê |
| Độ nổi | `shadow-bar`, `shadow-overlay` | Thanh dính, menu/dialog |

Không chép giá trị RGB vào component. Theme sáng/tối tiếp tục dùng cùng token ngữ nghĩa. Không áp các lệnh cấm bo góc, bóng, dark mode của skill cũ lên portal.

### Giá trị màu sáng/tối đang có trong mã

| Biến CSS | Sáng | Tối |
|---|---|---|
| `--blue-9` | `#2781F6` | `#2781F6` |
| `--slate-12` | `#1C2024` | `#EDEEF0` |
| `--slate-11` | `#60646C` | `#B0B4BA` |
| `--surface-app` | `#FFFFFF` | `#18191B` |
| `--surface-canvas` | `#F8FAFD` | `#111113` |
| `--surface-panel` | `#FFFFFF` | `#1C1D20` |
| `--teal-9` | `#12A594` | `#12A594` |
| `--ruby-9` | `#E54666` | `#E54666` |
| `--amber-9` | `#FFC53D` | `#FFC53D` |

Bảng này là bản đọc nguồn ngày 22/10/2026 để đối chiếu, không phải bảng hằng số mới cho component. Khi thay đổi màu, sửa biến CSS nguồn; giao diện chỉ dùng class/token ngữ nghĩa.

## Token kích thước cần dùng

| Nhóm | Token Tailwind/component hiện hành | Giá trị |
|---|---|---|
| Khoảng cách | `1`, `1.5`, `2`, `3`, `4`, `6` | 4, 6, 8, 12, 16, 24 px |
| Icon | `size-3.5`, `size-4`, `size-5` | 14, 16, 20 px |
| Nút Button | `xs`, `sm`, `md`, `lg` | Cao 24, 32, 40, 48 px theo component hiện hành |
| Vùng chạm cuộc gọi | `TOUCH_HEIGHT`, `TOUCH_MIN_HEIGHT`, `PHONE_TOUCH_SIZE` trong `touchTarget.ts` | 44 px cố định, không co theo cỡ chữ |
| Bo nút/field | `rounded-lg` | 8 px |
| Bo panel/menu | `rounded-xl` | 12 px |
| Avatar, switch | `rounded-full` | Tròn |
| Nhãn phụ | `text-xs` | 12 px |
| Nội dung control | `text-sm` | 14 px |
| Nội dung chính | `text-base` | 16 px |
| Số liệu | `font-mono`, `tabular-nums` | Số ổn định bề rộng |
| Bề rộng menu thiết bị | `w-64`, giới hạn theo viewport | 256 px trước khi giới hạn |

Các giá trị px của thang rem ở bảng trên quy đổi theo root 16px; kích thước thực có thể đổi theo cỡ chữ người dùng. Riêng vùng chạm cuộc gọi dùng token px cố định.

Với cài đặt cuộc gọi mới, gom cấu trúc menu và hàng điều chỉnh thành component dùng chung; kiểu gọi 1-1/nhóm/phòng thoại chỉ cấp actions và trạng thái. Lớp phủ số liệu tự đăng ký nguồn stats, không đẩy timer vào toàn màn gọi. Màu lấy CSS token; kích thước lấy primitive hoặc thang Tailwind hiện hành, không thêm một bảng giá trị song song chỉ để đổi tên cùng con số.

## Nghiệm thu

Giữ ngôn ngữ hiển thị trong `lang/{locale}`. Kiểm luồng thật trên máy tính và 375px, cả sáng/tối khi thay đổi màu. Ghi ảnh trước/sau và giới hạn capability theo browser. Không dùng gate của skill cũ làm chuẩn thay cho portal.
