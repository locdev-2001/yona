# Baseline UI admin v1 — đã duyệt

Chốt ngày **23/10/2026** theo xác nhận của người dùng: “chốt sổ components và tokens”. Nhánh `codex/admin-design-skeleton`.

Đây là điểm bắt đầu cho việc revamp UI admin. Thiết kế components và tokens hiện tại đã được duyệt; các ghi chú “đang duyệt” trong nhật ký cũ được thay thế bằng trạng thái này. Những thay đổi sau mốc này cần được ghi thành quyết định mới, không tự đổi style khi tích hợp từng trang.

## Nguồn chuẩn

| Phần | Nguồn duy nhất |
| --- | --- |
| Màu sáng/tối, kích thước, typography, spacing, motion | [tokens.ts](../../resources/js/superadmin/design-preview/tokens.ts) |
| Registry 33 mục component | [gallery.tsx](../../resources/js/superadmin/design-preview/gallery.tsx) |
| Bộ primitive dùng thư viện | [admin/components/ui](../../resources/js/admin/components/ui) |
| Các component ghép và bản xem trước | [design-preview](../../resources/js/superadmin/design-preview) |
| Chạy bản xem trước riêng | [Hướng dẫn](../../design/admin-preview/README.md) |

Không tạo thêm bản sao token trong từng trang. `colorTokens`, `dimensionTokens`, `spacingTokens`, `spacingPixels()` và `themeStyle()` là nguồn giá trị hiện tại; bảng token trong UI đọc trực tiếp từ đó. CSS `--preview-*` hiện được giới hạn cho bản xem trước; khi tích hợp phải dùng một lớp ánh xạ chung vào theme admin, không sao chép giá trị sang từng màn hình.

## Quyết định thiết kế đã chốt

- Font **Manrope** (chốt bổ sung ngày 23/10/2026, thay Inter), icon Reicon Outline; logo dùng asset hệ thống theo theme, cao 28px và giữ đúng tỉ lệ.
- Primary xanh `#2563eb` cho điều hướng, lựa chọn, focus và hành động chính. Widget/chart/badge dùng các màu solid tươi theo chức năng, không gradient.
- Light mode: các bề mặt trung tính trắng hoàn toàn. Dark mode: nền tối ấm theo token hiện tại.
- Control bo 6px; widget/card/drawer bo 20px; popup thông báo bo 12px; badge dạng viên thuốc. Hạn chế border, giữ đường chia khi cần đọc dữ liệu.
- Control cao 40px desktop, 44px mobile. Chữ nội dung 15px, control 14px, chú thích 13px; số liệu có phân cấp 40px/32px.
- Spacing theo chức năng: trang 32px/16px mobile, widget 24px/16px, khoảng khối 24px, nội dung 16px, padding control 12px, icon–chữ 8px, chi tiết 4px. Không tự thêm margin/padding theo cảm giác.
- Widget có góc cắt lõm thật bằng SVG clip-path; dùng chung `useCardSurface`, không che góc bằng khối màu nền. Biến thể ổn định theo định danh.
- Sidebar có tìm kiếm, submenu, chế độ thu gọn và drawer mobile. Topbar có tìm kiếm Ctrl/⌘ K, clear, đổi theme và thông báo; bỏ avatar topbar.
- Card tài khoản cao 64px, nền primary, chữ trắng, avatar xanh chanh. Góc cắt 32px, nút 28px chừa khe 4px. Light: nút navy `#1e3a8a`, mũi tên trắng. Dark: nút xanh nhạt `#dbeafe`, mũi tên navy. Menu mở sang phải, tự tránh tràn trên mobile.
- Thông báo: bố cục gọn theo ảnh tham chiếu; tab chọn và nút chính dùng primary. Toolbar nằm trong hàng thời gian có giữ chỗ, không đè tiêu đề khi hover/focus.
- Scrollbar 6px, mờ, track trong suốt. Dark/light và màn hình 375px là điều kiện nghiệm thu từng bước tích hợp.

## Danh mục component đã duyệt

33 mục dưới đây lấy theo registry gallery, không tính số biến thể/trạng thái thành component riêng.

| Nhóm | Thành phần |
| --- | --- |
| Hành động | Button, Icon button |
| Nhập liệu | Input/Password; Form; Textarea; Select; Combobox; Multi select; Checkbox/Radio; Switch; Range/Number input; Date/Time input; File input |
| Dữ liệu | Badge/Tag; Avatar/Avatar group; Metric/Sparkline; Data table/Pagination; Activity timeline; Card/Panel |
| Điều hướng | Breadcrumb/Tabs; Accordion/Collapsible; Command menu |
| Lớp nổi | Dropdown menu; Popover; Tooltip; Modal/Form; Confirmation dialog; Sheet/Drawer |
| Phản hồi | Thông báo; Progress; Alert; Toast; Empty/Loading/Error; Skeleton |

Bổ sung ngoài registry: shell Sidebar/Topbar và các chart đường, donut, cột theo giờ, lịch trạng thái. Thư viện nền hiện dùng shadcn/Base UI, TanStack Table, Recharts và Sonner. Thao tác nhiều lựa chọn phải dùng component thư viện đã duyệt.

## Hợp đồng tích hợp

1. Dùng lại primitive và component ghép đã có. Tách fixture, localStorage của demo và copy minh họa khỏi dữ liệu thật; UI chung nhận props/callback, nghiệp vụ đi qua adapter của màn hình.
2. Giữ route, quyền truy cập, dữ liệu và thao tác đang có. Revamp được nghiệm thu bằng các luồng thật của từng trang; việc duyệt baseline này xác nhận thiết kế và hành vi minh họa.
3. Đưa token/theme và component dùng chung vào một lớp phù hợp của admin. Không import toàn bộ `main.tsx`, gallery hoặc fixture của preview vào runtime admin.
4. Ưu tiên tái sử dụng `Layout`, Providers và điều hướng hiện tại. Thay giao diện theo từng vùng; không dựng một shell song song làm mất command palette, flash toast, trạng thái sidebar hoặc quyền menu.
5. Mỗi đợt chỉ xử lý một nhóm có thể xem và duyệt riêng. Kiểm tra browser desktop/375px, cả theme, focus/hover và tải lại; có ảnh trước/sau. Chạy các bước kiểm tra mã theo quy định repository; không thêm test tự động.

## Thứ tự revamp

| Đợt | Phạm vi | Điểm tích hợp hiện tại |
| --- | --- | --- |
| 1 | Theme/tokens, layout, sidebar, topbar, tài khoản và thông báo | `resources/js/superadmin/components/Layout.tsx`, `resources/js/admin/components/Providers.tsx`, `resources/js/admin/components/layout/` |
| 2 | Field và form tạo/sửa, modal/drawer | `resources/js/superadmin/resource/Form.tsx`, primitive tại `resources/js/admin/components/ui/` |
| 3 | Danh sách, lọc, bảng, phân trang và trang chi tiết | `resources/js/superadmin/resource/Index.tsx`, `resources/js/superadmin/resource/Show.tsx` |
| 4 | Dashboard, widget và chart với dữ liệu thực | `resources/js/superadmin/dashboard/` |

Các đường dẫn là điểm bắt đầu đối chiếu hiện trạng; phạm vi mỗi đợt cần bám màn hình được chọn. Shell và Tổng quan đã triển khai ở nhánh codex/admin-design-skeleton; commit e6164be3 đã push. Các nhóm màn hình tiếp theo được cập nhật trong admin-revamp-progress.md; chưa merge hoặc deploy.

## Tài liệu chi tiết và bằng chứng

- [Spacing](admin-spacing.md), [Widget/Card](admin-widget-card.md), [Metric](admin-metric-widget.md).
- [Field và Drawer](admin-controls-review.md), [Form và Select](admin-form-controls.md), [Data table](admin-data-table.md).
- [Sidebar và các lần điều chỉnh](admin-sidebar.md), [Thông báo](admin-notifications.md).
- [Ảnh nghiệm thu](admin-preview/): ảnh được ghi theo từng lần duyệt; đối chiếu quyết định mới nhất ở tài liệu này và giá trị hiện tại trong `tokens.ts`.
- [Phân tích mẫu ban đầu](admin-dashboard-preview.md): tài liệu lịch sử, không dùng bảng token cũ trong đó để triển khai.

Các kiểm tra TypeScript, build preview, i18n, Pint và diff đã đạt ở lượt thay đổi mã gần nhất; lượt chốt này chỉ cập nhật tài liệu và trạng thái.

## Chốt font sau khi so sánh trực tiếp

Ngày 23/10/2026, người dùng chốt **Manrope** sau khi thử Manrope, Be Vietnam Pro, Plus Jakarta Sans và Inter trong gallery component. Manrope là font được duyệt cho bộ component; các font khác chỉ còn để đối chiếu. Không đổi màu, kích thước hoặc spacing. Phạm vi lượt chốt này là component preview; áp dụng vào admin thật khi tích hợp từng màn. File font và OFL ở `resources/fonts/manrope/`.

### Phạm vi Manrope được mở rộng khi triển khai

Người dùng đã yêu cầu áp dụng font cho toàn dashboard admin. Nguồn font chung chuyển sang `resources/css/admin/typography.css`; không chỉ giới hạn ở component preview nữa. Các bề mặt dùng `--admin-font-family`, không sao chép khai báo font theo trang.

### Tinh gọn KPI và vị trí tooltip theo phản hồi triển khai

Người dùng yêu cầu giảm cỡ số và khoảng trống của card, tránh đè nội dung. KPI dùng token text-metric-compact 32px, số giữa donut dùng text-metric-mobile-compact 24px; MetricCard dùng cutout 40px từ control-height, icon widget-icon-size 36px, khoảng cách từ token sẵn có. WidgetCard thường giữ góc cắt mặc định. Tooltip donut nổi ngoài vòng chart ở bên phải, mobile tự tránh tràn; dùng portal để không bị các card khác che.

Component thống kê phụ ChartInsights đã được duyệt và áp dụng; xem quyết định bổ sung bên dưới.

### Đổi bộ icon theo yêu cầu người dùng

Dashboard và gallery dùng Reicon Outline, nguồn ánh xạ duy nhất tại `resources/js/admin/components/icons.tsx`. Toàn bộ import React của dashboard đi qua module này; không còn phụ thuộc lucide-react. Kích thước và màu vẫn theo token đã duyệt.

## Thống kê phụ của chart (đã duyệt 23/10/2026)

ChartInsights dùng một khối viền Panel với hai cột và đường chia, nhãn/icon trung tính 13px, giá trị 15px; mobile xếp dọc. Dùng token V1 sẵn có. Runtime Tin nhắn theo ngày dùng cùng component và CSS với gallery, truyền dữ liệu thật và bản dịch từ adapter.

## Màn đăng nhập và 2FA (đã duyệt 23/10/2026)

Người dùng chốt cả bản sáng và tối sau khi cung cấp ảnh tham chiếu: form gọn ở giữa, nền có bốn nhánh mạch, primary xanh V1; các bề mặt sáng giữ màu trắng. Không thêm token. AuthStage chứa nền mạch và stylesheet dùng chung; AuthPanel chứa khung nội dung; form đăng nhập của gallery chính là LoginForm được runtime dùng. Runtime lấy logo/tên cài đặt và bản dịch thật, màn 2FA giữ các bước nhập OTP và mã dự phòng.
