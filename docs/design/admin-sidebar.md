# Sidebar admin - đã duyệt

> Đã duyệt cùng toàn bộ components và tokens ngày 23/10/2026. [Baseline UI admin v1](admin-design-baseline.md) là nguồn chốt; nội dung các lượt duyệt bên dưới được giữ làm lịch sử.

Ngày 23/10/2026 · Nhánh `codex/admin-design-skeleton`.

## Phạm vi chốt lại theo phản hồi

Ảnh tham chiếu chỉ định hướng bố cục: logo/nút thu gọn, tìm kiếm, nhóm điều hướng và tài khoản cuối thanh. Người dùng yêu cầu giữ style tổng thể của Yona, không sao chép palette, khung nổi và capsule của mẫu.

Bản cuối dùng lại màu chữ, màu nền, màu primary và radius của hệ thống hiện tại. Desktop là thanh điều hướng liền với bố cục trang, không khung nổi/viền ngoài. Light mode trắng, dark mode giữ nền ấm `surface-navigation` sẵn có. Bỏ đường chia từng hàng. Trạng thái active dùng xanh thương hiệu; tổng số là chữ trung tính, thông báo cần chú ý mới có vòng tròn đỏ; khối tài khoản đã được đổi sang card cắt góc theo yêu cầu mới ở mục Footer bên dưới. Mobile dùng khung nổi theo pattern Drawer đã duyệt.

## Cấu trúc

`navigation-sidebar.tsx` là component nhận nhóm menu, mục active và callback điều hướng; không chứa logic riêng của kênh. Cấu hình menu và ánh xạ tới các phần của bản xem trước ở `main.tsx`. `navigation-sidebar.css` là nơi duy nhất quản lý style sidebar; đã gỡ các selector sidebar cũ khỏi `preview.css` để tránh chồng override.

Token mới chỉ cho kích thước theo chức năng: rộng mở/thu gọn, kích thước logo, vạch active, chiều cao profile. Không tạo palette riêng cho sidebar.

## Hành vi

- Thu gọn thành thanh icon 72px; trạng thái được giữ sau reload. Nút tìm khi đang thu gọn mở rộng và focus ô tìm.
- Tìm menu không phân biệt dấu tiếng Việt; bỏ các nhóm không có kết quả, có xóa tìm kiếm.
- Mục active có `aria-current=page`, vạch xanh sát mép và nền xanh nhẹ.
- Tài khoản và trợ giúp cố định phía dưới; chỉ thân menu cuộn khi thiếu chiều cao.
- Menu tài khoản dùng DropdownMenu shadcn/Base UI, có tùy chỉnh giao diện, đổi theme, trợ giúp và tham chiếu.
- 375px: sidebar dạng drawer, khóa cuộn nền, giữ focus trong sidebar; Escape và backdrop đóng, trả focus về nút mở.

## Nghiệm thu trực tiếp

Đã kiểm tra tìm `nguoi` chỉ còn Người dùng; xóa khôi phục 8 mục; thu gọn đo 72px, reload giữ lựa chọn; mở lại; chọn Bộ component cập nhật đúng active; đổi theme qua menu tài khoản. Menu đủ chỗ ở viewport desktop cao 720px.

Mobile 375×812: drawer rộng 280px, inset 8px, không tràn ngang; profile ở trong màn hình; đóng Escape khôi phục cuộn nền và focus. Các thay đổi chỉ áp dụng vào preview local. Không đổi trang người dùng đang xem; tab kiểm tra tạm được dùng ở nền.

Ảnh trong `docs/design/admin-preview/`: `sidebar-before.png`, `sidebar-light.png`, `sidebar-dark.png`, `sidebar-collapsed.png`, `sidebar-mobile.png`.

## Tinh chỉnh tỉ lệ và submenu theo phản hồi tiếp theo

- Hàng chính desktop 40px, icon 16px, hàng con 36px; mobile cả hai cấp tối thiểu 44px. Cột icon/chữ/phần bên phải dùng grid cố định, không đẩy nhãn theo độ rộng badge.
- Thu nhỏ ký hiệu thương hiệu, căn hàng logo với topbar 64px. Avatar dùng kích thước compact sẵn có. Giữ bảng màu/radius Yona.
- `notification-background` là đỏ `#dc2626`. Thông báo mở rộng là vòng tròn 20px; khi thu gọn là chấm tròn 8px. Chuông topbar dùng chung token đỏ 8px và nút vuông 40/44px. Tổng người dùng 2,8k không mang kiểu thông báo.
- Submenu Kết nối kênh: Yona, Zalo cá nhân, Email. Chọn mục con lọc đúng bảng kênh.
- Submenu Bộ component: Tất cả component, Biểu mẫu, Bảng dữ liệu. Dùng cấu hình đích điều hướng; gallery nhận truy vấn khởi tạo, không sao chép logic lọc.
- Mở rộng dùng Collapsible, thu gọn dùng DropdownMenu của Base UI/shadcn. Flyout bắt đầu ở x=80px với sidebar rộng 72px, tức có khoảng hở 8px. Có chevron, rail phân cấp, active cho mục con và ngữ nghĩa aria-expanded/aria-current.
- Tìm menu xét cả nhãn con, tự mở nhánh khớp. Đã dùng `bang` để tìm đúng Bảng dữ liệu. Đã chọn Email bằng Enter, chọn kênh trong flyout khi sidebar thu gọn.

Ảnh bổ sung: `sidebar-refine-before.png`, `sidebar-submenu-expanded.png`, `sidebar-submenu-flyout.png`, `sidebar-submenu-mobile.png`, `sidebar-submenu-dark.png` trong `docs/design/admin-preview/`.

## Footer tài khoản - 23/10/2026

Theo yêu cầu mới, chỉ footer có điểm nhấn màu và hình cắt như Widget/Card; giữ nguyên phần menu bên trên. Nền tím từ `metric-connections-background`, avatar xanh chanh từ `widget-highlight`, chữ dùng `metric-foreground`. Thay dấu ba chấm bằng Lucide ChevronRight đặt trong góc cắt.

Hình học được tách thành `useCardSurface` trong `widget-card.tsx`, dùng chung cho WidgetCard và button tài khoản. Đo border box để phần padding của button không làm lệch clip. Chỉ clip nền, không clip nội dung hay focus ring. Giữ mặc định hình học cũ cho WidgetCard; footer truyền kích thước cắt riêng.

Sau phản hồi yêu cầu thấp hơn, chiều cao cuối là 88px thay cho 112px; giảm padding dọc/gap. Góc cắt 36px, nút mũi tên 32px. Dùng token theo chức năng.

Đã kiểm tra: menu tài khoản mở bằng Enter và đổi được theme; bản dark chữ đủ rõ; bản thu gọn trở về avatar với button 40px; 375px card rộng 256px, cao 88px, không cắt chữ và nằm trong viewport. Widget metric vẫn dùng được clip-path chung.

Ảnh: `sidebar-footer-before.png`, `sidebar-footer-light.png`, `sidebar-footer-dark.png`, `sidebar-footer-mobile.png` trong `docs/design/admin-preview/`.

## Logo và menu tài khoản - 23/10/2026

Bỏ dòng “Tài khoản của bạn”, giữ footer 88px. Logo dùng trực tiếp `/brand-assets/logo.png` ở light và `/brand-assets/logo_dark.png` ở dark, cao 32px theo token `navigation-logo-height`; đã bỏ mark/chữ dựng tay.

Menu mở sang phải, cạnh dưới thẳng với footer, cách 8px. Hiệu ứng opacity và dịch ngang 8px từ trái ra trong 160ms; tắt chuyển động khi người dùng chọn reduced motion. Chỉ áp dụng cho menu tài khoản. DropdownMenu dùng khả năng collision avoidance của Base UI; ở 375px tự chuyển lên trên, toàn bộ menu nằm trong viewport. Prop mới là tùy chọn, các menu khác giữ nguyên mặc định.

Đã kiểm tra trực tiếp light/dark, mở bằng Enter, đóng bằng Escape, đổi theme qua menu, tải lại, trạng thái thu gọn và mobile. Desktop mở rộng: menu x=244px, rộng 248px, dưới cùng y=704px bằng card; mobile: x=20px, rộng 256px, cạnh phải 276px trong viewport 375px. Logo tải đúng asset 393×128 ở cả hai chế độ.

Ảnh: `sidebar-account-menu-before.png`, `sidebar-account-menu-light.png`, `sidebar-account-menu-dark.png`, `sidebar-account-menu-mobile.png` trong `docs/design/admin-preview/`.

## Footer thu gọn - phản hồi tiếp theo 23/10/2026

Giảm token `navigation-profile-height` từ 88px xuống 64px theo vùng người dùng khoanh. Giữ avatar 40px, góc cắt 36px và nút 32px. Đã đo desktop 224×64px, mobile 256×64px; nội dung nằm trong card. Ảnh `sidebar-account-compact-mobile.png`.

## Khe hở góc cắt và primary - 23/10/2026

Khi card giảm còn 64px, giới hạn hình học làm notch còn 32px, bằng đường kính nút cũ nên mất khe hở. Đã chuẩn hóa token notch 32px/nút 28px, chừa 4px; giữ chiều cao card 64px. Nút chevron và icon trợ giúp dùng màu xanh primary; nền card tím và avatar xanh chanh giữ điểm nhấn đã duyệt. Không thay hình học WidgetCard.

## Cân đối logo - 23/10/2026

Giảm token `navigation-logo-height` từ 32px xuống 28px (asset giữ đúng tỉ lệ 393:128, hiển thị khoảng 86×28px). Thêm padding trái 12px cho hàng brand để logo thẳng với icon tìm kiếm/menu; giới hạn max-width theo khoảng còn lại bên cạnh nút thu gọn. Khi sidebar thu gọn, bỏ inset này để nút vẫn giữa thanh 72px.

Đã đo desktop: logo x=24px/y=18px, cao 28px; tâm dọc bằng nút toggle. Mobile logo 86×28px, không chạm nút đóng 44px. Đã kiểm tra light/dark và 375px. Ảnh `sidebar-logo-proportion-before.png`, `sidebar-logo-proportion-light.png`, `sidebar-logo-proportion-dark.png`, `sidebar-logo-proportion-mobile.png`.

## Màu card tài khoản được chốt lại - 23/10/2026

Theo yêu cầu mới, thay nền tím bằng `action-primary` xanh #2563eb trong cả hai theme. Tên và dòng phụ chuyển trắng để dễ đọc. Nút chevron dùng hai token theo chức năng `navigation-account-action-background/foreground`: light đen #000/trắng #fff, dark trắng #fff/đen #000. Avatar xanh chanh, card 64px và góc cắt giữ nguyên.

Đã xác nhận màu computed trên trình duyệt ở cả hai theme và kiểm tra 375px. Ảnh `account-primary-before.png`, `account-primary-light.png`, `account-primary-dark.png`, `account-primary-mobile.png`.

## Palette nút tài khoản được duyệt - 23/10/2026

Người dùng chốt thay đen/trắng bằng cùng dải xanh: light dùng nền navy #1e3a8a, mũi tên trắng; dark dùng nền xanh nhạt #dbeafe, mũi tên navy #1e3a8a. Chỉ sửa hai token `navigation-account-action-background/foreground`; nền card primary và bố cục giữ nguyên. Đã xác nhận computed color trong cả hai theme và 375px. Ảnh `account-palette-light.png`, `account-palette-dark.png`, `account-palette-mobile.png`; ảnh trước ở `account-primary-light.png`/`account-primary-dark.png`.
