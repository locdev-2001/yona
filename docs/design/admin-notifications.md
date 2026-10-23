# Thông báo admin - đã duyệt

> Đã duyệt cùng toàn bộ components và tokens ngày 23/10/2026. [Baseline UI admin v1](admin-design-baseline.md) là nguồn chốt; nội dung các lượt duyệt bên dưới được giữ làm lịch sử.

Ngày 23/10/2026 · Nhánh `codex/admin-design-skeleton`. Chỉ bản xem trước, chưa kết nối dữ liệu thật.

## Bố cục theo ảnh tham chiếu

Popup neo dưới chuông, căn phải, rộng 400px; góc 12px. Tiêu đề 16px, nội dung 14px, chi tiết 13px. Các tab Tất cả/Nhắc đến/Hộp thư/Lưu trữ cao 28px desktop, 44px mobile. Tab đang chọn và nút Chấp nhận dùng `action-primary` xanh #2563eb. Nền trắng, không tô xanh từng hàng; hover mới có nền trung tính nhẹ. Dấu chưa đọc đỏ tròn dùng chung token thông báo. Thao tác đọc/lưu trữ nằm trong flex row riêng cùng thời gian, luôn được giữ chỗ dù ẩn; chỉ hiện khi hover hoặc focus; trên thiết bị cảm ứng luôn có thao tác.

Bốn mẫu: chia sẻ tệp, nhắc đến kèm bình luận hai dòng, yêu cầu truy cập có nút Từ chối/Chấp nhận, thông báo kèm tệp CSV. Tệp mẫu tải cục bộ qua data URL, không upload/gửi yêu cầu bên ngoài.

## Thành phần và trạng thái

`notification-center.tsx` là UI dùng chung nhận danh sách và callback đọc/lưu trữ/quyết định, không biết nghiệp vụ kênh. Dùng Popover và Tabs của shadcn/Base UI để quản lý focus, Escape và bàn phím. `notifications-preview.tsx` chứa riêng dữ liệu minh họa, lưu trạng thái bằng hook `usePreference` được tách từ main. Cùng component xuất hiện trên topbar và thư viện; hai bản minh họa giữ trạng thái riêng.

Có chưa đọc/đã đọc, đánh dấu tất cả, lưu trữ, khôi phục, danh sách rỗng và quyết định yêu cầu. Trạng thái lưu localStorage; đã kiểm tra reload giữ lưu trữ và quyết định. Tabs dùng phím mũi tên để chuyển focus, Enter để chọn.

## Topbar và footer

Bỏ avatar topbar. Search có Ctrl K trên Windows/Linux, ⌘ K trên macOS; badge phím tắt cao 24px, căn giữa field 40px, không viền lồng. Ctrl/Meta K focus field; nhập có nút clear. Footer tài khoản giảm còn 64px theo vùng khoanh.

## Nghiệm thu

Đã dùng thật trên desktop và 375px: mở/đóng popup, lọc, đọc/chưa đọc/đọc tất cả, chấm đỏ biến mất khi hết chưa đọc, lưu trữ/khôi phục, reload, chấp nhận yêu cầu trong gallery và tải lại giữ kết quả. Kiểm tra tab bằng bàn phím, Ctrl K và clear. Mobile popup rộng 343px, không tràn viewport 375px, danh sách cuộn riêng; footer cao 64px. Light/dark dùng cùng cấu trúc.

Ảnh trong `docs/design/admin-preview/`: `topbar-notifications-before.png`, `notifications-light.png`, `notifications-dark.png`, `notifications-mobile.png`, `sidebar-account-size-before.png`, `sidebar-account-compact-mobile.png`.

## Sửa chồng lấn và primary - 23/10/2026

Nguyên nhân toolbar đè nội dung: định vị absolute theo góc article. Đã đưa toolbar trở lại hàng flex cạnh thời gian, giữ diện tích ngay cả lúc ẩn, không che tiêu đề và không nhảy bố cục khi hover/focus. List tối đa 560px, cuộn khi viewport thiếu chiều cao.

Đã chụp trạng thái hover thực tế ở desktop và 375px. Ảnh: `notifications-hover-fix-light.png`, `notifications-hover-fix-dark.png`, `notifications-hover-fix-mobile.png`.
