# Lô 1b — BRIDGE: vị trí · tin nhóm · lời mời kết bạn · cửa ra cho lô 4 (07/09/2026)

Agent `zalo-lo1b-bridge`, tiếp nối `zalo-lo1-bridge`.
Phạm vi sửa: `services/zalo-bridge/src/**` + `docs/zalo-bridge/webhook-contract.md`.
KHÔNG đụng `app/`, `resources/`. KHÔNG commit. **KHÔNG restart bridge :3710** (đã kiểm cuối phiên: vẫn `200`).

## Kết quả theo mục

| # | Việc | Trạng thái | File |
|---|---|---|---|
| 1 | Vị trí `chat.location` + `chat.location.new` | XONG | `inbound-content.mjs`, `index.mjs` |
| 2 | Tin nhóm: `thread` + `sender` + `mentions` cho MỌI tin, 2 lane | XONG | `inbound-content.mjs`, `index.mjs` |
| 3 | `friend_request` durable + idempotent | XONG | `social-events.mjs` (mới), `index.mjs` |
| 4 | 3 cửa ra reaction/undo/typing + mã lỗi ổn định | XONG | `routes/personal-messages.mjs`, `reaction-icons.mjs` (mới) |
| 5 | `/send` nhận `filename` + `content_type` | **CHƯA CÓ → đã thêm** | `media-fetch.mjs`, `index.mjs`, `routes/personal-messages.mjs` |

## 1 — Vị trí

Lệch parser mà §6 chỉ ra là **đúng cả hai chỗ**, đã kiểm lại tận nơi trước khi sửa:
- `index.mjs` so `msgType === 'chat.location'`, còn payload thật là `chat.location.new`
  (zca `utils.js:445` cũng dùng `chat.location.new`) ⇒ nhánh vị trí **chưa từng chạy**.
- `parseInboundLocation` đọc `obj.latitude` ở tầng ngoài, trong khi toạ độ nằm trong
  **chuỗi JSON** `content.params`.

Đã sửa:
- `isLocationMsgType()` — nhận cả hai msgType, một chỗ duy nhất.
- `parseInboundLocation` đọc `params` (qua `parseContentParams`, dùng chung với
  `parseZinstantBankCardSource` — trước đây mỗi hàm tự `JSON.parse` một kiểu), địa chỉ lấy
  `content.description` **trước** `address`/`desc`. Vẫn đọc tầng ngoài làm dự phòng cho biến thể cũ.
- Payload đúng contract driver đang đọc và đúng `tests/Fixtures/channels/zalo_inbound_location.json`:
  `inbound_kind: location`, `location {latitude, longitude, address, title?, url}`.
- `url` bridge tự dựng khi Zalo không kèm `href` (payload thật `href: null`).

Test fixture theo đúng hình dạng §6 nhưng **toạ độ giả** (10.111111 / 106.222222) và địa chỉ bịa —
không có PII của founder trong repo.

## 2 — Tin nhóm (Q3)

`applyGroupContextToPayload()` là **chỗ duy nhất** gắn ngữ cảnh nhóm; cả lane live
(`index.mjs` handler `message`) và lane backfill (`buildGroupBackfillPayload`) cùng gọi. Đây
chính là bẫy 1.10 mà lô 1 đã gộp cho descriptor — giờ nhóm cũng vậy.

Phát ra cho **mọi** tin nhóm, kể cả tin do chính tài khoản bridge gửi (trước đây chỉ gắn
`sender_uid` khi `!isSelf`):

```json
"thread":   { "type": "group", "id": "7788", "name": "Nhóm Bán Hàng", "avatar": "https://…" },
"sender":   { "external_id": "555000111", "name": "Minh Anh", "avatar": "https://…" },
"mentions": [{ "external_id": "555000222", "name": "Bình", "offset": 0, "length": 5 }]
```

- Đổi `sender.id` → `sender.external_id` theo khoá trung tính của `docs/channel-capabilities.md` §2.4.
  Kiểm cơ học trước khi đổi: `sender.id` **không có ai đọc** — driver Laravel nhánh này chưa
  đọc `sender` (grep `app/Services/Zalo` = 0), bên trong bridge cũng chỉ dùng tại chỗ.
  `sender_uid` ở tầng ngoài giữ nguyên.
- Mention: zca `TMention = {uid, pos, len, type}` (`models/Message.d.ts`) **không mang tên** — tên
  chính là đoạn `@…` nằm trong text tại `[pos, pos+len)`, `normalizeMentions` cắt ra và bỏ dấu `@`.
  Đọc cả `data.mentions` (TGroupMessage) lẫn `content.mentions`.
- Tên/ảnh nhóm: `resolveGroupProfileCached` — cache theo group id, **tối đa 1 lời gọi
  `getGroupInfo`/phút/nhóm**. Trước đây gọi **mỗi tin** (đây là một phần finding 1.4 mà lô 1 để lại):
  nhóm đông = một lời gọi API cho từng câu chat. Lần gọi hỏng vẫn đóng dấu thời gian (không nện lại)
  và **giữ profile cũ** thay vì rơi về id nhóm.
- Tin của chính mình: lấy tên/ảnh từ `slot.integratedDisplayName`/`integratedAvatar` —
  **không** thêm lời gọi API nào cho nhánh isSelf mới mở.
- Lane backfill không gọi API (giữ nguyên nguyên tắc cũ), chỉ đọc cache; chưa có thì
  `thread.name = thread.id` — không bao giờ để trống `thread`.

## 3 — Lời mời kết bạn (Q7)

`social-events.mjs` (mới) giữ `friendRequestFromEvent` + `buildFriendRequestPayload`, và
**nhận luôn** `stableJsonForDedup` + `zaloPersonalSocialSourceId` chuyển từ `index.mjs` sang
(một nguồn, và test được mà không phải import `index.mjs`).

- Chỉ chuyển tiếp `type === REQUEST (2)` và `isSelf !== true`. Đọc `initializeFriendEvent`
  (`models/FriendEvent.js`): với REQUEST thì `threadId = data.toUid` (là **mình**), người mời nằm ở
  `data.fromUid`, `isSelf = fromUid == uid` ⇒ lấy `threadId` làm người mời là sai — đã tránh.
- Webhook `type: 'friend_request'` + `user {uid, name, avatar}` + `message?`, đi **outbox durable**
  (`postZaloPersonalSocialEvent` → `outbox.enqueue`), không phải fire-and-forget.
- `source_id` chỉ phụ thuộc (uid tài khoản, uid người mời, lời nhắn) — **không** phụ thuộc
  `connection_id` (đổi sau mỗi reconnect) nên Zalo bắn lại cùng lời mời vẫn ra một khoá.
- Bản thô `social_event`/`friend_event` vẫn gửi song song, không đổi hành vi cũ.

## 4 — Cửa ra cho lô 4

`POST /personal-messages/{reaction,undo,typing}`, cùng `X-Bridge-Send-Secret` với `/send`
(thiếu/sai → 403; bridge chưa cấu hình secret → 503 fail-closed, giữ nguyên `checkSendSecret`).

### Bảng contract (bản đầy đủ đã ghi vào `docs/zalo-bridge/webhook-contract.md` → mục **Bridge HTTP API**)

| Route | Body | zca gọi | OK |
|---|---|---|---|
| `/personal-messages/reaction` | `connection_id`, `thread_id`, `thread_type?`, `msg_id`, `cli_msg_id`, `icon` | `addReaction(icon, {data:{msgId,cliMsgId}, threadId, type})` | `{ok:true, source_id?}` |
| `/personal-messages/undo` | `connection_id`, `thread_id`, `thread_type?`, `msg_id`, `cli_msg_id` | `undo({msgId,cliMsgId}, threadId, type)` | `{ok:true}` |
| `/personal-messages/typing` | `connection_id`, `thread_id`, `thread_type?` | `sendTypingEvent(threadId, type)` | `{ok:true}` |

| `code` | HTTP | Nghĩa |
|---|---|---|
| `bad_request` | 400 | tham số sai (lỗi caller) — không thử lại |
| `session_lost` | 503 | phiên chưa sẵn sàng/đã mất (kèm `sessionLostReason` nếu có) |
| `zalo_rejected` | 502 | Zalo nhận rồi từ chối (`ZaloApiError`, `name = 'ZcaApiError'`) |
| `unknown` | 500 | lỗi lạ, đã log ở bridge |

Ba quyết định có bằng chứng, đừng đảo lại:
1. **`undo` chứ không `deleteMessage`** — đọc `apis/deleteMessage.js`: với tin của chính mình nó ném
   thẳng `"To delete your message for everyone, use undo api instead"`, và chat 1-1 thì không xoá cho
   mọi người được. `undo` mới là thu hồi hai chiều (`apis/undo.js`, endpoint `message/undo` /
   `group/undomsg`).
2. **Mã cảm xúc lạ phải trả `bad_request`, không được thả xuống zca.** `apis/addReaction.js` gặp mã
   không nhận ra thì `rType = -1` — đó là đường **GỠ** cảm xúc. Gõ nhầm emoji sẽ âm thầm xoá cảm xúc
   thay vì báo lỗi. `reaction-icons.mjs` nhận emoji hoặc mã zca, `""`/`"none"` = gỡ có chủ đích, còn
   lại → 400 `reaction_icon_unknown`.
3. **Tham số sai kiểm TRƯỚC trạng thái phiên.** Kiểm phiên trước thì mọi lời gọi sai của lõi đều bị
   che thành `session_lost` và người sửa đi tìm nhầm chỗ.

`thread_type` là **tuỳ chọn, mặc định 0 (chat 1-1)** — không có trong đặc tả được giao nhưng zca gọi
**endpoint khác hẳn** cho nhóm (`group/reaction`, `group/undomsg`, `group/typing`), nên bỏ hẳn là
không dùng được cho nhóm. Giá trị khác 0/1 → `bad_request`.

## 5 — `/send` với `filename` + `content_type` (kiểm theo yêu cầu)

**Chưa có, và có một lỗi thật ở đây.** `filename` trước đây chỉ dùng để đoán **phần mở rộng**;
file tạm vẫn đặt tên `zbr-<uuid>.<ext>`. Mà zca lấy tên tệp gửi đi bằng
`path.basename(filePath)` (`utils.js:329` → `sendMessage.js:297`) ⇒ **người nhận trên Zalo thấy đúng
chữ `zbr-<uuid>.bin`**. `content_type` thì chưa được nhận ở bất kỳ tầng nào.

Đã sửa:
- Tên thật thành **tên file**, phần ngẫu nhiên chống đụng độ lùi xuống **tên thư mục** tạm
  (`<tmp>/zbr-<uuid>/Báo giá Q4.pdf`). Giữ nguyên tên tiếng Việt; chỉ bỏ đường dẫn (`../../etc/passwd`
  → `passwd.bin`) và ký tự điều khiển; thiếu đuôi thì thêm đuôi suy ra.
- `content_type` đứng **trước** content-type của header khi suy đuôi — signed URL của storage hay trả
  `application/octet-stream`.
- `cleanupTempDownload()` xoá cả thư mục bọc ngoài (thay `fs.unlink` cũ) — không để rác trong `/tmp`.
- Sửa **cùng lỗi** ở route multipart `/send-attachment` (cũng `zbr-<uuid>.<ext>`).

Seam đã khớp (kiểm cơ học, không sửa `app/`): `SendOnZaloService.php:159-163` đã gửi `media_kind` +
`filename` + `content_type`; `ZaloBridgeClient` gọi đúng ba route mới với đúng tên trường.

## Kiểm chứng

```
node --test services/zalo-bridge/src/*.test.mjs services/zalo-bridge/src/routes/*.test.mjs
# tests 146 # pass 146 # fail 0   (chạy 3 lần liên tiếp, ổn định)
```

96 test của lô 1 giữ nguyên, **không sửa test cũ nào**. +50 test mới:
- `inbound-content.test.mjs` +7 — vị trí đúng hình dạng §6 (params chuỗi JSON, address =
  description), params object / params hỏng / thiếu toạ độ; mention; ngữ cảnh nhóm đầy đủ và khi
  chưa biết tên.
- `group-backfill.test.mjs` (mới, 5) — **khoá lane backfill**: nhóm có `thread`/`sender`/`mentions`,
  tin isSelf cũng có sender, 1-1 thì KHÔNG gắn, và `chat.location.new` ra `inbound_kind: location`
  ở lane này. Đây là lane không có cửa HTTP nào để thử, đúng chỗ hai lane từng lệch nhau.
- `social-events.test.mjs` (mới, 6) — REQUEST/không-REQUEST/isSelf, có và không có lời nhắn,
  `source_id` **idempotent qua reconnect** (đổi connection_id vẫn cùng khoá) và khác người thì khác khoá.
- `reaction-icons.test.mjs` (mới, 7) — emoji→mã, mã giữ nguyên, `''`/`none` = gỡ, emoji lạ → null,
  một emoji chỉ ra một mã.
- `routes/personal-messages.test.mjs` (mới, 12) — dựng express thật + slot giả: 403 thiếu secret,
  gọi zca đúng tham số/đúng ThreadType, `session_lost`, `zalo_rejected` vs `unknown`, precedence
  bad_request, và `/send` chuyển tiếp `filename` + `content_type`.
- `media-fetch.test.mjs` +4 — `safeAttachmentFilename`, tên thật giữ nguyên sau tải, `content_type`
  quyết định đuôi, dọn sạch thư mục tạm.

**Kiểm ngoài unit test — bản sao cô lập, cổng 37198, `.sessions` RỖNG** (không đụng :3710):

| Yêu cầu | Kết quả |
|---|---|
| thiếu secret, cả 3 route | `403 {"ok":false,"message":"Forbidden"}` |
| sai secret | `403` |
| `{}` | `400 bad_request` `connection_id required` |
| thiếu `thread_id` | `400 bad_request` `recipient_id_or_thread_id_required` |
| thiếu `msg_id`/`cli_msg_id` | `400 bad_request` `msg_id and cli_msg_id required` |
| `icon: "🦄"` | `400 bad_request` `reaction_icon_unknown` |
| `thread_type: 5` | `400 bad_request` `thread_type_invalid` |
| body hợp lệ, chưa có phiên | `503 session_lost` `not_logged_in` |
| `.sessions` sau khi thử | vẫn **0 file** |

Đã tắt bản sao và xoá thư mục; `curl http://127.0.0.1:3710/` cuối phiên → **200** (bridge thật nguyên vẹn).
`node --check` sạch mọi file sửa; `import` `index.mjs` in `KHONG boot phien nao` rồi thoát (chốt chặn của lô 1 còn nguyên).

## Ngoài phạm vi được giao nhưng có đụng (nói rõ để phiên chính duyệt)

1. **`index.mjs` có thêm ĐÚNG MỘT `export`** (`buildGroupBackfillPayload`). Module này trước đây
   không export gì. Lý do: lane backfill không có cửa HTTP nào để thử, mà nó chính là lane từng lệch
   âm thầm với lane live — muốn có test khoá thì phải chạm được vào nó. Import module vẫn không boot
   phiên nào.
2. **Chuyển `stableJsonForDedup` + `zaloPersonalSocialSourceId` từ `index.mjs` sang
   `social-events.mjs`** (cắt-dán, không đổi logic — khoá `source_id` của `group_event`/`friend_event`
   giữ nguyên bit-for-bit).
3. **Sửa `/send-attachment`** (route multipart) cùng lỗi tên tệp — không nằm trong 5 mục nhưng là
   đúng một dòng và cùng một bug.

## Việc cho phiên/lô khác (KHÔNG tự sửa vì ngoài phạm vi)

1. **`app/Services/Zalo/ZaloOutboundActions.php` chưa gửi `thread_type`** (dòng 51-56, 77-81,
   106-108). Chat 1-1 chạy đúng vì bridge mặc định 0, nhưng **thả cảm xúc / thu hồi / báo đang gõ
   trong NHÓM sẽ gọi nhầm endpoint của Zalo**. Sửa: thêm
   `'thread_type' => $channel->threadType($message)` (hàm đã có, `SendOnZaloService.php:136`).
2. **`ReactionIcons::code()` (Laravel) và `reaction-icons.mjs` (bridge) là hai bản của cùng một
   bảng.** Bridge phải giữ bản của mình (Laravel gửi emoji cũng phải chạy, mà PHP không gọi được từ
   Node). Nếu ai thêm cảm xúc mới thì phải sửa **cả hai** — nên có một test so hai bảng, hoặc chốt
   là lõi luôn gửi mã zca rồi bridge chỉ kiểm hợp lệ.
3. **Mọi thay đổi ở đây chỉ có hiệu lực SAU khi phiên chính restart :3710** (`cd services/zalo-bridge
   && pnpm pm2:restart`). Quy trình kiểm 8 bước ở `docs/zalo-bridge/deployment.md` vẫn đúng, thêm 3 bước:
   - gửi một **vị trí** từ điện thoại → Yona phải ra tin bản đồ, không còn im lặng;
   - gửi một **tệp** từ Yona ra Zalo → người nhận thấy **tên tệp thật**, không phải `zbr-….bin`;
   - nhờ một tài khoản lạ **gửi lời mời kết bạn** → Laravel phải nhận webhook `friend_request`.
4. **Cần một tin nhóm thật để nghiệm thu Q3.** Hình dạng `mentions` viết theo `TMention` của zca
   (có kiểu rõ ràng, không phải suy đoán như 1.11 trước đây), nhưng `dName`/`uidFrom` trong nhóm thì
   chưa có payload thật trong phiên này.

## Dọn dẹp

- Không commit, không `git add`, không đụng file ngoài phạm vi (`git status` xác nhận: chỉ
  `services/zalo-bridge/src/**` và `docs/zalo-bridge/webhook-contract.md` là của tôi; các file
  `app/**`, `lang/**`, `tests/**`, `outbox.mjs`, `deployment.md`, `.env*.example` đang sửa dở là của
  phiên khác — không đụng).
- Bản sao thử `/tmp/.../bridge-smoke-lo1b` đã tắt và xoá; không còn process nào ở :37198.
- Không đăng nhập vào phiên Zalo nào, không gọi API Zalo nào, không chạy DB, không đụng oracle.

```
Status: DONE_WITH_CONCERNS
Summary: Xong cả 5 mục — vị trí đúng hình dạng thật (chat.location.new + params chuỗi JSON), tin nhóm có thread/sender/mentions ở CẢ hai lane với cache getGroupInfo 1 lần/phút/nhóm, friend_request durable idempotent, 3 cửa ra cho lô 4 với mã lỗi ổn định, và /send giờ giữ tên tệp thật (trước đây người nhận thấy zbr-<uuid>.bin). 146/146 test xanh, bridge :3710 KHÔNG restart.
Concerns/Blockers:
  1. Toàn bộ chỉ có hiệu lực SAU khi phiên chính restart :3710 — thêm 3 bước nghiệm thu ở mục "Việc cho phiên/lô khác".
  2. ZaloOutboundActions.php (lô 4) chưa gửi `thread_type` → reaction/undo/typing trong NHÓM sẽ gọi nhầm endpoint Zalo. Một dòng, nhưng nằm ngoài phạm vi tôi được sửa.
  3. Bảng emoji↔mã cảm xúc tồn tại hai bản (PHP + bridge); thêm cảm xúc mới phải sửa cả hai — đề xuất test so bảng hoặc chốt lõi chỉ gửi mã zca.
  4. Đã thêm MỘT export vào index.mjs và chuyển 2 hàm hash sang social-events.mjs (cắt-dán, khoá source_id không đổi) — cần phiên chính duyệt.
  5. Tin nhóm chưa nghiệm thu trên payload thật (mentions viết theo kiểu zca đã khai báo, không phải suy đoán).
```
