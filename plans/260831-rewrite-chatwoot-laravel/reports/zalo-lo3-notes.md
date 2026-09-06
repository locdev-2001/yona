# Lô 3 — Chiều RA của kênh Zalo (07/09/2026)

Phạm vi: `SendOnZaloService`, `SendRateLimiter`, `config/zalo.php`, endpoint retry ở
`WebApi\Conversations\MessagesController`, `tests/Feature/Channels/ZaloSendTest.php`, chuỗi lỗi en/vi.
Nguồn yêu cầu: `reports/zalo-deep-audit.md` §"Lô 3" (3.1–3.9), `docs/channel-capabilities.md` §2.2
(`outbound_*`, `outbound_retry`), hợp đồng `zalo_source_ids` với Lô 2 (`reports/zalo-lo2-notes.md`),
quyết định founder Q6 07/09/2026 (bỏ giới hạn tin chủ động).

## File đã sửa / xoá

| File | Việc |
|---|---|
| `app/Services/Zalo/SendOnZaloService.php` | viết lại đường gửi: nhiều phần, tên tệp thật, lỗi có mã (3.1, 3.2, 3.4, 3.9) |
| `app/Services/Zalo/SendRateLimiter.php` | còn là bộ ĐẾM thuần, bỏ mọi nhánh chặn (Q6) |
| `config/zalo.php` | bỏ `send_window` + `daily_promotional_cap`, còn `counter_timezone` + `reply_window_hours` (Q6) |
| `app/Services/Zalo/Exception/{RateCap,SendOutsideWindow,ZaloCircuitOpen,ZaloNotConnected}Exception.php` | **xoá** — chết sau Q6 và sau khi lỗi chuyển sang dạng có cấu trúc |
| `app/Services/Channels/ChannelMessageStatus.php` | nới kiểu `string\|array\|null` cho `external_error` (kênh cũ vẫn ghi chuỗi) |
| `app/Http/Controllers/WebApi/Conversations/MessagesController.php` | `retry()` + `claimMessageRetry()` (3.3) |
| `routes/web_api.php` | 1 route `POST …/messages/{messageId}/retry` |
| `lang/{en,vi}/errors.php` + `resources/js/i18n/generated/{en,vi}.ts` | khối `errors.zalo.send.*` (bundle sinh lại bằng `artisan i18n:generate`) |
| `tests/Feature/Channels/ZaloSendTest.php` | 11 → 21 case |

KHÔNG đụng: `IncomingMessageService.php` (Lô 2), `services/zalo-bridge/**` (Lô 1),
`resources/js/**/message/**` (Lô 5), `app/Models/Channel/Zalo.php` (agent capabilities đang sửa).

## Đã làm

| # | Việc | Cách sửa | Test khoá |
|---|---|---|---|
| 3.1 | Gửi **mọi** đính kèm, không chỉ cái đầu | `messageParts()` cắt một tin của lõi thành nhiều lượt gọi bridge: sticker → 1 phần; có tệp → mỗi tệp 1 phần (chú thích + trích dẫn bám tệp ĐẦU TIÊN vì zca gộp caption vào chính tin đính kèm); không tệp → 1 phần văn bản. `sendEveryPart()` chạy lần lượt, dừng ở phần hỏng nhưng **vẫn lưu** source_id của phần đã đi | `gửi MỌI đính kèm của một tin và lưu đủ mọi source_id` (3 tệp → 3 lượt, `zalo_source_ids` = 4 id, `source_id` = id đầu) |
| 3.1 | Hợp đồng với Lô 2 | `rememberSourceIds()` gom `source_ids` (bridge đã trả sẵn mảng) hoặc `source_id` của TỪNG lượt vào `content_attributes.zalo_source_ids`, khử trùng, giữ thứ tự; `source_id` chính = phần tử đầu | cùng case trên |
| 3.1 | Tệp hỏng phải nói rõ tệp nào | `nameFailingFile()` bọc thông điệp bằng `errors.zalo.send.attachment_failed` (`:filename` + `:reason`) | `giữ source_id của tệp đã gửi được và nêu tên tệp hỏng khi lượt sau lỗi` |
| 3.2 | Tên tệp + content-type thật tới bridge | payload thêm `filename` (bridge đã đọc → đặt đúng đuôi) và `content_type` (**bridge chưa đọc** — yêu cầu cho Lô 1 ở dưới) | `gửi tên tệp gốc và content-type thật của tệp .docx tới bridge` |
| 3.2 | Chỉ gửi đính kèm thật sự mang tệp | `sendableAttachments()` lọc theo `media_kind` bridge chấp nhận (image/audio/video/file) và có URL; đính kèm chỉ có `external_url` vẫn được gửi (không im lặng bỏ) thay vì bị loại | — (được `OutboundAttachmentsContract` của khung capability dùng lại khi Zalo khai `outbound_file`) |
| 3.3 | Endpoint thử lại | `POST /api/v1/accounts/{account}/conversations/{conversationId}/messages/{messageId}/retry`. Phân quyền y hệt gửi tin (`fetchConversationForUser` → `Conversation::isVisibleTo`), khoá bản ghi (`lockForUpdate` trong transaction) nên hai cú bấm chỉ đẩy một job, chỉ nhận `status = failed`, trả về `MessageResource` như bản gốc | `đổi tin thất bại về sent, xoá lý do lỗi và đẩy lại SendReplyJob`, `không gửi lại tin chưa thất bại`, `từ chối người không thấy được hội thoại` |
| 3.3 | Dịch mã lỗi | `errors.zalo.send.<code>` en+vi; thông điệp sinh theo `account.locale` | `ghi lỗi khi phiên Zalo đã mất` (assert cả `code` lẫn câu tiếng Việt) |
| 3.4 | Phân tầng lỗi bridge | `classify()`: `message = not_logged_in` → `session_lost` (mới đổi state kênh + đếm ngắt mạch); **503/403 = kiểm secret của bridge** (`checkSendSecret`, index.mjs:2127) → `secret_mismatch`, KHÔNG đụng state, KHÔNG đếm; 429 và 5xx của zca → `zalo_rejected` (đếm); 5xx mang lỗi tải media → `media_fetch_failed`; không nối được → `bridge_unreachable`; còn lại `unknown` | `coi 503 thiếu secret là lỗi cấu hình…`, `coi 403 sai secret là lỗi cấu hình…`, `đếm lỗi zca thật vào ngắt mạch`, `báo bridge không gọi được mà không đụng trạng thái phiên` |
| 3.9 | Trích dẫn đủ trường | `quotePayload()` bắt buộc có `msgId, cliMsgId, uidFrom, msgType, ts, content`; thiếu ⇒ gửi KHÔNG trích dẫn; trả đúng 8 khoá của `SendMessageQuote` (`ttl` mặc định 0, `propertyExt` mặc định null — zca dùng `propertyExt` làm `qmsgAttach` cho quote văn bản) | 2 case quote cũ vẫn xanh |
| Q6 | Bỏ giới hạn tin chủ động | `SendRateLimiter` chỉ còn `increment()`/`currentCount()`; `assertCanSend`/cửa sổ giờ/trần ngày và 2 lớp exception đã xoá; config đổi `send_window` → `counter_timezone` | `vẫn gửi tin chủ động thứ tư trong ngày và ngoài khung 7h–22h` (23h30, 4 tin → 4 lượt bridge, bộ đếm = 4), `không đếm tin trả lời trong cửa sổ hội thoại vào số tin chủ động` |

Ngắt mạch giữ nguyên: chỉ `session_lost` và `zalo_rejected` mới nạp vào `ZaloHealthMonitor`
(bảng `CIRCUIT_ERROR_TYPES` là chỗ duy nhất map mã mới sang nhãn cũ của monitor).

### Kiểm chứng test có "cắn" thật
- Thêm `break` sau lượt gửi đầu (quay lại hành vi `->first()` cũ): **2 case đỏ** (`gửi MỌI đính kèm…`, `giữ source_id của tệp đã gửi được…`).
- Bỏ `filename`/`content_type` khỏi payload: case `.docx` **đỏ**.
- Đổi `503/403 → session_lost` (bản cũ): **2 case đỏ** (`secret` 503 và 403).
File đã khôi phục ngay sau mỗi phép đo (`git diff` sạch phần mutation).

## Bảng trace gốc ↔ port

| Hành vi | Ruby gốc | PHP port | Ghi chú |
|---|---|---|---|
| Endpoint thử lại | `api/v1/accounts/conversations/messages_controller.rb#retry` + `#claim_message_retry` + `retry.json.jbuilder` | `MessagesController::retry()` + `claimMessageRetry()` | `with_lock` → `DB::transaction` + `lockForUpdate` |
| Chỉ tin failed mới gửi lại | `next false unless message.failed?` | `$claimed->status !== Message::STATUSES['failed']` | trả 200 kèm tin như gốc, không 422 |
| Xoá source_id trừ inbox API/widget | `retry_attributes[:source_id] = nil unless inbox.api? \|\| inbox.web_widget?` | `Inbox::isApi()/isWebWidget()` | cần thiết: `BaseSendOnChannelService::isOutgoingMessageFromChannel()` bỏ qua tin đã có source_id |
| Đặt lại content_attributes | `retry_attributes = { content_attributes: {} }` (xoá SẠCH) | **lệch cố ý**: chỉ `unset(external_error)` | xoá sạch làm rụng `in_reply_to`/`sticker` (tin gửi lại mất trích dẫn) và `zalo_source_ids` (echo của phần đã gửi thành bong bóng ma) |
| `external_error` là store_accessor trên content_attributes | `models/message.rb` | `ChannelMessageStatus` | kênh Zalo ghi `{code, message}` thay chuỗi (yêu cầu `outbound_retry` của `docs/channel-capabilities.md` §2.2) |
| Trạng thái sau khi claim | `Messages::StatusUpdateService.new(message,'sent')` | gán thẳng `STATUSES['sent']` trong cùng transaction đã khoá | dùng service sẽ mở thêm một lượt update ngoài khoá |

## Hợp đồng cho Lô 5 (FE) — nút "Thử lại" và lý do lỗi

```
POST /api/v1/accounts/{accountId}/conversations/{conversationDisplayId}/messages/{messageId}/retry
body: {} · 200 → object message (MessageResource, giống payload của POST …/messages)
401 nếu agent không thấy hội thoại · 404 nếu tin không thuộc hội thoại
Bấm lại khi tin không còn `failed` = no-op (vẫn 200) → nút chỉ hiện khi status === 'failed'.
```
`resources/js/dashboard/api/inbox/message.js` (bản gốc Chatwoot) có sẵn hàm `retry(conversationID, messageId)` — port đúng đường dẫn trên.

Lý do lỗi đọc ở `message.content_attributes.external_error`. **Hai hình dạng cùng tồn tại**:
- kênh cũ: chuỗi (`'400, chat not found'`);
- kênh khai `outbound_retry` (Zalo): `{ code, message }` — `message` đã dịch sẵn theo locale tài khoản, cứ hiện thẳng; `code` để chọn hành động phụ:

| code | Ý nghĩa | Gợi ý UI |
|---|---|---|
| `session_lost` | mất phiên Zalo | ngoài "Thử lại" nên dẫn tới màn quét QR |
| `circuit_open` | đang tạm dừng vì lỗi liên tục | "Thử lại" sau ít phút |
| `bridge_unreachable` | không gọi được dịch vụ | "Thử lại" |
| `secret_mismatch` | sai cấu hình khoá gửi | báo quản trị viên, thử lại vô ích |
| `zalo_rejected` | Zalo từ chối | "Thử lại" |
| `media_fetch_failed` | không đọc được tệp | gửi lại tệp |
| `unknown` | còn lại | "Thử lại" |

FE nên đọc phòng thủ: `typeof external_error === 'string' ? external_error : external_error?.message`.

## Yêu cầu gửi Lô 1 (bridge) — driver đã sẵn sàng, bridge còn thiếu

1. **Tên tệp thật (3.2 phần còn lại).** `/personal-messages/send` đã nhận `filename` nhưng
   `downloadUrlToTemp()` chỉ lấy **đuôi** rồi ghi ra `zbr-<uuid>.<ext>` → khách vẫn thấy tên `zbr-…`.
   Cần dùng `AttachmentSource` dạng object của zca (`models/Attachment.d.ts`):
   `{ data: Buffer, filename: '<tên gốc>.<ext>', metadata: { totalSize, width?, height? } }`,
   hoặc tối thiểu ghi file tạm theo tên gốc đã làm sạch.
2. **Nhận thêm `content_type`** (Laravel đã gửi) và dùng nó khi đoán `mimeToExt`/`metadata`
   thay vì chỉ dựa `content-type` của HTTP response.
3. **`client_ref` (3.6).** Laravel chưa gửi vì bridge chưa dedupe theo khoá này; khi bridge sẵn sàng,
   thêm `client_ref = message.id` vào payload là một dòng trong `messageParts()`.
4. **Voice (3.8).** Cần API voice của zca khi `media_kind = audio`, bridge quyết định.
5. Giữ nguyên `source_ids[]` trong response — driver đã đọc mảng này trước, `source_id` chỉ là dự phòng.

## Chưa làm (có lý do) — ngoài phạm vi file được giao

| # | Việc | Vì sao chưa |
|---|---|---|
| 3.5 | `Message::outgoingContent()` (CSAT ra Zalo thiếu link) | phải sửa **lõi** `app/Models/Message.php` + mọi `SendOn*Service`; không thuộc phạm vi lô 3 và sẽ đụng file của agent khác |
| 3.6 | `client_ref` idempotency | cần bridge dedupe trước (xem yêu cầu Lô 1) |
| 3.7 | `SendReplyJob` sang queue `high` | **cố ý không làm**: worker dev đang chạy `queue:work redis` không kèm `--queue=high,default` → đổi queue sẽ làm mọi tin đi im lặng nằm lại hàng đợi. Chỉ đổi cùng lúc với cấu hình worker (supervisor/pm2) |
| 3.8 | Gửi voice đúng kiểu | thuộc bridge |
| — | `Channel\Zalo::capabilities()` chưa khai `OutboundImage/Video/Audio/File` và `OutboundRetry` | file đang do agent khung capability sửa (git status đang có `M app/Models/Channel/Zalo.php`). Sau lô này **đủ điều kiện khai** cả 5; comment "nợ lô 3" trong file đó nên gỡ luôn |
| — | Gate `capability_not_supported` cho endpoint retry | mọi kênh trong ma trận §4 đều khai `outbound_retry` nên chưa có kênh nào cần chặn; thêm khi có kênh khai thiếu |

## Lệch tài liệu cần chốt (không tự sửa)
`docs/channel-capabilities.md` §2.2 ghi `content_attributes.external_source_ids[]`, còn hợp đồng đã
chốt và đã thi công giữa Lô 2 ↔ Lô 3 (và code trên `main`) là **`content_attributes.zalo_source_ids`**.
Lô 2 đã ĐỌC khoá này (`findByAliasSourceId`), lô 3 đang GHI khoá này. Hai lựa chọn: đổi tài liệu theo
code, hoặc đặt tên trung tính `external_source_ids` cho MỌI kênh rồi sửa cả hai lô — nên chốt trước khi
kênh thứ hai khai `outbound_*`.

## Gate đã chạy
- `DB_DATABASE=yona_rw_test_lo3 php artisan test --filter=ZaloSendTest` → **21 passed / 66 assertions**.
- `DB_DATABASE=yona_rw_test_lo3 php artisan test tests/Feature/Channels tests/Feature/WebApi/ConversationMessagesControllerTest.php tests/Contracts` → **185 passed**.
- `DB_DATABASE=yona_rw_test_lo3 php artisan test tests/Feature/WebApi tests/Feature/Models tests/Feature/Jobs` → **1026 passed** (bảo hiểm cho việc nới kiểu `ChannelMessageStatus`).
- `vendor/bin/pint --test` → passed.
- `php artisan i18n:generate` rồi `--check` → "Bundle i18n khớp lang/".
- phpstan: **không có** trên nhánh này (`vendor/bin/phpstan` không tồn tại) — bỏ qua, không phải do lỗi.
- DB test riêng `yona_rw_test_lo3` đã `dropdb` sau khi đo. Không commit, không `git add`.

Status: DONE_WITH_CONCERNS
Summary: 3.1/3.2 (phần Laravel)/3.3/3.4/3.9 và quyết định Q6 đã xong, có test khoá đã kiểm chứng "cắn" thật; 3.5–3.8 nằm ngoài phạm vi file được giao hoặc phải chờ bridge.
Concerns/Blockers: (1) tên tệp thật chỉ đúng ĐUÔI cho tới khi Lô 1 dùng `AttachmentSource` của zca; (2) `Channel\Zalo::capabilities()` cần khai thêm `outbound_image/video/audio/file` + `outbound_retry` — file đang do agent khác giữ; (3) `docs/channel-capabilities.md` §2.2 gọi khoá là `external_source_ids` trong khi hợp đồng thi công là `zalo_source_ids`; (4) 3.7 (queue `high`) cố ý không làm vì worker dev chỉ nghe queue `default`.
