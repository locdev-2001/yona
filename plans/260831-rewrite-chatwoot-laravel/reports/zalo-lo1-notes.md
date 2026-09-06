# Lô 1 — BRIDGE-SỐNG · ghi chú thi công (07/09/2026)

Agent `zalo-lo1-bridge`. Phạm vi sửa: `services/zalo-bridge/src/**` + hai file docs được giao.
KHÔNG đụng `app/`, `resources/`. KHÔNG commit. KHÔNG restart bridge :3710.

## Kết quả theo finding

| # | Mức | Trạng thái | Sửa ở đâu |
|---|---|---|---|
| 1.1 | 🔴 | XONG | `session-resilience.mjs` (`createReconnectSupervisor`, `attachSessionLifecycle`) + `index.mjs` (`reloginSlotFromSavedSession`, `listener.start({retryOnClose:true})`) |
| 1.2 | 🔴 | XONG | `session-resilience.mjs` (`safeAsync`, `installProcessGuards`) + bọc 5 handler listener trong `index.mjs` |
| 1.3 | 🟠 | XONG | `classifyListenerError` + `noteSlotAlive` (tự hồi) |
| 1.4 | 🟠 | KHÔNG LÀM | Đề xuất ở cuối — cần cache có TTL/LRU, đụng đường resolve profile, không thuộc 7 mục ưu tiên |
| 1.5 | 🟠 | XONG | `inbound-content.mjs::mediaCaptionFromContent` |
| 1.6 | 🟡 | XONG | `index.mjs` route `GET /health` |
| 1.7 | 🟡 | XONG | `redact.mjs` + 4 điểm log trong `index.mjs` |
| 1.8 | 🟡 | KHÔNG LÀM | Đề xuất ở cuối |
| 1.9 | 🟡 | KHÔNG LÀM | Đề xuất ở cuối |
| 1.10 | 🟡 | XONG (phần hợp nhất lane) | `inbound-content.mjs::applyInboundDescriptorToPayload` |
| 1.11 | 🟡 | XONG (dè dặt — xem cảnh báo) | `inbound-content.mjs::parseInboundLocation` |
| 1.12 | 🟡 | XONG | `inbound-content.mjs::parseInboundLinkPreview` |
| 1.13 | ⚪ | KHÔNG TÁI HIỆN ĐƯỢC | Xem "Finding không xác nhận" |
| 1.14 | ⚪ | NGƯỜI KHÁC ĐANG LÀM | `media-fetch.mjs` đã có thay đổi chưa commit của phiên khác — không đụng |

## Chi tiết

### 1.1 — WS rớt là nối lại được, không còn "inbox điếc im lặng"

Bằng chứng gốc đã kiểm lại tận nơi:
- `node_modules/zca-js/dist/apis/listen.js:98` — `start({ retryOnClose = false } = {})`, mặc định KHÔNG thử lại.
- `listen.js` `ws.onclose`: chỉ khi `retryOnClose && canRetry(code)` mới tự nối lại; ngược lại phát `closed`.
  `canRetry` còn bị chặn hai lớp nữa: `close_and_retry_codes` do **server Zalo** gửi xuống, và hạn mức
  `retries` — hết hạn mức là phát `closed` rồi im.
- `index.mjs` cũ chỉ xử lý `closed` với `KickConnection`/`DuplicateConnection`. Mọi mã khác (1006 rớt mạng
  thường) rơi vào khoảng trống: WS chết, không báo, Yona vẫn `connected`.

Đã làm:
1. `listener.start({ retryOnClose: true })` — để zca tự lo lớp thử lại của nó.
2. `closed` nhận **mọi mã** → `markSlotSessionLost()` (báo `bridge_session state=session_lost` ngay) →
   `reconnectSupervisor.schedule()` → `reloginSlotFromSavedSession()` đăng nhập lại từ cookie đã lưu,
   backoff **5s → 15s → 30s → 1m → 2m → 5m** (giữ 5m về sau, không bỏ cuộc).
3. Mã 3000/3003 vẫn báo mất phiên nhưng **không** nối lại — phiên đã bị kết nối khác chiếm, nối lại chỉ
   đá qua đá lại.
4. Cookie đã bị xoá (đã `POST /auth/logout`) → supervisor trả `abandon`, dừng hẳn.

Ba chỗ dễ sai đã chặn:
- `markSlotSessionLost` **idempotent** — vòng đăng nhập lại thất bại liên tiếp không spam webhook
  (trước đây `tryLoginWithSavedSession` bắn `session_lost` mỗi lần thua).
- `closed` và `error` cùng bắn cho MỘT lần rớt → supervisor dedupe, chỉ một lịch.
- Listener của lần login trước có thể phát event muộn → `ownsListener()` so `slot.api.listener` với
  tham chiếu lúc attach + cờ `listenerDetaching`; gỡ chủ động (logout/promote/relogin) không bị hiểu
  nhầm là rớt mạng.
- `clearSlot`/`promote` huỷ lịch nối lại **trước** khi xoá cookie — nếu không, timer treo sẽ đánh thức
  lại slot vừa gỡ kết nối.

### 1.2 — Một exception lạc không còn giết bridge của mọi tenant

- `safeAsync(label, fn)` bọc cả 5 handler listener. Cái nặng nhất là `message`: trước đây là
  `void (async () => {…})()` — mọi `await` bên trong (resolve profile, sticker, danh thiếp) reject là
  thành `unhandledRejection`.
- `process.on('unhandledRejection')` + `process.on('uncaughtException')` **log và đi tiếp, KHÔNG
  `process.exit`**. Đây là quyết định có chủ đích: một process giữ phiên Zalo của MỌI tenant, thoát =
  mọi khách mất inbox và phải quét lại QR. Để không thành cái thảm giấu bụi, mọi lần bắt đều tăng
  counter lộ ra `/health` — `uncaught_exception > 0` là có bug thật phải truy (đã ghi vào deployment.md).
- Bằng chứng thêm cho rủi ro này (tìm được khi đọc `listen.js`): `canRetry()` đọc thẳng
  `this.retryCount[code.toString()].count`. Nếu server đưa một mã vào `close_and_retry_codes` mà không
  có trong `retries`, đó là TypeError ném **bên trong `ws.onclose`** → trước đây đủ giết process.

Kiểm thật (không phải chỉ unit test): chạy một script dựng `installProcessGuards()` rồi ném cả lỗi đồng
bộ trong timer lẫn promise reject — process sống tiếp, counter lên 1/1, exit code 0.

### 1.3 — Lỗi decode một frame không còn bị coi là mất phiên

`listen.js` `ws.onmessage` có `catch { this.emit("error", error) }` — tức là **cùng một event `error`**
mang cả lỗi đường truyền (ws.onerror) lẫn lỗi giải mã một frame. Code cũ đặt `loginPhase='session_lost'`
cho mọi `error` ⇒ khoá gửi giả và không bao giờ tự hồi.

`classifyListenerError()` phân loại: ErrorEvent của thư viện `ws` (có `target`/`type='error'`), mã lỗi
socket của Node, hoặc thông điệp đặc trưng → `transport`; còn lại → `decode`.

Nghiêng về `decode` là có chủ đích: lỗi transport luôn kéo theo `closed`/`disconnected` nên nhận nhầm về
phía `decode` vẫn được cứu; nhận nhầm về phía `transport` chính là con bug 1.3.

Tự hồi: `noteSlotAlive()` gọi ở đầu handler `message` và `cipher_key` — còn nhận được frame trong khi
slot đang `session_lost` thì báo lại `session_ok` và huỷ lịch nối lại.

### 1.5 — Chú thích ảnh/video/tệp

Đường cũ: `extractMediaCaption` → `extractInboundPlainText` dựng chuỗi `[Link] <title> <href>` rồi
**tự lọc bỏ chính chuỗi mình vừa dựng** (vì `pl.startsWith('[Link]') && pl.includes(href)`) ⇒ chú thích
biến mất ở **mọi** lane, trong khi `tests/Fixtures/channels/zalo_inbound_image.json` hứa
`"content": "Ảnh sản phẩm"`.

`mediaCaptionFromContent(content, msgType)` lấy thẳng từ content-object. Hai chỗ tinh:
- `share.file` để **tên tệp** ở `title` → chỉ đọc `description`.
- Bỏ khi chú thích chỉ là chính URL, hoặc là một tên tệp trần (`IMG_2048.jpg`) — Zalo có lúc điền
  title bằng tên tệp gốc.

`extractMediaCaption` và `normalizeUrlForCompare` (không còn ai dùng) đã xoá.

### 1.6 — `/health`

- **Bắt buộc** `checkUiSecret` (403 nếu thiếu) — route này trả uid, tên, avatar của tài khoản Zalo.
- **Resolve-only**: `slots.get()` thay `getSlot()` (không get-or-create) và **bỏ hẳn** nhánh ghi
  `writeSlotMetaForKey(slotKey, { bot_id: qBot })`. Nhánh đó ghi đè meta chỉ với `bot_id` ⇒ **mất
  `workspace_id`** ⇒ dispatcher `/zca` fail-closed 403 `workspace_binding_missing` sau đó.
- Liveness không định danh giữ nguyên ở `GET /` (đã có sẵn, không auth, không tham số) — dùng cho pm2/nginx.
- Thêm khối `resilience` (counter rớt/nối lại/handler lỗi/frame hỏng) để đo trên tài khoản thật.

**Tương thích:** driver Laravel nhánh này **không gọi** bridge `/health` (kiểm cơ học: `ZaloBridgeClient`
chỉ có `/auth/qr/*`, `/auth/logout`, `/personal-messages/send`; route Laravel `/zalo/health` đọc từ DB,
không đi qua bridge). `docs/zalo-bridge/deployment.md` vốn đã ghi lệnh curl kèm `X-Bridge-UI-Secret`.

### 1.7 — Log

`redact.mjs`: `rawPayloadLogEnabled` / `debugLogEnabled` / `shortToken` / `maskUid` / `rawPayloadLogWarning`.

- `ZALO_BRIDGE_LOG_QUOTE` **đảo thành opt-in** (`=== '1'`). Trước đây mặc định BẬT (chỉ tắt khi `=0`) và
  in nguyên `message.data` tới 16KB mỗi tin — pm2 không xoay log, tức là một bản sao inbox nằm ngoài mọi
  kiểm soát truy cập.
- Token QR trong log còn 8 ký tự đầu; uid Zalo che còn 4 số cuối (3 điểm log).
- Bật ở `NODE_ENV=production` → cảnh báo lúc boot.
- `ZALO_BRIDGE_DEBUG_FRIEND_REQUESTS` trong `routes/ui-actions.mjs` **đã sẵn là opt-in** từ trước —
  không đụng, chỉ ghi vào bảng cờ trong docs.

### 1.10 / 1.11 / 1.12 — làm thêm vì rẻ và đang có seam hở

Đọc `git status` thấy phiên khác **đã dựng xong phía driver**: `IncomingMessageService::locationAttachment()`
đọc `params['location']`, `linkAttachment()` đọc `params['link']`, kèm fixture
`zalo_inbound_location.json` / `zalo_inbound_link.json`. Bridge thì **chưa bao giờ phát hai kind đó** →
code driver + fixture đang là nhánh chết. Đã nối lại:

- `parseInboundLocation` — `chat.location` → `{latitude, longitude, title?, address?, url}` đúng shape
  driver đang đọc.
- `parseInboundLinkPreview` — `chat.link`/`chat.webcontent`/`chat.recommended` → `{url, title?,
  description?, thumb?}`. Đặt **sau** toàn bộ phép loại banner (`shouldDropZaloLinkBanner`,
  `plainTextIsLinkOnlyZaloBanner`) và sau nhánh danh thiếp, nên không hồi sinh thứ đang bị bỏ đúng.
- `applyInboundDescriptorToPayload` — gộp hai chuỗi `if/else` ánh xạ descriptor→payload (lane live và
  lane backfill) về **một** chỗ. Đây chính là cái bẫy 1.10: thêm kind mới mà chỉ sửa một lane thì lane
  kia nuốt im lặng. Sync có chủ đích (lane backfill chạy đồng bộ trong `relay-forwarder`); thứ cần gọi
  API Zalo (sticker, danh thiếp) do lane tự resolve rồi truyền vào.

> **CẢNH BÁO 1.11 — chưa có bằng chứng payload thật.** Zalo không công bố shape `chat.location` và
> zca-js cũng không mô hình hoá (`Message.d.ts` chỉ có `msgType: string`). Đã viết đọc rộng
> (`lat|latitude` × `long|lng|lon|longitude`, số hoặc chuỗi) và **trả `null` khi không ra số** để rơi về
> đúng đường cũ — sai shape thì không hồi quy, chỉ là chưa bắt được. **Cần một tin vị trí thật** trên
> tài khoản founder để chốt. Cách lấy bằng chứng: bật `ZALO_BRIDGE_DEBUG_LOG=1`, gửi một vị trí từ điện
> thoại, đọc `[zalo-bridge:quote-inspect]` trong log, rồi tắt cờ.

### Finding 1.13 — không xác nhận được

Audit nói "bridge đọc `cateId` nhưng payload thật dùng `catId`". Đọc lại
`inbound-content.mjs::stickerIdFrom` và `withStickerUrl`: **không có** chữ `cateId` hay `catId` nào
trong file. `grep -rn "cateId\|catId" services/zalo-bridge/src/` = 0. Nhiều khả năng finding này viết từ
nhánh `main` hoặc đã được sửa trong worktree. Không sửa gì.

## Ngoài phạm vi được giao nhưng có đụng (nói rõ để phiên chính duyệt)

1. **`src/outbox.mjs` + `src/outbox.test.mjs` — test flaky có sẵn.**
   Test `enqueue 3, mock 503 503 200 → FIFO giữ tới khi 200 rồi xóa` hỏng ngẫu nhiên ~1/6 lần
   (đo: 6 lần chạy, 1 lần `not ok 30`). Nguyên nhân: `enqueue()` kết bằng `void this.drain()`
   fire-and-forget; ba lần enqueue của test kích ba drain nền chạy xen kẽ, ăn mất phản hồi trong mảng
   `responses` theo thứ tự ngẫu nhiên. Đã thêm option `kickOnEnqueue` (mặc định `true` — **production
   không đổi hành vi**) và test đó truyền `false`, cùng lý do đã tắt `setInterval`. Sau sửa: 8 lần chạy
   liên tiếp đều xanh. Không sửa thì DoD "node --test xanh" là ngẫu nhiên.

2. **Chốt chặn `index.mjs` chỉ boot khi là entrypoint** — xem mục Sự cố bên dưới.

## Sự cố trong lúc làm (báo cáo đầy đủ)

Tôi chạy `node -e "import('./src/index.mjs')"` để kiểm import có lỗi symbol không. **Đó là sai lầm:**
`index.mjs` gọi `boot()` ngay khi load, và `bootRestoreAllSessions()` đọc `.sessions/c6.json` — phiên
Zalo THẬT của founder. Process đã kịp `Logged in as <uid-shop>` và `restored session
connection_id= 6` trước khi tôi kill.

Đã kiểm ngay sau đó bằng một `GET /health?connection_id=6` **read-only** (không truyền `bot_id` nên
không kích nhánh ghi meta của code cũ đang chạy):
`phase: "ready"`, `connected: true`, `session_lost: false`, `session_lost_reason: null`.
**Phiên thật KHÔNG bị ảnh hưởng** — process bị giết trước khi listener kịp mở WebSocket thứ hai, và nó
cũng chưa bao giờ bind được :3710. Không có process lạ còn sống.

Để chuyện này không lặp lại với bất kỳ phiên nào sau: `boot()` giờ chỉ chạy khi `index.mjs` là
entrypoint thật (`path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)`). pm2 chạy
`node src/index.mjs` nên không đổi gì; `import` thì in cảnh báo và **không boot phiên nào**. Đã kiểm:
`node -e "import('./src/index.mjs')"` giờ in `KHONG boot phien nao` rồi thoát sạch.

## Kiểm chứng

```
node --test services/zalo-bridge/src/*.test.mjs
# tests 96 # pass 96 # fail 0   (chạy 3 lần liên tiếp, ổn định)
```

Tăng từ 61 → 96 test. Test mới: `session-resilience.test.mjs` (16), `redact.test.mjs` (5),
`inbound-content.test.mjs` +14.

Test khoá đúng ba mục DoD:
- **1.1** — `ws close 1006 → post session_lost rồi relogin theo backoff 5s`; backoff nới dần
  `5s→15s→30s`; `abandon` dừng hẳn; relogin ném lỗi vẫn hẹn lại; 3000/3003 không nối lại;
  `closed`+`error` cùng bắn chỉ ra một lịch. Test chạy **đúng dây thật** (`attachSessionLifecycle`,
  cùng hàm `index.mjs` gọi) với `EventEmitter` giả + timers giả, không phải bản chép.
- **1.2** — handler ném lỗi đồng bộ: handler sau vẫn chạy, `emit` không ném ra ngoài; handler async
  reject bị nuốt; process guard đếm 1/1 và **không** gọi `exit`.
- **1.5** — `{title:'Ảnh sản phẩm', href:…}` → `content = 'Ảnh sản phẩm'`; `share.file` phân biệt tên
  tệp với chú thích; title là URL/tên tệp → không thành chú thích.

Kiểm ngoài unit test:
- Boot bản sao cô lập (`/tmp/.../bridge-smoke`, `.sessions` RỖNG, cổng 37199 — **không** đụng :3710):
  `GET /` → `200 OK`; `GET /health` thiếu secret → **403**; có secret → **200** kèm khối `resilience`;
  thư mục `.sessions` vẫn **0 file** sau khi gọi `/health?connection_id=6&bot_id=6` (chứng minh 1.6 đã
  hết side-effect ghi meta).
- Process guard: script thật ném lỗi đồng bộ + promise reject → process sống, exit 0.
- `node --check` sạch trên mọi file sửa; `import` module sạch (chứng minh không thiếu export nào).

**KHÔNG chạy Pest** — không sửa file PHP nào.

## Contract webhook

`docs/zalo-bridge/webhook-contract.md`: **không đổi tên trường nào đang dùng.**
- Bảng `inbound_kind`: ghi rõ chú thích → `content` cho `video`/`file` (trước chỉ ghi ở `image/gif`) +
  đoạn giải thích nguồn chú thích (`title`, `share.file` dùng `description`). Driver đọc `content` qua
  `IncomingMessageService::content()` — media có `card === null` nên chuỗi đi thẳng, **không phải sửa gì**.
- Mục `bridge_session`: thêm bảng "khi nào bắn `session_lost`" (3 nguyên nhân + cột có tự nối lại không)
  và ghi rõ chỉ có hai state hợp lệ.
- Mục mới `2b`: nói rõ `disconnected`/`connected` đi đường `relay_event` sẵn có, **không** phải
  `bridge_session`.

> Về yêu cầu "post `session_lost`/`disconnected`": đã kiểm `BridgeEventService::handleSession()` — driver
> chỉ nhận `session_ok`/`session_lost`, state lạ rơi vào `default => null` và bị bỏ qua êm. Nên tôi
> **không** bịa thêm state `disconnected` (sẽ là payload chết). Event `disconnected` của zca-js vốn đã
> được `attachRelayForwarder` đẩy sang Laravel dạng `relay_event` fire-and-forget từ trước — đã ghi vào
> contract thay vì làm trùng.

Hai kind mới `location` / `link` **chưa** ghi vào bảng contract vì phía driver do phiên khác đang làm và
chưa commit — để phiên đó chốt tên trường rồi bổ sung một lần, tránh hai chỗ mô tả lệch nhau. Shape
bridge phát bám đúng `tests/Fixtures/channels/zalo_inbound_{location,link}.json` mà phiên đó đã đặt.

## Khởi động lại bridge — CHƯA LÀM, phiên chính làm

**Tôi không restart :3710** (đang giữ phiên Zalo thật của founder). Mọi thay đổi ở trên **chỉ có hiệu
lực sau restart**. Đã viết mục "Khởi động lại bridge" trong `docs/zalo-bridge/deployment.md`; tóm tắt:

```bash
cd services/zalo-bridge && pnpm pm2:restart
```

Kiểm sau restart, theo thứ tự:

1. `curl http://127.0.0.1:3710/` → `OK`.
2. `curl -s "http://127.0.0.1:3710/health?connection_id=6" -H "X-Bridge-UI-Secret: <UI_SECRET>" | jq '{phase, connected, session_lost_reason, resilience}'`
   → phải `phase: "ready"`, `connected: true`. **Từ nay thiếu header là 403** — đó là hành vi đúng, không
   phải bridge hỏng.
3. `curl -s "http://127.0.0.1:3710/health?connection_id=6" | head -c 80` → phải ra `{"ok":false,"message":"Forbidden"}` (xác nhận 1.6).
4. `pm2 logs zalo-personal-bridge --lines 50 | grep -E "restored session|mat phien|hen dang nhap lai"`
   → có `restored session connection_id= 6 uid= ******1247` (uid đã che = 1.7 chạy).
5. Kiểm `resilience` trong `/health`: sau vài phút `uncaught_exception` và `unhandled_rejection` phải
   vẫn là `0`. Khác `0` là có đường async chưa bọc — đọc log tìm `zalo-bridge: uncaughtException`.
6. Kiểm `.sessions/c6.json.meta.json` **còn nguyên `workspace_id`** sau khi gọi `/health` (1.6).
7. Nghiệm thu 1.1 trên máy thật (không bắt buộc, nhưng đáng làm một lần): ngắt mạng máy chạy bridge
   ~30 giây rồi nối lại. Kỳ vọng: log có `mat phien connection_id= 6 ws_closed_1006…` → `hen dang nhap
   lai slot= 6 attempt= 1 delay_ms= 5000` → `dang nhap lai THANH CONG`; UI Yona hiện banner mất kết nối
   rồi tự hết; `resilience.relogin_ok` tăng 1.
8. Nghiệm thu 1.5: gửi cho tài khoản Zalo của bridge một **ảnh có chú thích** → tin trong Yona phải hiện
   chữ chú thích dưới ảnh (trước đây luôn rỗng).

Nếu sau restart một slot kẹt `session_lost` mà `resilience.relogin_pending = true` thì **cứ chờ hết
backoff (tối đa 5 phút)** rồi kiểm lại — bridge đang tự thử. Chỉ khi hết chu kỳ vẫn `session_lost` mới
là cookie chết và phải quét QR lại từ UI.

## Đề xuất cho lô sau (không làm trong lô này)

- **1.4 (🟠 N+1 gọi API mỗi tin)** — `resolvePeerProfile`/`resolveGroupProfile`/`resolveStickerForWebhook`
  gọi mỗi tin. Đề xuất: một `Map` cache theo slot, TTL 6h, cap ~5k, đặt cạnh `slotGroupNameCache` đã có
  sẵn tiền lệ. Nên làm cùng lúc với 2.3 (làm mới tên/avatar) vì hai bên cùng đụng đường resolve profile
  — làm riêng dễ đá nhau.
- **1.8 (🟡 event chatty)** — `CONSUMED_RELAY_EVENTS` cấu hình một chỗ ở bridge + `AbortSignal.timeout(5000)`
  + cap in-flight cho `postRelayFireAndForget`. Hiện hàm này `fetch(...).catch(() => {})` **không có
  timeout**: Laravel treo là in-flight dồn vô hạn. Đây là rủi ro thật, rẻ, nên làm sớm.
- **1.9 (🟡 backfill không cursor)** — lưu `lastMsgId` mỗi lane vào meta slot, debounce ≥60s/slot.
  Đụng `reconnect-backfill.mjs` + format meta; cần đo cùng lúc với guard 200 tin/phút phía Laravel nên
  để nguyên lô.
- **1.10 phần còn lại** — `inbound_kind: 'unsupported'` cho loại tin chưa nhận dạng (doodle, todo, poll,
  zinstant khác). Phần hợp nhất hai lane đã xong nên giờ chỉ còn thêm một nhánh ở **một** chỗ, nhưng lõi
  phải chốt trước `is_unsupported` hiển thị ra sao — hỏi phiên chính.
- **`.env.example`** — nên thêm khối cờ log mới (`ZALO_BRIDGE_DEBUG_LOG`). File này đang có thay đổi chưa
  commit của phiên khác nên tôi không đụng. Dòng `# ZALO_BRIDGE_LOG_QUOTE=0` hiện có vẫn đúng nghĩa
  (chỉ `=1` mới bật), chỉ là thừa.

## Dọn dẹp

- Không commit, không `git add`, không đụng file ngoài phạm vi.
- Thư mục thử `/tmp/claude-1000/.../scratchpad/bridge-smoke` là bản sao cô lập, `.sessions` rỗng, cổng
  37199 — không còn process nào chạy.
- Không tạo/xoá dữ liệu nào trên account 3, không đụng oracle, không chạy DB.

```
Status: DONE_WITH_CONCERNS
Summary: Xong 7 mục ưu tiên (1.1 1.2 1.3 1.5 1.6 1.7) + làm thêm 1.10/1.11/1.12 vì phía driver đã dựng xong và đang hở seam; 96/96 test xanh, bridge KHÔNG restart.
Concerns/Blockers:
  1. Mọi thay đổi chỉ có hiệu lực SAU khi phiên chính restart :3710 — quy trình kiểm 8 bước ở mục "Khởi động lại bridge".
  2. `/health` từ nay BẮT BUỘC X-Bridge-UI-Secret (403 nếu thiếu). Driver Laravel không gọi route này nên không ảnh hưởng, nhưng script/monitor ngoài repo nếu có thì phải sửa — dùng `GET /` cho uptime check.
  3. 1.11 (chat.location) viết theo suy đoán shape, CHƯA có payload thật; sai thì không hồi quy (rơi về đường cũ) nhưng cần một tin vị trí thật để chốt.
  4. `location`/`link` chưa ghi vào webhook-contract.md — chờ phiên làm driver chốt tên trường để không mô tả lệch nhau.
  5. Sự cố: tôi lỡ `import` index.mjs làm nó đăng nhập vào phiên Zalo thật của founder; đã kill ngay và xác minh phiên còn `ready`/`connected: true`, không thiệt hại. Đã thêm chốt chặn boot-chỉ-khi-là-entrypoint để không lặp lại.
  6. Đã đụng outbox.mjs/outbox.test.mjs ngoài phạm vi 7 mục để vá một test flaky có sẵn (thêm option `kickOnEnqueue`, production giữ nguyên hành vi) — cần phiên chính duyệt.
```
