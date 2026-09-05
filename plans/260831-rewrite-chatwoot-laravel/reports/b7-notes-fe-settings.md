# B7 Labels — ghi chú agent `b7-fe-settings` (trang Settings → Labels + chip nhãn dùng chung)

Ngày: 06/09/2026. Nguồn: `refs/chatwoot` v4.17.1 (không mở `enterprise/`).

## Bảng trace Vue → TSX

| Vue / JS gốc | React | Ghi chú |
|---|---|---|
| `settings/labels/Index.vue` | `resources/js/dashboard/settings/labels/Index.tsx` | Danh sách qua `getJson` thay vuex `labels/get`; giữ `picoSearch` với trọng số `title: 4`; giữ sắp xếp `title.localeCompare` của action gốc |
| `settings/labels/AddLabel.vue` | `settings/labels/AddLabel.tsx` | Gọi API + toast; màu khởi tạo `getRandomColor()`; `prefillTitle` giữ nguyên cho nơi gọi ở nhóm hội thoại |
| `settings/labels/EditLabel.vue` | `settings/labels/EditLabel.tsx` | Gọi API + toast, tiêu đề `Edit label - {title}` |
| (khối form lặp trong 2 file trên) | `settings/labels/LabelForm.tsx` | Hai file gốc chép nguyên khối form; gom một chỗ, DOM/class giữ nguyên 100% |
| `settings/labels/validations.js` | `settings/labels/validations.ts` + `validations.test.ts` | Xem "Khác biệt có chủ đích" #1 |
| `helper/labelColor.js` | `helper/labelColor.ts` | `getRandomColor` nguyên văn |
| `components/widgets/ColorPicker.vue` + `Chrome/Saturation/Hue/EditableInput` của `@lk77/vue3-color@3.0.6` | `components/widgets/ColorPicker.tsx` + `ColorPicker.scss` | Thư viện chỉ có bản Vue → viết lại bằng React, **giữ nguyên DOM/class/CSS `vc-*`** (CSS chép từ dist của đúng bản 3.0.6) |
| `tinycolor2` (phụ thuộc của vue3-color) | `helper/colorHelper.ts` + `colorHelper.test.ts` | Chỉ phần đổi hệ màu picker cần: hex↔rgb, rgb↔hsl/hsv, hsv/hsl→rgb, `colorChange` = `_colorChange` của mixin |
| `components-next/label/Label.vue` | `components-next/label/Label.tsx` | Mở rộng: `label` nhận **chuỗi hoặc object** `{title, description, color}`; nhận `className` + attr tự do (`data-label`) để `CardLabelsV5` dùng lại; thêm slot `action` |
| `i18n/locale/en/labelsMgmt.json` | `lang/en/label_mgmt.php` (+ `artisan i18n:generate`) | Bỏ nhánh `SUGGESTIONS` (gợi ý nhãn = Captain/EE) |
| `labels.routes.js` | `routes/web.php` (2 dòng, `account.role:administrator`) | `/settings/labels` → redirect `/settings/labels/list`, tên route `settings_labels_list` |
| `menuItems.ts` | — | Mục "Settings Labels" đã trỏ sẵn `settings/labels/list`, không phải sửa |

Component tái sử dụng đã có (không viết lại): `SettingsWrapper`/`SettingsLayout`/`BaseSettingsHeader`, `BaseTable*`, `Modal`/`ModalHeader`/`DeleteModal`, `Button`, `WootInput`.

## Contract backend đã nối (khớp `b7-notes-be.md`)

- `GET /api/v1/accounts/{id}/labels` → `{"payload": [...]}`
- `POST /labels`, `PATCH /labels/{id}` → body **phẳng** `{title, description, color, show_on_sidebar}` (đúng `LabelsAPI` gốc; backend cũng nhận dạng bọc `{label:{…}}`), trả về `Label` trần
- `DELETE /labels/{id}` → **200 body rỗng** (`head :ok` của Rails)

## Khác biệt có chủ đích so bản gốc

1. **`validLabelCharacters` chặt hơn.** Bản gốc chỉ kiểm "không chứa dấu cách" trong khi thông báo lỗi lại nói "Only Alphabets, Numbers, Hyphen and Underscore are allowed". Bản port dùng thẳng regex của model (`lib/regex_helper.rb`: `\A[\p{L}\p{N}]+[\p{L}\p{N}_-]+\z`) nên nút Create/Edit tắt đúng với thứ backend sẽ từ chối, thay vì để người dùng ăn 422. Thứ tự thông báo giữ nguyên: required → minLength(2) → ký tự.
2. **`AddLabel.vue`/`EditLabel.vue` gộp thân form** thành `LabelForm.tsx` (DRY) — DOM xuất ra không đổi.
3. **Ô nhập trong picker không có `data-testid`**; `woot-input` của Vue cho attr rơi xuống thẻ gốc, `WootInput.tsx` chưa hỗ trợ và file đó nằm ngoài phạm vi tính năng này. Playwright chọn theo thứ tự input trong `.modal-container`.
4. **`labelId` của EditableInput dùng `useId()` của React** thay `Math.random()` — chỉ khác chuỗi `aria-labelledby`, không ảnh hưởng hiển thị.
5. **Bỏ `throttle` 20ms của vùng saturation** (lodash trong bản gốc): React cập nhật nhiều lần hơn khi kéo, kết quả màu giống hệt.
6. **`Alpha`/`Checkboard` không port** — `ColorPicker.vue` luôn truyền `disable-alpha`, hai nhánh đó không bao giờ render.

## Bẫy đã vấp (đo mới sửa, không đoán)

| Triệu chứng | Nguyên nhân | Sửa |
|---|---|---|
| Picker lệch pixel: bo góc 2px thay 4px, đổ bóng của thư viện thay `shadow-lg` | Bản gốc là **style scoped** (`.colorpicker--chrome.vc-chrome[data-v-x]`) nên thắng CSS thư viện. Bản port ban đầu để các lớp Tailwind trên `className` — cùng độ đặc hiệu 0-1-0 với `.vc-chrome`, mà `ColorPicker.scss` được nạp **sau** utilities nên `.vc-chrome` thắng | Chuyển khối ghi đè vào `ColorPicker.scss` dưới selector đôi `.colorpicker--chrome.vc-chrome { @apply … }` — đúng cách bản gốc làm. Đo lại: `border-radius`/`box-shadow` trùng khít oracle |
| `DELETE /labels/{id}` báo lỗi ở FE dù xóa thành công | Controller trả `head :ok` (200, body rỗng) đúng gốc, còn `apiClient.request` gọi thẳng `response.json()` → ném `SyntaxError`. Các controller trước (teams/agents) né bằng cách trả `{"message":"ok"}` | `helper/apiClient.ts`: đọc `response.text()` rồi chỉ `JSON.parse` khi có nội dung. **Đây là sửa ngoài danh sách file được giao** — nhưng là chỗ duy nhất đúng để sửa (DRY), và mọi endpoint kiểu `head :ok` sau này đều cần |
| Không đóng được picker bằng cách bấm ra chỗ trống trong modal | **Bản gốc cũng vậy**: `Modal.vue` gắn `@mousedown="event => event.stopPropagation()"` trên `.modal-container` nên `v-on-clickaway` (listener ở document) không nhận được sự kiện. Đã kiểm chứng trên oracle: phải bấm lại ô màu mới đóng | Giữ nguyên hành vi gốc; clickaway của bản port chỉ loại trừ cả cụm `.colorpicker` (bấm ô màu = toggle, không lật qua lật lại) |
| Ô nhập trong picker bị style input toàn cục đè | Không xảy ra: `$form-input-selector` của `_base.scss` là `input[type]…`, mà `.vc-input__input` **không đặt `type`** — đừng thêm `type="text"` vào đó |

## Kiểm chứng

- `npx tsc --noEmit`: 0 lỗi ở file của tính năng này (16 dòng lỗi còn lại thuộc `components-next/message/**` + `components/widgets/conversation/**` của agent khác đang làm dở, do `@chatwoot/utils` chưa cập nhật).
- `npm run build` xanh; `npm test` 21 file / 163 test xanh (thêm 36 test: `validations.test.ts` 12, `colorHelper.test.ts` 24). `pint` sạch.
- **E2E trình duyệt** (`~/www/pixel-diff/b7-labels-e2e.mjs`, yona :8000 account 2, john@acme.inc): tạo → sửa → validate → xóa đều chạy thật. Ghi nhận: gõ `B7-KiemThu` lưu thành `b7-kiemthu`; gõ hex `#1F93FF` trong picker cập nhật đúng ô màu; tiêu đề modal sửa `Edit label - b7-kiemthu`; `show_on_sidebar` tắt được giữ khi mở lại; gõ tên có dấu cách hiện đúng "Only Alphabets, Numbers, Hyphen and Underscore are allowed" và tắt nút Create; modal xóa đúng câu chữ; xóa xong về trạng thái rỗng. Lỗi console duy nhất: `409 POST /app/login` = Inertia asset-version reload sau khi build lại, không liên quan.
- **Pixel-diff** (`b7-labels-diff.mjs`, oracle :3000 account 1 vs yona :8000 account 2, ngưỡng 0.1%, 1280×800, light+dark, cùng 2 nhãn cố định tạo qua UI ở cả hai bên): **10/10 ĐẠT** — list 0.030/0.030% · edit modal 0.039/0.031% · delete modal 0.039/0.031% · add modal 0.039/0.031% · picker mở 0.039/0.031%. Toàn bộ phần lệch là logo Yona + icon sidebar (nền chung của mọi màn đã đo từ A3).
- **Audit nút** (`audit-buttons.mjs /settings/labels/list`): 3 nút hiển thị (Add label, sửa, xóa) — cả hai bên đều `OK` với cùng `Δel` (27 / 26 / 13). Nút trong modal + nút đổi hệ màu của picker kiểm riêng bằng `b7-picker-toggle.mjs`: chuỗi hex → r/g/b → h/s/l và nút × đóng modal cho kết quả **giống hệt từng ký tự** giữa hai bên (`hex=#1F93FF` → `r=31,g=147,b=255` → `h=209,s=100%,l=56%`).
- **Đã dọn sạch nhãn test ở CẢ HAI bên** sau khi đo (`b7-labels-fixture.mjs … remove`, `Label::count() = 0` ở `yona_rw`, danh sách oracle rỗng).

Script để lại trong `~/www/pixel-diff/`: `b7-labels-e2e.mjs`, `b7-labels-diff.mjs`, `b7-labels-fixture.mjs`, `b7-picker-probe.mjs`, `b7-picker-toggle.mjs`, `b7-labels-probe.mjs`.
