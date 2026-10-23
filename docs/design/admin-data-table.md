# Data table — đã duyệt

> Đã duyệt cùng toàn bộ components và tokens ngày 23/10/2026. [Baseline UI admin v1](admin-design-baseline.md) là nguồn chốt; nội dung các lượt duyệt bên dưới được giữ làm lịch sử.

Ngày 22/10/2026 · `codex/admin-design-skeleton` · Bản xem trước admin.

## Hướng thiết kế

Theo ảnh người dùng cung cấp: toolbar rõ chức năng, ô tìm kiếm có clear, bộ lọc gọn, header có icon/sắp xếp, hàng dữ liệu đồng đều, avatar và badge viên thuốc, panel tùy chỉnh cột nổi bên phải.

Nền sáng trắng hoàn toàn; màu xanh dành cho thao tác và lựa chọn. Đường chia dùng token `border-divider` ở độ mờ 65%, không dùng các đường kẻ tối của bản cũ. Chữ dữ liệu 14px, nhãn 13px. Header 40px, hàng 48px; các chiều rộng cột có token theo chức năng. Trên điện thoại giữ danh tính và ô chọn cố định, các cột còn lại cuộn ngang trong bảng; scrollbar dùng cấu hình mảnh chung.

## Thư viện và cấu trúc

- TanStack Table: tìm, lọc, sắp xếp, lựa chọn, phân trang, thứ tự và hiển thị cột.
- shadcn/Base UI: Table, Checkbox, Switch, Popover, DropdownMenu. dnd-kit: kéo và đổi thứ tự bằng bàn phím.
- `data-table.tsx`: khung bảng và panel cột trung tính, nhận table instance, cấu hình trường và các slot hành động/lọc.
- `directory-table.tsx`: dữ liệu mẫu người dùng và cấu hình riêng của danh sách. Có 24 dòng, 9 thuộc tính; họ tên là cột cố định.
- Bảng tải riêng khi cần; không tăng gói tải đầu của trang tổng quan.
- Tùy chỉnh hiển thị/thứ tự được lưu trên trình duyệt và khôi phục mặc định được. Các thao tác áp dụng vào dữ liệu mẫu, chưa nối backend.
- Xuất CSV hỗ trợ các dòng đang lọc hoặc những dòng được chọn; cột xuất theo thứ tự đang hiển thị, có UTF-8 BOM và xử lý giá trị có thể bị phần mềm bảng tính hiểu như công thức.

## Lỗi panel người dùng vừa phát hiện

Thumb switch chịu cả `translate` từ thư viện lẫn `transform` tùy chỉnh, nên bị dịch hai lần ra ngoài track. Pseudo-element mở rộng vùng bấm tràn thêm 12px sang phải, tạo scrollbar ngang. Bản sửa chỉ dùng một phép dịch, giữ inset thumb 2px, vùng bấm mở rộng theo chiều dọc. Track 28×16px, thumb 12px.

Đã đo trực tiếp trên trình duyệt: khi bật thumb cách mép phải 2px; khi tắt cách mép trái 2px. `scrollWidth` và `clientWidth` của danh sách bằng nhau ở desktop và 375px. Các hàng trong bảng đều cao 48px.

## Nghiệm thu trực tiếp

- Tìm không có kết quả: hiện trạng thái rỗng, bộ đếm 0–0/0 và trang 1/1. Xóa bộ lọc khôi phục danh sách.
- Lọc cần chú ý: đúng 4 dòng, cả 4 cùng trạng thái.
- Sắp xếp tên tăng dần: cột có `aria-sort=ascending`, dòng đầu Anh Thư.
- Chọn một dòng: checkbox đầu bảng ở trạng thái mixed. Chọn tất cả trong trang: 10 dòng; có thanh hành động và bỏ chọn.
- Chuyển trang: hiển thị 11–20/24. Chọn 20 dòng/trang: 20 dòng, vùng bảng cuộn riêng.
- Đổi vị trí Email bằng Space → mũi tên → Space; tắt cột Email; reload giữ đúng thứ tự và trạng thái. Khôi phục mặc định trả về đầy đủ cấu hình gốc.
- Panel sáng/tối và 375px: không tràn ngang, switch không bị cắt; vùng danh sách cuộn dọc khi thiếu chỗ.

Ảnh: `admin-preview/data-table-before.png`, `data-table-light.png`, `data-table-dark.png`, `data-table-mobile.png`, `data-table-column-fix.png`.

Trạng thái: đang chờ người dùng duyệt Data table, chưa chuyển sang component khác.
