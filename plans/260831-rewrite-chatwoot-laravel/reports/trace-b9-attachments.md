# Trace B9 — Attachments

Ngày: 06/09/2026. Phiên đơn `yona-6d` (QA + e2e) + 2 agent song song, chạy **cùng lúc với B7 Labels**. Bảng trace chi tiết trong 2 note:

| Vùng | Ghi chú | Nội dung |
|---|---|---|
| Backend | [b9-notes-be.md](b9-notes-be.md) | `Attachment` (13 file_type, validate, push_event_data, URL), gắn vào `Message` + `MessageBuilder` multipart/signed_id, `MessageResource.attachments`, endpoint `direct_uploads`, giới hạn |
| Frontend | [b9-notes-fe.md](b9-notes-fe.md) | gửi multipart trong `api.ts` + ReplyBox, bubble Image/Video/Audio/File, chip đính kèm, gallery/lightbox |

## Kiến trúc chốt

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| ActiveStorage (`has_one_attached :file`) | **một bảng `attachments` polymorphic** dùng chung (quyết định #9): cột `disk/path/filename/content_type/byte_size` + các cột nghiệp vụ gốc | bảng đã có từ A4 (avatar), B9 chỉ gắn thêm morph `Message` |
| `url_for(file)` → URL kết thúc bằng tên tệp người dùng tải lên, 301 sang tệp thật | route `GET /attachments/{attachment}/{filename}` → `AttachmentsController@show` redirect 301 (phiên chính port bổ sung) | **bắt buộc**: `bubbles/File.vue` đọc tên hiển thị TỪ URL (payload không có trường `filename`); thiếu nó bubble hiện chuỗi băm và rộng 323px thay vì 280px |
| `autosave: true` trên attachments | `$pendingAttachments` + `persistPendingAttachments()` trên `Message` | phải lưu tệp TRƯỚC `dispatchCreateEvents()`, không thì payload realtime mất attachments |
| `params[:private]` (Rails ép kiểu ở tầng params) | `App\Support\BooleanParam::from()` (phiên chính port bổ sung), dùng chung với typing status | `(bool) 'false' === true` trong PHP từng biến mọi tin có tệp thành ghi chú riêng tư |
| `direct_uploads` (ActiveStorage) | `POST …/conversations/{id}/direct_uploads` trả `signed_id` | Chatwoot mặc định `DIRECT_UPLOADS_ENABLED=false` nên FE dùng đường multipart; endpoint giữ cho đủ mặt tiền API |

## Gate (phiên chính chạy 06/09)

1. **Pest 696/696** (1618 assertion, gồm cả B7) · vitest **163/163** · tsc · build · pint · `i18n:generate --check` — xanh.
2. Trace: file này + 2 note.
3. **Pixel-diff** (gửi cùng 2 tệp hai bên): bubble ảnh **0.000%** light + dark, bubble tệp **0.000%** (280×175 khớp đúng sau khi URL kết thúc bằng tên gốc), chip đính kèm **0.000%**. Màn conversation hồi quy 0.006%.
4. **Audit nút**: nút đính kèm (kẹp giấy) vẫn DEAD ở cả hai bên trong headless (mở hộp thoại chọn tệp của hệ điều hành, harness không đo được) — giống oracle, không phải nút chết.
5. **E2e** (`b79-e2e-full.mjs`): gửi ảnh từ UI → bubble ảnh hiện không reload; gửi PDF → bubble tệp tải được; cả hai còn nguyên sau F5; gửi 16 tệp → 422 + toast đúng câu chữ, preview giữ nguyên; gallery mở đủ nút và đóng bằng Esc.

## Khác biệt cố ý / nợ

1. `thumb_url` trả cùng URL ảnh gốc — chưa sinh biến thể 250px như ActiveStorage.
2. Tin có tệp chưa có bubble "đang gửi": `sendReply` trong `ConversationContext` chưa nhận `files` nên `ReplyBox` gọi thẳng lớp API, bubble thật hiện qua realtime `message.created` (đã kiểm: đúng một lần, không nhân đôi). Gộp về một đường gửi khi chạm lại file này.
3. Gallery chỉ duyệt media của các tin đang nạp — backend chưa mở `GET conversations/{id}/attachments`.
4. Ghi âm (nút mic) vẫn thuộc phần chưa port — khác biệt duy nhất còn lại trong audit nút so oracle.
5. `resources/js/types/chatwoot-prosemirror-schema.d.ts` khai `declare module '@chatwoot/utils'` nên che d.ts thật của package — phải bổ sung thủ công mỗi khi dùng hàm mới của gói đó.

## Bẫy đã trả giá

1. **URL tệp phải kết thúc bằng tên gốc** (xem bảng trên) — sai thì bubble tệp lệch cả nội dung lẫn kích thước.
2. **`(bool) 'false'`**: mọi cờ boolean đến từ multipart/query phải qua `BooleanParam`.
3. Hai agent backend chạy Pest song song trên cùng DB test làm suite đỏ giả — mỗi agent cần DB test riêng.
4. Cột `external_url`/`fallback_title` do A4 tạo hẹp (varchar 255) chặn trước cả validate 2048 của gốc; đã nới bằng migration mới thay vì sửa migration cũ.
