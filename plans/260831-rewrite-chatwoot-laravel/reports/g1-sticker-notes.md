# G1 — Sửa lỗi sticker Zalo không hiện trên dashboard (07/09/2026)

Bối cảnh: test Zalo thật (inbox 59, account 3, conversation 132, message 696). Khách gửi
sticker → bridge đẩy `inbound_kind: sticker` kèm object `sticker`, `content` = null, không
có `media_url`. Trên UI: bong bóng trống hoàn toàn, card hội thoại hiện "Không có nội dung".

## Nguyên nhân gốc (đã chứng minh bằng nguồn, không đoán)

`app/Services/Zalo/IncomingMessageService.php` chỉ nhét object `sticker` vào
`content_attributes` rồi tạo tin với `content` = null và **không** tạo đính kèm nào,
cũng **không** đặt `content_type`. Hai chỗ ở lõi FE quyết định hậu quả:

- `resources/js/dashboard/components-next/message/Message.tsx:139` —
  `shouldRenderMessage = attachments.length > 0 || message.content || status === FAILED || external_error`.
  Không content + không đính kèm ⇒ **false** ⇒ lõi không render bong bóng nào. Đây là lý do
  khung tin nhắn trống chứ không phải bubble hỏng.
- `components-next/Conversation/ConversationCard/MessagePreview.tsx:60-76` — không content,
  không attachments ⇒ rơi xuống nhánh cuối `CHAT_LIST.NO_CONTENT` ("Không có nội dung").

Tức là lõi Chatwoot **không sai** — driver Zalo đã bỏ qua contract của lõi.

## Cách sửa: map vào contract lõi có sẵn, KHÔNG thêm nhánh `if zalo` vào lõi

Chatwoot đã có sẵn `content_type: sticker` (`refs/chatwoot/app/models/message.rb:101`,
port ở `app/Models/Message.php:57`) nhưng **không có bubble sticker riêng** — bản gốc hiển
thị sticker bằng đúng đường ảnh: kênh Line nhúng URL sticker
(`refs/chatwoot/app/services/line/incoming_message_service.rb:59-65`), kênh Messenger map
`sticker → image` (`app/builders/messages/messenger/message_builder.rb:123`), WhatsApp map
`sticker → :image` (`whatsapp/incoming_message_service_helpers.rb:46`).

Nên driver Zalo làm y hệt: sticker → `content_type = sticker` + **một đính kèm ảnh** mang
`external_url` = URL sticker trên CDN Zalo (không tải về đĩa, giống Line). `Attachment`
đã hỗ trợ sẵn: đính kèm không có tệp trả `data_url = external_url`
(`app/Models/Attachment.php:363-367`), và `bubbles/Image.tsx` chỉ đọc `data_url` — không
đụng `thumb_url`. ⇒ **FE không phải sửa một dòng nào.**

Hệ quả trên UI: bong bóng ảnh sticker đúng bên theo `direction` (đường orientation cũ của
lõi, không đổi), card hội thoại hiện nhãn ảnh `CHAT_LIST.ATTACHMENTS.image.CONTENT` —
trùng đúng nhãn mà nhánh sticker của `MessagePreview` gốc dùng.

`content_attributes.sticker` **giữ nguyên** ⇒ chiều ra `SendOnZaloService.php:85` không đổi.

## Bảng trace gốc ↔ port

| Gốc (Chatwoot/Ruby) | Port (Laravel/React) | Ghi chú |
|---|---|---|
| `message.rb:101` `sticker: 11` | `app/Models/Message.php:57` | có sẵn, nay mới có kênh dùng |
| `line/incoming_message_service.rb:59-65` (sticker = URL từ xa, không tải) | `IncomingMessageService::attachSticker()` | Zalo dùng `external_url` thay vì markdown vì bridge đã cho URL ảnh trực tiếp |
| `messenger/message_builder.rb:123` `sticker → :image` | `attachSticker()` đặt `Attachment::FILE_TYPE_IMAGE` | cùng quy ước file_type |
| `_attachment.json.jbuilder` (`data_url` khi không có tệp) | `Attachment::metadataForFileType()` | không sửa |
| `components-next/message/bubbles/Image.vue` | `bubbles/Image.tsx` | không sửa |
| `ConversationCard/MessagePreview.vue:72` | `MessagePreview.tsx:39` | không sửa |

## File đã sửa (đúng phạm vi được giao)

| File | Thay đổi |
|---|---|
| `app/Services/Zalo/IncomingMessageService.php` | thêm `contentType()`/`isSticker()`/`attachSticker()`, truyền `content_type` khi dựng tin, `attachMedia()` rẽ nhánh sticker |
| `tests/Fixtures/channels/zalo_inbound_sticker.json` | fixture mới theo `docs/zalo-bridge/webhook-contract.md` (`inbound_kind: sticker`, object sticker như payload thật) |
| `tests/Feature/Channels/ZaloChannelTest.php` | +3 test |

Không sửa file FE, không sửa `ZaloEventsJob`, không đụng `~/www/pixel-diff`, không commit.

## Spec ↔ Pest

| Hành vi | Test |
|---|---|
| sticker → `content_type=sticker` + đính kèm ảnh `external_url`, `data_url` đúng URL, `content_attributes.sticker` còn nguyên | `it('hiển thị sticker bằng contract lõi: content_type sticker + đính kèm ảnh ngoài')` |
| sticker thiếu URL ảnh → vẫn `content_type=sticker`, không tạo đính kèm rác | `it('bỏ qua sticker thiếu URL ảnh nhưng vẫn giữ content_type sticker')` |
| tin thường không bị đổi `content_type` | `it('giữ content_type text cho tin thường')` |

Thứ tự tra URL: `stickerUrl → url → thumbnail → stickerSpriteUrl` (zca-js đặt nhiều tên;
`stickerSpriteUrl` là sprite nên xếp cuối).

## Backfill tin đã lưu

Đã chạy trên `yona_rw` (chỉ THÊM dữ liệu, không xoá): rà toàn bộ tin có `content_attributes.sticker`
→ chỉ đúng **message 696**, đã set `content_type = 11` và tạo attachment ảnh
`external_url = https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=98930&size=130`.
Kiểm chứng qua `MessageResource`:

```json
{"id":696,"content":null,"content_type":"sticker",
 "attachments":[{"id":62,"file_type":"image","data_url":"https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=98930&size=130","thumb_url":""}]}
```

Lệnh backfill (chạy lại nếu còn tin cũ ở môi trường khác — không viết artisan command vì
chỉ dùng một lần):

```bash
php artisan tinker --execute='
foreach (App\Models\Message::whereRaw("content_attributes::text like \x27%\"sticker\"%\x27")->get() as $m) {
    $url = $m->content_attributes["sticker"]["stickerUrl"] ?? $m->content_attributes["sticker"]["url"] ?? null;
    if (! $url) continue;
    $m->content_type = App\Models\Message::CONTENT_TYPES["sticker"]; $m->saveQuietly();
    if ($m->attachments()->count() === 0) {
        $m->attachments()->create(["account_id" => $m->account_id, "file_type" => App\Models\Attachment::FILE_TYPE_IMAGE, "external_url" => $url]);
    }
}'
```

## Bẫy đã trả giá

- Tưởng lỗi ở bubble; thật ra tắc ở `shouldRenderMessage` — tin không có content lẫn đính
  kèm thì lõi bỏ qua hoàn toàn. Mọi kênh muốn hiện "thứ không phải chữ" đều PHẢI sinh đính kèm.
- Nhánh sticker của `MessagePreview` gốc chỉ chạy khi **có** `content` (`message.content && isMessageSticker`).
  Zalo không có content ⇒ nhánh đó không bao giờ vào; nhãn đến từ nhánh attachments, may là
  hai nhánh cho ra **cùng một nhãn** ảnh nên không lệch so với oracle. Đừng "sửa" nhánh đó
  ở lõi để chiều Zalo.
- `content_attributes ? 'sticker'` trong tinker/PDO bị nuốt làm placeholder — dùng
  `content_attributes::text like '%"sticker"%'` cho lệnh một lần.
- Không tải sticker về đĩa: URL CDN Zalo có query string, tải về sẽ mất đuôi/animation webp
  và tốn đĩa cho ảnh dùng lại nhiều lần; Line trong bản gốc cũng để URL từ xa.

## Kết quả gate

| Gate | Kết quả |
|---|---|
| `DB_DATABASE=yona_rw_test_sticker php artisan test --compact --filter=Zalo` | **37 passed**, 115 assertions (đã `dropdb` sau khi xong) |
| `vendor/bin/pint --test app/Services/Zalo/IncomingMessageService.php tests/Feature/Channels/ZaloChannelTest.php` | passed |
| `npx tsc --noEmit` / `npx vitest` / `npm run build` | **không chạy** — không sửa file FE nào (đã kiểm: fix nằm trọn ở driver) |
| E2E trình duyệt | để phiên chính nghiệm thu: mở conversation 132, tin 696 phải hiện ảnh sticker bên trái; card hội thoại hiện nhãn ảnh |

Status: DONE
Summary: Sticker Zalo trước đây chỉ nằm trong `content_attributes` nên lõi không render (thiếu cả content lẫn đính kèm); nay driver map vào contract có sẵn của Chatwoot — `content_type: sticker` + đính kèm ảnh `external_url` — nên bong bóng và preview hiển thị đúng mà FE không phải sửa dòng nào.
Concerns/Blockers: Ảnh sticker trỏ thẳng CDN Zalo (`zalo-api.zadn.vn`); nếu CDN chặn hotlink hoặc CSP của dashboard siết `img-src`, ảnh sẽ hỏng — khi đó chuyển sang tải về qua `RemoteAttachmentDownloader` (một dòng trong `attachSticker`). Cần founder xác nhận bằng mắt trên trình duyệt.
