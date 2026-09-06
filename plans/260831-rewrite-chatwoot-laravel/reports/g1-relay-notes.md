# G1 — Sự kiện relay Zalo (seen/delivered/reaction/undo) + trích dẫn (07/09/2026)

Tiếp nối `g1-notes.md` và `g1-sticker-notes.md` (fix sticker giữ nguyên, xây tiếp trên đó).
Bằng chứng: payload thật bắt từ redis (`reports/redis-relay.log`, `redis-relay2.log`),
type zca-js trong `services/zalo-bridge/node_modules/zca-js/dist/apis/listen.d.ts` +
`models/{SeenMessage,DeliveredMessage,Reaction,Undo}.d.ts`, và DB `yona_rw`
(inbox 59, conversation 132, message 708/713/718).

## Bảng kịch bản

| # | Tính năng | Bước | Kết quả | Bằng chứng |
|---|---|---|---|---|
| 1 | seen/delivered | phát lại hình dạng payload thật qua `/webhooks/zalo` | **FAIL trước sửa** → PASS | `receiptIds` đọc `msgIds` ở tầng ngoài; zca gửi `payload[0]` = mảng `{data:{msgId}}` |
| 2 | tick realtime | biên nhận đổi status | **FAIL trước sửa** → PASS | cập nhật bằng query builder → không có hook `updated` → không phát `message.updated` |
| 3 | reaction | khách thả 👍 lên tin 713 | **FAIL trước sửa** → PASS | đích thật ở `payload[0].data.content.rMsg[0].gMsgID`, không phải `msgId` tầng ngoài |
| 4 | undo | khách thu hồi tin 718 | **FAIL trước sửa** → PASS | đích thật ở `payload[0].data.content.globalMsgId`; tin vẫn hiện nguyên nội dung |
| 5 | quote inbound | tin 718 trả lời trích dẫn tin 713 | **FAIL trước sửa** → PASS | `quote.msg_id` = **cliMsgId** (`1788714913519`), không phải `source_id` (`8233983384565`) |
| 6 | `in_reply_to` | lõi nối tin được trả lời | **FAIL trước sửa** → PASS | `Message#ensure_in_reply_to` + `Messages::InReplyToMessageBuilder` CHƯA port — lỗi lõi, ảnh hưởng mọi kênh |
| 7 | khối trích dẫn trên UI | bong bóng có khung tin gốc | **FAIL trước sửa** → PASS | `Message.tsx:173` hardcode `inReplyTo: null` (ghi chú "Bỏ ở B3") |
| 8 | quote chiều ra | agent trả lời trích dẫn ra Zalo | **FAIL trước sửa** → PASS (backend) | driver gửi `content_attributes.quote` (hình dạng inbound) — bridge cần `SendMessageQuote` có `msgId` nên luôn bị bỏ |
| 9 | "mỗi event bắn 4 lần" | đếm job trong redis | **KHÔNG PHẢI LỖI** | xem mục "Nghi vấn trùng 4 lần" |

## Lỗi + nguyên nhân gốc + cách sửa

### 1. Envelope `relay_event` bị đọc sai tầng (seen/delivered/reaction/undo đều không áp dụng được)

`payload` trong envelope là **mảng tham số listener zca**, không phải object phẳng
(`ListenerEvents` trong `apis/listen.d.ts`):

| event | hình dạng thật |
|---|---|
| `seen_messages` / `delivered_messages` | `payload[0]` = **mảng** `{type,data:{msgId,…},threadId,isSelf}` |
| `reaction` | `payload[0]` = `{data:{content:{rMsg:[{gMsgID}],rIcon,rType},…},threadId,isSelf}` |
| `old_reactions` | `payload[0]` = **mảng** Reaction |
| `undo` | `payload[0]` = `{data:{content:{globalMsgId,cliMsgId,deleteMsg},…}}` |

`BridgeEventService::receiptIds` và `MessageStateService::targetSourceId` đọc `msgId`/`msgIds`
ở tầng ngoài. Với reaction/undo, `msgId` tầng ngoài là định danh **của chính sự kiện**, nên
kể cả khi tra được cũng sẽ đánh nhầm lên một tin không tồn tại.

**Sửa:** thêm `app/Services/Zalo/RelayEventParser.php` — nơi DUY NHẤT biết hình dạng zca.
`MessageStateService` giờ nhận `source_id` đã bóc sẵn, không biết gì về zca (đúng hướng
"đặc thù sống ở driver, lõi nói contract trung tính").

### 2. Biên nhận không phát realtime + có thể kéo tick lùi

`applyReceipts` cũ dùng `Message::query()->…->update([...])` — query builder KHÔNG chạy hook
`updated` của model, mà `sendUpdateEvent()` (phát `MESSAGE_UPDATED`) nằm đúng ở hook đó.
Hệ quả: dấu tick chỉ đổi khi reload trang. Ngoài ra không có thứ tự: biên nhận `delivered`
đến trễ sẽ hạ tin đang `read`.

**Sửa:** duyệt từng model rồi `->update()`; lọc `whereIn('status', [sent, delivered])` +
`where('status','<',$status)` để CHỈ NÂNG. Cùng lúc đó nó thành idempotent: phát lại cùng
một biên nhận không sinh sự kiện thừa. Test khoá: `'đánh dấu đã nhận / đã xem …, chỉ nâng
không hạ'` và `'phát message.updated khi biên nhận đổi trạng thái'`.

### 3. Reaction — bảng mã zca → emoji

`rIcon` là mã nội bộ của Zalo (`/-strong`, `:>`, `_()_`…), bảng đầy đủ ở enum `Reactions`
(`models/Reaction.d.ts`, 55 mã). Thêm `app/Services/Zalo/ReactionIcons.php` quy về emoji;
mã lạ (zca thêm cảm xúc mới) giữ nguyên thay vì mất. `rIcon` rỗng = `Reactions.NONE` = gỡ
cảm xúc → `reactions` về `[]`.

> **Lưu ý cho founder (KHÔNG sửa vì ngoài gốc):** Chatwoot v4.17.1 **không có UI reactions**
> — `grep -rn "reactions" refs/chatwoot/app/javascript/` = 0 kết quả, phía Ruby cũng chỉ có
> `message_reactions` trong danh sách subscribe của Instagram. Nên biểu cảm hiện được LƯU
> đúng (`content_attributes.reactions`) nhưng **chưa hiển thị**. Vẽ chúng lên bong bóng là
> thêm UI ngoài bản gốc — cần founder quyết trước khi làm.

### 4. Undo — đánh dấu như tin bị xoá của lõi

Trước: `content = null` + `deleted = true`. Vì `Message.tsx:139` `shouldRenderMessage` cần
content HOẶC đính kèm, tin thu hồi **biến mất hoàn toàn** khỏi khung chat (cùng họ với bug
sticker hôm qua) thay vì hiện "đã thu hồi".

Gốc đánh dấu tin bị xoá ở `refs/chatwoot/app/controllers/api/v1/accounts/conversations/messages_controller.rb:23`:
`content = I18n.t('conversations.messages.deleted')`, `content_type = :text`,
`content_attributes = { deleted: true }` (thay TRỌN, không merge). Port y hệt.

Chuỗi sinh trong job nền nên không có request để `SetLocale` chạy → dịch theo
`account->locale` (`__('conversations.messages.deleted', [], $inbox->account->locale)`).
Kiểm chứng thật trên account 3 (locale vi): tin 718 → "Tin nhắn đã bị xoá".

### 5. Trích dẫn: Zalo trỏ bằng `cliMsgId`, lõi nói `source_id` — **và lõi thiếu cả cầu nối**

Đây là lỗi **hai tầng**:

**(a) Lõi thiếu `ensure_in_reply_to`.** `refs/chatwoot/app/models/message.rb:69` có
`before_save :ensure_in_reply_to` gọi `Messages::InReplyToMessageBuilder`
(`app/services/messages/in_reply_to_message_builder.rb`) để quy `in_reply_to` ↔
`in_reply_to_external_id` về một cặp id nội bộ + source_id. Bản rewrite **chưa port** →
Telegram, WhatsApp, Instagram, Facebook, Tiktok đều đặt `in_reply_to_external_id` nhưng
KHÔNG kênh nào có `in_reply_to`, nên FE không bao giờ vẽ được khối trích dẫn.
Đã port: `app/Services/Messages/InReplyToMessageBuilder.php` + `Message::ensureInReplyTo()`
trong hook `saving`.

**(b) Driver Zalo trỏ sai định danh.** `quote.msg_id` mà bridge gửi lên là **cliMsgId** của
tin bị trích (định danh phía client), không phải `msgId` ta lưu ở `source_id`. Bằng chứng
thật: tin 718 có `quote.msg_id = "1788714913519"` trong khi tin 713 có
`source_id = "8233983384565"`; chính con số `1788714913519` xuất hiện lại ở
`rMsg[0].cMsgID` của sự kiện reaction — xác nhận nó là cliMsgId của 713.

Bridge KHÔNG chuẩn hoá được: zca chỉ đưa `cliMsgId` trong `TQuote` (không có `globalMsgId`
cho tin 1-1) — `extractQuoteFromListenerMessage` (index.mjs:905) đã dò 15 khoá và vẫn phải
rơi về `cliMsgId`. Nên việc quy đổi phải nằm ở driver Laravel:

- mỗi tin đến lưu `content_attributes.zca_message` = đúng 8 trường của `SendMessageQuote`
  (`node_modules/zca-js/dist/apis/sendMessage.d.ts:9`), lấy từ `listener_data` **bridge đã
  gửi sẵn** — nhờ vậy **không phải sửa bridge, không phải restart**;
- khi có quote, `quotedSourceId()` thử `quote_msg_id → quote.msg_id → quote.msgId →
  quote.cli_msg_id`: khớp `source_id` thì dùng luôn, không thì tra
  `content_attributes #>> '{zca_message,cliMsgId}'` trong hội thoại → trả về `source_id`;
- driver chỉ đặt `in_reply_to_external_id` (contract lõi); lõi tự suy `in_reply_to`.

Tin CRM tự gửi ra thì không biết `cliMsgId` (bridge chỉ trả `msgId`). Bù bằng **tin echo**:
lượt dội lại trước đây bị `return null` khi trùng `source_id`, giờ ghi bổ sung `zca_message`
lên bản ghi đã có (`backfillZcaMessage`, `updateQuietly` để không phát sự kiện thừa).

### 6. FE — khối trích dẫn không bao giờ hiện

`bubbles/Base.tsx` đã có sẵn khối trích dẫn (port đủ từ `Base.vue`) nhưng
`Message.tsx:173` truyền cứng `inReplyTo: null` — ghi chú "Bỏ ở B3: fetch tin in_reply_to
qua API (B9)". Bản gốc `MessageList.vue:133` `getInReplyToMessage` tra **trong chính danh
sách đang hiển thị** trước, chỉ fetch API khi không thấy.

Đã port nhánh tra-trong-danh-sách (`findInReplyTo` trong `MessageList.tsx`) + prop
`inReplyTo` cho `Message.tsx`. **Chưa port** nhánh fetch API cho tin nằm ngoài trang hiện
tại (`MessageApi.getPreviousMessages` với cửa sổ ±100) — đã sửa lại ghi chú trong file cho
đúng phạm vi còn thiếu.

### 7. Chiều ra: quote gửi sai hình dạng

`SendOnZaloService` chuyển thẳng `content_attributes['quote']` (hình dạng **inbound**:
`msg_id`/`text`/`sender_name`) sang bridge, trong khi `bridgeSendTextOrMedia` (index.mjs:2158)
chỉ nhận quote khi `quote.msgId != null` (shape `SendMessageQuote`) — nên trích dẫn chiều ra
**luôn bị bỏ im lặng**. Đã đổi sang `quotePayload()`: đọc `content_attributes.in_reply_to`
(lõi đã quy về id nội bộ) → lấy `zca_message` của tin đó.

> **Ngoài phạm vi — chưa bấm được từ UI:** dashboard chưa có nút "Reply to" trên tin
> (context menu tin nhắn thuộc cụm B5, chưa port — `grep -rn "in_reply_to" resources/js/dashboard/conversation/`
> = 0). Chuỗi backend đã thông và có test khoá, nhưng founder chưa có đường bấm để thử.
> Đề xuất: port context menu "Reply to" của `Message.vue` khi làm nốt cụm B5.

## Nghi vấn "mỗi relay event bị bắn 4 lần" — KHÔNG phải lỗi

`redis-relay.log` có đúng 4 dòng cho một sự kiện, nhưng đó là 4 dòng `MONITOR`, không phải
4 job:

| dòng | lệnh | ý nghĩa |
|---|---|---|
| 1 | `EVAL` (KEYS `default`, `default:notify`) | script đẩy job |
| 2 | `[2 lua] "rpush" default` | chính lệnh bên trong script trên |
| 3 | `[2 lua] "zadd" default:reserved` | worker **giữ chỗ** job (`attempts` 0→1) |
| 4 | `ZREM default:reserved` | job chạy **xong** |

Cả 4 dòng mang cùng `"uuid":"30b14746-…"` và cùng `"id":"5UFNEMhoM3UI7tCYbKN7p8SH9Lp8eyxD"`
⇒ **một** job duy nhất, đi trọn vòng đẩy → giữ chỗ → xong. `redis-relay2.log` (undo) y hệt
với uuid `14399162-…`. Kiểm lại phía bridge cũng đúng: `attachRelayForwarder` có chốt
`slot.forwarderAttached` chống attach lại khi relogin, và chatty lane `postFireAndForget`
POST một lần, không retry (`relay-forwarder.mjs:20-45`). **Không sửa bridge dòng nào.**

Dù vậy toàn bộ đường xử lý giờ đều idempotent (phát lại cùng payload không đổi kết quả):
inbound dedupe theo `source_id`; biên nhận chỉ nâng; reaction so sánh trước khi ghi; undo
bỏ qua tin đã `deleted`.

## Bảng trace gốc ↔ port

| Gốc (Chatwoot/Ruby/Vue hoặc zca-js) | Port (Laravel/React) |
|---|---|
| `app/services/messages/in_reply_to_message_builder.rb` | `app/Services/Messages/InReplyToMessageBuilder.php` |
| `app/models/message.rb:69` `before_save :ensure_in_reply_to` | `Message::booted()` hook `saving` → `ensureInReplyTo()` |
| `messages_controller.rb:23` (đánh dấu tin bị xoá) | `MessageStateService::applyRecall()` |
| `config/locales/{en,vi}.yml` `conversations.messages.deleted` | `lang/{en,vi}/conversations.php` → `messages.deleted` |
| `components-next/message/MessageList.vue:133` `getInReplyToMessage` | `MessageList.tsx` `findInReplyTo()` (nhánh danh sách; nhánh fetch API chưa port) |
| `MessageList.vue:179` `:in-reply-to` | `MessageList.tsx` prop `inReplyTo` → `Message.tsx` → context |
| `zca-js` `ListenerEvents` (`apis/listen.d.ts:36-42`) | `app/Services/Zalo/RelayEventParser.php` |
| `zca-js` enum `Reactions` (`models/Reaction.d.ts`) | `app/Services/Zalo/ReactionIcons.php` |
| `zca-js` `SendMessageQuote` (`apis/sendMessage.d.ts:9`) | `IncomingMessageService::ZCA_QUOTE_FIELDS` + `SendOnZaloService::quotePayload()` |

## File đã sửa / thêm

| File | Thay đổi |
|---|---|
| `app/Services/Messages/InReplyToMessageBuilder.php` | **mới** — port builder gốc |
| `app/Models/Message.php` | +`ensureInReplyTo()` trong hook `saving` (port `before_save`) |
| `app/Services/Zalo/RelayEventParser.php` | **mới** — bóc envelope zca (seen/delivered/reaction/undo) |
| `app/Services/Zalo/ReactionIcons.php` | **mới** — 55 mã zca → emoji |
| `app/Services/Zalo/MessageStateService.php` | nhận source_id trung tính; nâng-không-hạ; cập nhật qua model (realtime); undo theo cách gốc |
| `app/Services/Zalo/BridgeEventService.php` | dùng `RelayEventParser`, bỏ `receiptIds` đọc sai tầng |
| `app/Services/Zalo/IncomingMessageService.php` | lưu `zca_message`; quy `cliMsgId` → `source_id` cho quote; ghi bổ sung khi echo |
| `app/Services/Zalo/SendOnZaloService.php` | `quotePayload()` dựng `SendMessageQuote` từ `in_reply_to` |
| `lang/{en,vi}/conversations.php` | +`messages.deleted` (khóa gốc Chatwoot) |
| `resources/js/i18n/generated/{en,vi}.ts` | `php artisan i18n:generate` |
| `resources/js/dashboard/components-next/message/MessageList.tsx` | `findInReplyTo` + truyền prop |
| `resources/js/dashboard/components-next/message/Message.tsx` | prop `inReplyTo` thay vì hardcode `null` |
| `tests/Fixtures/channels/zalo_relay_{seen,delivered,undo}.json` | **mới** — dựng theo payload thật |
| `tests/Fixtures/channels/zalo_relay_reaction.json` | **thay** — fixture cũ sai hình dạng (object phẳng) |
| `tests/Fixtures/channels/zalo_inbound_quote.json` | **mới** — quote trỏ bằng cliMsgId + `listener_data` |
| `tests/Feature/Channels/ZaloChannelTest.php` | +7 test relay/quote/echo |
| `tests/Feature/Channels/ZaloSendTest.php` | +2 test quote chiều ra |
| `tests/Feature/Builders/MessageBuilderTest.php` | 2 test cập nhật theo hành vi gốc (xem dưới) |
| `resources/js/dashboard/components-next/message/MessageList.test.tsx` | +2 test khối trích dẫn |

**Không sửa** `services/zalo-bridge/**` (bridge thật đang chạy — không cần restart),
không sửa `ZaloEventsJob`/`ZaloController`, không commit.

> `MessageBuilderTest` cũ khẳng định `content_attributes: {"in_reply_to":42}` đi qua nguyên
> vẹn — đó chính là hành vi của bản **chưa port** `ensure_in_reply_to`. Gốc quy `in_reply_to`
> về tin thật trong hội thoại (không thấy thì về `null`, `messages_controller` gốc y hệt),
> nên hai test được sửa để tin được trả lời tồn tại thật. Đây là test ngoài phạm vi được
> giao nhưng bắt buộc phải cập nhật vì hành vi lõi đổi đúng theo bản gốc.

## Spec ↔ Pest / vitest

| Hành vi | Test |
|---|---|
| reaction áp đúng `rMsg.gMsgID`, đổi mã zca → emoji, không đụng tin khác | `ZaloChannelTest`: *ghi biểu cảm lên đúng tin bị thả cảm xúc…* |
| `rIcon` rỗng → gỡ hết biểu cảm | *gỡ biểu cảm khi rIcon rỗng* |
| undo theo `content.globalMsgId`, nội dung + content_type + attributes như gốc | *thu hồi đúng tin theo content.globalMsgId…* |
| delivered → read, biên nhận trễ không hạ tick | *đánh dấu đã nhận / đã xem…, chỉ nâng không hạ* |
| realtime `message.updated` khi đổi trạng thái | *phát message.updated khi biên nhận đổi trạng thái* |
| quote theo cliMsgId → `in_reply_to_external_id` + lõi đặt `in_reply_to` | *nối tin trích dẫn qua cliMsgId về source_id…* |
| echo ghi bổ sung `zca_message`, không nhân đôi tin | *ghi bổ sung zca_message cho tin đã có khi bridge dội lại (echo)* |
| quote inbound cũ (`msgId`) vẫn nối được | *tải tệp đính kèm và giữ trích dẫn trong content_attributes* |
| quote chiều ra dựng đúng `SendMessageQuote` | `ZaloSendTest`: *gửi kèm quote zca khi agent trả lời trích dẫn* |
| tin cũ chưa có `zca_message` → không gửi quote rác | *không gửi quote khi tin được trả lời chưa có ảnh chụp zca* |
| khối trích dẫn hiện nội dung tin gốc / ẩn khi tin nằm ngoài danh sách | `MessageList.test.tsx`: *MessageList in_reply_to* (2 test) |

## Backfill đã chạy trên `yona_rw` (chỉ THÊM/SỬA, không xoá)

Cách làm: **phát lại đúng 2 payload thật** đã bắt được ở redis qua `BridgeEventService` —
vừa backfill vừa là phép kiểm chứng end-to-end trên dữ liệu thật.

```bash
php artisan tinker --execute='
// 1. cliMsgId thật của tin 713 — lấy từ rMsg[0].cMsgID trong redis-relay.log
$m = App\Models\Message::find(713);
$m->updateQuietly(["content_attributes" => [...$m->content_attributes ?? [],
    "zca_message" => ["msgId" => "8233983384565", "cliMsgId" => "1788714913519"]]]);

// 2. phát lại reaction + undo thật (params bóc từ job serialize trong redis-relay*.log)
$service = app(App\Services\Zalo\BridgeEventService::class);
$service->handle(json_decode(file_get_contents("reaction.json"), true)); // xem script bên dưới
$service->handle(json_decode(file_get_contents("undo.json"), true));

// 3. biên nhận đã xem cho 708/713 (KHÔNG bắt được payload seen — dựa trên
//    quan sát của founder là khách đã đọc; xem cảnh báo bên dưới)
foreach (App\Models\Message::whereIn("id", [708, 713])->get() as $x) {
    if (in_array($x->status, [0, 1], true)) { $x->update(["status" => 2]); }
}'
```

Script bóc payload từ log (đã dùng): `plans/.../reports/redis-relay*.log` → lọc dòng
`"rpush"` → `json_decode(stripcslashes(...))` → `unserialize($d['data']['command'])` →
đọc property `params` của `ZaloEventsJob`.

Kết quả kiểm chứng qua `MessageResource`:

| id | trước | sau |
|---|---|---|
| 708 | `status=sent`, `ca=[]` | `status=read` |
| 713 | `status=sent`, `ca=[]` | `status=read`, `reactions:["👍"]`, `zca_message` |
| 718 | `content="Cảm ơn em…"`, `ca.quote` | `content="Tin nhắn đã bị xoá"`, `ca={"deleted":true}` |

> ⚠️ Mục 3 là backfill **suy luận**, không có payload `seen_messages` trong log (chatty lane
> không đi outbox nên không bắt được lúc đó). Nếu founder muốn tuyệt đối chỉ dùng dữ liệu
> đo được thì hạ 708/713 về `status=0` và thử lại bằng một lượt nhắn mới — đường xử lý nay
> đã đúng nên biên nhận mới sẽ tự áp.

> ⚠️ Tin 718 sau backfill hiển thị "Tin nhắn đã bị xoá" (đúng thực tế: khách ĐÃ thu hồi),
> nên khối trích dẫn của chính tin đó không còn để xem — gốc cũng xoá trọn `content_attributes`.
> Muốn nghiệm thu khối trích dẫn thì nhờ khách nhắn một tin trả lời trích dẫn MỚI.

## Kết quả gate

| Gate | Kết quả |
|---|---|
| `DB_DATABASE=yona_rw_test_g1relay2 php artisan test --filter=Zalo` | **44 passed**, 143 assertions |
| Pest toàn suite trên `yona_rw_test_g1relay` | **2083/2083 xanh** (5104 assertion) |
| `vendor/bin/pint --test app/ tests/…` | passed |
| `npx tsc --noEmit` | sạch |
| `npx vitest run` | **711/711** (89 file), +2 test mới |
| `flock /tmp/yona-build.lock npm run build` | xanh |
| `php artisan i18n:generate --check` | "Bundle i18n khớp lang/" |
| `node --test services/zalo-bridge/src/*.test.mjs` | 59/59 (không sửa bridge) |
| Kiểm chứng dữ liệu thật | phát lại 2 payload thật trên conversation 132 → đúng đích |

## Bẫy đã trả giá

1. `redis-cli MONITOR` in **cả** lệnh `EVAL` lẫn các lệnh lua bên trong nó → một lần đẩy job
   thành 2 dòng, cộng vòng giữ chỗ/xoá chỗ của worker thành 4. Đếm dòng log là sai; phải so
   `uuid` của job.
2. `Message::query()->…->update()` không chạy hook model ⇒ mất realtime. Mọi cập nhật cần
   phát `message.updated` phải đi qua từng model.
3. Tin outgoing tạo trong test bị `SendReplyJob` (sync) đánh `status=failed` **trong DB**,
   nhưng đối tượng trong tay test vẫn giữ `status=0` (job nhận bản deserialize khác) → gọi
   `updateQuietly(['status'=>0])` không thấy dirty nên **không ghi gì**. Phải `refresh()` trước.
4. `->value('content_attributes')` của query builder trả **chuỗi JSON thô** (bỏ qua cast) —
   phải `->first()?->content_attributes`.
5. Trong vitest, `.prose` khớp cả bong bóng chữ lẫn khối trích dẫn; chọn khối trích dẫn bằng
   `.line-clamp-2`.
6. `quote.msg_id` của bridge là **cliMsgId**, tên khoá đánh lừa. Đừng dò theo tên khoá — so
   thẳng với `source_id` trong DB rồi mới kết luận.

## Lỗi ngoài phạm vi (không tự sửa — kèm bằng chứng + đề xuất)

| Vấn đề | Bằng chứng | Đề xuất |
|---|---|---|
| Không có UI reactions | `grep -rn "reactions" refs/chatwoot/app/javascript/` = 0 | Founder quyết: vẽ thêm chip emoji dưới bong bóng = **thêm UI ngoài gốc** |
| Không có nút "Reply to" trên dashboard | `grep -rn "in_reply_to" resources/js/dashboard/conversation/` = 0; `Message.tsx` ghi "Bỏ ở B3: context menu (B5)" | Port context menu tin nhắn (cụm B5) rồi mới nghiệm thu được quote chiều ra |
| `in_reply_to` trỏ tin nằm ngoài trang đang tải → không hiện khối trích dẫn | gốc `MessageList.vue:65` fetch `getPreviousMessages` cửa sổ ±100 | Port nhánh fetch khi làm B9 (API đã có `getPreviousMessages` ở `conversation/api.ts:112`) |
| `content_attributes.in_reply_to` chưa có trong type FE | `resources/js/dashboard/conversation/types.ts` không khai báo | Bổ sung khi cụm B5/B9 chạm tới types |
| Xoá tin từ dashboard (`DELETE message`) chưa port | `MessagesController` ghi rõ "Bỏ: … destroy" | Cụm tiện ích tin nhắn; khóa `conversations.messages.deleted` nay đã có sẵn để dùng lại |

## Dọn dẹp

- DB test: `yona_rw_test_g1relay`, `yona_rw_test_g1relay2` đã `dropdb`.
- Không tạo dữ liệu QA mới trên account 3; chỉ sửa 3 tin có sẵn (708/713/718) theo mục backfill.
- Không đụng oracle, không đụng `~/www/pixel-diff`, không restart bridge.

Status: DONE_WITH_CONCERNS
Summary: Envelope `relay_event` bị đọc sai tầng nên seen/delivered/reaction/undo đều không áp dụng được; đã thêm `RelayEventParser` (đặc thù zca ở driver), cho biên nhận đi qua model để phát realtime và chỉ nâng trạng thái, đánh dấu tin thu hồi đúng cách gốc, đồng thời port `Messages::InReplyToMessageBuilder` + `before_save :ensure_in_reply_to` còn thiếu ở LÕI và quy `cliMsgId` của Zalo về `source_id` để khối trích dẫn hiện được cả hai chiều.
Concerns/Blockers:
- "Bắn 4 lần" là đọc nhầm output `redis-cli MONITOR` (1 job/sự kiện, cùng uuid) — không sửa bridge, không cần restart bridge.
- Chatwoot v4.17.1 KHÔNG có UI reactions: biểu cảm nay lưu đúng nhưng chưa hiển thị — cần founder quyết có vẽ thêm ngoài gốc không.
- Dashboard chưa có nút "Reply to" (cụm B5 chưa port) nên quote chiều ra chưa bấm thử được từ UI, dù backend đã thông và có test khoá.
- Backfill `status=read` cho tin 708/713 dựa trên quan sát của founder, KHÔNG có payload `seen_messages` bắt được — nêu rõ trong mục backfill để founder quyết giữ hay hoàn tác.
