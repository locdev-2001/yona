# Revamp UI admin — tiến độ ngày 23/10/2026

Task: [Revamp UI admin theo components và tokens v1 đã duyệt](https://dash.yona.vn/admin/tasks/view/168).

## Phạm vi đã triển khai tại local

- Khung admin dùng trực tiếp NavigationSidebar, SearchField, PreviewButton và NotificationCenter của baseline V1. Điều hướng và tài khoản nhận dữ liệu máy chủ, không mang fixture của gallery vào runtime.
- Giữ provider/sidebar cookie, phím tắt bảng lệnh, tìm kiếm API, toast và các route hiện có. Dùng một hook xác định mục điều hướng đang mở cho cả sidebar và breadcrumb.
- Theme sáng/tối và scrollbar đọc nguyên nguồn `tokens.ts`; giữ lựa chọn theme sau tải lại.
- Theo duyệt bổ sung trong hội thoại: ánh xạ bảng màu cũ của console vào token V1 tại `console-shell.css`, để chữ và biểu đồ cũ còn đọc được khi chuyển dark. Không thêm token/màu mới.
- Thông báo giữ skeleton; không gọi API giả hay dùng dữ liệu minh hoạ. Người dùng yêu cầu giữ nguyên màu skeleton dù nền trắng khiến các thanh khó thấy ở light mode.
- Chưa thay nội dung các màn hình, chưa đánh dấu hoàn thành các đợt V1. Tổng quan đang chờ duyệt thiết kế cohort.

## Mẫu cohort đang trình duyệt

Mở `http://127.0.0.1:8620/design/admin-preview/cohort.html` khi server preview đang chạy.

- Ghép WidgetCard, Table và Progress đã có; toàn bộ giá trị màu, chữ, khoảng cách, kích thước lấy từ token V1.
- Mỗi ô có phần trăm và thanh tiến độ primary; không dùng thêm bảng màu heatmap.
- Ghim cột tuần đăng ký; cuộn ngang trong bảng trên mobile, không đẩy tràn cả trang.
- Dấu — biểu thị tuần chưa có số liệu. Bản trình duyệt dùng số liệu minh hoạ có ghi rõ.
- Chưa thêm component vào danh mục đã duyệt và chưa nối vào runtime. Cần người dùng duyệt mẫu trước.

## Nghiệm thu trực tiếp

- Desktop: sidebar 248px; thu gọn 72px, tải lại vẫn giữ; topbar 64px; card tài khoản 64px. Menu con mở được khi sidebar thu gọn.
- Tìm menu không dấu `nguoi` trả Người dùng; nút xoá khôi phục menu. Chuyển sang Người dùng qua sidebar thành công.
- Command palette mở bằng nút tìm kiếm; query `john` trả người dùng/liên hệ thật từ API local. Escape đóng được.
- Theme đổi qua topbar và menu tài khoản, tải lại giữ theme; chữ KPI dark đã sáng theo token.
- 375×812: drawer rộng 280px, inset 8px, nằm trọn màn hình; menu tài khoản tránh tràn; Escape khôi phục focus và cuộn nền.
- Cohort 375px: scrollWidth trang 369px trong viewport 375px; cuộn ngang bằng bàn phím hoạt động; cột đầu vẫn tại x=32px.

## Kiểm tra mã

- TypeScript: đạt.
- i18n-check: đạt.
- Pint kiểm tra file Blade thay đổi: đạt.
- Vite build ứng dụng và SDK: đạt; có cảnh báo kích thước chunk từ build hiện tại.
- `git diff --check`: đạt.
- Kiểm tra CSS: vùng superadmin đạt (182 module). Toàn bộ lệnh còn báo thiếu hai module ở vùng widget (CloseButton/Kbd); đã kiểm tra checkout main cũng có đúng hai lỗi này, không phát sinh từ revamp.
- Không thêm hay chạy test tự động. Chưa commit, push, merge hoặc deploy.

## Ảnh

Ảnh ở `docs/design/admin-revamp/`:

- `shell-before-desktop.png`: trước khi thay khung.
- `shell-after-light.png`, `shell-after-dark.png`: khung mới và ánh xạ màu.
- `shell-collapsed.png`: sidebar thu gọn.
- `shell-mobile-light.png`, `shell-mobile-dark.png`: drawer 375px.
- `cohort-design-light.png`, `cohort-design-dark.png`, `cohort-design-mobile.png`: mẫu cohort chờ duyệt.

## Chốt font của bộ component

Người dùng đã duyệt Manrope ngày 23/10/2026 sau khi so sánh trực tiếp trong gallery. Đã cập nhật baseline và nhãn của bộ chọn font. Lượt này chỉ chốt font cho component, chưa thay font runtime admin.

## Triển khai Manrope toàn dashboard admin và Tổng quan

Theo yêu cầu tiếp theo của người dùng, Manrope đã áp dụng vào toàn dashboard admin, gồm đăng nhập, shell, các trang, số liệu, bảng, modal và toast. Nguồn duy nhất: `resources/css/admin/typography.css`; các stylesheet dùng `--admin-font-family`. Bảng mã kỹ thuật vẫn dùng monospace.

Màn Tổng quan đã nối MetricCard và WidgetCard V1 vào dữ liệu thật; cohort dùng lại CohortMatrix đã trình duyệt, ánh xạ đúng offset tuần từ API. Không tạo sparkline giả cho KPI vì API chỉ cung cấp số kỳ hiện tại/kỳ trước. Giữ API, các widget, đổi khoảng thời gian, làm mới và tùy chỉnh bố cục hiện có. Các màn khác mới đổi font chung, chưa thay toàn bộ component.

Nghiệm thu thực tế: chọn 7 ngày làm thay đổi số liệu; đổi độ rộng KPI từ Toàn dòng sang Rộng, reload vẫn giữ, rồi khôi phục Toàn dòng và xác nhận đã lưu. Cohort có 8 dòng dữ liệu thật. 375px: khung cohort 305px, bảng 1080px cuộn bên trong; scrollWidth toàn trang 369px trong viewport 375px. Kiểm tra font body, heading, KPI, màn Người dùng, command palette và input đều là Manrope, font tải thành công.

Đã sửa min-width của nội dung WidgetCard dùng chung để bảng dài không đẩy tràn trang. TypeScript, i18n-check, Pint và build đạt. Chưa commit/push/deploy. Ảnh mới: overview-v1-light.png, overview-cohort-real.png, overview-v1-mobile.png, overview-v1-mobile-cohort.png.

## Chia lại bento grid theo ảnh phản hồi

KPI giới hạn 4 cột trên desktop, thành hai hàng đủ 8 thẻ; màn hẹp chia hai cột và mobile một cột. Widget bên dưới dùng lưới 12 cột: Hẹp 4, Vừa 6, Rộng 8, Toàn dòng 12. Giữ giá trị size và thứ tự bố cục đã lưu, không ghi đè dữ liệu người dùng. Gap tiếp tục dùng section-gap V1.

Đã bỏ margin-bottom lặp ở header/KPI và sửa nút làm mới ẩn vốn chiếm 38px do CSS button đè position của sr-only. Nút vẫn truy cập được bằng bàn phím. Không thay màu/font/card.

Nghiệm thu viewport 1911×920: 8 KPI nằm ở hai hàng; biểu đồ tin nhắn rộng 1054px, phân bố kênh 515px, khoảng cách theo token. 375×812: KPI một cột 337px, scrollWidth trang 369px, không tràn. TypeScript/build/diff-check đạt. Ảnh bento-before.png, bento-desktop.png, bento-mobile.png. Chưa commit/deploy.

## Sửa đa ngữ, chart và thu gọn card theo phản hồi

- Thêm lớp DesignCopyProvider trung tính, nhận bản dịch từ lang/{en,vi}/admin_design.php ở adapter console. Sidebar/tìm menu, submenu, menu tài khoản, đổi theme, thông báo và cohort hiển thị đúng locale; không trộn tiếng Việt trong menu tiếng Anh.
- Biểu đồ đường, cột và donut của runtime và gallery dùng chung renderer trong chart-components.tsx và cùng stylesheet. Bỏ kiểu area cũ, dùng legend bật/tắt ở trên, đường solid và donut vành mảnh theo baseline. Dữ liệu thật và bảng số cho trình đọc màn hình được giữ.
- Góc cắt cuối card dành chỗ cho nút ba chấm khi card không có footer. Đã đo nút và liên kết cuối của Operations shortcuts không giao nhau.
- Số KPI dùng token 32px, số giữa donut giảm tiếp còn 24px theo phản hồi; card KPI dùng góc cắt 40px (giá trị từ control-height hiện có), icon 36px, giảm padding/gap bằng token sẵn có. Đo desktop: card cao 154px so với 242px trước đó.
- Tooltip donut là portal trên body, đứng bên phải cách vòng chart 8px; tránh viewport bằng cách chuyển sang trái hoặc lên trên ở mobile. Không bị số giữa donut, card khác hoặc góc cắt che mất.
- Mẫu Chart insights · Thống kê phụ đã có trong gallery, dùng Panel và token V1, có bản sáng/tối/mobile. Đang chờ người dùng duyệt, chưa tích hợp thay hai ô MetricBoxes cũ.

Nghiệm thu thực tế: menu tài khoản en có Back to workspace / Switch to dark theme / Log out; vi đúng nhãn tương ứng. Legend ẩn Incoming làm số đường giảm còn 1, không có area fill. 375px: khung chart 305px, scrollWidth trang 369px. Tooltip desktop đọc Website / 157 ở ngoài donut; vị trí portal cách cạnh phải donut 8px và nằm trong viewport. TypeScript, i18n, Pint, build kiểm tra theo lượt sửa. Chưa commit/deploy.

## Reicon và bộ chọn ngôn ngữ

Toàn bộ icon React của admin và gallery chuyển sang Reicon Outline qua một module ánh xạ duy nhất. Đã bỏ lucide-react khỏi dependency; giữ nguyên màu và kích thước token. Adapter bỏ children của Base UI icon slot để tránh xung đột với SVG do Reicon dựng. Kiểm tra Tổng quan có 68 SVG Reicon và không còn SVG Lucide.

Menu tài khoản ở sidebar có mục Ngôn ngữ, submenu chọn Tiếng Việt hoặc English và đánh dấu lựa chọn hiện tại. Danh sách lấy từ cấu hình locale của server qua LocaleOptions dùng chung với landing; đổi ngôn ngữ giữ đường dẫn và bộ lọc, dùng middleware locale hiện có để ghi nhớ lựa chọn.

Nghiệm thu trình duyệt: đổi Việt → Anh → Việt; chuyển trang Người dùng/Tài khoản và reload vẫn giữ ngôn ngữ. Menu mobile 375px nằm trong viewport, không tràn. TypeScript, Pint, i18n-check và build đạt. Ảnh language-menu-reicon-final.png, language-menu-en.png, language-menu-mobile.png. Mẫu thống kê phụ đã thu gọn label 13px, value 15px và dùng Reicon; ảnh chart-insights-reicon-compact.png. Mẫu này vẫn chờ duyệt trong gallery, chưa thay runtime. Chưa commit/push/deploy.

## Sửa donut bị co ở widget hẹp và chỉnh tiếp mẫu thống kê

Tái hiện ở viewport 960px: distribution rộng 261px nhưng media query ép chart và legend thành hàng ngang, donut co còn 57px; ảnh phản hồi có thể co nhỏ hơn theo chiều rộng card. Bỏ chuyển hàng ngang theo viewport, giữ donut không co và chú giải ở dưới cho cả gallery/runtime. Sau sửa: donut 144×144px ở 960px, 124×124px ở mobile 375px; scrollWidth mobile 369px, không tràn. Không thêm token. Ảnh donut-narrow-before.png, donut-narrow-after.png, donut-narrow-mobile.png.

Người dùng chọn chỉnh tiếp Chart insights trong gallery: mẫu mới gộp thành một khối có đường chia, nhãn/icon trung tính 13px và giá trị 15px; mobile xếp dọc. Dùng token V1 hiện có. Ảnh chart-insights-revised.png; chưa áp dụng vào dashboard, vẫn chờ duyệt.

## Áp dụng mẫu thống kê phụ đã chốt

Người dùng duyệt mẫu ChartInsights trong gallery ngày 23/10/2026. Đã thay hai MetricBoxes phía trên Tin nhắn theo ngày bằng đúng component dùng chung với gallery; bỏ nhãn chờ duyệt trong gallery. Tách giá trị ngày cao điểm và chú thích ngày, bổ sung bản dịch Việt/Anh cho đơn vị tin và khoảng được chọn. Dữ liệu thật: 72,5%, 303 tin ngày 25/09; khi không có dữ liệu giữ dấu gạch thay vì tạo số giả.

Nghiệm thu: desktop hai cột, mobile 375px xếp dọc, khối rộng 305px và trang scrollWidth 369px. Đổi sang English hiển thị 72.5%, In the selected range, 303 messages, on 25/09; đã chuyển về Tiếng Việt. TypeScript, Pint, i18n-check, build admin/SDK và preview đều đạt. Ảnh chart-insights-applied.png, chart-insights-applied-mobile.png. Chưa commit/push/deploy.
