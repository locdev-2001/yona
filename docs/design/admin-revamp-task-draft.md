# Task revamp UI admin — đã ghi trên dash

Ngày 23/10/2026. Đã cập nhật task có sẵn [Revamp UI admin theo components và tokens v1 đã duyệt (#168)](https://dash.yona.vn/admin/tasks/view/168), tên cũ “Nâng cấp toàn bộ UI dashboard Super Admin”; không tạo task trùng. Trạng thái Chưa bắt đầu, ưu tiên Bình thường, dự án Yona, Nguyen Robert đã được gán. Có 7 checklist V1 và 6 tệp đính kèm: baseline TXT, gói mã ZIP, 4 ảnh. Đã tải lại task để xác nhận lưu thành công.

## Thông tin đã ghi

- Tên: **Revamp UI admin theo bộ components và tokens v1 đã duyệt**
- Trạng thái: Chưa bắt đầu.
- Ưu tiên: Bình thường.
- Người thực hiện: Nguyen Robert; giữ những người đã có trên task.
- Ngày bắt đầu: giữ ngày 02/10/2026 của task cũ. Không đặt thêm hạn.
- Thẻ: optimize, ux ui, module:platform (giữ thẻ hiện có).
- Dự án: Yona (#1).

## Mô tả

**Hiện trạng:** Người dùng đã chốt toàn bộ components và tokens UI admin v1 ngày 23/10/2026. Cần đưa bộ thiết kế đã duyệt vào UI admin thật theo từng đợt, giữ nghiệp vụ và quyền truy cập hiện có.

**Bằng chứng:** Nhánh `codex/admin-design-skeleton`; baseline tại `docs/design/admin-design-baseline.md`. Nguồn token duy nhất: `resources/js/superadmin/design-preview/tokens.ts`. Registry 33 mục component: `resources/js/superadmin/design-preview/gallery.tsx`. Bản preview đã kiểm tra desktop/375px, light/dark, có ảnh tại `docs/design/admin-preview/`.

**Mục tiêu:** Đồng nhất thiết kế trên admin, tránh từng trang tự đặt màu/kích thước/spacing; dùng lại component để giảm sửa lặp và lỗi bố cục.

**Quyết định đã chốt:** Inter, Lucide React; primary #2563eb; nền trắng ở light, tối ấm ở dark; màu solid tươi cho chart/widget/badge; control bo 6px, widget/card/drawer bo 20px; spacing theo chức năng. Sidebar có submenu, thu gọn; thông báo theo mẫu; input có clear. Card tài khoản primary, nút navy #1e3a8a ở light, xanh nhạt #dbeafe/mũi tên navy ở dark. Chi tiết theo baseline, không tự đổi thiết kế khi tích hợp.

**Việc cần làm / checklist:**

- [ ] Đối chiếu trang và luồng admin hiện có với baseline; xác định lớp ánh xạ token/component dùng chung.
- [ ] Đợt 1: tokens/theme, layout, sidebar, topbar, tài khoản và thông báo; giữ command palette, flash toast, quyền menu và trạng thái điều hướng.
- [ ] Đợt 2: field/form tạo–sửa, Select/Combobox/Multi select, file/range, modal và drawer.
- [ ] Đợt 3: trang danh sách/chi tiết, bộ lọc, data table, tùy chỉnh cột và phân trang với dữ liệu thật.
- [ ] Đợt 4: dashboard, widget và chart với dữ liệu thật.
- [ ] Nghiệm thu từng đợt trên desktop và 375px, light/dark, hover/focus, bàn phím, reload; đính kèm ảnh trước/sau và cập nhật tiến độ.
- [ ] Hoàn tất kiểm tra TypeScript, build phù hợp, i18n, Pint và diff theo repository; không thêm test tự động.

**Điều kiện hoàn thành:** Cả bốn đợt đã tích hợp và được nghiệm thu trên admin thật. Token có một nguồn sửa; fixture/localStorage demo không lẫn vào runtime. Không còn chồng lấn input, toolbar thông báo hay góc cắt tài khoản. Chỉ chuyển Đã hoàn thành khi có bằng chứng nghiệm thu; merge/push/deploy theo chỉ định riêng.

## Bằng chứng đính kèm khi tạo

Baseline v1 và ảnh trong `docs/design/admin-preview/`: `account-palette-light.png`, `account-palette-dark.png`, `notifications-hover-fix-light.png`, `account-palette-mobile.png`.

MCP trả HTTP 403 nên lần ghi này dùng giao diện dash sau khi người dùng đăng nhập. Đã xác nhận task, checklist và tệp sau tải lại; ảnh bằng chứng: docs/design/admin-preview/admin-revamp-task-recorded.png. Nội dung bên dưới là bản bàn giao; công việc chính thức được theo dõi trên dash.
