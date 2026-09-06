# G1 — Kênh Zalo cá nhân (`Channel::Zalo`) + vòng đời đăng nhập QR

Nguồn: nhánh `main` của chính repo (không phải Chatwoot — Chatwoot KHÔNG có kênh Zalo).
Đích: khung kênh ngoài của bản rewrite (F2–F5) — thêm kênh = thêm driver, lõi không đổi.

## HỢP ĐỒNG API

### Tạo inbox Zalo
`POST /api/v1/accounts/{accountId}/inboxes` (admin-only)

```jsonc
{ "name": "Zalo cửa hàng", "channel": { "type": "zalo" } }
```
KHÔNG có trường kỹ thuật nào — người dùng cuối chỉ đặt tên; danh tính tài khoản Zalo
đến từ lần quét QR (lệnh founder). `channel_type` trả về = `Channel::Zalo`.

`InboxResource` bổ sung (chỉ với inbox Zalo): `zalo_uid`, `zalo_display_name`,
`zalo_phone`, `zalo_state`, `zalo_session_lost_reason`, `zalo_last_connected_at`.
`zalo_state` ∈ `qr_waiting | connected | session_lost`.

### Vòng đời QR (khối `// G1` trong `routes/web_api.php`, admin-only)

| Route | Trả về |
|---|---|
| `POST /inboxes/{id}/zalo/qr` | `{ok:true, qr_token, connection_id}` · 503 `{ok:false,message}` khi bridge chưa chạy |
| `GET /inboxes/{id}/zalo/qr_status` | nguyên phản hồi bridge + `ok:true` (`phase`: `qr_waiting`/`ready`/`error`, `qr_image` data-URI) |
| `POST /inboxes/{id}/zalo/promote` | `{ok:true, zalo_uid, display_name}` · 409 `{error_code:'zalo_account_mismatch'}` khi quét nhầm tài khoản · 503 bridge chết |
| `GET /inboxes/{id}/zalo/health` | `{state, zalo_uid, display_name, phone, session_lost_reason, last_connected_at, last_session_lost_at, circuit_open, error_count}` |

### Webhook từ bridge (khối `// G1` trong `routes/api.php`)
`POST /webhooks/zalo`, header `X-Zalo-Personal-Bridge-Secret` (`VerifyZaloBridgeSecret`).
Payload theo `docs/zalo-bridge/webhook-contract.md`. Mã trả: 200 nhận (xử lý bất đồng bộ
trong `ZaloEventsJob`), 400 thiếu `connection_id`, 401 sai secret.

`connection_id` = **`channel_zalo.id`** (xem "Khác biệt cố ý" #1).

## Bảng trace `main` → rewrite

| Nguồn nhánh `main` | Đích nhánh rewrite |
|---|---|
| `database/migrations/2026_06_28_800002_create_zalo_connections_table` (+ 900004 `last_session_lost_at`) | `database/migrations/2026_09_06_998000_create_channel_zalo_table.php` |
| `app/Models/ZaloConnection.php` | `app/Models/Channel/Zalo.php` (dùng trait `Channelable` như 12 kênh kia) |
| — | `database/factories/Channel/ZaloFactory.php` + state `InboxFactory::zalo()` |
| lời gọi `Http::…` rải trong `ZaloConnectionController` + `ZaloSendService` | `app/Services/Zalo/ZaloBridgeClient.php` (cửa HTTP duy nhất) |
| `ZaloConnectionController@store/qr/promote/cancelQr` + `PromoteAccountBinder` | `app/Services/Zalo/QrLoginService.php` + `app/Http/Controllers/WebApi/ZaloConnectionsController.php` |
| `ZaloPersonalWebhookController` (điều phối `type`) | `app/Services/Zalo/BridgeEventService.php` + `Api/Webhooks/ZaloController.php` + `Jobs/Webhooks/ZaloEventsJob.php` |
| `ZaloChannelDriver::parseInbound` + `Chat\Intake\IntakeService` | `app/Services/Zalo/IncomingMessageService.php` |
| `Chat\Status\MessageStatusService` + `Intake\ZaloStateEventParser` | `app/Services/Zalo/MessageStateService.php` |
| `Delivery/ZaloSendService` | `app/Services/Zalo/SendOnZaloService.php` (kế thừa `BaseSendOnChannelService` của F2–F5) |
| `Policy/SendRateLimiter` | `app/Services/Zalo/SendRateLimiter.php` (ngưỡng đọc từ `config/zalo.php`) |
| `Health/ZaloHealthMonitor` | `app/Services/Zalo/ZaloHealthMonitor.php` |
| `Exception/{RateCap,SendOutsideWindow,ZaloCircuitOpen,ZaloNotConnected}Exception` | `app/Services/Zalo/Exception/*` (bỏ `ZaloSplitBrainException` — xem #1) |
| `app/Http/Middleware/VerifyZaloBridgeSecret.php` | y nguyên, đọc `config('zalo.bridge.webhook_secret')` |
| `config/services.php` khối `zalo_bridge` | `config/zalo.php` (thêm cửa sổ giờ / trần ngày / ngắt mạch) |
| `resources/js/pages/integration/zalo/index.tsx` (panel QR) | `resources/js/dashboard/settings/inboxes/channels/ZaloQrPanel.tsx` |
| — (bản `main` là trang settings rời) | `channels/Zalo.tsx` (bước 1+2 của wizard), `channels/ZaloSessionBanner.tsx` |
| `services/zalo-bridge/**` | chép nguyên, KHÔNG sửa logic (chỉ đổi `LARAVEL_WEBHOOK_URL` mặc định trong `.env*.example` sang `/webhooks/zalo`) |
| `docs/zalo-bridge/{deployment,webhook-contract}.md` | chép + sửa phần đường webhook & luồng bind (không còn RLS) |
| morph map / `CHANNEL_TYPES` / `CHANNEL_SERVICES` | mỗi nơi đúng MỘT dòng (`AppServiceProvider`, `InboxesController`, `SendReplyJob`) |

### Spec ↔ Pest

| Hành vi | Pest |
|---|---|
| webhook: secret, thiếu `connection_id`, hàng đợi, tin đến, trùng `source_id`, gộp theo số điện thoại, direction, đính kèm + trích dẫn, `bridge_session`, `relay_event` (reaction/undo/seen), kênh lạ | `tests/Feature/Channels/ZaloChannelTest.php` (14) |
| tạo inbox chỉ với tên, phân quyền, 404 kênh khác, mở QR, bridge chết, `qr_status`, chưa mở phiên, promote, quét nhầm tài khoản, health + ngắt mạch | `tests/Feature/Channels/ZaloQrLifecycleTest.php` (10) |
| gửi đúng payload/secret, không gửi tin dội lại, mất phiên, chưa kết nối, ngắt mạch, trần 3 tin/ngày, khung 7h–22h, miễn trừ tin trả lời, `SendReplyJob` chọn đúng driver | `tests/Feature/Channels/ZaloSendTest.php` (9) |

Fixture webhook: `tests/Fixtures/channels/zalo_{inbound_text,inbound_image,bridge_session,relay_reaction}.json`
(dựng theo `docs/zalo-bridge/webhook-contract.md`).

## Quyết định thiết kế / Khác biệt cố ý

1. **`connection_id` = `channel_zalo.id`.** Bản `main` có sequence `zalo_connection_id_seq`
   riêng vì một workspace giữ NHIỀU slot Zalo và phải tra `workspace_id` qua
   `pgsql_privileged` để bind RLS. Ở đây một inbox = một tài khoản Zalo (đúng mô hình
   inbox của Chatwoot), nên khóa chính của kênh làm luôn khóa slot. Hệ quả: bỏ được
   sequence, bảng `zalo_connections` rời, `PromoteAccountBinder`, `ChannelAccount`,
   `ZaloSplitBrainException` và toàn bộ luồng bind RLS.
2. **Không có RLS/TenantScope.** Bản rewrite tách dữ liệu theo `account_id` như Chatwoot;
   webhook không cần bind gì, chỉ tra kênh theo `connection_id` rồi đi tiếp.
3. **Webhook đẩy vào hàng đợi rồi trả 200 ngay**, cùng khuôn Telegram/Line/WhatsApp của
   F2–F5 — bỏ bảng mã 202/422/503 phân loại cho outbox của bridge. Bridge vẫn retry khi
   không nhận được 2xx (mất kết nối); tin hỏng nằm lại ở log của job, không dead-letter riêng.
4. **Lỗi gửi ghi vào `content_attributes.external_error`** qua `ChannelMessageStatus` như
   mọi kênh ngoài, thay vì ném exception lên UI. `SendOnZaloService` không ném ra ngoài:
   `SendReplyJob` là job nền, ném lỗi chỉ làm hỏng luồng tạo tin.
5. **Trần ≤3 tin/số/ngày + khung 7h–22h chỉ áp tin CHỦ ĐỘNG.** Tin trả lời khi khách có
   tin đến trong `zalo.reply_window_hours` (24h) đi tự do và KHÔNG tiêu quota — đúng
   quyết định trong `CLAUDE.md`. Ngưỡng nằm trong `config/zalo.php`, không hardcode.
6. **Chống trùng liên hệ theo số điện thoại** dùng lại `ContactInboxWithContactBuilder`
   (đã dedupe identifier → email → phone). Bridge không gửi số ở tin thường; số lấy từ
   `user.phone` hoặc danh thiếp Zalo (`business_card.phone`) khi có.
7. **Sự kiện trạng-thái-tin đi vào `content_attributes`** (`reactions`, `deleted`,
   `in_reply_to_external_id`) và cột `status` — không dựng bảng `relay_events`/
   `message_source_aliases` như bản `main`.
8. **Icon kênh dùng `i-ri-chat-3-line/fill`** — bộ icon của Chatwoot không có glyph Zalo.
   `public/assets/images/icon_zalo.png` của nhánh `main` chưa chép vì `ChannelSelector`
   nhận class icon, không nhận đường dẫn ảnh.
9. **Không có oracle Chatwoot cho kênh Zalo** → pixel-diff so với wizard kênh API (xem gate).
10. **`ZaloInteractionService`, `ZaloBackfillService`, dispatcher `/zca`, social_event →
    dòng hệ thống, sticker CDN allowlist, `MessageSourceAlias`** của nhánh `main` CHƯA port
    (ngoài phạm vi G1). `social_event` hiện rơi vào nhánh mặc định và bị bỏ qua êm.
11. **Trang settings rời `/integrations/zalo` của nhánh `main` không port** — kết nối nằm
    trong wizard inbox + biểu ngữ trên trang cấu hình inbox, đúng mô hình Chatwoot.

## Bẫy đã trả giá

1. `array_filter(..., fn ($v) => $v !== null)` nuốt luôn `qr_token => null` nên sau khi
   chốt phiên token cũ vẫn nằm lại DB. Phải tách phần "có thì ghi" ra khỏi phần "luôn ghi".
2. `Http::fake()` với key `'host/auth/qr/status'` KHÔNG khớp request GET có query string —
   phải `'host/auth/qr/status*'`. (Cùng họ với bẫy #2 của `f2f5-notes-be.md`.)
3. Hàng đợi trong test là `sync`: tạo một `Message` outgoing là `SendReplyJob` chạy NGAY,
   nên `$message` trong biến test đã cũ — phải `refresh()` trước khi đọc `content_attributes`,
   không thì "Trying to access array offset on null".
4. `POST /inboxes` của bản rewrite trả **200**, không phải 201.
5. Chạy e2e headless nhiều lượt làm đầy `user_sessions` (giới hạn 25 của F8) → lần đăng
   nhập sau bị chặn bằng màn "You have reached your limit of active sessions". Dọn bằng
   xóa `user_sessions` cũ trước khi đo lại.
6. Cắt output script Playwright bằng `| head` giết tiến trình trước khối `finally` → inbox
   e2e không được dọn. Chạy trọn rồi mới lọc output.

## Kết quả gate

| Gate | Kết quả |
|---|---|
| `php artisan migrate` trên `yona_rw` | DONE (`2026_09_06_998000_create_channel_zalo_table`) |
| Pest vùng G1 (`tests/Feature/Channels`) | 108/108 xanh (33 test mới của G1) |
| Pest toàn suite trên `yona_rw_test_g1` | **2044/2044 xanh** (5008 assertion), DB đã `dropdb` |
| `vendor/bin/pint` theo danh sách file của tôi | passed |
| `npx tsc --noEmit` | không có lỗi ở file của tôi (3 lỗi còn lại thuộc `helper/facebookSdk.ts` của `f2f5-fe`) |
| `npx vitest run` | 673/673 (84 file), thêm 2 test mới |
| `npm run build` | xanh |
| E2E giả lập trên `yona_rw` | 21/21 đạt — `~/www/pixel-diff/g1-zalo-e2e.mjs` |
| Pixel-diff (1280×800, light + dark) | xem bảng dưới |

### E2E giả lập (`node ~/www/pixel-diff/g1-zalo-e2e.mjs`)
Script tự dựng **bridge giả** bằng `http.createServer` ở `127.0.0.1:3710` (tắt khi xong),
rồi chạy thật trên yona `localhost:8000`: lưới kênh → thẻ Zalo bấm được → form chỉ hỏi
tên → panel QR hiện ảnh QR → bridge báo `ready` → promote → bước gán nhân viên →
`InboxResource` có `zalo_state=connected`, `zalo_uid`, `zalo_phone` → giả webhook tin đến
(200) và webhook sai secret (401) → hội thoại + liên hệ hiện đúng → agent trả lời → job
gửi ra gọi `/personal-messages/send` đúng `thread_id`/`text`/`connection_id` kèm header
`X-Bridge-Send-Secret` → webhook `bridge_session: session_lost` → `health` đổi trạng thái
→ biểu ngữ mất phiên hiện trên trang cấu hình inbox → **xóa inbox e2e**.
Dữ liệu e2e đã dọn sạch (`channel_zalo` = 0 dòng, không còn liên hệ "Khách Zalo E2E").

### Pixel-diff (`node ~/www/pixel-diff/g1-zalo-pixel.mjs`)
Không có oracle cho Zalo — phép đo so **wizard Zalo của yona** với **wizard kênh API của
oracle** (hai màn dùng chung `WizardLayout`: header, thanh bước, cột trái, khối form một ô tên).

| Vùng | Light | Dark |
|---|---|---|
| toàn màn | 1.899% | 1.966% |
| header | 0.263% | 0.267% |
| cột bước (WizardLayout) | **0.000%** | **0.000%** |
| thân form (**khác biệt cố ý**) | 2.537% | 2.637% |

Cột bước trùng tuyệt đối và header ở mức nhiễu nền; phần lệch nằm đúng ở tiêu đề + nội
dung form (kênh API có thêm ô Webhook URL, chữ khác nhau) — đó là khác biệt chủ đích.

## Founder quét QR thật thế nào

1. Cài và chạy bridge:
   ```bash
   cd services/zalo-bridge
   cp .env.example .env         # điền 3 secret + LARAVEL_WEBHOOK_URL
   pnpm install
   pnpm pm2:start               # hoặc: node src/index.mjs (foreground)
   ```
   `.env` của bridge:
   ```
   LARAVEL_WEBHOOK_URL=http://127.0.0.1:8000/webhooks/zalo
   LARAVEL_WEBHOOK_SECRET=<trùng ZALO_BRIDGE_WEBHOOK_SECRET>
   LARAVEL_BASE_URL=http://127.0.0.1:8000
   BRIDGE_HTTP_HOST=127.0.0.1
   BRIDGE_HTTP_PORT=3710
   BRIDGE_SEND_SECRET=<trùng ZALO_BRIDGE_SEND_SECRET>
   BRIDGE_UI_SECRET=<trùng ZALO_BRIDGE_UI_SECRET>
   ```
2. `.env` của Laravel (mẫu đã có trong `.env.example`):
   ```
   ZALO_BRIDGE_URL=http://127.0.0.1:3710
   ZALO_BRIDGE_WEBHOOK_SECRET=…
   ZALO_BRIDGE_SEND_SECRET=…
   ZALO_BRIDGE_UI_SECRET=…
   ```
   rồi `php artisan config:clear`.
3. Trên UI: **Settings → Inboxes → Add Inbox → Zalo** → đặt tên → panel QR hiện ra →
   mở Zalo trên điện thoại, vào máy quét QR, quét mã → tự sang bước gán nhân viên.
4. Mất phiên (Zalo đá đăng nhập, đổi máy…): trang cấu hình inbox hiện biểu ngữ đỏ
   "Scan QR code again" — bấm để quét lại. Quét nhầm tài khoản khác sẽ bị chặn (409)
   để không đổi chủ inbox giữa chừng.
5. Bridge phải chạy trên CÙNG máy với Laravel (mặc định `127.0.0.1:3710`); worker hàng
   đợi phải chạy để webhook được xử lý.

> Rủi ro đã biết (giữ nguyên từ nhánh `main`): Zalo cá nhân không có API chính thức,
> zca-js là thư viện dịch ngược — có nguy cơ vi phạm ToS và bị khóa tài khoản. Cửa sổ
> 7h–22h, trần 3 tin chủ động/số/ngày và ngắt mạch khi bridge lỗi liên tục là để giảm
> rủi ro đó, không phải để loại bỏ nó.

## Ghi chú môi trường (không commit)
Đã thêm vào `.env` local 4 biến `ZALO_BRIDGE_*` với giá trị e2e
(`e2e-zalo-webhook-secret` / `e2e-zalo-send-secret` / `e2e-zalo-ui-secret`) và chạy
`php artisan config:clear`. Founder đổi thành secret thật khi chạy bridge thật.

## Route đã thêm (trong đúng hai khối được giao)
- `routes/api.php`: `POST /webhooks/zalo` (+ `VerifyZaloBridgeSecret`).
- `routes/web_api.php`: 4 route `/inboxes/{id}/zalo/*`.
Không cần route nào khác.
