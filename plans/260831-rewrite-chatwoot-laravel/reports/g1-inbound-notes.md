# G1 — Đính kèm realtime, dedupe theo inbox và các loại tin riêng của Zalo (07/09/2026)

Xây tiếp trên `g1-sticker-notes.md` + `g1-relay-notes.md` (không hoàn tác gì của hai agent
trước). Bằng chứng đầu vào: `g1-inbound-evidence.md` (đo trên Zalo thật, hội thoại 138,
account 3). Nguồn gốc đối chiếu: `refs/chatwoot` v4.17.1, `services/zalo-bridge/src/*.mjs`,
`node_modules/zca-js`.

## Bảng kịch bản

| # | Tính năng | Bước | Kết quả | Bằng chứng |
|---|---|---|---|---|
| 1 | Ảnh/tệp inbound hiện ngay | phát `zalo_inbound_image` rồi đọc payload `message.created` **tại lúc phát** | **FAIL trước sửa** → PASS | payload không có khóa `attachments` vì tệp gắn sau `save()` |
| 2 | Backfill sau restart bridge | cùng `source_id`, hội thoại cũ đã `resolved` | **FAIL trước sửa** → PASS | dedupe theo hội thoại ⇒ tin cũ chui sang hội thoại mới (id 749–755 ở evidence) |
| 3 | Tin đã thu hồi trong backfill | payload `msgType: chat.undo`, content "[Tin nhắn]" | **FAIL trước sửa** → PASS | tin 751 được dựng lại từ tin khách đã xoá |
| 4 | Danh thiếp | tin 768 (thật) | **FAIL trước sửa** → PASS | `content` null + không đính kèm ⇒ `shouldRenderMessage` false ⇒ bong bóng trống, card hội thoại "Không có nội dung" |
| 5 | Thẻ ngân hàng | fixture theo `inbound-content.mjs` | **FAIL trước sửa** → PASS | driver bỏ rơi `bank_card` (chỉ đọc `sticker`/`business_card`/`call`) |
| 6 | Nhắc hẹn | tin 763 (thật) | **FAIL trước sửa** → PASS | rơi vào nhánh text ⇒ hiện "[Link] ⏰ … .png" |
| 7 | Cuộc gọi | fixture theo `buildCallPayloadFromZaloRecommended` | **FAIL trước sửa** → PASS | `call` được lưu nhưng không có bong bóng nào đọc |
| 8 | Video / audio / tệp / gif | 4 fixture theo contract | PASS (khoá lại bằng test) | `file_type` đúng 4 loại |
| 9 | Biểu cảm | tin 713 (thật) có `reactions:["👍"]` | **FAIL trước sửa** → PASS | dữ liệu đã lưu đúng từ relay-fix nhưng **không có UI** |
| 10 | Ô xem trước danh sách | 4 loại thẻ | PASS | `content` mang nhãn ⇒ không rơi về `CHAT_LIST.NO_CONTENT` |
| 11 | Gửi ảnh chiều ra | `APP_URL` host ≠ host bridge | vẫn cần env/doc (xem §6) | `fetch_host_not_allowed` → Yona báo "chưa kết nối" |

## Lỗi đã sửa

### 1. `message.created` phát ra khi chưa có đính kèm — LỖI DRIVER, không phải lỗi lõi

Đã kiểm lõi trước khi kết luận: `Message::booted()` hook `created` chạy
`persistPendingAttachments()` **trước** `dispatchCreateEvents()` (port đúng
`autosave: true` của `has_many :attachments` rồi mới tới
`execute_after_create_commit_callbacks`), và `MessageResource::attachmentsPayload()`
đọc quan hệ đã nạp. ⇒ **Lõi đúng, không sửa lõi.**

Sai ở driver: `IncomingMessageService` gọi `$message->save()` rồi mới `attachMedia()`.
Gốc làm ngược lại — `Whatsapp::IncomingMessageBaseService#create_messages`:
`attach_files` → `attach_location` → `@message.save!` (`incoming_message_base_service.rb:102-104`),
và `attach_files` dùng `@message.attachments.new(...)` chứ không `create`.

Đã đổi sang dựng `Attachment` chưa lưu rồi giao cho `Message::$pendingAttachments`
(đúng đường mà `Builders\Messages\MessageBuilder` và Slack builder đang dùng).

Test khoá đọc payload **ngay tại lúc phát sự kiện** (`Event::listen` + `MessageResource::pushEventData`),
không đọc lúc assert — nếu đọc lúc assert thì lazy-load sẽ cứu cả bản có bug.

> **Lỗi ngoài phạm vi (xem §"Lỗi ngoài phạm vi"): 7 kênh khác đang mắc đúng lỗi này.**

### 2. Dedupe `source_id` theo hội thoại thay vì theo inbox

`source_id` là định danh của nền tảng trên cả kênh; gốc tra
`Message.find_by(source_id:)` / `@inbox.messages.find_by(source_id:)`
(`whatsapp/incoming_message_service_helpers.rb:98`, `imap/imap_mailbox.rb:83`,
`mailbox/.../references_strategy.rb:46`). Bản cũ tra `$conversation->messages()` nên lô
`old_messages` sau khi bridge khởi động lại tạo lại 7 tin cũ trong hội thoại đang mở.

Đã đổi sang `Message::where('inbox_id')->where('source_id')`, và **chuyển phép tra lên
trước** bước resolve hội thoại — nhờ vậy tin trùng không kéo theo việc mở hội thoại mới
(gốc cũng `return if find_message_by_source_id(...)` trước `set_conversation`).

### 3. Tin đã thu hồi quay lại theo đường backfill

`chat.undo` đến kèm `content: "[Tin nhắn]"` (nhãn của `contentLabelFromObject`). Tạo lại
là dựng dậy thứ khách đã xoá ⇒ bỏ qua theo `msgType` trong `listener_data`/`msg_type`.

### 4. Bốn loại tin Zalo không có trong lõi

**Cách lưu đã chọn: `content_attributes.<kind>` chuẩn hoá + `content_type = text` +
`content` là nhãn đọc được.** Lý do (không chọn thêm hằng vào `Message::CONTENT_TYPES`):

- `CONTENT_TYPES` bên gốc là enum của cột DB **và** của API/webhook công khai
  (`contentTypeName()` đi thẳng ra payload). Thêm giá trị = lệch enum khỏi Chatwoot, mọi
  client/webhook đọc theo enum gốc sẽ gặp giá trị lạ. Bốn loại này là đặc thù MỘT kênh,
  không phải khái niệm chung như `sticker`/`input_csat`.
- Bản gốc xử lý đúng tình huống "loại riêng của kênh" bằng `content_attributes` + bubble
  riêng, không nới enum: `Message.vue#componentToRender` rẽ nhánh theo
  `contentAttributes.whatsappFlowResponse`, `contentAttributes.type === 'dyte'`,
  `contentAttributes.imageType` (story Instagram). Ta đi đúng lối đó.
- `content` mang nhãn ("[Danh thiếp]", "[Tài khoản ngân hàng]", "[Cuộc gọi]", còn nhắc hẹn
  lấy chính tiêu đề) nên card hội thoại / tìm kiếm / webhook / `shouldRenderMessage` đều có
  dữ liệu — **không phải sửa `MessagePreview.tsx`** (xem §5).

Chỗ biết hình dạng thẻ Zalo được gom vào **một** class mới `InboundCardParser` (cùng vai
trò với `RelayEventParser` ở nhánh sự kiện); `IncomingMessageService` chỉ hỏi
`parse()`/`label()` và không biết Zalo đóng gói thế nào.

Riêng **nhắc hẹn** bridge chưa có `inbound_kind`: tin đến là `chat.ecard`, `content` là
chuỗi link ảnh thô. Driver nhận ra qua `listener_data.content.params.actions[].data.act`
bắt đầu bằng `create_reminder` rồi bóc `title / description / emoji / startTime /
reminderId / repeat`. **Không phải sửa bridge, không phải khởi động lại bridge.**

### 5. Bong bóng — bốn component mới, dựng trên khung có sẵn của gốc

`BaseAttachment.tsx` (port của `BaseAttachment.vue`) đã có sẵn đúng bố cục icon + tên +
mô tả + nút hành động mà gốc dùng cho Contact/Location/Embed. Ba thẻ dùng lại nó;
cuộc gọi là **một dòng** (như Zalo) nên dựng thẳng trên `BaseBubble`.

Sửa nhỏ đúng theo gốc: prop `action` của `BaseAttachment` thành optional — bản gốc có
`v-if="action"`, bản port lại bắt buộc nên thẻ không có hành động (nhắc hẹn) không dựng được.

`Message.tsx`: thêm `resolveChannelCardBubble(contentAttributes)` đứng **trước** nhánh
chọn bubble theo đính kèm (đúng thứ tự của `componentToRender`), và thêm điều kiện vào
`shouldRenderMessage` — gốc cũng liệt kê `hasWhatsappFlowResponse` ở đúng chỗ đó
(`Message.vue:429-438`).

### 6. Biểu cảm — **MỞ RỘNG NGOÀI GỐC**

Chatwoot v4.17.1 KHÔNG có UI reactions (`grep -rn "reactions" refs/chatwoot/app/javascript/`
= 0). Theo yêu cầu (Zalo là kênh chính của Yona) đã vẽ thêm hàng emoji nhỏ dưới bong bóng
trong `bubbles/Base.tsx`, đọc `content_attributes.reactions` mà relay-fix đã lưu.

> ⚠️ **Pixel-diff phải loại trừ `[data-yona-reactions]`** — phần này cố ý khác bản gốc.
> Chỉ hiện khi tin có biểu cảm nên ảnh chụp fixture sạch không đổi.

## Bảng trace gốc ↔ port

| Gốc (Chatwoot / bridge) | Port (Laravel / React) |
|---|---|
| `whatsapp/incoming_message_base_service.rb:102-104` (`attach_files` trước `save!`) | `IncomingMessageService::buildAttachments()` → `Message::$pendingAttachments` |
| `whatsapp/incoming_message_service_helpers.rb:98` `Message.find_by(source_id:)` | `IncomingMessageService::findBySourceId()` (phạm vi inbox) |
| `whatsapp/incoming_message_base_service.rb:38` `return if find_message_by_source_id` trước `set_conversation` | tra `source_id` trước `IncomingConversationResolver::resolve` |
| `Message.vue#componentToRender` (`whatsappFlowResponse` / `type === 'dyte'` / `imageType`) | `Message.tsx::resolveChannelCardBubble()` |
| `Message.vue:429-438` `shouldRenderMessage` | `Message.tsx` cùng danh sách + nhánh thẻ kênh |
| `bubbles/BaseAttachment.vue` (`v-if="action"`) | `bubbles/BaseAttachment.tsx` (`action` optional) |
| `bubbles/Contact.vue` (thẻ liên hệ dựng trên BaseAttachment) | `bubbles/ZaloBusinessCard.tsx`, `ZaloBankCard.tsx`, `ZaloReminder.tsx` |
| `bubbles/VoiceCall.vue` (một dòng icon + nhãn) | `bubbles/ZaloCall.tsx` |
| `config/locales/*.yml` `conversations.messages.*` | `lang/{en,vi}/conversations.php` → `messages.business_card|bank_card|reminder|call` |
| bridge `parseZinstantBankCardSource` / `parseBankCardHtml` (`inbound-content.mjs`) | `content_attributes.bank_card` (không đổi hình dạng) |
| bridge `buildCallPayloadFromZaloRecommended` (`index.mjs:606`) | `content_attributes.call` |
| zca `chat.ecard` + `create_reminder11` | `InboundCardParser::reminder()` |
| bridge `buildAllowedHosts` (chỉ host webhook) | + host của `LARAVEL_BASE_URL` |

## File đã sửa / thêm

| File | Thay đổi |
|---|---|
| `app/Services/Zalo/InboundCardParser.php` | **mới** — nơi duy nhất biết hình dạng thẻ Zalo (4 loại) + nhãn dự phòng |
| `app/Services/Zalo/IncomingMessageService.php` | đính kèm trước `save`; dedupe theo inbox và tra trước khi resolve hội thoại; bỏ tin `chat.undo` backfill; lưu 4 loại thẻ + nhãn `content` |
| `resources/js/dashboard/components-next/message/bubbles/ZaloBusinessCard.tsx` | **mới** |
| `resources/js/dashboard/components-next/message/bubbles/ZaloBankCard.tsx` | **mới** — có nút sao chép số tài khoản |
| `resources/js/dashboard/components-next/message/bubbles/ZaloReminder.tsx` | **mới** |
| `resources/js/dashboard/components-next/message/bubbles/ZaloCall.tsx` | **mới** |
| `resources/js/dashboard/components-next/message/bubbles/BaseAttachment.tsx` | `action` optional (đúng `v-if="action"` của gốc) |
| `resources/js/dashboard/components-next/message/bubbles/Base.tsx` | **mở rộng ngoài gốc**: hàng biểu cảm `[data-yona-reactions]` |
| `resources/js/dashboard/components-next/message/Message.tsx` | rẽ nhánh bubble theo `content_attributes` + `shouldRenderMessage` |
| `lang/{en,vi}/conversations.php` | +4 nhãn `messages.*` (nội dung dự phòng lưu vào DB) |
| `lang/{en,vi}/conversation.php` | +`CONVERSATION.ZALO.*`, +3 khóa `SHARED_ATTACHMENT.*` |
| `resources/js/i18n/generated/{en,vi}.ts` | `php artisan i18n:generate` |
| `services/zalo-bridge/src/media-fetch.mjs` | `buildAllowedHosts` nhận thêm `laravelBaseUrl` |
| `services/zalo-bridge/src/index.mjs` | truyền `LARAVEL_BASE_URL` vào allowlist |
| `services/zalo-bridge/src/media-fetch.test.mjs` | +2 test |
| `services/zalo-bridge/.env.example`, `.env.production.example` | ghi rõ `BRIDGE_FETCH_HOST_ALLOWLIST` dùng khi nào |
| `docs/zalo-bridge/deployment.md` | mục "Host của đính kèm chiều ra (`fetch_host_not_allowed`)" |
| `docs/zalo-bridge/webhook-contract.md` | bảng `inbound_kind` → cách driver lưu; reminder; `chat.undo`; dedupe theo inbox |
| `tests/Fixtures/channels/zalo_inbound_{business_card,bank_card,reminder,call,video,audio,file,gif}.json`, `zalo_backfill_undo.json` | **mới** (9 fixture) |
| `tests/Feature/Channels/ZaloChannelTest.php` | +12 test (kể cả dataset 4 loại media) |
| `resources/js/dashboard/components-next/message/ZaloBubbles.test.tsx` | **mới** — 14 test |

**KHÔNG sửa** `MessagePreview.tsx` (cả hai bản) — cách lưu mới đã cho `content` có nhãn nên
nhánh sẵn có của lõi hiện đúng; đã khoá bằng test render `ConversationCard/MessagePreview`
cho cả 4 loại. Không đụng file của agent `qa-b`. Không sửa lõi (`app/Models/Message.php`
giữ nguyên bản của agent relay). Không khởi động lại bridge. Không commit.

## Spec ↔ Pest / vitest

| Hành vi | Test |
|---|---|
| payload `message.created` đã có `attachments` | `ZaloChannelTest`: *phát message.created với đính kèm đã có trong payload* |
| dedupe theo inbox, hội thoại cũ đã đóng cũng không tạo lại | *bỏ qua tin trùng source_id kể cả khi hội thoại cũ đã đóng* |
| tin `chat.undo` trong backfill không tạo tin mới | *không dựng lại tin đã thu hồi khi kéo lịch sử về* |
| danh thiếp / thẻ ngân hàng / cuộc gọi: `content_attributes` + nhãn | 3 test *hiển thị …* |
| nhắc hẹn dựng từ `listener_data`, `content` hết link thô | *dựng thẻ nhắc hẹn từ listener_data thay vì để lọt link ảnh thô* |
| ecard không phải nhắc hẹn thì không bịa thẻ | *không nhầm tin ecard thường thành nhắc hẹn* |
| `file_type` đúng cho video/audio/file/gif | *gắn đúng file_type cho video / âm thanh / tệp / gif* (4 dataset) |
| bong bóng 4 loại vẽ đúng trường + nút | `ZaloBubbles.test.tsx` (8 test) |
| ô xem trước ra nhãn, không "Không có nội dung" | `ZaloBubbles.test.tsx` (4 dataset) |
| hàng biểu cảm chỉ hiện khi có reactions | `ZaloBubbles.test.tsx` (2 test) |
| allowlist nhận host `LARAVEL_BASE_URL`, bỏ qua URL hỏng | `media-fetch.test.mjs` (2 test) |

## Backfill đã chạy trên `yona_rw` (chỉ 2 tin, theo id cụ thể)

Dùng **chính `InboundCardParser` của production** để vá — dữ liệu vá tay không thể lệch
khỏi đường chạy thật, và đây cũng là phép kiểm chứng parser trên payload Zalo thật:

```bash
php artisan tinker --execute='
foreach ([763 => "reminder", 768 => "business_card"] as $id => $expectedKind) {
    $message = App\Models\Message::find($id);
    $attributes = $message->content_attributes ?? [];
    $params = ["listener_data" => $attributes["zca_message"] ?? []];
    foreach (["business_card", "bank_card", "call"] as $kind) {
        if (isset($attributes[$kind])) { $params[$kind] = $attributes[$kind]; }
    }
    $card = App\Services\Zalo\InboundCardParser::parse($params);
    if ($card === null || $card["kind"] !== $expectedKind) { continue; }
    $label = App\Services\Zalo\InboundCardParser::label($card["kind"], $card["data"], $message->account->locale);
    $message->update([
        "content" => $card["kind"] === "reminder" || blank($message->content) ? $label : $message->content,
        "content_attributes" => [...$attributes, $card["kind"] => $card["data"]],
    ]);
}'
```

| id | trước | sau |
|---|---|---|
| 763 | `content = "[Link] ⏰ Hẹn gọi… .png"` | `content = "Hẹn gọi tư vấn gói Team"`, `+reminder{title,description,emoji,start_time,reminder_id,repeat}` |
| 768 | `content = null` (card hội thoại "Không có nội dung") | `content = "[Danh thiếp]"`, `business_card` giữ nguyên |
| 764 | tin hệ thống "Phước Lộc tạo nhắc hẹn mới …" | **giữ nguyên** — Zalo cũng hiện cả dòng hệ thống lẫn thẻ |
| 772, 780 | tệp .txt / gif, đã có đính kèm | **không cần vá** — cách lưu media không đổi |

Dùng `update()` (không phải `updateQuietly`) để tab đang mở của founder nhận
`message.updated` và vẽ lại ngay.

## Founder quét QR thật thế nào (bổ sung mục trong `g1-notes.md`)

Trước khi test gửi ảnh/tệp **chiều ra**, kiểm 3 biến — sai là tin báo "chưa kết nối"
(thông báo đánh lừa: `callBridge` quy mọi lỗi non-2xx về `not_connected`):

1. `APP_URL` trong `.env` của Laravel phải cùng host với `LARAVEL_BASE_URL` của bridge
   (cả hai nên là `http://127.0.0.1:8000`). Khác host ⇒ bridge trả
   `fetch_host_not_allowed` khi tải tệp về để gửi.
2. Nếu buộc phải khác (ví dụ `APP_URL=http://localhost:8000`), thêm vào
   `services/zalo-bridge/.env`: `BRIDGE_FETCH_HOST_ALLOWLIST=localhost`.
3. Sau khi đổi bất kỳ biến nào ở trên **phải khởi động lại bridge** mới có hiệu lực.

> Bản sửa ở `media-fetch.mjs` đã tự thêm host của `LARAVEL_BASE_URL` vào allowlist, nhưng
> **chỉ có tác dụng sau khi bridge khởi động lại**. Phiên này KHÔNG restart bridge (phiên
> Zalo thật của founder đang chạy) — phiên chính quyết thời điểm restart. Cho tới lúc đó
> `.env` dev đang có `BRIDGE_FETCH_HOST_ALLOWLIST=localhost,127.0.0.1` (agent trước đặt)
> nên chiều ra vẫn chạy.

## ⚠️ CHẶN NGHIỆM THU: một worker hàng đợi đang giữ **bản code cũ trong bộ nhớ**

Đây là lý do kết quả trên Zalo thật trông "lúc được lúc không" và là thứ phải xử lý TRƯỚC
khi founder test lại — nếu không, mọi bản sửa của cả ba agent G1 sẽ trông như không ăn.

Ba tiến trình đang cùng rút hàng đợi:

| PID | Lệnh | Nạp lại code? |
|---|---|---|
| 13283 | `php artisan queue:listen …` | **có** (sinh tiến trình con mỗi job) |
| 1189164 | `php artisan queue:work --once …` | **có** |
| 957169 | `php artisan queue:work redis --tries=3 --timeout=120` | **KHÔNG** — nạp code lúc khởi động rồi giữ nguyên |

Bằng chứng: cùng loại tin `chat.ecard`, tin **763** (17:35:00) có `zca_message` còn tin
**804** (17:49:06) thì không; các tin 772/780/781/787/827/828 cũng trống. Đường xử lý không
đổi giữa hai mốc đó — chỉ khác ở worker nào bốc job. Tin nào rơi vào PID 957169 thì chạy
bằng driver **trước** bản sửa của agent relay.

Hệ quả với dữ liệu thật (không khôi phục được, payload không còn ở đâu):

| id | mất gì |
|---|---|
| 804 | tin nhắc hẹn "tới giờ" — không có `zca_message` nên **không dựng lại được thẻ** |
| 827, 828 | hai thẻ ngân hàng thật (VietinBank, Liobank) — `content_attributes = []`, mất số TK/QR |

**Việc của phiên chính** (không tự làm vì đang là môi trường test thật của founder):
`php artisan queue:restart` (worker thoát êm sau job hiện tại; `queue:listen` vẫn phục vụ
nên hàng đợi không đứng), rồi bật lại `queue:work` nếu nó không tự lên. Sau đó nhờ founder
gửi lại 1 thẻ ngân hàng + 1 nhắc hẹn để nghiệm thu trên dữ liệu mới.

## Lỗi ngoài phạm vi (không tự sửa — kèm bằng chứng + đề xuất)

| Vấn đề | Bằng chứng | Đề xuất |
|---|---|---|
| Bridge KHÔNG xử lý `chat.location` ⇒ gửi vị trí không tạo tin nào | evidence §5; `grep -n "location" services/zalo-bridge/src/{index,inbound-content}.mjs` = 0 | Lõi Chatwoot đã có `file_type: location` (`coordinates_lat/long`, `fallback_title`) và bubble bản đồ — thêm nhánh `chat.location` ở bridge rồi map thẳng vào đính kèm lõi, driver không cần bubble riêng. Cần cửa sổ restart bridge |
| Sự kiện `typing` bị bỏ (`BridgeEventService`: `'typing' => null`) nên agent không thấy "đang nhập…" | evidence §5 | Lõi có đường typing của widget — nối relay `typing` (isSelf=false) vào đó. Là **tính năng mới**, không thuộc cụm inbound này |
| **7 kênh khác cũng gắn đính kèm SAU `save()`** ⇒ `message.created` realtime thiếu `attachments`, bong bóng chỉ hiện sau khi tải lại trang | `Telegram/IncomingMessageService.php:73` save → `:145,157,174` create (gốc `telegram/incoming_message_service.rb:34-35` `process_message_attachments` **trước** `save!`); tương tự `Line:73/130`, `Tiktok:78/165`, `Twilio:56/154`, `Whatsapp:127/202`, `Sms:45/69`, `Messenger/BaseMessageBuilder:34,47,73,88` | Đổi cả 7 sang `Message::$pendingAttachments` như driver Zalo; một test khoá dùng chung cho mọi kênh (đọc payload tại lúc phát sự kiện) |
| Undo trong lô backfill hiện chỉ bị **bỏ qua**, chưa đánh dấu tin gốc là đã thu hồi | payload backfill mang `content.globalMsgId` nhưng `RelayEventParser::recallSourceId()` chỉ bóc được envelope `relay_event` | Thêm accessor cho hình dạng backfill rồi gọi `MessageStateService::applyRecall` — thu hồi lúc bridge offline mới áp được |
| `Message` phát `message.created` trong hook `created` (**bên trong** transaction), gốc là `after_create_commit` (**sau** commit) | `app/Models/Message.php` hook `created`, không `afterCommit`; hai builder có bọc transaction: `Builders/Messages/{Facebook,Instagram}/MessageBuilder.php:37` | Zalo/Telegram/Line… không bọc transaction nên chưa lộ; nhưng ở Facebook/Instagram, rollback sau khi phát sự kiện sẽ để lại tin "ma" trên UI. Đề xuất chuyển các hook after-create của `Message` sang `DB::afterCommit()` cho khớp `execute_after_create_commit_callbacks` |
| Chưa có UI đổi/gỡ biểu cảm từ dashboard | chỉ hiển thị một chiều (đọc từ Zalo) | Cần founder quyết có cho agent thả cảm xúc ra Zalo không (bridge có API) |
| Bridge chưa có `inbound_kind: reminder` | `parseInboundDescriptor` không có nhánh `chat.ecard` | Khi nào sửa bridge được (có cửa sổ restart) thì đẩy việc nhận diện xuống bridge cho đồng nhất với 8 kind còn lại; driver giữ nguyên vì đọc `content_attributes.reminder` |
| Tin in đậm/định dạng của Zalo về thành chữ thuần | evidence §4, tin 787 | Zalo gửi định dạng ở `propertyExt`; port sau nếu founder cần |
| `ContactsExportJobTest` fail khi chạy full-suite song song hai agent | 2 test fail trong full-suite, **8/8 xanh** khi chạy riêng | Job ghi tệp export vào `storage/` dùng chung — cần tách thư mục theo `TEST_TOKEN`/`Storage::fake` để hai phiên chạy song song không đá nhau |

## Bẫy đã trả giá

1. `Event::assertDispatched` + đọc `$message->attachments` **lúc assert** không bắt được bug
   này: quan hệ chưa nạp sẽ lazy-load từ DB và thấy tệp đã lưu xong. Phải đóng gói payload
   ngay trong listener (`MessageResource::pushEventData`) mới đo đúng thứ FE nhận.
2. Đổi trạng thái hội thoại sang `resolved` trong test **đẻ thêm một tin activity** —
   `Message::count()` không còn là 1; phải đếm theo `source_id`.
3. Bundle i18n của vitest mặc định là `en`; chuỗi tiếng Việt chỉ khớp sau `setLocale('vi')`
   (và trả về `'en'` ở `afterAll` để không rò sang file test khác).
4. `content.params` của tin nhắc hẹn là JSON **lồng ba tầng** (`params` → `actions[].data`
   → `.data`), mỗi tầng là chuỗi JSON escape. Dò theo tên khóa ở tầng ngoài sẽ trượt.
5. Trường QR của thẻ ngân hàng tên là `qr_url` (không phải `qr` như mô tả ban đầu) —
   `parseBankCardHtml` ở `inbound-content.mjs` là nguồn chuẩn.
6. `node --test services/zalo-bridge/src` (thư mục) không chạy được — phải
   `node --test services/zalo-bridge/src/*.test.mjs`.

## Kết quả gate

| Gate | Kết quả |
|---|---|
| `DB_DATABASE=yona_rw_test_g1in php artisan test --filter=ZaloChannelTest` | **34 passed**, 129 assertions |
| Pest toàn suite trên `yona_rw_test_g1in` | **2109/2111** (5176 assertion); 2 fail là `ContactsExportJobTest` — **không thuộc phạm vi này**, chạy riêng `--filter=ContactsExportJobTest` thì **8/8 xanh** ⇒ nhiễu do hai agent chạy full-suite cùng lúc dùng chung thư mục export trong `storage/` |
| `vendor/bin/pint --test app/Services/Zalo app/Models/Message.php tests/Feature/Channels` | passed |
| `npx tsc --noEmit` | sạch |
| `npx vitest run` | **730/730** (90 file), +14 test mới |
| `flock /tmp/yona-build.lock npm run build` | xanh |
| `php artisan i18n:generate --check` | "Bundle i18n khớp lang/" |
| `node --test services/zalo-bridge/src/*.test.mjs` | **61/61** (+2 mới) |
| Kiểm chứng dữ liệu thật | parser chạy trên payload thật của tin 763/768 trên `yona_rw` |

## Dọn dẹp

- DB test `yona_rw_test_g1in`: đã `dropdb` sau khi chạy xong.
- Không tạo dữ liệu QA mới trên account 3; chỉ vá 2 tin có sẵn (763, 768) theo mục backfill.
- Không đụng oracle, không đụng `~/www/pixel-diff`, không restart bridge, không commit.

```
Status: DONE_WITH_CONCERNS
Summary: Driver Zalo giờ gắn đính kèm TRƯỚC khi lưu (payload `message.created` đã có tệp),
dedupe `source_id` theo inbox và bỏ tin `chat.undo` trong lô backfill, đồng thời chuẩn hoá
4 loại tin riêng của Zalo (danh thiếp / thẻ ngân hàng / nhắc hẹn / cuộc gọi) vào
`content_attributes` + nhãn `content`, kèm 4 bong bóng mới dựng trên `BaseAttachment` của
bản gốc và hàng biểu cảm (mở rộng ngoài gốc).
Concerns/Blockers:
- CHẶN NGHIỆM THU: worker PID 957169 `queue:work redis` giữ code cũ trong bộ nhớ nên tin
  Zalo thật lúc chạy code mới lúc code cũ (tin 763 có `zca_message`, tin 804/827/828 không).
  Phiên chính cần `php artisan queue:restart` rồi mới nhờ founder test lại; dữ liệu thẻ của
  tin 804/827/828 đã mất ở khâu nhận, không khôi phục được.
- 7 kênh khác (Telegram, Line, Tiktok, Twilio, Whatsapp, Sms, Messenger) đang mắc đúng lỗi
  "gắn đính kèm sau save" — đã nêu bằng chứng theo số dòng, chưa sửa vì ngoài phạm vi.
- Hàng biểu cảm là mở rộng NGOÀI bản gốc: pixel-diff phải loại trừ `[data-yona-reactions]`.
- Bridge chưa xử lý `chat.location` và sự kiện `typing` chưa nối vào lõi (evidence §5) —
  cả hai cần quyết định riêng, `chat.location` còn cần cửa sổ restart bridge.
- Bản sửa allowlist trong `media-fetch.mjs` chỉ có hiệu lực SAU khi bridge khởi động lại;
  phiên này không restart bridge.
```
