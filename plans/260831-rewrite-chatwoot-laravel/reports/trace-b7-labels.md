# Trace B7 — Labels

Ngày: 06/09/2026. Phiên đơn `yona-6d` (QA + e2e) + 3 agent song song, chạy **cùng lúc với B9 Attachments**. Bảng trace chi tiết trong 3 note:

| Vùng | Ghi chú | Nội dung |
|---|---|---|
| Backend | [b7-notes-be.md](b7-notes-be.md) | bảng `labels` + `taggings`, `Label`, trait `Labelable`, job/service đổi tên và xóa nhãn, 9 route, nhánh nhãn trong `BulkActionsJob` |
| Settings | [b7-notes-fe-settings.md](b7-notes-fe-settings.md) | màn Settings › Labels (bảng, modal tạo/sửa/xóa), `ColorPicker` port từ `@lk77/vue3-color`, chip `components-next/label` |
| Hội thoại | [b7-notes-fe-conversation.md](b7-notes-fe-conversation.md) | LabelBox trong panel, nhãn trên thẻ, nhóm Labels ở sidebar + lọc theo nhãn, 2 nút nhãn trong thanh bulk |

## Kiến trúc chốt

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| gem `acts_as_taggable_on` (`tags` + `taggings` toàn cục) | bảng **`taggings`** riêng: `account_id`, `label_id` (khóa ngoại thật), morph `taggable`, unique `(label_id, taggable_type, taggable_id)` | quyết định trong plan; hệ quả: **chỉ gắn được nhãn đã tồn tại trong account** (gốc tạo tag tự do) — UI gốc cũng chỉ cho chọn từ danh sách nên đường người dùng không đổi |
| `Labelable` (`update_labels`, `add_labels`) | trait `App\Models\Concerns\Labelable` | nguồn DUY NHẤT của logic gán nhãn cho Conversation lẫn Contact; Conversation override seam `labelListChanged()` để đồng bộ `cached_label_list`, bắn `CONVERSATION_UPDATED` và sinh activity |
| `Labels::UpdateJob`/`RemoveAssociationsJob` + service | cùng tên trong `App\Jobs\Labels` / `App\Services\Labels` | bỏ tham số `old_label_title`/`label_deleted_at` vì khóa ngoại cascade làm chúng thành tham số chết |
| `conversation_finder.rb#filter_by_labels` (`tagged_with any: true`) | `ConversationFinder::filterByLabels()` (phiên chính port bổ sung) | khớp BẤT KỲ nhãn nào; thiếu nó thì bộ đếm tab và phân trang sai khi nhiều hội thoại |
| `components/widgets/ColorPicker.vue` (`@lk77/vue3-color`) | `components/widgets/ColorPicker.tsx` + `.scss` viết lại giữ nguyên DOM/class `vc-*` | không thêm dependency; CSS lấy từ sourcemap đúng bản 3.0.6 |

## Gate (phiên chính chạy 06/09)

1. **Pest 696/696** (1618 assertion, gồm cả B9) · vitest **163/163** (21 file) · tsc · build · pint · `i18n:generate --check` — xanh.
2. Trace: file này + 3 note.
3. **Pixel-diff**: Settings › Labels 10/10 màn đạt (list 0.030%, add/edit/delete/picker 0.031–0.039%); khối nhãn trong panel **0.000%** (chưa gán / picker mở / đã gán 2 nhãn, light + dark); nhóm Labels ở sidebar 0.000%; dropdown bulk "Assign labels" và "Remove labels" 0.000%. **Thanh bulk của B6 từ 3.114%/3.193% về 0.000%** — nợ B6 đã trả.
4. **Audit nút**: 3 nút trang Settings › Labels đều phản ứng, `Δel` trùng oracle; nút đổi hệ màu trong picker cho chuỗi giá trị giống hệt từng ký tự hai bên.
5. **E2e**: tạo → sửa → xóa nhãn ở Settings; gán 2 nhãn cho hội thoại → hiện trên panel + thẻ + sidebar không reload → gỡ 1 → click nhãn ở sidebar lọc đúng; kịch bản tổng `b79-e2e-full.mjs` xác nhận nhãn còn nguyên sau F5, DB ghi `cached_label_list` + activity "John added …".

## Khác biệt cố ý / nợ

1. **Chỉ gắn được nhãn có sẵn trong account** (xem bảng trên) — title lạ bị bỏ qua im lặng.
2. Badge chưa đọc cho mục nhãn trên sidebar: nợ B8.
3. Nhóm "Tagged With" trong Contacts và nhánh `type="contact"` của bulk label: nợ nhóm sau.
4. `components/ui/Label.tsx` (chip `woot-label` trong hội thoại) và `components-next/label/Label.tsx` (chip settings) là **hai component khác nhau** — đúng như gốc, không gộp.
5. `apiClient` đọc `text()` trước khi parse để chịu được `head :ok` (200 body rỗng) — áp dụng cho mọi endpoint kiểu đó về sau.

## Bẫy đã trả giá

1. **Hai agent chạy Pest song song trên cùng `yona_rw_test`** làm suite đỏ giả (bảng bị migrate giữa chừng, deadlock). Khi chạy nhiều agent backend cùng lúc, mỗi agent phải dùng DB test riêng (`DB_DATABASE=… vendor/bin/pest`, nhớ tạo extension `pg_trgm`, `pgcrypto`).
2. **Style scoped của Vue thắng CSS thư viện**: port picker bằng lớp Tailwind trên `className` thì `ColorPicker.scss` nạp sau utilities nên `.vc-chrome` thắng, bo góc lệch 2px. Phải ghi đè bằng selector đôi `.colorpicker--chrome.vc-chrome` như gốc.
3. Kịch bản e2e đọc `document.body.innerText` để tìm tên nhãn cho **âm tính/dương tính giả**: chuỗi đó cũng nằm ở sidebar. Phải đo trong `.sidebar-labels-wrap` và mở accordion "Conversation Actions" trước.
4. Activity message tới sau vài giây (job `high` → broadcast) — kiểm bằng `waitForSelector`, đừng chờ cứng.
