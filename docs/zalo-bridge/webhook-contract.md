# Webhook Contract — Zalo Personal Bridge → Laravel

## Endpoint

```
POST /webhooks/zalo
Header: X-Zalo-Personal-Bridge-Secret: <ZALO_BRIDGE_WEBHOOK_SECRET>
Content-Type: application/json
```

## Event Types

### 1. `inbound` — Tin nhắn từ Zalo

```json
{
  "type": "inbound",
  "connection_id": 1,
  "bot_id": 1,
  "personal_uid": "1234567890",
  "peer_uid": "9876543210",
  "thread_id": "9876543210",
  "thread_type": 0,
  "source_id": "msgId_from_zalo",
  "is_self": false,
  "direction": "in",
  "user": { "name": "Nguyễn Văn A", "avatar": "https://..." },
  "platform_sent_at": 1719500000000,
  "inbound_kind": "text",
  "content": "Xin chào",
  "msg_type": "chat.text"
}
```

**direction field (F14)**:
- `"in"` = contact gửi đến (không meter)
- `"out"` = tenant gửi từ phone cá nhân (meter)
- `"echo"` = bridge dội lại tin CRM vừa gửi (không meter — tránh double-count)
- Thiếu field → fail-safe `"in"`

**inbound_kind values**: text | image | gif | video | audio | file | sticker | location | link | business_card | bank_card | call

| inbound_kind | Trường đi kèm | Driver Laravel lưu thành |
|---|---|---|
| `text` | `content` | `content` |
| `image`, `gif` | `media_url`, chú thích → `content` | đính kèm `file_type=image` |
| `video` | `media_url`, chú thích → `content` | đính kèm `file_type=video` |
| `audio` | `media_url` (Zalo không cho chú thích tin thoại) | đính kèm `file_type=audio` |
| `file` | `media_url`, `media_filename`, chú thích → `content` | đính kèm `file_type=file` |
| `sticker` | `sticker{stickerUrl,url,thumbnail,…}` | `content_type=sticker` + đính kèm ảnh `external_url` |
| `location` | `location{latitude,longitude,address?,title?,url}` | đính kèm `file_type=location` (`coordinates_lat/long`, `fallback_title`) |
| `link` | `link{url,title?,description?,thumb?}`, chữ khách gõ kèm → `content` | đính kèm `fallback` (`external_url` + `fallback_title`) |
| `business_card` | `business_card{name,title,thumbnail,url,phone?,qr_code_url?}` | `content_attributes.business_card` |
| `bank_card` | `bank_card{bank_name,bank_bin,account_number,account_holder,logo_url,qr_url}` | `content_attributes.bank_card` |
| `call` | `call{media,direction,outcome,duration_seconds,callback_enabled}` | `content_attributes.call` |

**Chú thích tin media** — bridge lấy thẳng từ content-object Zalo: `content.title`
(với `share.file` là `content.description`, vì `title` ở đó là TÊN TỆP). Không có
chú thích thì `content` là chuỗi rỗng. Tên trường không đổi — trước 07/09/2026
chú thích bị lọc nhầm nên `content` luôn rỗng ở mọi lane; driver Laravel không
phải sửa gì.

**Nhắc hẹn (reminder)** — bridge CHƯA có `inbound_kind` riêng: tin đến dạng
`msgType: chat.ecard` và rơi vào nhánh text, `content` là chuỗi link ảnh thô. Driver
Laravel nhận ra nó trong `listener_data` (`content.params.actions[].data.act` bắt đầu
bằng `create_reminder`) và lưu `content_attributes.reminder{title,description,emoji,
start_time,reminder_id,repeat}`.

**Tin đã thu hồi trong backfill** — `msgType: chat.undo`, `content: "[Tin nhắn]"`.
Driver bỏ qua, không tạo lại tin khách đã xoá.

Loại tin Zalo không có `content_type` trong lõi Chatwoot (danh thiếp, thẻ ngân hàng,
nhắc hẹn, cuộc gọi) được lưu ở `content_attributes.<kind>`, còn `content` giữ nhãn
đọc được (`lang/{en,vi}/conversations.php` → `messages.*`) để card hội thoại, tìm kiếm
và webhook không rỗng.

**Dedupe**: driver tra `source_id` trong phạm vi **inbox** (không phải hội thoại) —
lô `old_messages` sau khi bridge khởi động lại có thể chứa tin của hội thoại đã đóng.

**Tin vị trí** — Zalo gửi `msgType: chat.location.new` (biến thể cũ `chat.location`,
bridge nhận cả hai). Toạ độ KHÔNG nằm ở tầng ngoài mà trong **chuỗi JSON**
`content.params` (`{"isUserLocation":1,"srcId":"0","latitude":…,"longitude":…}`),
địa chỉ dạng chữ ở `content.description`. Bridge tự `JSON.parse` và phát ra:

```json
{
  "inbound_kind": "location",
  "content": "",
  "location": {
    "latitude": 10.111111,
    "longitude": 106.222222,
    "address": "Số 1 Đường Giả Định, Quận 1, TP.HCM",
    "url": "https://maps.google.com/?q=10.111111,106.222222"
  }
}
```

`title` chỉ có khi Zalo gửi kèm tên địa điểm; `url` do bridge dựng khi Zalo không
kèm `href`. Không đọc ra số → tin rơi về nhánh text thay vì mất hẳn.

### 1b. Tin nhóm (`thread_type: 1`)

MỌI tin nhóm — cả lane live lẫn lane backfill, cả tin do chính tài khoản bridge
gửi — mang thêm ba khối sau. Nhóm là MỘT hội thoại; người nói từng câu nằm ở
`sender`, không phải ở `user` (`user` là hồ sơ của **nhóm**).

```json
{
  "thread_type": 1,
  "thread": { "type": "group", "id": "7788", "name": "Nhóm Bán Hàng", "avatar": "https://…" },
  "sender": { "external_id": "555000111", "name": "Minh Anh", "avatar": "https://…" },
  "sender_uid": "555000111",
  "mentions": [{ "external_id": "555000222", "name": "Bình", "offset": 0, "length": 5 }]
}
```

| Trường | Ghi chú |
|---|---|
| `thread.name` | tên nhóm; chưa tra được thì bằng `thread.id` (không bao giờ rỗng) |
| `thread.avatar` | vắng mặt khi nhóm không có ảnh |
| `sender.external_id` | `uidFrom` của Zalo — khoá định danh thành viên |
| `sender.name` | `dName` của listener, hoặc hồ sơ tra được; bí quá thì bằng uid |
| `sender.avatar` | vắng mặt khi không tra được (lane backfill không gọi API) |
| `mentions[]` | từ `mentions` của zca (`{uid,pos,len}`); `name` là đoạn `@…` trong text |

Tên/ảnh nhóm được cache theo group id, **tối đa một lời gọi `getGroupInfo` mỗi
phút mỗi nhóm** — trước đây gọi mỗi tin, nhóm đông là đường thẳng tới khoá tài khoản.

### 1c. `friend_request` — Lời mời kết bạn

Lời mời kết bạn ĐẾN (`friend_event` type `REQUEST`, `isSelf: false`) đi đường
riêng, **durable qua outbox** như tin nhắn (không phải fire-and-forget):

```json
{
  "type": "friend_request",
  "connection_id": 6,
  "bot_id": 6,
  "personal_uid": "614700000000000000",
  "user": { "uid": "555000111", "name": "Minh Anh", "avatar": "https://…" },
  "message": "Chào shop, cho mình hỏi giá",
  "source_id": "zps:614700000000000000:<hash>"
}
```

- `message` chỉ có khi người mời nhập lời nhắn.
- `user.name`/`user.avatar` tra từ hồ sơ Zalo; tra hỏng thì `name` = uid, `avatar` = `null`
  — mất lời mời tệ hơn hiển thị tên xấu.
- `source_id` chỉ phụ thuộc (uid tài khoản, uid người mời, lời nhắn) nên Zalo bắn lại
  cùng lời mời sau reconnect vẫn ra một khoá → driver dedupe được.
- Bản thô `social_event`/`friend_event` vẫn gửi song song như cũ (không đổi).

### 2. `bridge_session` — Trạng thái kết nối

```json
{
  "type": "bridge_session",
  "connection_id": 1,
  "bot_id": 1,
  "state": "session_ok",
  "detail": null
}
```

**state values** (chỉ hai giá trị này; giá trị lạ bị driver bỏ qua êm):
- `"session_ok"` → model state: `connected`
- `"session_lost"` → model state: `session_lost` (+ detail = lý do)

**Khi nào bridge bắn `session_lost`** — mỗi lần rơi vào trạng thái mất phiên bắn
đúng MỘT lần (idempotent, vòng đăng nhập lại không spam):

| `detail` | Nguyên nhân | Bridge có tự nối lại không |
|---|---|---|
| `ws_closed_<code>_<reason>` | WebSocket đóng hẳn (zca-js đã thôi tự thử lại) | Có — trừ mã 3000/3003 (phiên bị kết nối khác chiếm) |
| `listener_error: …` | Lỗi đường truyền của socket | Có |
| `restore_failed: …` | Cookie đã lưu không đăng nhập được | Có, tới khi cookie sống lại hoặc bị gỡ |

Nối lại thành công thì bắn `session_ok` rồi backfill gap. Lỗi giải mã **một** frame
KHÔNG còn bắn `session_lost` (chỉ tăng bộ đếm `frame_error` ở `/health`) — trước
07/09/2026 nó khoá gửi giả và không bao giờ tự hồi.

### 2b. `relay_event` — Event WebSocket thô (fire-and-forget)

`disconnected` / `connected` của zca-js đi theo đường `relay_event` sẵn có, KHÔNG
phải `bridge_session` — chúng mô tả socket, không phải trạng thái nghiệp vụ của
phiên. Trạng thái nghiệp vụ chỉ có hai giá trị `session_ok` / `session_lost` ở trên.

### 3. `social_event` — Group/friend events (no-op D-1)

```json
{
  "type": "social_event",
  "social_kind": "group_event",
  "connection_id": 1,
  "bot_id": 1,
  "personal_uid": "...",
  "act": "...",
  "thread_id": "...",
  "event": {}
}
```

## Định tuyến sự kiện (nhánh `rewrite/chatwoot-laravel`)

Bản rewrite phân tách dữ liệu theo `account_id` như Chatwoot, KHÔNG dùng RLS nên
không còn bước bind TenantScope:

```
1. Kiểm secret trên header (VerifyZaloBridgeSecret)
2. connection_id > 0? không thì 400
3. Đẩy payload vào hàng đợi (ZaloEventsJob) và trả 200 ngay
4. Job: Channel\Zalo::find(connection_id) → inbox → xử lý theo `type`
   (kênh không tồn tại hoặc account ngưng hoạt động → bỏ qua êm)
```

## Bridge HTTP API (Laravel → bridge)

Chiều ngược lại của contract: lõi gọi bridge để tác động lên tài khoản Zalo.
Mọi route dưới đây dùng **cùng một cửa xác thực**:

```
POST http://127.0.0.1:3710/personal-messages/<hành động>
Header: X-Bridge-Send-Secret: <BRIDGE_SEND_SECRET>
Content-Type: application/json
```

Thiếu/sai secret → `403 {"ok":false,"message":"Forbidden"}`. Bridge chưa cấu hình
secret → `503` (fail-closed, không có đường bypass).

### Lỗi có cấu trúc

Ba route mới trả lỗi dạng `{"ok": false, "code": …, "message": …}`. Lõi rẽ nhánh
theo **`code`**, không parse `message` (message là chữ Zalo/bridge trả về, có thể đổi):

| `code` | HTTP | Nghĩa | Lõi nên làm gì |
|---|---|---|---|
| `bad_request` | 400 | tham số sai (lỗi của caller) | sửa lời gọi, KHÔNG thử lại |
| `session_lost` | 503 | phiên Zalo chưa sẵn sàng / đã mất | hiện banner kết nối lại, thử lại sau |
| `zalo_rejected` | 502 | Zalo nhận rồi từ chối (tin quá cũ, hết quyền…) | báo người dùng, không thử lại vô hạn |
| `unknown` | 500 | lỗi lạ (đã log ở bridge) | thử lại có backoff |

Tham số sai được kiểm **trước** trạng thái phiên — lỗi gọi sai của lõi không bị
che thành `session_lost`.

### Bảng contract

| Route | Body | zca gọi | Trả về khi OK |
|---|---|---|---|
| `POST /personal-messages/reaction` | `connection_id`, `thread_id`, `thread_type?` (0 mặc định / 1 = nhóm), `msg_id`, `cli_msg_id`, `icon` | `addReaction(icon, {data:{msgId,cliMsgId}, threadId, type})` | `{ok:true, source_id?}` |
| `POST /personal-messages/undo` | `connection_id`, `thread_id`, `thread_type?`, `msg_id`, `cli_msg_id` | `undo({msgId,cliMsgId}, threadId, type)` | `{ok:true}` |
| `POST /personal-messages/typing` | `connection_id`, `thread_id`, `thread_type?` | `sendTypingEvent(threadId, type)` | `{ok:true}` |

- **`icon`** nhận **emoji** (`"👍"`) hoặc **mã zca** (`"/-strong"`); bridge dịch
  emoji→mã bằng bảng soi gương của `app/Services/Zalo/ReactionIcons.php`.
  `""` hoặc `"none"` = **gỡ** cảm xúc. Emoji Zalo không có → `bad_request`
  `reaction_icon_unknown`: nếu để lọt xuống, zca đặt `rType = -1` và **âm thầm gỡ**
  cảm xúc thay vì báo lỗi.
- **`undo` chứ không phải `deleteMessage`**: `deleteMessage` là xoá-phía-mình và
  ném thẳng "use undo api instead" với tin của chính mình
  (`node_modules/zca-js/dist/apis/deleteMessage.js`). Thu hồi hai chiều = `undo`.
- **`thread_type`** không bắt buộc (mặc định 0 = chat 1-1) nhưng **phải gửi `1` cho
  nhóm** — zca gọi endpoint khác hẳn cho nhóm. Giá trị khác 0/1 → `bad_request`.
- `msg_id`/`cli_msg_id` lấy từ `platform_meta.zca_message` của tin đã lưu.

### `POST /personal-messages/send` — tên tệp và kiểu tệp

Ngoài các trường cũ (`text`, `file_url`, `media_kind`, `quote`, `sticker`), route
gửi nhận thêm:

| Trường | Bắt buộc | Vì sao |
|---|---|---|
| `filename` | nên gửi khi đính kèm tệp | zca lấy tên tệp gửi đi bằng `path.basename` của file tạm — không gửi thì **người nhận thấy `zbr-<uuid>.bin`**. Bridge giữ nguyên tên thật (kể cả tiếng Việt), chỉ bỏ phần đường dẫn |
| `content_type` | nên gửi | dùng để suy ra đuôi tệp khi `filename` không có đuôi; đứng **trước** content-type của storage vì signed URL hay trả `application/octet-stream` |

`send-batch` nhận cùng hai trường trên trong mỗi phần tử `items[]`.

## Response Codes — webhook `POST /webhooks/zalo`

(Cửa Laravel→bridge có bảng mã lỗi riêng ở mục **Bridge HTTP API** trên.)

| Code | Meaning |
|------|---------|
| 200  | Đã nhận (xử lý bất đồng bộ trong hàng đợi) |
| 400  | missing connection_id |
| 401  | secret không khớp / chưa cấu hình |
