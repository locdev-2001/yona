# Lô 8 — BẢO MẬT & VẬN HÀNH · ghi chú thi công (07/09/2026)

Agent `zalo-lo8-security`. Không commit. Không gọi/restart bridge `:3710`.
Gate: Pest trên DB riêng `yona_rw_test_lo8`, `node --test` cho bridge, `vendor/bin/pint --test`.
Không đụng FE nên không chạy `tsc`.

## Bảng finding · trạng thái · file

| # | Mức | Trạng thái | Ở đâu |
|---|---|---|---|
| 8.3 | 🟡 | **XONG** | `app/Models/Attachment.php`, `app/Http/Controllers/AttachmentsController.php`, `routes/web.php`, `config/yona.php` |
| 8.4 | 🟡 | **XONG một nửa** (đường webhook) — đường API dashboard còn hở, ngoài phạm vi | `app/Services/Webhooks/PayloadRedactor.php` (mới), `Trigger.php`, `config/webhooks.php` |
| 8.1 | 🟠 | **XONG phần quyền tệp** (0700/0600 + siết tệp cũ lúc boot); mã hoá at-rest = **thiết kế đã ghi, chưa thi công** | `services/zalo-bridge/src/session-store-fs.mjs` (mới), `index.mjs`, `docs/zalo-bridge/deployment.md` |
| 8.7 | 🟡 | **XONG** — chốt bất biến thời gian + supervisor mẫu | `config/queue.php`, `docs/zalo-bridge/deployment.md` |
| 8.8 | 🟡 | **XONG phần ghi luật** (`queue:restart`) | `docs/zalo-bridge/deployment.md` |
| 8.10 | 🟡 | **XONG** phần bridge (một `safeEqual` dùng chung + bỏ query string) | `services/zalo-bridge/src/secret-compare.mjs` (mới), `index.mjs`, `routes/zca-dispatch.mjs` |
| 8.12 | ⚪ | **XONG** phần docs lệch code (`make bridge` không tồn tại, zca-js 2.1.2, `BRIDGE_ELEVATED_SECRET`, backup `.sessions`) | `docs/zalo-bridge/deployment.md` |
| 8.2 | 🟡 | **CHƯA** — không tự sửa, ngoài phạm vi file | đề xuất bên dưới |
| 8.5 | 🟡 | **CHƯA** — ngoài phạm vi file | đề xuất bên dưới |
| 8.6 | 🟠 | **CHƯA** — ngoài phạm vi file, **rủi ro cao nhất còn lại** | đề xuất bên dưới |
| 8.9 | 🟡 | **CHƯA** — ngoài phạm vi file (`routes/*.php` là file dùng chung) | đề xuất bên dưới |
| 8.11 | 🟠 | **CHƯA** — báo cáo của agent khác, không tự sửa | đề xuất bên dưới |
| 8.13 | ⚪ | **KHÔNG LÀM** đúng chỉ đạo (`quota-gate-removed`) | — |
| 8.14 | ⚪ | **CHƯA** — ngoài phạm vi file | đề xuất bên dưới |

---

## 1. URL đính kèm đã ký (8.3)

### Đối chiếu gốc trước khi sửa
`refs/chatwoot/app/models/attachment.rb`:
- `file_url` = `url_for(file)` → `/rails/active_storage/blobs/redirect/<signed_id>/<tên tệp>`.
  `signed_id` là chữ ký HMAC của blob id; `config.active_storage.urls_expire_in` không được
  đặt ở bất kỳ `config/environments/*.rb` nào của Chatwoot ⇒ **URL trong app KHÔNG hết hạn**,
  nhưng **không đoán được**.
- `download_url` = `file.blob.url` → URL dịch vụ đĩa, ký **hạn 5 phút**
  (`ActiveStorage::Service.url_expires_in` mặc định). Đây là URL dành cho dịch vụ bên ngoài.

Bản port trước đây trả `/attachments/{id}/{filename}`: `id` là số tăng dần, `filename` là tên
gốc người dùng đặt (`hoa-don.pdf`, `IMG_1234.jpg`). Không auth, không chữ ký ⇒ đoán được ⇒ lỗi
lõi, mọi tenant. Đường dẫn trên đĩa là `Str::random(40)` nên chỉ hạ mức chứ không xoá được rủi ro:
route chuyển hướng chính là thứ biến id đoán được thành tệp thật.

### Đã làm
- Route đổi thành `/attachments/{attachment}/{token}/{filename}`. **Chữ ký nằm trong ĐƯỜNG DẪN,
  không phải query string** — bắt buộc, vì giao diện lấy tên hiển thị bằng `url.split('/').pop()`
  (`sharedAttachments.ts::fileNameFromUrl`, `GalleryView.tsx`); nhét `?signature=` vào là tên tệp
  hiện ra thành `hoa-don.pdf?expires=…`. Đây cũng đúng chỗ ActiveStorage đặt `signed_id`.
- `Attachment::fileToken(int $id, ?int $exp)` = `base64url({"id":…,"exp":…}) . "." . base64url(HMAC-SHA256)`,
  khoá = `config('app.key')`, verify bằng `hash_equals`.
- Hai mức đúng như gốc:
  - `fileUrl()` / `thumbUrl()` → `exp = null`, không hết hạn (thay `blobs/redirect`), dùng cho
    `data_url`/`thumb_url` trong `pushEventData`, email thông báo, macro, logo portal;
  - `downloadUrl()` → có hạn `config('yona.attachments.download_url_ttl')` = 300s (thay `blob.url`),
    dùng bởi mọi driver gửi ra ngoài (Zalo bridge, Meta, Twilio, Telegram, LINE, Slack…).
- Hạn rơi vào **mốc cố định** (`(intdiv(time(),$ttl)+2)*$ttl`) chứ không phải `now()+5 phút`:
  hai lần dựng URL cho cùng một tệp trong cùng cửa sổ ra ĐÚNG một chuỗi. Cần thiết vì
  `tests/Contracts/Channels/Contracts/OutboundAttachmentsContract.php:45` so chuỗi URL đã gửi với
  `$attachment->downloadUrl()` gọi lại — nếu hạn tính theo `time()` thì test chớp tắt qua ranh giới
  giây. Tuổi thọ thực 5–10 phút.
- Controller kiểm chữ ký **trước** khi kiểm tên tệp (403 trước 404) để không thành oracle dò tên tệp.

### Tương thích đã kiểm
- **Bridge**: `services/zalo-bridge/src/media-fetch.mjs::assertUrlAllowed` chỉ allowlist theo
  **host**, không theo path ⇒ thêm một đoạn đường dẫn không ảnh hưởng. Vòng đời cũng an toàn:
  `SendOnZaloService::attachmentUrl()` dựng URL ngay trong job rồi bridge fetch đồng bộ; outbox
  của bridge (`outbox.mjs`) chỉ retry chiều **bridge → Laravel**, không giữ `file_url`.
- **`SendReplyJob` retry**: URL dựng lại mỗi lần chạy ⇒ luôn còn hạn.
- **LINE**: `SendOnLineService:63` đã cố ý dùng `fileUrl()` (không hết hạn) thay `downloadUrl()` —
  giữ nguyên, giờ nhận xét đó mới đúng với code.
- **Widget/public**: URL đã ký vẫn mở được không cần đăng nhập, đúng như `blobs/redirect` của gốc.
- **Harness `ALLOW_PRIVATE_WEBHOOK_URLS`**: không đụng — cờ đó thuộc `SafeHttp`, không liên quan
  chữ ký đính kèm.
- Không có chỗ nào trong `resources/` hay Blade tự dựng `/attachments/…` bằng tay (đã grep).

### Test khoá (`tests/Feature/Models/AttachmentTest.php`)
- URL ký hợp lệ → redirect; chữ ký rác → **403**; URL 3 đoạn kiểu cũ → 404.
- Chữ ký cấp cho đính kèm KHÁC → 403 (chống dùng chéo).
- Chữ ký đã hết hạn → 403.
- `fileUrl()` có `exp = null`, `downloadUrl()` có `exp` trong tương lai ≤ +600s, và hai lần gọi ra
  cùng một chuỗi.

### ⚠️ Việc vận hành bắt buộc
Sau khi nhận thay đổi này: **`php artisan queue:restart`**. Worker đang chạy giữ `Attachment` cũ
trong RAM và sẽ phát broadcast/webhook mang URL 3 đoạn — URL đó nay 404. URL cũ đã gửi đi trước
đây (email thông báo cũ) cũng hỏng vĩnh viễn; chấp nhận được vì nhánh chưa lên production.

---

## 2. PII qua API / webhook / agent bot (8.4)

### Rà lại trước khi sửa — một phần finding ĐÃ được lô 2 xử lý
`IncomingMessageService::zcaMessage()` **không còn** bê nguyên `listener_data`: nó đã lọc còn đúng
8 trường `ZCA_QUOTE_FIELDS`.

### Không cắt tiếp xuống `msgId/cliMsgId/ts` — có căn cứ
Đề bài gợi ý cắt còn 3 trường. **Không làm được**: đọc thẳng
`services/zalo-bridge/node_modules/zca-js/dist/apis/sendMessage.js:180-196`, chiều gửi trích dẫn cần
đủ cả 8 — `qmsgOwner: quote.uidFrom`, `qmsg: quote.content` (hoặc `prepareQMSG(quote)` đọc
`content.params`), `qmsgType: getClientMessageType(quote.msgType)`, `qmsgTs: quote.ts`,
`qmsgTTL: quote.ttl`, `qmsgAttach: prepareQMSGAttach(quote)` đọc `propertyExt`/`content`.
Cắt xuống 3 trường = **trả lời trích dẫn trên Zalo hỏng**. `SendOnZaloService::QUOTE_REQUIRED_FIELDS`
đã ghi đúng nhu cầu đó.

### Đã làm — cắt ở CỬA RA, không cắt ở kho
Giữ ảnh chụp trong DB (chiều gửi cần), chặn nó ra ngoài:
- `app/Services/Webhooks/PayloadRedactor.php` (mới) — bóc các khoá đã khai khỏi **mọi** map
  `content_attributes` trong payload (đệ quy, cap 8 tầng: payload có `conversation.messages[]`).
- Gắn vào `Trigger::performRequest()` — **một cửa ra HTTP duy nhất** cho cả ba loại webhook
  (tài khoản, inbox API, agent bot), nên không phải rải ở từng driver.
- Danh sách khoá khai ở `config/webhooks.php::redacted_content_attributes = ['zca_message','sticker']`
  ⇒ lõi không mang tên riêng của kênh nào **trong mã**; driver mới chỉ thêm khoá vào danh sách.
- Test khoá trong `tests/Feature/Jobs/WebhookJobTest.php`: `zca_message`/`sticker` biến mất cả ở
  tầng gốc lẫn trong `conversation.messages[]`, `in_reply_to_external_id` vẫn còn.

### Quyết định có căn cứ: KHÔNG cắt `content_attributes.quote`
`quote` thô mang `text` + `sender_name` của tin được trích dẫn. Đó là **nội dung người dùng nhìn
thấy**, cùng hạng với `content`, không phải payload nội bộ nền tảng — và khi tin gốc chưa có trong
DB (khách trích tin gửi trước lúc kết nối) thì nó là dấu vết duy nhất để dựng khối trích dẫn. Cắt đi
là mất giá trị sản phẩm chứ không phải giảm rủi ro.

### Đã ghi thành quy tắc chung
`docs/channel-capabilities.md` §3 — hai mục mới: "Dữ liệu thô của nền tảng không đi qua mặt tiền
công khai" và "Tệp đính kèm đi ra ngoài phải là URL đã ký, có hạn".

### Còn hở — ngoài phạm vi file, cần phiên khác
`MessageResource::toArray/pushEventData/webhookData` trả `content_attributes` **nguyên vẹn** ra API
dashboard (`app/Http/Resources/MessageResource.php` không nằm trong phạm vi được giao). Đề xuất:
gọi cùng `PayloadRedactor::redact()` ở `MessageResource::toArray()` và `webhookData()`, **không**
ở đường broadcast realtime của dashboard nếu về sau FE cần đọc — hiện FE **không** đọc
`zca_message`/`sticker` (đã grep `resources/js`, 0 kết quả), nên cắt được cả hai đường.
Kiến trúc lý tưởng hơn: cho driver tự khai qua `DeclaresCapabilities` (`internalContentAttributeKeys()`)
thay vì liệt kê ở config — cần sửa `app/Models/Channel/**` (lô 6 sở hữu).

---

## 3. Cookie phiên Zalo (8.1)

Trước: `.sessions/` mode 775, `c6.json` mode **664** — mọi user trên máy đọc được **toàn quyền tài
khoản Zalo cá nhân** (đăng nhập bằng cookie, không cần OTP). Trái chuẩn trong repo (Telegram
`bot_token` cast `encrypted`).

### Đã làm — `services/zalo-bridge/src/session-store-fs.mjs` (mới)
Một cổng duy nhất ghi vào kho phiên: thư mục `0700`, tệp `0600`.
Ba cái bẫy đã chặn:
- `mode` của `fs.mkdir`/`fs.writeFile` **chỉ áp khi TẠO MỚI** và còn bị umask trừ đi ⇒ mỗi lần ghi
  đều `chmod` lại tường minh;
- `fs.copyFile` (promote qr→connection) **giữ mode nguồn** ⇒ `copySessionFile()` chmod ngay sau khi chép;
- tệp do bản bridge cũ ghi (664) sẽ không bao giờ tự đổi ⇒ `hardenSessionStore()` chạy đầu `boot()`,
  siết mọi tệp và log `siết quyền N tệp phiên`.

Điểm ghi đã chuyển sang cổng này: `writeSlotMetaForKey`, ghi cookie khi `GotLoginInfo`
(`index.mjs:2358`), `promoteQrToConnection`, và mọi `fs.mkdir(SESSIONS_DIR)` còn lại.
Test: `src/session-store-fs.test.mjs` (5 case, gồm ghi đè tệp 664 và bản sao từ tệp 666).

### Mã hoá at-rest — thiết kế, CHƯA thi công (có lý do)
Đã ghi đầy đủ vào `docs/zalo-bridge/deployment.md` §"Mã hoá at-rest (`BRIDGE_SESSION_KEY`)":
AES-256-GCM, tệp `{v:1,iv,tag,data}`, đọc tệp thiếu `v` ⇒ plaintext cũ ⇒ ghi đè lại dạng mã hoá
(tự di trú), production thiếu khoá ⇒ từ chối boot, đổi khoá = quét QR lại.
Không thi công trong phiên này vì phải **restart bridge đang giữ phiên thật của founder** và phải
có sẵn phương án quét QR dự phòng nếu di trú hỏng — cần cửa sổ vận hành do founder chốt.
Quyền `0600` chặn user khác trên cùng máy; nó **không** chặn backup/ảnh đĩa bị lộ — đó chính là
phần mã hoá còn nợ.

---

## 4. Worker / vận hành (8.7, 8.8)

**Quyết định: giữ `default`, KHÔNG tách hàng đợi `high` riêng cho job Zalo.** Job Zalo đã nằm đúng
tier theo phân tầng của gốc (`StopTypingJob` → `critical`, `ZaloHealthSweepJob` → `scheduled_jobs`);
vấn đề thật không phải "thiếu tier" mà là **worker chạy thiếu `--queue`**: `queue:work redis` trần
chỉ rút `default`, mọi job `critical/high/medium/low/purgable/scheduled_jobs` nằm im. `Makefile`
(`QUEUE_TIERS`) đã đúng; cái sai là process khởi động bằng tay.

Đã sửa/ghi:
- `config/queue.php`: `REDIS_QUEUE_RETRY_AFTER` mặc định **90 → 180**, kèm chú thích bất biến
  `media_timeout (120s) < worker --timeout (150s) < retry_after (180s)`. Trước đây `retry_after=90`
  **nhỏ hơn** `zalo.bridge.media_timeout=120` ⇒ Redis trả job về hàng đợi trong lúc nó còn đang gửi
  ⇒ **khách nhận tin hai lần**.
- `docs/zalo-bridge/deployment.md`: khối supervisor mẫu (`queue:work redis --queue=critical,high,
  medium,default,mailers,low,scheduled_jobs,purgable --tries=3 --timeout=150 --max-time=3600`,
  `stopwaitsecs=180`) + `schedule:work` riêng cho health sweep; luật `queue:restart` sau deploy và
  sau mỗi lần sửa `app/**.php`; luật dev chỉ chạy MỘT consumer.

---

## 5. Còn lại 8.x — đề xuất (không tự sửa, ngoài phạm vi file)

**8.2 — webhook không so `personal_uid`** (`app/Http/Controllers/Api/Webhooks/ZaloController.php`,
`app/Jobs/Webhooks/ZaloEventsJob.php`). Đã kiểm: `personal_uid` chỉ được đọc ở
`QrLoginService.php:110`, **không chỗ nào** so với `channel.zalo_uid` trên đường webhook.
Controller chỉ kiểm `connection_id > 0` rồi dispatch; secret dùng chung mọi tenant. Đề xuất: trong
`ZaloEventsJob` (hoặc `BridgeEventService`), sau khi tra kênh theo `connection_id`, so
`payload['personal_uid']` với `$channel->zalo_uid`; lệch ⇒ **bỏ tin + log warning**, không ghi.

**8.5 + 8.6 — `app/Services/Channels/RemoteAttachmentDownloader.php`** (lưu ý: audit ghi đường dẫn cũ
`app/Services/RemoteAttachmentDownloader.php`, file thật ở `Services/Channels/`). Đã đọc: **chưa có
gì cả** — không `SafeHttp::assertPublicUrl`, không precheck `Content-Length`, không cap, không stream:
`$response->body()` nạp NGUYÊN tệp vào RAM rồi `Attachment::storeContents()` giữ thêm bản sao. **Đây
là rủi ro cao nhất còn lại của lô 8**: URL do client Zalo đặt → SSRF vào mạng nội bộ; tệp lớn →
OOM worker; `ZaloEventsJob --tries=1` ⇒ tin của khách mất vĩnh viễn. Đề xuất:
`SafeHttp::assertPublicUrl($url)` ngay đầu `download()`; `->sink($tmp)` thay vì `body()`; precheck
`Content-Length` so `config('limits.maximum_file_upload_size')`; vượt cap ⇒ **vẫn tạo tin** kèm nhãn
và `external_error` thay vì nuốt.

**8.9 — chưa rate-limit** `POST /webhooks/zalo` (`routes/api.php:135`) và
`POST /inboxes/{id}/zalo/qr` (`routes/web_api.php:325`). Đã grep: `throttle` chỉ có ở hai route auth
trong `routes/web.php`. Đề xuất `->middleware('throttle:…')`; `routes/*.php` là file dùng chung nên
để phiên chính hoặc lô 6 áp cùng lượt với 6.1.

**8.11 — PII thật trong `plans/**/reports/`**: còn ít nhất `zalo-lo1-notes.md:173` chứa uid Zalo
thật của founder (`6147…1247`), và `g1-inbound-evidence.md` là báo cáo của agent khác. Không tự sửa
báo cáo của phiên khác (rủi ro xung đột). Đề xuất trước khi commit: thay uid bằng placeholder cố
định, tên người thật → "Khách A"; thêm `redis-*.log` vào `.gitignore`. Founder đã được đánh dấu là
người quyết ở mục này.

**8.14 — `app/Jobs/Avatar/AvatarFromUrlJob.php:88-90`**: vẫn `assertPublicUrl` một lần rồi
`allow_redirects.max = 3` ⇒ hop 2–3 không được kiểm. Đề xuất `allow_redirects => false` + vòng lặp
tự đi từng hop, mỗi hop `assertPublicUrl`.

**8.13** — không dựng lại gate hạn mức, đúng chỉ đạo.

---

## Bridge — cần cửa sổ RESTART mới có hiệu lực

Không gọi, không restart bridge trong phiên này (phiên Zalo thật của founder). Ba thay đổi dưới đây
**chỉ có tác dụng sau lần restart tới**:

1. `session-store-fs.mjs` — quyền `0700/0600` + `hardenSessionStore()` lúc boot.
   Tệp đang tồn tại (`.sessions/c6.json`, `c6.json.meta.json`) **vẫn đang 664** cho tới lúc đó.
2. `checkUiSecret` — bỏ `?ui_secret=`, chỉ nhận header `X-Bridge-UI-Secret`.
   Đã kiểm mọi client đều gửi header: `ZaloBridgeClient.php:137`, `deploy.sh:495`. Không có client
   nào dùng query string ⇒ restart không làm hỏng ai.
3. `secret-compare.mjs` — `safeEqual()` (`timingSafeEqual`) cho `BRIDGE_UI_SECRET` và
   `BRIDGE_SEND_SECRET`; `zca-dispatch.mjs` bỏ bản sao riêng, import chung.

Kiểm ngay sau khi restart:
```bash
stat -c '%a %n' services/zalo-bridge/.sessions services/zalo-bridge/.sessions/*   # 700 / 600
curl -s "http://127.0.0.1:3710/health?connection_id=6&ui_secret=$SECRET" -o /dev/null -w '%{http_code}\n'  # 403
curl -s "http://127.0.0.1:3710/health?connection_id=6" -H "X-Bridge-UI-Secret: $SECRET" -o /dev/null -w '%{http_code}\n'  # 200
```

Chưa làm (ghi để không rơi): guard production **chưa** bắt buộc `LARAVEL_WEBHOOK_SECRET` /
`LARAVEL_WEBHOOK_URL` (mới chỉ có `BRIDGE_SEND_SECRET` + `BRIDGE_UI_SECRET` ở `index.mjs::boot`).
Thêm hai biến này vào cùng khối `missing` là một dòng — để lô 1/phiên chính làm cùng cửa sổ restart,
tránh hai phiên sửa chồng `index.mjs`.

---

## Gate

| Gate | Kết quả |
|---|---|
| `DB_DATABASE=yona_rw_test_lo8 php artisan test tests/Contracts tests/Feature/Channels tests/Feature/Models/AttachmentTest.php tests/Feature/Jobs tests/Feature/Listeners tests/Feature/WebApi/{Conversation,Contact}AttachmentsTest.php tests/Feature/WebApi/ConversationMessagesControllerTest.php` | **442 passed**, 1286 assertions |
| `… tests/Feature/Integrations tests/Feature/Models tests/Feature/Mailboxes` (đường dùng `fileUrl()`: Slack, Macro, Portal, notification, mailbox) | **459 passed**, 809 assertions |
| `node --test src/*.test.mjs src/routes/*.test.mjs` (services/zalo-bridge) | **153 passed**, 0 failed |
| `vendor/bin/pint --test` (file đã sửa) | passed |
| `tsc` | không chạy — không đụng `resources/` |

Ghi chú đo: giữa phiên có 2 case `ZaloQrLifecycleTest` đỏ do `ZaloHealthSweepJob::handle()` đang được
**phiên khác sửa dở** trong cùng working tree (`git status` xuất hiện `QrLoginService.php`,
`TypingRelayService.php`, `ZaloConnectionsController.php`, `resources/js/dashboard/settings/inboxes/**`
không phải của tôi). Lượt chạy cuối cả 442 case đều xanh. Không đụng file của phiên đó.

Dọn dẹp: `dropdb yona_rw_test_lo8` sau khi phiên chính nghiệm thu (giữ lại để chạy lại gate).
Không commit, không `git add`.

```
Status: DONE_WITH_CONCERNS
Summary: Đã ký URL đính kèm hai mức đúng như ActiveStorage (chữ ký trong đường dẫn để không vỡ tên
tệp trên UI), cắt payload thô nền tảng ở cửa ra webhook, siết quyền kho phiên bridge về 0700/0600,
và chốt bất biến thời gian của worker; 8.2/8.5/8.6/8.9/8.11/8.14 nằm ngoài phạm vi file nên chỉ có
đề xuất kèm bằng chứng.
Concerns/Blockers:
- Cần `php artisan queue:restart` ngay khi nhận thay đổi — worker giữ code cũ sẽ phát URL đính kèm
  3 đoạn nay đã 404.
- Ba thay đổi bridge chỉ có hiệu lực sau cửa sổ restart do founder chốt; `.sessions/*.json` hiện
  VẪN đang 664.
- 8.6 (`RemoteAttachmentDownloader` không stream, không cap, không chốt SSRF, `--tries=1`) là rủi ro
  cao nhất còn lại và chưa ai nhận — cần giao cho một phiên có quyền sửa `app/Services/Channels/**`.
- Mã hoá cookie phiên at-rest mới có thiết kế, chưa thi công.
```
