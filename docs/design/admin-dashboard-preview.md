# Bản thử nghiệm dashboard admin Yona

> Tài liệu phân tích lịch sử. Các bảng token và mô tả ban đầu bên dưới đã được điều chỉnh trong quá trình duyệt; triển khai theo [Baseline UI admin v1 đã chốt ngày 23/10/2026](admin-design-baseline.md) và `tokens.ts` hiện tại.

Ngày cập nhật: 22/10/2026. Nhánh: `codex/admin-design-skeleton`.

## Nguồn tham chiếu và mức độ chính xác

[Out of Dark – Customer journey, Martin Strba](https://dribbble.com/shots/24328826-Out-of-Dark-Customer-journey) là nguồn tham chiếu thị giác. Đã xem trực tiếp video trên Dribbble, gồm dashboard tối, bảng chỉ số và panel công việc. Trang giới thiệu cho biết thiết kế dùng Figma tokens và một thư viện React được tùy chỉnh.

Dribbble không cung cấp file thiết kế gốc. Màu, font, khoảng cách và kích thước trong báo cáo này là đề xuất được suy ra từ hình/video, sau đó điều chỉnh theo lựa chọn của chủ dự án; không phải token gốc được trích xuất chính xác từ Figma.

## Phân tích thiết kế mẫu

**Bố cục:** thanh điều hướng bên trái giữ ngữ cảnh, thanh công cụ phía trên quản lý tìm kiếm và bộ lọc. Nội dung chia lưới; khu vực số liệu chiếm phần lớn bề ngang, công việc cần chú ý nằm ở cột phụ. Điều này giúp đọc từ tổng quan đến hành động.

**Phân cấp bề mặt:** nền gần đen, panel tối nhỉnh hơn nền, lớp điều khiển sáng hơn panel. Viền rất mảnh và bóng nhẹ giữ nhiều thông tin trên cùng trang mà không tạo cảm giác mỗi phần là một khối nổi độc lập.

**Typography:** sans-serif trung tính; nhãn phụ nhỏ, số liệu lớn hơn, độ đậm vừa phải. Số liệu có bề rộng ổn định giúp so sánh nhanh. Không thể xác nhận chính xác font của mẫu chỉ từ video.

**Màu:** phần lớn giao diện là màu trung tính. Xanh ngọc, tím, hồng và vàng tập trung ở biểu đồ, biến động và mức ưu tiên. Màu làm nổi dữ liệu hơn là trang trí toàn khung.

**Biểu đồ:** sparkline cạnh số liệu làm rõ xu hướng mà không cần mở báo cáo; đường và màu phân biệt các chuỗi. Bảng số liệu giữ vai trò tra cứu chi tiết. Panel công việc đưa hành động liên quan về cùng ngữ cảnh với số liệu.

**Điểm cần điều chỉnh cho Yona:** chữ trong mẫu khá nhỏ khi thu hẹp màn hình; cần tăng độ rõ của nhãn, bổ sung thao tác chạm và trạng thái rỗng. Màu cảnh báo phải đi cùng nhãn, không chỉ có màu. Cần tạo bố cục riêng cho điện thoại thay vì thu nhỏ toàn bộ màn hình desktop.

## Hướng thiết kế đã chốt

- Inter lấy từ font có sẵn trong repository; icon dùng Lucide React.
- Màu xanh là nhận diện chủ đạo: `action-primary` áp dụng cho logo thử nghiệm, lựa chọn, focus và nút chính.
- Màu solid cho trạng thái, badge và biểu đồ. Xanh lá cho tích cực, vàng cho cần chú ý, đỏ cho gián đoạn; tím phân loại hệ thống. Không dùng gradient.
- Bo góc control, panel, badge và đầu cột chart theo token 6px. Avatar, donut và chấm trạng thái giữ hình tròn theo chức năng.
- Panel và thẻ chỉ số không có viền. Giữ đường phân cách ở thanh công cụ, bảng và một số nhóm nội dung để định hướng.
- Ưu tiên chart: đường nhiều kênh, donut phân bổ, cột theo giờ, lịch trạng thái hệ thống; bảng chi tiết nằm dưới.
- Có dark/light mode, cùng cấu trúc và cùng token ngữ nghĩa.

## Token màu theo chức năng

Nguồn duy nhất: `resources/js/superadmin/design-preview/tokens.ts`. Tiền tố CSS là `--preview-`. Đổi một màu tại đây sẽ cập nhật UI và bảng swatch trong trang Design token.

| Token | Chức năng | Tối | Sáng |
|---|---|---|---|
| `surface-canvas` | Nền ứng dụng | `#0C0E12` | `#F3F5F8` |
| `surface-navigation` | Thanh điều hướng | `#101318` | `#FFFFFF` |
| `surface-panel` | Bề mặt khối | `#15181E` | `#FFFFFF` |
| `surface-control` | Bề mặt nổi | `#20242D` | `#ECEEEF` |
| `border-divider` | Đường phân cách | `#25292F` | `#E4E7EC` |
| `text-primary` | Chữ chính | `#F1F2F3` | `#191C20` |
| `text-secondary` | Chữ phụ | `#9B9FA7` | `#5F6670` |
| `action-primary` | Hành động chính · màu chủ đạo | `#2563EB` | `#2563EB` |
| `status-success-foreground` | Chữ trạng thái tích cực | `#50C6A2` | `#187B60` |
| `status-danger-foreground` | Chữ trạng thái lỗi | `#EC819B` | `#B33356` |
| `chart-connections` | Biểu đồ · kết nối | `#A799ED` | `#6E56B6` |
| `chart-volume` | Biểu đồ · lưu lượng | `#65B8FF` | `#3279D9` |
| `chart-peak` | Biểu đồ · cao điểm | `#FFAB66` | `#CF721C` |
| `status-success-background` | Nền trạng thái tích cực | `#237B62` | `#197452` |
| `status-danger-background` | Nền trạng thái lỗi | `#BB3F5C` | `#BA3453` |
| `category-system-background` | Nền phân loại | `#7359BC` | `#7153B8` |
| `text-on-status` | Chữ trên nền màu | `#FFFFFF` | `#FFFFFF` |
| `text-on-action` | Chữ trên nút chính | `#FFFFFF` | `#FFFFFF` |
| `status-warning-background` | Nền trạng thái cần chú ý | `#EFC35A` | `#F2C34D` |
| `status-warning-foreground` | Chữ trạng thái cần chú ý | `#EFC35A` | `#95660C` |
| `avatar-background` | Nền ảnh đại diện | `#C8D5E8` | `#D4E1F5` |
| `avatar-foreground` | Chữ ảnh đại diện | `#24364E` | `#24364E` |
| `text-on-warning` | Chữ trên badge cần chú ý | `#36270C` | `#36270C` |

Không đặt tên kiểu `blue-500`, `gray-900`, `size-2`. `toneTokens` nối trạng thái/ngữ cảnh của component với token màu. Các tên chuỗi dữ liệu, số liệu và trạng thái nằm trong fixture của bản xem trước.

## Token kích thước theo chức năng

Các kích thước thiết kế cũng có cùng một nguồn tại `tokens.ts`. Hệ khoảng cách dùng nhịp 4/8/12/16/20/24/32px nhưng được đặt tên theo vai trò sử dụng.

| Token | Giá trị |
|---|---|
| `page-gutter` | 32px |
| `page-gutter-mobile` | 16px |
| `section-gap` | 20px |
| `section-padding` | 24px |
| `content-gap` | 16px |
| `element-gap` | 8px |
| `indicator-gap` | 4px |
| `navigation-width` | 224px |
| `navigation-drawer-width` | 252px |
| `navigation-item-height` | 40px |
| `topbar-height` | 64px |
| `control-height` | 36px |
| `control-height-touch` | 44px |
| `control-padding-inline` | 12px |
| `control-radius` | 6px |
| `panel-padding` | 20px |
| `panel-radius` | 6px |
| `metric-card-height` | 144px |
| `badge-height` | 24px |
| `badge-radius` | 6px |
| `badge-padding-inline` | 8px |
| `avatar-size` | 32px |
| `avatar-size-compact` | 28px |
| `icon-control` | 16px |
| `icon-navigation` | 18px |
| `icon-inline` | 14px |
| `icon-illustration` | 24px |
| `selection-indicator-size` | 16px |
| `chart-height` | 240px |
| `chart-hourly-height` | 190px |
| `chart-donut-size` | 144px |
| `chart-donut-size-mobile` | 124px |
| `chart-axis-width` | 48px |
| `chart-bar-radius` | 6px |
| `text-caption` | 11px |
| `text-control` | 12px |
| `text-body` | 13px |
| `text-section-title` | 15px |
| `text-page-title` | 26px |
| `text-metric` | 28px |
| `text-chart-axis` | 11px |
| `body-line-height` | 1.6 |
| `heading-line-height` | 1.3 |
| `motion-duration` | 160ms |

Button, input và segmented control dùng `control-height` 36px trên máy tính; dùng `control-height-touch` 44px trên điện thoại. Badge dùng 24px. Icon điều khiển dùng 16px, điều hướng 18px, icon nằm trong dòng phụ 14px. Tiêu đề trang 26px, tiêu đề khối 15px, chỉ số 28px. Nội dung control 12px và nội dung chính 13px.

Các con số tọa độ nội bộ của SVG, trục biểu đồ và giá trị dữ liệu không phải kích thước component. Breakpoint là quy tắc responsive; token thể hiện kích thước của từng vai trò.

## Component dùng chung

| Component | Vai trò / API chính | Trạng thái |
|---|---|---|
| `PreviewButton` | Bọc primitive Button hiện có; `appearance`: primary / secondary / ghost | Mặc định, hover, focus, disabled |
| `Panel` | Khung nội dung; `title`, `description`, `action`, `children` | Co giãn theo lưới |
| `StatusBadge` | Nhãn trạng thái; `tone`, `children` | Tích cực, cảnh báo, lỗi, phân loại |
| `SegmentedControl` | Lựa chọn loại trừ nhau; `options`, `value`, `onChange`, `getLabel` | Chọn, bỏ chọn, focus |
| `MetricCard` | Nhãn, chỉ số, biến động và sparkline | Dữ liệu minh họa / ẩn |
| `Sparkline` | Biểu đồ đường gọn cho thẻ và bảng | Nhiều tone, nét solid |
| `TaskRow` | Công việc có checkbox, phân loại và mô tả | Chưa xem / đã xem |
| `SkeletonBlock` | Giữ vùng trống có kích thước khi tải | Tĩnh, không hiệu ứng nhấp nháy |
| `TrafficChart` | Đường nhiều kênh; `period` | Tooltip, ẩn/hiện chuỗi, đổi kỳ |
| `ChannelDistribution` | Donut và chú giải theo kênh | Tooltip |
| `ActivityCharts` | Cột theo giờ và lịch sức khỏe | Dữ liệu / skeleton |

Component chỉ nhận props; fixture nằm riêng, token nằm riêng. Nội dung hiển thị nằm tại `lang/vi/admin_design_preview.json`. Preview có entry và cấu hình Vite riêng. Khi đưa vào admin thật, dùng các component này để thay phần trình bày của widget hiện có và nối dữ liệu từ endpoint hiện tại.

## Bố cục và tương tác

Trên desktop: sidebar 224px; nội dung gồm 4 thẻ chỉ số, 2 hàng biểu đồ, bảng kết nối và panel công việc. Trên điện thoại 375px: sidebar thành ngăn trượt, thẻ chỉ số chia 2 cột, chart xếp dọc. Bảng cuộn bên trong vùng bảng.

Các tương tác minh họa: đổi kỳ 7/30/90 ngày; bật/tắt chuỗi trên chart; lọc kênh và trạng thái rỗng; ẩn/hiện thẻ; đánh dấu công việc; đổi sáng/tối; xuất bảng CSV minh họa; mở hướng dẫn. Kỳ thống kê, thẻ đang ẩn, công việc đã xem và theme được lưu khi tải lại.

Nút Xem skeleton hiển thị bố cục tải của thẻ số liệu và các chart. Bộ component cho phép thử nút, lựa chọn và trạng thái; Design token hiển thị swatch cùng giá trị kích thước từ nguồn mã hiện hành.

Các mục Người dùng/Hộp thư trong sidebar hiện là điều hướng minh họa đến vùng dữ liệu trong trang. Đây là trang để duyệt thiết kế, dùng dữ liệu mẫu.

## Chạy và build

Tại worktree của nhánh:

```bash
node node_modules/vite/bin/vite.js --config vite.admin-preview.config.js
```

Mở [bản xem trước](http://127.0.0.1:8620/design/admin-preview/index.html).

```bash
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build --config vite.admin-preview.config.js
```

Bản build riêng nằm tại `dist/admin-preview/`. Biểu đồ tải trong chunk riêng; file preview không tham gia entry production của admin. Dùng dependency hiện có, không thêm package.

## Nghiệm thu

- TypeScript: đạt.
- Build preview: đạt; biểu đồ được tách chunk.
- Build ứng dụng hiện có và SDK: đạt; còn cảnh báo Sass và kích thước chunk trong phần mã hiện hành.
- `i18n:generate --check`: đạt. Không thay đổi PHP nên không có tệp PHP cần Pint.
- Đã dùng UI thật: đổi kỳ, lọc ra trạng thái không có kết quả rồi xóa lọc, đánh dấu công việc, tùy chỉnh ẩn thẻ, khôi phục bố cục, đổi theme và mở/đóng menu điện thoại.
- Đã tải lại và xác nhận: kỳ 30 ngày, 3 thẻ hiển thị và công việc đã xem còn được giữ.
- Đã đối chiếu computed style trên desktop: Inter, tiêu đề 26px, icon control 16px, control 36px, badge 24px, padding panel 20px, radius panel 6px, viền panel 0px, màu chủ đạo `#2563EB`.
- 375px: control đo được 44px, chiều rộng trang 375px, không tràn ngang toàn trang.

Ảnh trước là bản phác thảo đầu tiên để đối chiếu các lựa chọn mới. Admin local ở cổng 8610 không truy cập được lúc kiểm tra; ảnh `baseline-unavailable.png` ghi lại giới hạn này, không được xem là ảnh baseline admin đã nghiệm thu.

| Ảnh | Nội dung |
|---|---|
| [Bản đầu](admin-preview/before-direction.png) | Trước khi chốt Inter, màu xanh, bo 6px và token kích thước theo chức năng |
| [Desktop tối](admin-preview/desktop-dark.png) | Bản cuối |
| [Desktop sáng](admin-preview/desktop-light.png) | Bản cuối |
| [Điện thoại tối](admin-preview/mobile-dark.png) | 375px |
| [Điện thoại sáng](admin-preview/mobile-light.png) | 375px |
| [Component](admin-preview/components.png) | Thư viện dùng chung |
| [Token](admin-preview/tokens.png) | Màu và kích thước |
| [Skeleton](admin-preview/skeleton.png) | Bố cục đang tải |
