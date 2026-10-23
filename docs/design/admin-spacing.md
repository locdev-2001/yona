# Spacing dashboard admin — đã chốt

> Đã duyệt cùng toàn bộ components và tokens ngày 23/10/2026. [Baseline UI admin v1](admin-design-baseline.md) là nguồn chốt; nội dung các lượt duyệt bên dưới được giữ làm lịch sử.

Ngày: 22/10/2026. Nhánh: `codex/admin-design-skeleton`.

Lượt này chỉ chuẩn hóa spacing trong preview, theo quy trình duyệt từng thành phần cùng chủ dự án. Các component khác vẫn là bản nháp.

## Nguồn duy nhất

`resources/js/superadmin/design-preview/tokens.ts` khai báo `spacingValues`, xuất CSS qua `spacingTokens` và cung cấp số cho Recharts qua `spacingPixels()`. Nhãn token mô tả chức năng, không đặt theo thứ tự kích thước.

| Vai trò | Token | Desktop | Điện thoại |
|---|---|---:|---:|
| Lề trong trang | `page-padding`, `page-padding-mobile` | 32px | 16px |
| Khoảng giữa các khối | `section-gap` | 24px | 24px |
| Lề trong widget | `widget-padding`, `widget-padding-mobile` | 24px | 16px |
| Khoảng giữa nội dung | `widget-content-gap` | 16px | 16px |
| Lề trong control | `control-padding` | 12px | 12px |
| Khoảng icon và nhãn | `control-gap` | 8px | 8px |
| Khoảng chi tiết phụ | `detail-gap` | 4px | 4px |
| Mép vùng chart | `chart-inset`, `chart-inset-mobile` | 24px | 16px |

`chart-inset` và `widget-padding` dùng cùng giá trị nguồn; khi đổi lề widget thì mép chart đổi cùng. Breakpoint điện thoại hiện là 760px.

## Quy tắc áp dụng

- Margin, padding, gap trong CSS preview chỉ dùng token, `0`, `auto` hoặc phép tính từ token.
- Tiêu đề, số liệu, legend và vùng chart dùng cùng mép trái/phải trong widget.
- Chart không còn offset âm bên trái. Khoảng bên trong Recharts dùng `spacingPixels()` từ nguồn chung.
- Trong widget, khoảng giữa từng vùng nội dung là 16px. Khoảng chi tiết trong control là 8px hoặc 4px theo vai trò.
- Khi duyệt từng component tiếp theo, khoảng cách phải bám bộ token này; không thêm giá trị riêng theo cảm giác.

## Bằng chứng

Đã kiểm tra trực tiếp trên UI:

- Desktop 1440px: mép trái/phải của header, số liệu, legend, chart đều **24px**; đáy chart **24px**.
- Điện thoại 375px: các mép tương ứng đều **16px**, không tràn ngang toàn trang.
- Không còn khai báo margin/padding/gap bằng `px`, `rem`, `em` rời trong CSS nguồn của preview.
- TypeScript, build preview, i18n-check và kiểm tra khoảng trắng đều đạt.

[Ảnh trước](admin-preview/spacing-before-desktop.png) · [Ảnh desktop sau chỉnh](admin-preview/spacing-chart-desktop.png) · [Ảnh 375px](admin-preview/spacing-after-mobile.png).

Trạng thái: **người dùng đã chốt spacing ngày 22/10/2026**. Bộ spacing này là chuẩn dùng chung cho các lượt tiếp theo. Thành phần tiếp theo cần duyệt riêng: Widget/Card.
