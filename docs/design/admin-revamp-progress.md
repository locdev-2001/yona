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

## Đợt CRUD: danh sách, form và khung chi tiết (đang nghiệm thu)

Tài khoản/Người dùng và các resource dùng chung đã nối vào Data table V1: server tiếp tục xử lý tìm kiếm, bộ lọc, sort và phân trang; renderer/panel tùy chỉnh cột dùng chung với gallery. Hiển thị/thứ tự cột lưu riêng theo tài nguyên. Bản dịch Việt/Anh cho điều khiển bảng đi qua DesignCopyProvider. Đã mở được bảng Tài khoản và panel, ẩn cột Ngôn ngữ thành công; bước reload bị gián đoạn do server kết thúc theo phiên lệnh.

Đã chuyển server PHP/Vite sang tiến trình độc lập (8630/8631), giới hạn PHP dev server 2 worker và Node heap 1536 MB. Hai cổng vẫn lắng nghe sau nhiều lệnh kiểm tra. Trình duyệt đang giữ trang lỗi kết nối dạng data URL; công cụ từ chối truy cập trang lỗi, đang chờ người dùng tải lại tab trong ứng dụng. Chưa xác nhận lưu cột qua reload, tìm/lọc/sort/phân trang, theme tối và mobile, không đánh dấu hoàn tất.

Form và khung chi tiết CRUD dùng lại Panel, field controls, ChartInsights và token V1. Tách CSS Panel/Badge khỏi preview.css thành panel-components.css dùng chung cho gallery/runtime. Không thêm token hay dữ liệu minh hoạ vào runtime. TypeScript và build admin/SDK đạt; Pint bản dịch và i18n-check đạt. Chưa commit/push các thay đổi đợt này, chưa deploy.

## Nghiệm thu tiếp CRUD và các màn vận hành

- Tài khoản/Người dùng: tìm không có kết quả → trạng thái rỗng, nút xóa tìm gửi lại server; sắp xếp tên tăng dần đưa Acme Inc lên đầu; trang 2 giữ query sort và hiển thị 21–40/40. Ẩn cột và đổi thứ tự bằng bàn phím còn giữ sau reload, khôi phục mặc định hoạt động. Header/cell dùng renderer V1 chung với gallery. Hàng danh tính đã đo 48px. Mobile: viewport 375px, trang 369px, bảng cuộn bên trong khung 337px.
- Form/chi tiết CRUD: Panel, field, trạng thái và ChartInsights dùng component/token V1. Đã sửa bảng quan hệ thiếu ô làm lệch các cột, ánh xạ cell theo tên cột. Tách URL mở hàng khỏi URL bản ghi để menu Sửa/Tổng quan 360 không nối thêm đường dẫn vào /overview.
- Theo duyệt của người dùng, thêm validation tập trung trong luồng lưu CRUD; quy tắc sống trong từng Dashboard. Tên trống của người dùng hiển thị lỗi dưới trường, không còn lỗi DB; tạm khóa thiếu nhóm/lý do báo riêng hai trường. Đã kiểm tra lỗi và hủy, xác nhận tài khoản vẫn hoạt động. Lưu tên PlatformApp local thành “MCP sticker local · UI V1”, reload vẫn đúng, sau đó đã khôi phục “MCP sticker local”.
- Sức khỏe kênh/Cảnh báo/Mức dùng tính năng/Nhật ký/Dữ liệu: dùng chung DataTableGrid của V1; giữ lọc, phân trang, hàng mở rộng và ghim cột. Đã kiểm tra lọc cảnh báo còn một hộp thư, mở/hủy form luật, tìm nhật ký rỗng/xóa tìm, tìm bảng, ghim id trái/account_id phải. Các trang đã đo ở 375px không tràn ngang (trang 369px, khung bảng 337px).
- Hồ sơ tài khoản: thẻ số liệu dùng MetricCard; chart sử dụng dùng DesignTimeSeries dạng cột; badge trạng thái và panel dùng bản V1. Đã mở dữ liệu thật, chuyển tab Hộp thư và reload. Mobile chart rộng 257px, trang 369px trong viewport 375px.
- Trạng thái hệ thống: Panel/badge V1, bổ sung nhãn và trạng thái Việt/Anh. Thương hiệu: khung logo dùng token, giữ các thao tác upload/reset. Cấu hình: sửa lỗi tab kéo form mobile rộng 794px; sau sửa các trường rộng 337px, trang 369px. Chỉ mở phần Email không có khóa bí mật để lưu ảnh.
- Kho sticker: drawer chi tiết dùng khung inset/radius/padding V1, nút Đóng có bản dịch. Đã mở bộ/chỉnh metadata/hủy, không đổi sticker. Mobile drawer từ x=8 đến x=367, rộng 359px trong viewport 375px. Các popup field dùng cùng stylesheet control của gallery.

Ảnh mới trong admin-revamp/: accounts-desktop.png, users-desktop.png, users-dark.png, users-mobile.png, users-columns-mobile.png, user-detail-dark.png, user-form-validation.png, user-form-mobile.png, account-form-validation.png, account-detail-mobile.png, channel-health-before.png, channel-health-after.png, channel-health-mobile.png, alerts-rule-editor.png, alerts-mobile.png, feature-usage-desktop.png, feature-usage-mobile.png, data-table-pinned.png, data-table-mobile.png, audit-logs-mobile.png, instance-status-desktop.png, instance-status-mobile.png, branding-desktop.png, branding-mobile.png, app-config-email-desktop.png, app-config-email-mobile.png, sticker-detail-mobile.png, account-overview-desktop.png.

## Chốt và áp dụng màn xác thực theo ảnh tham chiếu

Người dùng duyệt cả bản sáng và tối ngày 23/10/2026. Đã áp dụng nền mạch/thẻ form vào đăng nhập và 2FA. AuthStage/AuthPanel dùng chung với gallery, LoginForm cũng dùng chung để chỉ chỉnh một nơi. Logo/tên lấy từ cấu hình cài đặt; bản dịch và lỗi dưới trường lấy từ server. Thông báo sai tài khoản/mật khẩu đã có Việt/Anh. Mã dự phòng xếp hai cột để vừa thẻ gọn; OTP dùng chiều cao control của từng breakpoint. Màu thanh tiến trình điều hướng cũng lấy primary V1.

Nghiệm thu trực tiếp trên cùng form trong gallery: cả theme trắng/tối, nút hiện/ẩn mật khẩu, OTP và khung form ở 375px không tràn. Ảnh auth-login-reference.png, auth-login-reference-light.png, auth-mfa-reference.png, auth-shared-login-light.png. Phiên admin hiện đã đăng nhập nên chưa chạy lại luồng đăng nhập/ghi danh 2FA bằng một phiên mới; không tạo khóa 2FA trong gallery.

Các thay đổi đợt này chưa commit/push/deploy. Công việc revamp tổng thể vẫn đang tiến hành.

Kiểm tra cuối đợt: Pint toàn bộ PHP thay đổi, TypeScript, i18n-check, build admin/SDK và build gallery đều đạt; diff-check sạch. Nút hiện/ẩn mật khẩu đã kiểm tra trên LoginForm dùng chung. Link review trong gallery tự chọn component theo tham số review sau reload.

## Rà tiếp bảng vận hành và các màn tích hợp — 23/10/2026

Đợt trước đã commit và push `ce1b7496` lên `origin/codex/admin-design-skeleton`. Chưa merge hoặc deploy.

- Sửa bảng Tài khoản dùng tính năng: cột mặc định 150px xung đột link tối thiểu 192px. ListTable dùng chiều rộng cột V1 196/120/184px, giữ chiều rộng khai báo riêng; các link danh tính co theo ô, tên dài có ellipsis/title. Áp dụng cùng điểm dùng chung cho Mức dùng tính năng, Sức khỏe kênh và Cảnh báo.
- Nghiệm thu bảng tài khoản dùng “Tạo hộp thư” có dữ liệu thật: mobile 375px, trang 369px, các cột 196/120/120/184/184px; bấm hàng mở đúng hồ sơ và quay lại được. Đã kiểm tra desktop và lưu ảnh trước/sau.
- Agent bot: mở danh sách, chi tiết có token che, form Sửa và Hủy; mobile 375px không tràn (trang 369px). Không lưu thay đổi bot.
- Access token: danh sách/điều khiển bảng dùng V1; các giá trị vẫn che. Desktop và mobile 375px (trang 369px); không bấm Hiện/Sao chép.
- Đăng nhập hộ: sửa resourceName tại Dashboard thành `impersonations` đúng route; trước đó tiêu đề còn tiếng Anh và tìm/sort có thể điều hướng sang resource suy ra từ model. Bổ sung nhãn quan hệ Việt/Anh. Đã bấm sort Tạo lúc, nhập/tìm/xóa từ khóa, xác nhận URL luôn `/admin/impersonations`. Dữ liệu local đang rỗng; chưa có nghiệm thu hàng nhật ký có dữ liệu. Mobile trang 375px trong viewport 375px.
- Biến cấu hình hệ thống: mở bảng, tìm từ khóa không khớp, xác nhận trạng thái rỗng trên desktop/mobile. Chỉ lưu ảnh trạng thái rỗng để không đưa giá trị cấu hình vào bằng chứng. Không sửa cấu hình.
- Kiểm tra hồi quy bảng Sức khỏe kênh/Cảnh báo sau chỉnh cột: trang 369px trong viewport 375px; cuộn bảng nằm trong khung. Bộ ảnh mobile bổ sung dùng viewport 375×700.

Kiểm tra mã: TypeScript, Pint các tệp PHP sửa, i18n-check (đã sinh lại bundle en/vi), build admin/SDK và gallery đạt. Không chạy hoặc viết test tự động. Không thêm token hoặc pattern mới.

Ảnh bổ sung: feature-accounts-before-mobile.png, feature-accounts-after-mobile.png, feature-accounts-after-desktop.png, agent-bots-desktop.png, agent-bot-form-mobile.png, access-tokens-desktop.png, access-tokens-mobile.png, impersonations-desktop.png, impersonations-mobile.png, installation-config-empty-desktop.png, installation-config-empty-mobile.png, channel-health-column-mobile.png, alerts-column-mobile.png.

Công việc tổng thể vẫn đang tiến hành. Còn nghiệm thu đăng nhập/2FA bằng phiên mới và các trạng thái chỉ có khi có dữ liệu (nhật ký đăng nhập hộ); không đánh dấu hoàn tất toàn bộ.

## Route đăng nhập gọn — 23/10/2026

Theo yêu cầu người dùng, đổi GET/POST đăng nhập từ `/admin/sign_in` thành `/admin/login`. Named route `admin.login` là nguồn dùng chung: middleware khách, redirect lỗi/throttle và URL submit cấp cho LoginForm đều lấy từ route này. Đường dẫn GET cũ chuyển hướng 301 sang `/admin/login` để giữ bookmark. Không thêm luồng đăng ký quản trị.

Kiểm tra HTTP local không có phiên: `/admin/login` trả 200; `/admin/sign_in` trả 301 với Location `/admin/login`; `/admin` trả 302 về `/admin/login`. Pint, i18n-check, TypeScript và build admin/SDK đạt. Không đổi bố cục giao diện; chưa chạy lại đăng nhập/2FA bằng phiên mới. Thay đổi route chưa commit/push/deploy.

## Chuẩn hóa các route admin còn snake_case — 23/10/2026

Đổi toàn bộ đoạn route tĩnh của console sang kebab-case: access-tokens, account-users, agent-bots, platform-apps, installation-configs, app-config, audit-logs, channel-health, feature-usage, instance-status, sticker-packs, reset-cache, resend-confirmation và push-subscriptions; bao gồm API kho sticker chung/riêng theo tài khoản. Chi tiết tính năng dùng slug (ví dụ inbox-created), khóa sự kiện trong DB giữ nguyên. Tên bảng dữ liệu và query/payload vẫn là định danh dữ liệu, không bị thay thế chuỗi tùy tiện.

- Dashboard::resourceName dùng kebab-case; singular/form payload, khóa dịch, metadata và tùy chọn cột đã lưu giữ định danh cũ. Sidebar, command palette, liên kết profile, widget và các thông báo đều lấy đường dẫn mới.
- Sticker API dùng chung nhận tên collection do adapter admin truyền vào; API của dashboard người dùng tiếp tục dùng mặc định hiện có. Không gắn logic đặc thù admin vào lõi sticker.
- Chuyển hướng GET/HEAD URL cũ tập trung qua SuperAdminArea::canonicalPath và LegacyRedirectController, giữ query string. Prefix /super_admin cũ cũng đi thẳng tới URL chuẩn; không tạo alias POST/PUT/DELETE cũ.
- Nhật ký ghi mẫu route mới, giữ subject_type dạng định danh cũ; bộ mô tả chuẩn hóa khi đọc để cả dòng cũ/mới có cùng bản dịch và liên kết đúng.

Nghiệm thu trình duyệt local: Agent bot mở chi tiết/form ở route mới, submit quay về chi tiết thành công và tên vẫn là “Nhân viên AI”; nhật ký mới hiển thị “Sửa agent bot” với liên kết /admin/agent-bots/128. Kho sticker tải hai bộ và nội dung qua API mới. Đã mở Sức khỏe kênh, Trạng thái hệ thống, Mức dùng tính năng, Access token, Ứng dụng nền tảng, Biến cấu hình hệ thống (tìm rỗng) và Cấu hình Email qua URL mới. Bookmark /admin/feature_usage/inbox_created chuyển về /admin/feature-usage/inbox-created, reload vẫn ra dữ liệu. Mobile 375px: trang 369px. HTTP kiểm tra URL cũ có query giữ nguyên query; /super_admin/sign_in chuyển 301 về /admin/login. route:list không còn đoạn tĩnh snake_case dưới /admin; /super_admin chỉ còn route chuyển hướng.

TypeScript, Pint các PHP sửa, i18n-check, build admin/SDK và gallery đạt. Ảnh: kebab-agent-bot-detail.png, kebab-sticker-library.png, kebab-audit-logs.png, kebab-feature-usage-mobile.png (dùng các ảnh đợt trước làm đối chiếu). Chưa commit/push/deploy thay đổi route.

## Chuẩn bị triển khai theo yêu cầu — 23/10/2026

Đã commit đổi route tại 3ee754cb và tích hợp origin/main tại 98cd6917. Giữ cả cập nhật cuộc gọi lẫn Reicon/giấy phép, chuẩn hóa thêm call-quality (màn từ main mới), không đổi khóa dịch. TypeScript trên bản tích hợp đạt; Pint và i18n-check đạt. Đã mở /admin/call-quality với dữ liệu local và ghi ảnh release-call-quality-local.png. Ảnh production-login-before.png ghi nhận giao diện production cũ tại /admin/sign_in trước triển khai.

Production đang ở f7661f97. Bốn commit main mới hơn là cập nhật UI cuộc gọi/tài liệu; plan trước triển khai xác nhận không có migration mới. Triển khai qua cổng yona-deploy theo lệnh deploy trực tiếp của người dùng, nghiệm thu production sẽ ghi tiếp sau khi server hoàn tất.

## Sửa wrapper auth sau nghiệm thu production — 23/10/2026

Deploy đầu 2f83d87e thành công nhưng nghiệm thu màn đăng nhập runtime production phát hiện admin-console-auth co còn 98px vì là flex item không được cấp width, kéo panel còn 50px. Đây là lỗi ở wrapper runtime, gallery không tái hiện. Đã dùng chung quy tắc width:100%/min-width:0 của admin-console-shell cho admin-console-auth; không thêm token hoặc thay layout mẫu đã duyệt.

Nghiệm thu trực tiếp form runtime local: viewport 1280px, root/stage 1280px, panel 320px; mobile 375px trang 375px, panel 320px. Để mở cùng trang khi phiên local đã đăng nhập, tạm bỏ guest-only trong local lúc kiểm tra và đã khôi phục trước commit; auth production và routes được giữ nguyên. Ảnh production-login-narrow-before.png, auth-runtime-width-desktop.png, auth-runtime-width-mobile.png. Deploy bản sửa ngay trong cùng yêu cầu triển khai.

## Sửa autofill theo ảnh người dùng — 23/10/2026

Ảnh production của người dùng cho thấy trình duyệt tô khối xám/trắng chữ vào ô email/mật khẩu. Gốc: ConsoleAuthLayout thiếu data-theme trong khi .admin-preview mặc định color-scheme dark, dù html đã dùng token sáng. Đã lấy theme từ cùng ThemeProvider để root auth đồng bộ với shell. Field controls dùng chung bổ sung trạng thái :autofill/:-webkit-autofill cho input trong nhóm, dùng surface-control/text-primary và field-height đã duyệt; không thêm màu, kích thước hoặc token mới, không tắt autocomplete.

Nghiệm thu runtime local bằng dữ liệu minh họa, ép pseudo-state :autofill bằng DevTools (không dùng thông tin đăng nhập thật): sáng scheme light, chữ rgb(30,41,59), nền rgb(255,255,255); tối scheme dark, chữ rgb(248,245,235), nền rgb(48,48,41). Nền phủ đúng token hiện tại, focus vẫn ở wrapper, mobile 375px không tràn. Đã khôi phục guest middleware và theme sáng local sau kiểm tra. Ảnh autofill-light-local.png, autofill-dark-local.png, autofill-dark-mobile.png.
