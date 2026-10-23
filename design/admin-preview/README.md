# Bản xem trước UI admin Yona

**Đã chốt components và tokens v1 ngày 23/10/2026.** Nguồn chuẩn cho đợt revamp: [Baseline UI admin](../../docs/design/admin-design-baseline.md).

Chạy tại gốc checkout thiết kế:

```bash
node node_modules/vite/bin/vite.js --config vite.admin-preview.config.js
```

Địa chỉ: [Bản xem trước](http://127.0.0.1:8620/design/admin-preview/index.html). Chỉ chạy một server trên cổng 8620; dùng tiến trình hiện tại nếu đã có.

Nguồn token: [tokens.ts](../../resources/js/superadmin/design-preview/tokens.ts). Registry component: [gallery.tsx](../../resources/js/superadmin/design-preview/gallery.tsx). Bản xem trước có dữ liệu minh họa và trạng thái local; khi tích hợp admin dùng props/callback với dữ liệu thật theo từng màn hình.
